/*
 * Copyright 2024 The Backstage Authors
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
import { startCase } from 'lodash';
import { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import { Draft07 as JSONSchema, isJsonError } from 'json-schema-library';

export function isJsonObject(value?: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Helper function to format a key into a human-readable string
export function formatKey(key: string): string {
  const parts = key.split('/');
  return parts
    .filter(Boolean)
    .map(part => startCase(part))
    .join(' > ');
}

export function findSchemaForKey(
  key: string,
  schemas: ParsedTemplateSchema[],
  formState: Partial<{ [key: string]: JsonValue }>,
): ParsedTemplateSchema | null {
  for (const step of schemas) {
    /*
      The whole form state is passed to getSchema so that dependencies and
      if/then/else resolve the same way they do in the form. Extra properties
      are forbidden so the library does not invent a schema for a key that the
      step does not declare.
    */
    const schema = step.mergedSchema;
    const lookupSchema = isJsonObject(schema.additionalProperties)
      ? schema
      : { ...schema, additionalProperties: false };

    const draft = new JSONSchema(lookupSchema);
    const res = draft.getSchema({
      pointer: `#/${key}`,
      data: formState,
    });

    if (!!res && !isJsonError(res) && !(res instanceof Error)) {
      return step;
    }
  }

  return null; // Return null if the key isn't found in any schema
}

function conditionalSubschemas(node: JsonObject): JsonObject[] {
  const result: JsonObject[] = [];
  if (isJsonObject(node.dependencies)) {
    for (const value of Object.values(node.dependencies)) {
      if (isJsonObject(value)) {
        result.push(value);
      }
    }
  }
  for (const name of ['then', 'else']) {
    const value = node[name];
    if (isJsonObject(value)) {
      result.push(value);
    }
  }
  for (const name of ['allOf', 'anyOf', 'oneOf']) {
    const value = node[name];
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isJsonObject(entry)) {
          result.push(entry);
        }
      }
    }
  }
  return result;
}

function declaresInConditional(key: string, node: JsonObject): boolean {
  return conditionalSubschemas(node).some(sub => {
    if (
      isJsonObject(sub.properties) &&
      Object.prototype.hasOwnProperty.call(sub.properties, key)
    ) {
      return true;
    }
    return declaresInConditional(key, sub);
  });
}

export function isDeclaredInConditionalBranch(
  key: string,
  schemas: ParsedTemplateSchema[],
): boolean {
  return schemas.some(step => declaresInConditional(key, step.mergedSchema));
}
