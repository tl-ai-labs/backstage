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
import { FormContextType, RJSFSchema, retrieveSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const validator = customizeValidator();

function collectGoverningKeys(stepSchema: unknown): Set<string> {
  const keys = new Set<string>();

  function walk(node: unknown) {
    if (!isObject(node)) {
      return;
    }

    if (isObject(node.dependencies)) {
      for (const depKey of Object.keys(node.dependencies)) {
        keys.add(depKey);
        walk(node.dependencies[depKey]);
      }
    }

    if (isObject(node.if)) {
      if (isObject(node.if.properties)) {
        for (const prop of Object.keys(node.if.properties)) {
          keys.add(prop);
        }
      }
      if (Array.isArray(node.if.required)) {
        for (const req of node.if.required) {
          if (typeof req === 'string') {
            keys.add(req);
          }
        }
      }
      walk(node.if);
    }

    if (isObject(node.then)) {
      walk(node.then);
    }

    if (isObject(node.else)) {
      walk(node.else);
    }

    if (Array.isArray(node.allOf)) {
      for (const child of node.allOf) {
        walk(child);
      }
    }

    if (Array.isArray(node.anyOf)) {
      for (const child of node.anyOf) {
        walk(child);
      }
    }

    if (Array.isArray(node.oneOf)) {
      for (const child of node.oneOf) {
        walk(child);
      }
    }
  }

  walk(stepSchema);
  return keys;
}

function collectSubschemaPropertyNames(node: unknown): Set<string> {
  const names = new Set<string>();

  function walk(n: unknown) {
    if (!isObject(n)) {
      return;
    }

    if (isObject(n.properties)) {
      for (const key of Object.keys(n.properties)) {
        names.add(key);
      }
    }

    if (isObject(n.dependencies)) {
      for (const depKey of Object.keys(n.dependencies)) {
        walk(n.dependencies[depKey]);
      }
    }

    if (isObject(n.then)) {
      walk(n.then);
    }

    if (isObject(n.else)) {
      walk(n.else);
    }

    if (Array.isArray(n.allOf)) {
      for (const child of n.allOf) {
        walk(child);
      }
    }

    if (Array.isArray(n.anyOf)) {
      for (const child of n.anyOf) {
        walk(child);
      }
    }

    if (Array.isArray(n.oneOf)) {
      for (const child of n.oneOf) {
        walk(child);
      }
    }
  }

  walk(node);
  return names;
}

/**
 * Options for resolving a step schema.
 * @alpha
 */
export type ResolveStepSchemaOptions = {
  isPropertyEnabled?: (propertyName: string) => boolean;
};

/**
 * Extracts condition-governing data from form state for a step schema.
 * @alpha
 */
export function pickConditionData(
  stepSchema: JsonObject,
  formState: Partial<{ [key: string]: JsonValue }>,
): Partial<{ [key: string]: JsonValue }> {
  const result: Partial<{ [key: string]: JsonValue }> = {};
  if (!isObject(stepSchema) || !isObject(formState)) {
    return result;
  }

  const governingKeys = collectGoverningKeys(stepSchema);
  for (const key of governingKeys) {
    if (Object.prototype.hasOwnProperty.call(formState, key)) {
      result[key] = formState[key];
    }
  }

  return result;
}

/**
 * Resolves a wizard step's JSON Schema against accumulated form state,
 * resolving cross-step conditions without mutating the input schema.
 * @alpha
 */
export function resolveStepSchema(
  stepSchema: JsonObject,
  formState: JsonObject,
  options?: ResolveStepSchemaOptions,
): JsonObject {
  if (!isObject(stepSchema)) {
    return stepSchema;
  }

  const hasDependencies = isObject(stepSchema.dependencies);
  const hasIf = isObject(stepSchema.if);

  if (!hasDependencies && !hasIf) {
    return stepSchema;
  }

  if (
    !Object.prototype.hasOwnProperty.call(stepSchema, 'properties') ||
    !isObject(stepSchema.properties)
  ) {
    return stepSchema;
  }

  const ownProperties = stepSchema.properties;
  const governingKeys = collectGoverningKeys(stepSchema);
  let hasCrossStepGoverningKey = false;
  for (const key of governingKeys) {
    if (!Object.prototype.hasOwnProperty.call(ownProperties, key)) {
      hasCrossStepGoverningKey = true;
      break;
    }
  }

  if (!hasCrossStepGoverningKey) {
    return stepSchema;
  }

  const collectedAddedProperties: Record<string, JsonObject> = {};
  const collectedAddedRequired = new Set<string>();
  const consumedDependencyKeys = new Set<string>();
  let ifProbeRan = false;

  if (hasDependencies) {
    const deps = stepSchema.dependencies as Record<string, unknown>;
    for (const key of Object.keys(deps)) {
      if (!Object.prototype.hasOwnProperty.call(ownProperties, key)) {
        consumedDependencyKeys.add(key);
        const probe: RJSFSchema = {
          type: 'object',
          properties: { [key]: {} },
          dependencies: { [key]: deps[key] as RJSFSchema },
        };
        try {
          // retrieveSchema expects RJSFSchema and FormContextType/data record
          const resolved = retrieveSchema(
            validator,
            probe,
            probe,
            formState as FormContextType,
          );
          if (isObject(resolved.properties)) {
            for (const [propName, propVal] of Object.entries(
              resolved.properties,
            )) {
              if (propName !== key && isObject(propVal)) {
                if (
                  !Object.prototype.hasOwnProperty.call(
                    collectedAddedProperties,
                    propName,
                  )
                ) {
                  collectedAddedProperties[propName] = propVal;
                }
              }
            }
          }
          if (Array.isArray(resolved.required)) {
            for (const req of resolved.required) {
              if (typeof req === 'string' && req !== key) {
                collectedAddedRequired.add(req);
              }
            }
          }
        } catch {
          // No error or throw on failure
        }
      }
    }
  }

  if (hasIf && isObject(stepSchema.if)) {
    const ifSchema = stepSchema.if;
    const ifKeys = new Set<string>();
    if (isObject(ifSchema.properties)) {
      for (const key of Object.keys(ifSchema.properties)) {
        ifKeys.add(key);
      }
    }
    if (Array.isArray(ifSchema.required)) {
      for (const req of ifSchema.required) {
        if (typeof req === 'string') {
          ifKeys.add(req);
        }
      }
    }

    const absentIfKeys = Array.from(ifKeys).filter(
      k => !Object.prototype.hasOwnProperty.call(ownProperties, k),
    );

    if (absentIfKeys.length > 0) {
      ifProbeRan = true;
      const stubs: Record<string, JsonObject> = {};
      for (const k of absentIfKeys) {
        stubs[k] = {};
      }

      const probe: RJSFSchema = {
        type: 'object',
        properties: stubs,
        if: stepSchema.if as RJSFSchema,
      };
      if (stepSchema.then !== undefined) {
        probe.then = stepSchema.then as RJSFSchema;
      }
      if (stepSchema.else !== undefined) {
        probe.else = stepSchema.else as RJSFSchema;
      }

      try {
        // retrieveSchema expects RJSFSchema and FormContextType/data record
        const resolved = retrieveSchema(
          validator,
          probe,
          probe,
          formState as FormContextType,
        );
        if (isObject(resolved.properties)) {
          for (const [propName, propVal] of Object.entries(
            resolved.properties,
          )) {
            if (!absentIfKeys.includes(propName) && isObject(propVal)) {
              if (
                !Object.prototype.hasOwnProperty.call(
                  collectedAddedProperties,
                  propName,
                )
              ) {
                collectedAddedProperties[propName] = propVal;
              }
            }
          }
        }
        if (Array.isArray(resolved.required)) {
          for (const req of resolved.required) {
            if (typeof req === 'string' && !absentIfKeys.includes(req)) {
              collectedAddedRequired.add(req);
            }
          }
        }
      } catch {
        // No error or throw on failure
      }
    }
  }

  const nextProperties = { ...ownProperties };
  for (const [key, value] of Object.entries(collectedAddedProperties)) {
    if (options?.isPropertyEnabled && !options.isPropertyEnabled(key)) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(nextProperties, key)) {
      nextProperties[key] = value;
    }
  }

  const baseRequired = Array.isArray(stepSchema.required)
    ? (stepSchema.required as string[]).filter(k => typeof k === 'string')
    : [];
  const mergedRequiredList: string[] = [];
  const seenRequired = new Set<string>();

  for (const req of baseRequired) {
    if (!seenRequired.has(req)) {
      seenRequired.add(req);
      mergedRequiredList.push(req);
    }
  }
  for (const req of collectedAddedRequired) {
    if (options?.isPropertyEnabled && !options.isPropertyEnabled(req)) {
      continue;
    }
    if (!seenRequired.has(req)) {
      seenRequired.add(req);
      mergedRequiredList.push(req);
    }
  }

  const result: JsonObject = {
    ...stepSchema,
    properties: nextProperties,
  };

  if (mergedRequiredList.length > 0) {
    result.required = mergedRequiredList;
  } else {
    delete result.required;
  }

  if (consumedDependencyKeys.size > 0 && hasDependencies) {
    const nextDeps: Record<string, unknown> = {};
    const originalDeps = stepSchema.dependencies as Record<string, unknown>;
    for (const [k, v] of Object.entries(originalDeps)) {
      if (!consumedDependencyKeys.has(k)) {
        nextDeps[k] = v;
      }
    }
    if (Object.keys(nextDeps).length > 0) {
      result.dependencies = nextDeps as JsonObject;
    } else {
      delete result.dependencies;
    }
  }

  if (ifProbeRan) {
    delete result.if;
    delete result.then;
    delete result.else;
  }

  return result;
}

