/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { JsonObject, JsonValue } from '@backstage/types';
import {
  ADDITIONAL_PROPERTY_FLAG,
  retrieveSchema,
  type RJSFSchema,
  type ValidatorType,
} from '@rjsf/utils';
import { omit } from 'lodash';

type ConditionalBranch = { reads: string[]; fields: string[] };

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectEntries(value: JsonValue | undefined): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function propertyKeys(node: JsonObject): string[] {
  return isObject(node.properties) ? Object.keys(node.properties) : [];
}

// Keeps an earlier-step field out of the step that only reads it.
function withoutProperty(option: JsonObject, key: string): JsonObject {
  const { properties } = option;
  return isObject(properties)
    ? { ...option, properties: omit(properties, key) as JsonObject }
    : option;
}

function conditionKeys(node: JsonObject): string[] {
  const keys = propertyKeys(node);

  if (Array.isArray(node.required)) {
    for (const key of node.required) {
      if (typeof key === 'string') {
        keys.push(key);
      }
    }
  }

  if (isObject(node.dependencies)) {
    keys.push(...Object.keys(node.dependencies));
  }

  for (const name of ['allOf', 'anyOf', 'oneOf']) {
    for (const entry of objectEntries(node[name])) {
      keys.push(...conditionKeys(entry));
    }
  }

  for (const name of ['not', 'if', 'then', 'else']) {
    const entry = node[name];
    if (isObject(entry)) {
      keys.push(...conditionKeys(entry));
    }
  }

  return keys;
}

function collectBranches(stepSchema: JsonObject): ConditionalBranch[] {
  const branches: ConditionalBranch[] = [];

  // Nested objects are skipped because rjsf evaluates their conditions against
  // their own data, so they can never read a field of another step.
  const walk = (node: JsonObject, reads: string[], inBranch: boolean) => {
    if (inBranch) {
      branches.push({ reads, fields: propertyKeys(node) });
    }

    if (isObject(node.if)) {
      const branchReads = [...reads, ...conditionKeys(node.if)];
      for (const branch of [node.then, node.else]) {
        if (isObject(branch)) {
          walk(branch, branchReads, true);
        }
      }
    }

    for (const entry of objectEntries(node.allOf)) {
      walk(entry, reads, inBranch);
    }

    if (isObject(node.dependencies)) {
      for (const [key, value] of Object.entries(node.dependencies)) {
        if (isObject(value)) {
          const branchReads = [...reads, key];
          walk(withoutProperty(value, key), branchReads, true);
          for (const option of objectEntries(value.oneOf)) {
            walk(withoutProperty(option, key), branchReads, true);
          }
        }
      }
    }
  };

  walk(stepSchema, [], false);
  return branches;
}

function fieldKeys(stepSchema: JsonObject): string[] {
  return [
    ...propertyKeys(stepSchema),
    ...objectEntries(stepSchema.allOf).flatMap(propertyKeys),
    ...collectBranches(stepSchema).flatMap(branch => branch.fields),
  ];
}

function earlierFieldKeys(
  stepSchemas: JsonObject[],
  stepIndex: number,
): Set<string> {
  const keys = new Set(stepSchemas.slice(0, stepIndex).flatMap(fieldKeys));
  // A key the step defines itself is a same-step condition, which rjsf handles.
  for (const key of fieldKeys(stepSchemas[stepIndex])) {
    keys.delete(key);
  }
  return keys;
}

function crossStepBranches(
  stepSchemas: JsonObject[],
  stepIndex: number,
): ConditionalBranch[] {
  const earlierKeys = earlierFieldKeys(stepSchemas, stepIndex);
  return collectBranches(stepSchemas[stepIndex]).filter(branch =>
    branch.reads.some(key => earlierKeys.has(key)),
  );
}

function dependencyToConditions(key: string, value: JsonObject): JsonObject[] {
  const { oneOf, ...rest } = value;
  const conditions: JsonObject[] = [];

  if (Object.keys(rest).length > 0) {
    conditions.push({
      if: { required: [key] },
      then: withoutProperty(rest, key),
    });
  }

  for (const option of objectEntries(oneOf)) {
    const properties = option.properties;
    if (isObject(properties) && isObject(properties[key])) {
      conditions.push({
        if: { properties: { [key]: properties[key] }, required: [key] },
        then: withoutProperty(option, key),
      });
    }
  }

  return conditions;
}

