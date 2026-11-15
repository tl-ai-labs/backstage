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
import { retrieveSchema, RJSFSchema, ValidatorType } from '@rjsf/utils';
import { type ParsedTemplateSchema } from '../hooks/useTemplateSchema';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolves the top-level `dependencies` of a schema whose trigger property is
 * not a property of the schema itself, for example because it was answered in
 * an earlier step of the form.
 *
 * rjsf ignores such dependencies, so they are resolved here against the form
 * data collected so far, following the same rules as rjsf does for
 * dependencies within a single step.
 */
export function resolveExternalDependencies(
  schema: JsonObject,
  formData: JsonObject,
  validator: ValidatorType,
): JsonObject {
  const { dependencies } = schema;
  if (!isObject(dependencies)) {
    return schema;
  }

  const ownProperties = isObject(schema.properties) ? schema.properties : {};
  const externalKeys = Object.keys(dependencies).filter(
    key => !(key in ownProperties),
  );
  if (externalKeys.length === 0) {
    return schema;
  }

  const remainingDependencies = { ...dependencies };
  const required = new Set<string>();
  // Dependent schemas are added as allOf entries rather than being merged in
  // directly, which keeps any existing conditions of the step intact.
  const dependentSchemas: JsonObject[] = [];

  for (const key of externalKeys) {
    const dependency = dependencies[key];
    delete remainingDependencies[key];

    if (formData[key] === undefined) {
      continue;
    }

    if (Array.isArray(dependency)) {
      for (const name of dependency) {
        if (typeof name === 'string') {
          required.add(name);
        }
      }
      continue;
    }

    if (!isObject(dependency)) {
      continue;
    }

    const { oneOf, ...dependentSchema } = dependency;
    if (Object.keys(dependentSchema).length > 0) {
      dependentSchemas.push(dependentSchema);
    }

    if (!Array.isArray(oneOf)) {
      continue;
    }

    // Exactly one of the subschemas must match the value of the trigger
    // property, otherwise the oneOf is ignored, same as in rjsf.
    const matching = oneOf.filter((subschema): subschema is JsonObject => {
      if (!isObject(subschema) || !isObject(subschema.properties)) {
        return false;
      }
      const condition = subschema.properties[key];
      if (condition === undefined) {
        return false;
      }
      return validator.isValid(
        { type: 'object', properties: { [key]: condition } } as RJSFSchema,
        { [key]: formData[key] },
        schema as RJSFSchema,
      );
    });

    if (matching.length !== 1) {
      continue;
    }

    // The trigger property belongs to another step, so it must not be
    // rendered as part of this one.
    const { properties: branchProperties, ...branch } = matching[0];
    const { [key]: _trigger, ...properties } = branchProperties as JsonObject;
    if (Object.keys(properties).length > 0) {
      dependentSchemas.push({ ...branch, properties });
    } else if (Object.keys(branch).length > 0) {
      dependentSchemas.push(branch);
    }
  }

  const resolved: JsonObject = { ...schema };

  if (Object.keys(remainingDependencies).length > 0) {
    resolved.dependencies = remainingDependencies;
  } else {
    delete resolved.dependencies;
  }

  if (required.size > 0) {
    const existing = Array.isArray(schema.required) ? schema.required : [];
    resolved.required = Array.from(new Set([...existing, ...required]));
  }

  if (dependentSchemas.length > 0) {
    const existing = Array.isArray(schema.allOf) ? schema.allOf : [];
    resolved.allOf = [...existing, ...dependentSchemas];
  }

  return resolved;
}

/**
 * Resolves the dependencies of a step on answers given outside of that step.
 */
export function resolveStepDependencies(
  step: ParsedTemplateSchema,
  formData: JsonObject,
  validator: ValidatorType,
): ParsedTemplateSchema {
  return {
    ...step,
    schema: resolveExternalDependencies(step.schema, formData, validator),
    mergedSchema: resolveExternalDependencies(
      step.mergedSchema,
      formData,
      validator,
    ),
  };
}

/**
 * Collects the top-level property names that are only defined within a
 * condition, i.e. `if`/`then`/`else` or `dependencies`.
 */
function collectConditionalKeys(
  schema: JsonValue | undefined,
  conditional: boolean,
  keys: Set<string>,
  triggerKeys: Set<string>,
) {
  if (!isObject(schema)) {
    return;
  }

  if (conditional && isObject(schema.properties)) {
    for (const key of Object.keys(schema.properties)) {
      keys.add(key);
    }
  }

  collectConditionalKeys(schema.then, true, keys, triggerKeys);
  collectConditionalKeys(schema.else, true, keys, triggerKeys);

  if (isObject(schema.dependencies)) {
    for (const [key, dependency] of Object.entries(schema.dependencies)) {
      triggerKeys.add(key);
      collectConditionalKeys(dependency, true, keys, triggerKeys);
    }
  }

  // Unconditional oneOf/anyOf alternatives are picked by the user, not by
  // the form data, so only descend into them within a condition.
  const subschemas = [
    schema.allOf,
    ...(conditional ? [schema.oneOf, schema.anyOf] : []),
  ];
  for (const list of subschemas) {
    if (Array.isArray(list)) {
      for (const subschema of list) {
        collectConditionalKeys(subschema, conditional, keys, triggerKeys);
      }
    }
  }
}

/**
 * Removes the values of conditional fields whose condition no longer holds,
 * for example because the user went back and changed an answer that the
 * field depends on. Values of properties that are not conditional, including
 * those not defined by any step, are kept as is.
 */
export function omitInactiveConditionalValues(
  steps: ParsedTemplateSchema[],
  formData: Record<string, JsonValue>,
  validator: ValidatorType,
): Record<string, JsonValue> {
  const conditionalKeys = new Set<string>();
  const triggerKeys = new Set<string>();
  const activeKeys = new Set<string>();

  for (const step of steps) {
    collectConditionalKeys(step.schema, false, conditionalKeys, triggerKeys);

    const schema = resolveExternalDependencies(
      step.schema,
      formData,
      validator,
    ) as RJSFSchema;
    const resolved = retrieveSchema(validator, schema, schema, formData);
    for (const key of Object.keys(resolved.properties ?? {})) {
      activeKeys.add(key);
    }
  }

  return Object.fromEntries(
    Object.entries(formData).filter(
      ([key]) =>
        !conditionalKeys.has(key) ||
        triggerKeys.has(key) ||
        activeKeys.has(key),
    ),
  );
}
