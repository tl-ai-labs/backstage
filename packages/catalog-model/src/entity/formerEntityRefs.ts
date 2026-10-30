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

import { FORMER_ENTITY_REFS_MAX_COUNT } from './constants';
import { parseEntityRef, stringifyEntityRef } from './ref';

/**
 * Parses a comma-separated list of former entity references from an annotation value.
 *
 * @remarks
 *
 * This function never throws. Individual malformed entries are dropped without
 * failing the entire declaration. If the number of distinct valid references
 * exceeds the maximum allowed count, an empty list is returned so that an
 * over-budget declaration fails visibly.
 *
 * @public
 * @param value - The raw annotation string to parse
 * @returns A list of normalized, de-duplicated entity reference strings
 */
export function parseFormerEntityRefs(value: string | undefined): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return [];
  }

  const entries = trimmedValue.split(',');
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawEntry of entries) {
    const entry = rawEntry.trim();
    if (!entry) {
      continue;
    }

    try {
      const parsed = parseEntityRef(entry);
      const canonical = stringifyEntityRef(parsed);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        result.push(canonical);
      }
    } catch {
      // Per-entry fail-closed: skip invalid entity refs
    }
  }

  if (result.length > FORMER_ENTITY_REFS_MAX_COUNT) {
    return [];
  }

  return result;
}
