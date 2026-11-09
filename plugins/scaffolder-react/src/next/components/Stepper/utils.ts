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
import { FormValidation } from './createAsyncValidators';
import { getConditionalPropertyNames } from '../../lib/schema';

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

// rjsf skips a dependency whose key is not a property of the step, so
// cross-step dependencies are re-expressed as if/then entries in allOf.
export function expandCrossStepDependencies(schema: JsonObject): JsonObject {
  if (!isObject(schema.dependencies) || !isObject(schema.properties)) {
    return schema;
  }

  const produced: JsonObject[] = [];

  for (const k of Object.keys(schema.dependencies)) {
    if (Object.prototype.hasOwnProperty.call(schema.properties, k)) {
      continue;
    }

    const dependenciesWithoutK = Object.fromEntries(
      Object.entries(schema.dependencies).filter(([key]) => key !== k),
    );
    const conditionalNames = getConditionalPropertyNames({
      ...schema,
      dependencies: dependenciesWithoutK,
    });
    if (conditionalNames.includes(k)) {
      continue;
    }

    const v = schema.dependencies[k];
    if (Array.isArray(v)) {
      produced.push({
        if: { required: [k] },
        then: { required: v },
      });
    } else if (isObject(v)) {
      const { oneOf, ...rest } = v;
      if (Object.keys(rest).length > 0) {
        produced.push({
          if: { required: [k] },
          then: rest,
        });
      }
      if (Array.isArray(oneOf)) {
        for (const item of oneOf) {
          if (
            isObject(item) &&
            isObject(item.properties) &&
            isObject(item.properties[k])
          ) {
            const kProp = item.properties[k];
            const isDiscriminator =
              isObject(kProp) &&
              ('const' in kProp || Array.isArray(kProp.enum));
            if (isDiscriminator) {
              const propertiesWithoutK = Object.fromEntries(
                Object.entries(item.properties).filter(([prop]) => prop !== k),
              );
              produced.push({
                if: {
                  properties: { [k]: kProp },
                  required: [k],
                },
                then: {
                  ...item,
                  properties: propertiesWithoutK,
                },
              });
            }
          }
        }
      }
    }
  }

  if (produced.length === 0) {
    return schema;
  }

  return {
    ...schema,
    allOf: [...(Array.isArray(schema.allOf) ? schema.allOf : []), ...produced],
  };
}
