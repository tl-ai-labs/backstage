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

import { Entity } from './Entity';
import { ANNOTATION_FORMER_NAMES, DEFAULT_NAMESPACE } from './constants';
import { parseEntityRef, stringifyEntityRef } from './ref';
import type { Validators } from '../validation';

function getFormerNameItems(entity: Entity): string[] {
  const annotation = entity.metadata.annotations?.[ANNOTATION_FORMER_NAMES];
  if (typeof annotation !== 'string') {
    return [];
  }

  return annotation
    .split(',')
    .map(item => item.trim())
    .filter(item => Boolean(item));
}

/**
 * Returns the former entity refs that an entity declares in the
 * backstage.io/former-names annotation, as lowercase full refs
 * (kind:namespace/name). Short forms take the kind and namespace of the entity.
 * Items that cannot be parsed, that have a different kind, or that equal the
 * entity's own ref are left out; duplicates are removed.
 *
 * @public
 * @param entity - The entity to extract former entity refs from
 * @returns The list of unique former entity refs in first-seen order
 */
export function parseFormerEntityRefs(entity: Entity): string[] {
  const items = getFormerNameItems(entity);
  if (items.length === 0) {
    return [];
  }

  const currentRef = stringifyEntityRef(entity);
  const defaultKind = entity.kind;
  const defaultNamespace = entity.metadata.namespace ?? DEFAULT_NAMESPACE;
  const entityKindLower = entity.kind.toLocaleLowerCase('en-US');

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    let parsed;
    try {
      parsed = parseEntityRef(item, {
        defaultKind,
        defaultNamespace,
      });
    } catch {
      continue;
    }

    if (parsed.kind.toLocaleLowerCase('en-US') !== entityKindLower) {
      continue;
    }

    const ref = stringifyEntityRef(parsed);
    if (ref === currentRef || seen.has(ref)) {
      continue;
    }

    seen.add(ref);
    result.push(ref);
  }

  return result;
}

/**
 * Validates that all entries in the backstage.io/former-names annotation are
 * valid entity refs of the same kind, follow naming rules, and do not reference
 * the entity itself.
 */
export function validateFormerEntityRefs(
  entity: Entity,
  validators: Validators,
): void {
  const items = getFormerNameItems(entity);
  if (items.length === 0) {
    return;
  }

  const currentRef = stringifyEntityRef(entity);
  const defaultKind = entity.kind;
  const defaultNamespace = entity.metadata.namespace ?? DEFAULT_NAMESPACE;
  const entityKindLower = entity.kind.toLocaleLowerCase('en-US');

  for (const item of items) {
    let parsed;
    try {
      parsed = parseEntityRef(item, {
        defaultKind,
        defaultNamespace,
      });
    } catch {
      throw new Error(
        `"annotations.backstage.io/former-names" item "${item}" is not valid; it is not a valid entity ref`,
      );
    }

    if (parsed.kind.toLocaleLowerCase('en-US') !== entityKindLower) {
      throw new Error(
        `"annotations.backstage.io/former-names" item "${item}" is not valid; it must have the same kind as the entity, "${entity.kind}"`,
      );
    }

    if (
      !validators.isValidKind(parsed.kind) ||
      !validators.isValidNamespace(parsed.namespace) ||
      !validators.isValidEntityName(parsed.name)
    ) {
      throw new Error(
        `"annotations.backstage.io/former-names" item "${item}" is not valid; it does not follow the entity naming rules`,
      );
    }

    if (stringifyEntityRef(parsed) === currentRef) {
      throw new Error(
        `"annotations.backstage.io/former-names" item "${item}" is not valid; it is the current ref of the entity`,
      );
    }
  }
}
