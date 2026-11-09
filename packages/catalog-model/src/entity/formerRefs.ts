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

import { DEFAULT_NAMESPACE } from './constants';
import { Entity } from './Entity';
import { parseEntityRef, stringifyEntityRef } from './ref';

/**
 * Annotation listing entity refs the entity was previously known by.
 *
 * @remarks
 *
 * The value is a comma-separated list of entity refs. Short refs (name) and
 * namespace/name refs default to the entity's own kind and namespace.
 *
 * @public
 */
export const ANNOTATION_FORMER_REFS = 'backstage.io/former-refs';

/**
 * Extracts and normalizes former entity refs from an entity's annotations.
 *
 * @remarks
 *
 * Reads the {@link ANNOTATION_FORMER_REFS} annotation value, splits on commas,
 * trims whitespace, parses each item defaulting missing kind or namespace to
 * the entity's own kind and namespace, skips items that fail parsing or have
 * a different kind than the entity, and returns normalized lowercase stringified
 * entity refs in first-seen order without duplicates or self-references.
 *
 * @public
 * @param entity - An entity
 * @returns An array of normalized former entity ref strings
 */
export function getEntityFormerRefs(entity: Entity): string[] {
  const annotationValue = entity.metadata.annotations?.[ANNOTATION_FORMER_REFS];
  if (typeof annotationValue !== 'string') {
    return [];
  }

  const ownNamespace = entity.metadata.namespace || DEFAULT_NAMESPACE;
  const ownRef = stringifyEntityRef({
    kind: entity.kind,
    namespace: ownNamespace,
    name: entity.metadata.name,
  });

  const result: string[] = [];
  const seen = new Set<string>();

  const items = annotationValue.split(',');
  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) {
      continue;
    }

    let parsed;
    try {
      parsed = parseEntityRef(item, {
        defaultKind: entity.kind,
        defaultNamespace: ownNamespace,
      });
    } catch {
      continue;
    }

    if (parsed.kind.toLowerCase() !== entity.kind.toLowerCase()) {
      continue;
    }

    const stringified = stringifyEntityRef(parsed);
    if (stringified === ownRef || seen.has(stringified)) {
      continue;
    }

    seen.add(stringified);
    result.push(stringified);
  }

  return result;
}
