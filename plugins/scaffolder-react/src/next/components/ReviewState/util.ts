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
import { omit, startCase } from 'lodash';
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
      The key itself is omitted from data so json-schema-library does not invent
      a schema based on its value when it is not declared in the schema.
      All other form answers are provided so conditional constructs (allOf,
      if/then/else, dependencies) from this or earlier steps can be resolved.
    */
    const data = omit(formState, key);
    const draft = new JSONSchema(step.mergedSchema);
    const res = draft.getSchema({
      pointer: `#/${key}`,
      data,
    });

    if (res && !isJsonError(res)) {
      return step;
    }
  }

  return null;
}

function isKeyDeclaredInNode(key: string, node?: JsonValue): boolean {
  if (!isJsonObject(node)) {
    return false;
  }

  if (
    isJsonObject(node.properties) &&
    Object.prototype.hasOwnProperty.call(node.properties, key)
  ) {
    return true;
  }

  const compoundKeys = ['allOf', 'anyOf', 'oneOf'] as const;
  for (const compound of compoundKeys) {
    const list = node[compound];
    if (
      Array.isArray(list) &&
      list.some(entry => isKeyDeclaredInNode(key, entry))
    ) {
      return true;
    }
  }

  if (
    isKeyDeclaredInNode(key, node.then) ||
    isKeyDeclaredInNode(key, node.else)
  ) {
    return true;
  }

  if (isJsonObject(node.dependencies)) {
    for (const dep of Object.values(node.dependencies)) {
      if (isKeyDeclaredInNode(key, dep)) {
        return true;
      }
    }
  }

  return false;
}

export function isKeyDeclaredInSchemas(
  key: string,
  schemas: ParsedTemplateSchema[],
): boolean {
  return schemas.some(step => isKeyDeclaredInNode(key, step.mergedSchema));
}
