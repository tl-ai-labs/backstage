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
import { Draft07 as JSONSchema } from 'json-schema-library';
import { getSchemaPropertyKeys, resolveStepSchema } from '../../lib/schema';

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

export function isKeyDefinedInSchemas(
  key: string,
  schemas: ParsedTemplateSchema[],
): boolean {
  const rootKey = key.split('/').filter(Boolean)[0] ?? key;
  return schemas.some(step =>
    getSchemaPropertyKeys(step.mergedSchema).has(rootKey),
  );
}

export function findSchemaForKey(
  key: string,
  schemas: ParsedTemplateSchema[],
  formState: Partial<{ [key: string]: JsonValue }>,
): ParsedTemplateSchema | null {
  const previousStepKeys = new Set<string>();

  for (const step of schemas) {
    /*
      To determine if a key is defined in a schema we resolve any conditional
      branches (dependencies, if/then/else, allOf, oneOf, anyOf) against formState
      and then call getSchema with an empty data object. Passing an empty data
      object ensures getSchema does not infer a fallback schema from formState
      for keys that are not in the active schema.
    */

    const resolvedSchema = resolveStepSchema(step.mergedSchema, formState, {
      previousStepKeys,
      resolveAll: true,
    });

    for (const k of getSchemaPropertyKeys(step.mergedSchema)) {
      previousStepKeys.add(k);
    }

    const draft = new JSONSchema(resolvedSchema);
    const res = draft.getSchema({
      pointer: `#/${key}`,
      data: {},
    });

    if (
      res &&
      !(isJsonObject(res as JsonValue) && (res as JsonObject).type === 'error')
    ) {
      return step;
    }
  }

  return null; // Return null if the key isn't found in any schema
}
