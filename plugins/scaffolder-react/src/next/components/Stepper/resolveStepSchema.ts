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
import type { JsonObject, JsonValue } from '@backstage/types';
import {
  mergeSchemas,
  retrieveSchema,
  type RJSFSchema,
  type ValidatorType,
} from '@rjsf/utils';
import type { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import { isObject } from './utils';

/**
 * Collects all top-level property names that a step schema may define,
 * including properties introduced conditionally via `dependencies`,
 * `dependentSchemas`, `then`, `else`, `allOf`, `oneOf`, or `anyOf`.
 */
export function collectSchemaPropertyKeys(
  schema: JsonObject | undefined,
  keys: Set<string> = new Set(),
): Set<string> {
  if (!isObject(schema)) {
    return keys;
  }

  if (isObject(schema.properties)) {
    for (const key of Object.keys(schema.properties)) {
      keys.add(key);
    }
  }

  if (isObject(schema.dependencies)) {
    for (const depSchema of Object.values(schema.dependencies)) {
      if (isObject(depSchema)) {
        collectSchemaPropertyKeys(depSchema, keys);
      }
    }
  }

  if (isObject(schema.dependentSchemas)) {
    for (const depSchema of Object.values(schema.dependentSchemas)) {
      if (isObject(depSchema)) {
        collectSchemaPropertyKeys(depSchema, keys);
      }
    }
  }

  for (const branchKey of ['then', 'else'] as const) {
    const branch = schema[branchKey];
    if (isObject(branch)) {
      collectSchemaPropertyKeys(branch, keys);
    }
  }

  for (const listKey of ['allOf', 'oneOf', 'anyOf'] as const) {
    const list = schema[listKey];
    if (Array.isArray(list)) {
      for (const subSchema of list) {
        if (isObject(subSchema)) {
          collectSchemaPropertyKeys(subSchema, keys);
        }
      }
    }
  }

  return keys;
}

/**
 * Resolves `dependencies` in a step schema that reference fields defined in
 * earlier steps rather than the current step's own `properties`.
 *
 * RJSF's `processDependencies` skips any dependency key that is not present in
 * `schema.properties`, so cross-step `dependencies` would otherwise be ignored.
 * Resolving them here against the accumulated `formData` merges the active
 * branch into the current step schema while stripping earlier-step trigger
 * properties so they are neither rendered nor re-validated on this step.
 */
export function resolveCrossStepSchema(
  schema: JsonObject,
  formData: Record<string, JsonValue>,
  earlierStepKeys: Set<string>,
  validator: ValidatorType,
): JsonObject {
  if (!isObject(schema)) {
    return schema;
  }

  const ownProperties = isObject(schema.properties) ? schema.properties : {};
  let hasChanges = false;
  let resolved: RJSFSchema = { ...(schema as RJSFSchema) };

  if (isObject(schema.dependencies)) {
    const crossStepDeps: [string, JsonValue | undefined][] = [];
    const sameStepDeps: Record<string, JsonValue | undefined> = {};

    for (const [depKey, depValue] of Object.entries(schema.dependencies)) {
      if (earlierStepKeys.has(depKey) && !(depKey in ownProperties)) {
        crossStepDeps.push([depKey, depValue]);
      } else {
        sameStepDeps[depKey] = depValue;
      }
    }

    if (crossStepDeps.length > 0) {
      hasChanges = true;
      if (Object.keys(sameStepDeps).length > 0) {
        resolved.dependencies = sameStepDeps as RJSFSchema['dependencies'];
      } else {
        delete resolved.dependencies;
      }

      for (const [depKey, depValue] of crossStepDeps) {
        if (formData[depKey] === undefined) {
          continue;
        }

        if (Array.isArray(depValue)) {
          const requiredKeys = depValue.filter(
            (item): item is string => typeof item === 'string',
          );
          if (requiredKeys.length > 0) {
            resolved.required = Array.from(
              new Set([...(resolved.required ?? []), ...requiredKeys]),
            );
          }
        } else if (isObject(depValue)) {
          const tempSchema: RJSFSchema = {
            type: 'object',
            properties: { [depKey]: {} },
            dependencies: { [depKey]: depValue as RJSFSchema },
          };
          const depResolved: RJSFSchema = {
            ...retrieveSchema(
              validator,
              tempSchema,
              schema as RJSFSchema,
              formData,
            ),
          };

          if (isObject(depResolved.properties as JsonValue)) {
            const filteredProperties = { ...depResolved.properties };
            for (const propKey of Object.keys(filteredProperties)) {
              if (
                propKey === depKey ||
                (earlierStepKeys.has(propKey) && !(propKey in ownProperties))
              ) {
                delete filteredProperties[propKey];
              }
            }
            if (Object.keys(filteredProperties).length > 0) {
              depResolved.properties = filteredProperties;
            } else {
              delete depResolved.properties;
            }
          }

          if (Array.isArray(depResolved.required)) {
            const filteredRequired = depResolved.required.filter(
              reqKey =>
                reqKey !== depKey &&
                !(earlierStepKeys.has(reqKey) && !(reqKey in ownProperties)),
            );
            if (filteredRequired.length > 0) {
              depResolved.required = filteredRequired;
            } else {
              delete depResolved.required;
            }
          }

          resolved = mergeSchemas(resolved, depResolved);
        }
      }
    }
  }

  if (Array.isArray(resolved.allOf)) {
    let allOfChanged = false;
    const nextAllOf = resolved.allOf.map(subSchema => {
      if (!isObject(subSchema as JsonValue)) {
        return subSchema;
      }
      const nextSubSchema = resolveCrossStepSchema(
        subSchema as JsonObject,
        formData,
        earlierStepKeys,
        validator,
      );
      if (nextSubSchema !== subSchema) {
        allOfChanged = true;
      }
      return nextSubSchema as RJSFSchema;
    });
    if (allOfChanged) {
      hasChanges = true;
      resolved.allOf = nextAllOf;
    }
  }

  return hasChanges ? (resolved as JsonObject) : schema;
}

/**
 * Removes values from `formData` for conditional schema properties that are
 * no longer active in any step given the current answers.
 *
 * Properties that do not appear in any step schema (e.g. custom initial state)
 * are preserved.
 */
export function pruneInactiveFormData(
  steps: ParsedTemplateSchema[],
  formData: Record<string, JsonValue>,
  validator: ValidatorType,
): Record<string, JsonValue> {
  const allSchemaKeys = new Set<string>();
  for (const step of steps) {
    collectSchemaPropertyKeys(step.schema, allSchemaKeys);
  }

  const pruned: Record<string, JsonValue> = { ...formData };

  for (let pass = 0; pass <= steps.length; pass++) {
    const activeKeys = new Set<string>();
    const earlierStepKeys = new Set<string>();

    for (const step of steps) {
      const withCrossStep = resolveCrossStepSchema(
        step.schema,
        pruned,
        earlierStepKeys,
        validator,
      );
      const fullyResolved = retrieveSchema(
        validator,
        withCrossStep as RJSFSchema,
        withCrossStep as RJSFSchema,
        pruned,
      );

      if (isObject(fullyResolved.properties as JsonValue)) {
        for (const key of Object.keys(fullyResolved.properties!)) {
          activeKeys.add(key);
        }
      }

      collectSchemaPropertyKeys(step.schema, earlierStepKeys);
    }

    let changed = false;
    for (const key of Object.keys(pruned)) {
      if (allSchemaKeys.has(key) && !activeKeys.has(key)) {
        delete pruned[key];
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return pruned;
}
