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
import {
  retrieveSchema,
  type FieldValidation,
  type RJSFSchema,
  type UiSchema,
  type ValidatorType,
} from '@rjsf/utils';
import type { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import { FormValidation } from './createAsyncValidators';

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

function findPropertySchema(
  schema: JsonObject,
  key: string,
): JsonObject | undefined {
  if (isObject(schema.properties) && isObject(schema.properties[key])) {
    return schema.properties[key] as JsonObject;
  }

  for (const branchKey of ['then', 'else'] as const) {
    const branch = schema[branchKey];
    if (isObject(branch)) {
      const found = findPropertySchema(branch, key);
      if (found) {
        return found;
      }
    }
  }

  for (const combinatorKey of ['allOf', 'oneOf', 'anyOf'] as const) {
    const branches = schema[combinatorKey];
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        if (isObject(branch)) {
          const found = findPropertySchema(branch, key);
          if (found) {
            return found;
          }
        }
      }
    }
  }

  if (isObject(schema.dependencies)) {
    for (const depSchema of Object.values(schema.dependencies)) {
      if (isObject(depSchema)) {
        const found = findPropertySchema(depSchema, key);
        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolves JSON Schema `dependencies` that reference fields defined in earlier
 * steps so that RJSF evaluates them on the current step without rendering
 * duplicate inputs.
 */
export function resolveCrossStepDependencies(
  steps: ParsedTemplateSchema[],
): ParsedTemplateSchema[] {
  return steps.map((step, index) => {
    if (index === 0 || !isObject(step.schema?.dependencies)) {
      return step;
    }

    const earlierSteps = steps.slice(0, index);
    const stepProps = isObject(step.schema.properties)
      ? (step.schema.properties as JsonObject)
      : undefined;

    const updatedProperties = stepProps ? { ...stepProps } : undefined;
    let updatedUiSchema: UiSchema = { ...step.uiSchema };
    let changed = false;

    for (const depKey of Object.keys(step.schema.dependencies)) {
      if (stepProps && depKey in stepProps) {
        continue;
      }

      let depSchema: JsonObject | undefined;
      for (const earlierStep of earlierSteps) {
        depSchema = findPropertySchema(earlierStep.schema, depKey);
        if (depSchema) {
          break;
        }
      }

      if (!depSchema) {
        continue;
      }

      changed = true;
      if (updatedProperties) {
        updatedProperties[depKey] = depSchema;
      }

      updatedUiSchema = {
        ...updatedUiSchema,
        [depKey]: {
          ...(isObject(updatedUiSchema[depKey])
            ? (updatedUiSchema[depKey] as JsonObject)
            : {}),
          'ui:widget': 'hidden',
        },
      };

      const uiOrder = updatedUiSchema['ui:order'];
      if (
        Array.isArray(uiOrder) &&
        !uiOrder.includes('*') &&
        !uiOrder.includes(depKey)
      ) {
        updatedUiSchema['ui:order'] = [...uiOrder, depKey];
      }
    }

    if (!changed) {
      return step;
    }

    return {
      ...step,
      schema: {
        ...step.schema,
        ...(updatedProperties ? { properties: updatedProperties } : {}),
      },
      uiSchema: updatedUiSchema,
    };
  });
}

function collectAllowedProperties(
  schema: JsonObject,
  target: Record<string, JsonObject>,
) {
  if (!isObject(schema.properties)) {
    return;
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!isObject(propSchema)) {
      continue;
    }
    const existing = target[key];
    if (
      existing &&
      isObject(existing.properties) &&
      isObject(propSchema.properties)
    ) {
      const mergedProps: Record<string, JsonObject> = {
        ...(existing.properties as Record<string, JsonObject>),
      };
      collectAllowedProperties(propSchema, mergedProps);
      target[key] = { ...existing, ...propSchema, properties: mergedProps };
    } else if (!existing || isObject(propSchema.properties)) {
      target[key] = propSchema;
    }
  }
}

function pruneObjectBySchema(
  data: JsonObject,
  allowedProps: Record<string, JsonObject>,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!(key in allowedProps)) {
      continue;
    }
    const propSchema = allowedProps[key];
    if (isObject(value) && isObject(propSchema.properties)) {
      result[key] = pruneObjectBySchema(
        value,
        propSchema.properties as Record<string, JsonObject>,
      );
    } else if (value !== undefined) {
      result[key] = value;
    } else {
      result[key] = value as unknown as JsonValue;
    }
  }
  return result;
}

/**
 * Removes form data keys that are not present in any step's active schema
 * (for example, conditional fields whose condition is no longer satisfied).
 */
export function pruneExtraData(
  steps: ParsedTemplateSchema[],
  validator: ValidatorType,
  formData: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const allowedProps: Record<string, JsonObject> = {};
  for (const step of steps) {
    const retrieved = retrieveSchema(
      validator,
      step.schema as RJSFSchema,
      step.schema as RJSFSchema,
      formData,
    );
    if (isObject(retrieved as JsonValue)) {
      collectAllowedProperties(retrieved as JsonObject, allowedProps);
    }
  }
  return pruneObjectBySchema(formData, allowedProps);
}
