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
import {
  collectAllSchemaPropertyKeys,
  resolveConditionalSchema,
} from '../../lib/schema';

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
  const booleanKeys = new Set<string>();
  for (const step of schemas) {
    const props = step.mergedSchema.properties;
    if (isJsonObject(props)) {
      for (const [k, v] of Object.entries(props)) {
        if (isJsonObject(v) && v.type === 'boolean') {
          booleanKeys.add(k);
        }
      }
    }
  }

  const earlierStepKeys = new Set<string>();
  for (const step of schemas) {
    const resolvedSchema = resolveConditionalSchema(
      step.mergedSchema,
      (formState ?? {}) as JsonObject,
      { earlierStepKeys, booleanKeys },
    );

    const stepKeys = collectAllSchemaPropertyKeys(
      step.mergedSchema,
      earlierStepKeys,
    );
    for (const k of stepKeys) {
      earlierStepKeys.add(k);
    }

    const draft = new JSONSchema(resolvedSchema);
    const res = draft.getSchema({
      pointer: `#/${key}`,
    });

    if (res && res.type !== 'error') {
      return step;
    }
  }

  return null;
}