/**
 * Prunes values from form state that are declared exclusively in conditional subschemas
 * and are currently unreachable under the active conditions across all steps.
 * @alpha
 */
export function pruneUnreachableFormState(
  stepSchemas: JsonObject[],
  formState: Record<string, JsonValue>,
): Record<string, JsonValue> {
  if (!Array.isArray(stepSchemas) || !isObject(formState)) {
    return formState;
  }

  const conditionalPropertyNames = new Set<string>();
  const topLevelProperties = new Set<string>();
  const governingKeysAllSteps = new Set<string>();
  const reachableProperties = new Set<string>();

  for (const step of stepSchemas) {
    if (!isObject(step)) {
      continue;
    }
    const hasOwnProperties =
      Object.prototype.hasOwnProperty.call(step, 'properties') &&
      isObject(step.properties);
    const ownProps = hasOwnProperties ? (step.properties as JsonObject) : {};

    if (hasOwnProperties) {
      for (const key of Object.keys(ownProps)) {
        topLevelProperties.add(key);
      }
    }

    for (const govKey of collectGoverningKeys(step)) {
      governingKeysAllSteps.add(govKey);
    }

    if (isObject(step.dependencies)) {
      const deps = step.dependencies as Record<string, unknown>;
      for (const [depKey, depSchema] of Object.entries(deps)) {
        const subNames = collectSubschemaPropertyNames(depSchema);
        if (
          hasOwnProperties &&
          !Object.prototype.hasOwnProperty.call(ownProps, depKey)
        ) {
          for (const name of subNames) {
            conditionalPropertyNames.add(name);
          }
        } else {
          for (const name of subNames) {
            reachableProperties.add(name);
          }
        }
      }
    }

    if (isObject(step.if)) {
      const ifKeys = new Set<string>();
      if (isObject(step.if.properties)) {
        for (const k of Object.keys(step.if.properties)) {
          ifKeys.add(k);
        }
      }
      if (Array.isArray(step.if.required)) {
        for (const req of step.if.required) {
          if (typeof req === 'string') {
            ifKeys.add(req);
          }
        }
      }

      let isCrossStepIf = false;
      if (hasOwnProperties) {
        for (const k of ifKeys) {
          if (!Object.prototype.hasOwnProperty.call(ownProps, k)) {
            isCrossStepIf = true;
            break;
          }
        }
      }

      const ifBranchNames = new Set<string>();
      if (isObject(step.then)) {
        for (const name of collectSubschemaPropertyNames(step.then)) {
          ifBranchNames.add(name);
        }
      }
      if (isObject(step.else)) {
        for (const name of collectSubschemaPropertyNames(step.else)) {
          ifBranchNames.add(name);
        }
      }

      if (isCrossStepIf) {
        for (const name of ifBranchNames) {
          conditionalPropertyNames.add(name);
        }
      } else {
        for (const name of ifBranchNames) {
          reachableProperties.add(name);
        }
      }
    }
  }

  // Governing keys are condition tests, not conditional declarations; exclude them from drop candidates.
  for (const govKey of governingKeysAllSteps) {
    conditionalPropertyNames.delete(govKey);
  }

  if (conditionalPropertyNames.size === 0) {
    return formState;
  }

  for (const step of stepSchemas) {
    if (!isObject(step)) {
      continue;
    }
    const resolved = resolveStepSchema(step, formState as JsonObject);
    if (isObject(resolved) && isObject(resolved.properties)) {
      for (const key of Object.keys(resolved.properties)) {
        reachableProperties.add(key);
      }
    }
  }

  const keysToDrop = new Set<string>();
  for (const key of Object.keys(formState)) {
    if (
      conditionalPropertyNames.has(key) &&
      !topLevelProperties.has(key) &&
      !reachableProperties.has(key)
    ) {
      keysToDrop.add(key);
    }
  }

  if (keysToDrop.size === 0) {
    return formState;
  }

  const pruned: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(formState)) {
    if (!keysToDrop.has(key)) {
      pruned[key] = value;
    }
  }

  return pruned;
}