/**
 * Moves dependencies keyed on earlier-step fields into `allOf` conditions,
 * because rjsf skips a dependency whose key is not in the step's properties.
 */
export function rewriteCrossStepDependencies(
  stepSchemas: JsonObject[],
  stepIndex: number,
): JsonObject {
  const schema = stepSchemas[stepIndex];
  const { dependencies } = schema;
  if (!isObject(dependencies)) {
    return schema;
  }

  const earlierKeys = earlierFieldKeys(stepSchemas, stepIndex);
  const rewrittenKeys = Object.keys(dependencies).filter(
    key => earlierKeys.has(key) && isObject(dependencies[key]),
  );
  if (rewrittenKeys.length === 0) {
    return schema;
  }

  const conditions = rewrittenKeys.flatMap(key =>
    dependencyToConditions(key, dependencies[key] as JsonObject),
  );
  const remaining = omit(dependencies, rewrittenKeys) as JsonObject;
  const allOf = [
    ...(Array.isArray(schema.allOf) ? schema.allOf : []),
    ...conditions,
  ];
  const rewritten = omit(schema, ['dependencies', 'allOf']) as JsonObject;
  // ajv rejects an empty allOf against the draft-07 metaschema.
  if (allOf.length > 0) {
    rewritten.allOf = allOf;
  }
  if (Object.keys(remaining).length > 0) {
    rewritten.dependencies = remaining;
  }
  return rewritten;
}

/**
 * Returns the keys read by the cross-step conditions of a step.
 */
export function getCrossStepConditionKeys(
  stepSchemas: JsonObject[],
  stepIndex: number,
): string[] {
  const branches = crossStepBranches(stepSchemas, stepIndex);
  return [...new Set(branches.flatMap(branch => branch.reads))];
}

function resolvedKeys(
  stepSchemas: JsonObject[],
  stepIndex: number,
  values: Record<string, JsonValue>,
  validator: ValidatorType,
): string[] {
  const rewritten = rewriteCrossStepDependencies(stepSchemas, stepIndex);
  const resolved = retrieveSchema(
    validator,
    rewritten as RJSFSchema,
    rewritten as RJSFSchema,
    values,
  ) as JsonObject;
  const properties = isObject(resolved.properties) ? resolved.properties : {};

  // Without this filter, rjsf's additional properties would keep a hidden value
  // alive just because the value is present in the form data.
  const keys = Object.keys(properties).filter(key => {
    const property = properties[key];
    return !(isObject(property) && ADDITIONAL_PROPERTY_FLAG in property);
  });
  const options = [
    ...objectEntries(resolved.oneOf),
    ...objectEntries(resolved.anyOf),
  ];
  return [...keys, ...options.flatMap(propertyKeys)];
}

function findHiddenKeys(
  stepSchemas: JsonObject[],
  crossStepFields: string[],
  values: Record<string, JsonValue>,
  validator: ValidatorType,
): string[] {
  const candidates = crossStepFields.filter(key =>
    Object.prototype.hasOwnProperty.call(values, key),
  );
  if (candidates.length === 0) {
    return [];
  }

  const resolved = new Set(
    stepSchemas.flatMap((_, index) =>
      resolvedKeys(stepSchemas, index, values, validator),
    ),
  );
  return candidates.filter(key => !resolved.has(key));
}

/**
 * Returns the form values without those hidden by a cross-step condition, or
 * the given object itself when nothing is hidden.
 */
export function omitHiddenCrossStepValues(
  stepSchemas: JsonObject[],
  formData: Record<string, JsonValue>,
  validator: ValidatorType,
): Record<string, JsonValue> {
  const crossStepFields = [
    ...new Set(
      stepSchemas.flatMap((_, index) =>
        crossStepBranches(stepSchemas, index).flatMap(branch => branch.fields),
      ),
    ),
  ];

  try {
    let values = formData;
    let hidden = findHiddenKeys(
      stepSchemas,
      crossStepFields,
      values,
      validator,
    );
    // A dropped value can stop satisfying a later condition, so chained
    // conditions need another pass to agree with what Review shows.
    while (hidden.length > 0) {
      values = omit(values, hidden) as Record<string, JsonValue>;
      hidden = findHiddenKeys(stepSchemas, crossStepFields, values, validator);
    }
    return values;
  } catch {
    // A broken later step should fail when the user reaches it, as it does today.
    return formData;
  }
}
