/*
 * Copyright 2023 The Backstage Authors
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
import type { FieldValidation } from '@rjsf/utils';
import type { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import {
  collectAllSchemaPropertyKeys,
  resolveConditionalSchema,
  type ResolveSchemaOptions,
} from '../../lib/schema';
import type { FormValidation } from './createAsyncValidators';

function isFieldValidation(error: any): error is FieldValidation {
  return !!error && '__errors' in error;
}

export function hasErrors(errors?: FormValidation): boolean {
  if (!errors) {
    return false;
  }

  for (const error of Object.values(errors)) {
    if (isFieldValidation(error)) {
      if ((error.__errors ?? []).length > 0) {
        return true;
      }

      continue;
    }

    if (hasErrors(error)) {
      return true;
    }
  }

  return false;
}

export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export {
  resolveConditionalSchema,
  collectAllSchemaPropertyKeys,
  type ResolveSchemaOptions,
};

function extractBooleanKeysAndDefaults(
  schemaNode: JsonObject | undefined,
  booleanKeys: Set<string>,
  defaults: Record<string, JsonValue>,
) {
  if (!schemaNode || typeof schemaNode !== 'object') {
    return;
  }

  if (isObject(schemaNode.properties)) {
    for (const [key, propDef] of Object.entries(schemaNode.properties)) {
      if (isObject(propDef)) {
        if (propDef.type === 'boolean') {
          booleanKeys.add(key);
        }
        if (propDef.default !== undefined && !(key in defaults)) {
          defaults[key] = propDef.default as JsonValue;
        }
      }
    }
  }

  const recurseBranches = (branches: unknown) => {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        if (isObject(branch)) {
          extractBooleanKeysAndDefaults(branch, booleanKeys, defaults);
        }
      }
    }
  };

  recurseBranches(schemaNode.allOf);
  recurseBranches(schemaNode.oneOf);
  recurseBranches(schemaNode.anyOf);

  if (isObject(schemaNode.then)) {
    extractBooleanKeysAndDefaults(schemaNode.then, booleanKeys, defaults);
  }
  if (isObject(schemaNode.else)) {
    extractBooleanKeysAndDefaults(schemaNode.else, booleanKeys, defaults);
  }
  if (isObject(schemaNode.dependencies)) {
    for (const depVal of Object.values(schemaNode.dependencies)) {
      if (isObject(depVal)) {
        extractBooleanKeysAndDefaults(depVal, booleanKeys, defaults);
      }
    }
  }
}

export function resolveStepSchema(
  stepSchema: JsonObject,
  steps: ParsedTemplateSchema[],
  activeStep: number,
  formData: JsonObject,
): JsonObject {
  const earlierStepKeys = new Set<string>();
  for (const step of steps.slice(0, activeStep)) {
    const keys = collectAllSchemaPropertyKeys(
      step.mergedSchema ?? step.schema ?? {},
    );
    for (const key of keys) {
      earlierStepKeys.add(key);
    }
  }

  const booleanKeys = new Set<string>();
  const defaults: Record<string, JsonValue> = {};
  for (const step of steps.slice(0, activeStep + 1)) {
    extractBooleanKeysAndDefaults(
      step.mergedSchema ?? step.schema ?? {},
      booleanKeys,
      defaults,
    );
  }

  const effectiveFormData: JsonObject = { ...formData };
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (effectiveFormData[key] === undefined) {
      effectiveFormData[key] = defaultVal;
    }
  }

  return resolveConditionalSchema(stepSchema, effectiveFormData, {
    earlierStepKeys,
    booleanKeys,
  });
}

function pruneNestedState(
  value: JsonValue,
  schemaProp: JsonObject | undefined,
): JsonValue {
  if (!isObject(value) || !schemaProp || schemaProp.type !== 'object') {
    return value;
  }

  const resolvedNestedSchema = resolveConditionalSchema(schemaProp, value);
  const activeNestedProps = isObject(resolvedNestedSchema.properties)
    ? resolvedNestedSchema.properties
    : {};
  const allNestedKeys = collectAllSchemaPropertyKeys(schemaProp);

  const pruned: JsonObject = {};
  for (const [k, v] of Object.entries(value)) {
    if (allNestedKeys.has(k) && !(k in activeNestedProps)) {
      continue;
    }
    pruned[k] =
      v !== undefined && isObject(activeNestedProps[k])
        ? pruneNestedState(v, activeNestedProps[k] as JsonObject)
        : v;
  }
  return pruned;
}

export function pruneInactiveStepsState(
  steps: ParsedTemplateSchema[],
  state: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const allDefinedKeys = new Set<string>();
  const activeDefinedKeys = new Set<string>();
  const activePropertiesByKey: Record<string, JsonObject> = {};

  const booleanKeys = new Set<string>();
  const defaults: Record<string, JsonValue> = {};
  for (const step of steps) {
    extractBooleanKeysAndDefaults(
      step.mergedSchema ?? step.schema ?? {},
      booleanKeys,
      defaults,
    );
  }

  const effectiveState: JsonObject = { ...state };
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (effectiveState[key] === undefined) {
      effectiveState[key] = defaultVal;
    }
  }

  const earlierStepKeys = new Set<string>();
  for (const step of steps) {
    const stepSchema = step.mergedSchema ?? step.schema ?? {};
    const stepKeys = collectAllSchemaPropertyKeys(stepSchema);
    for (const key of stepKeys) {
      allDefinedKeys.add(key);
    }

    const resolved = resolveConditionalSchema(stepSchema, effectiveState, {
      earlierStepKeys,
      booleanKeys,
    });

    if (isObject(resolved.properties)) {
      for (const [k, propSchema] of Object.entries(resolved.properties)) {
        activeDefinedKeys.add(k);
        if (isObject(propSchema)) {
          activePropertiesByKey[k] = propSchema;
        }
      }
    }

    for (const key of stepKeys) {
      earlierStepKeys.add(key);
    }
  }

  const prunedState: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(state)) {
    if (allDefinedKeys.has(k) && !activeDefinedKeys.has(k)) {
      continue;
    }
    prunedState[k] = pruneNestedState(v, activePropertiesByKey[k]);
  }

  return prunedState;
}
