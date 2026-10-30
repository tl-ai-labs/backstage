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

import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import { FilterPredicate } from '@backstage/filter-predicates';
import { ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX } from '../../database/operations/stitcher/buildEntitySearch';

/**
 * Builds a filter predicate for resolving a candidate former entity ref to
 * entities that claim it.
 *
 * @remarks
 * Returns undefined if the ref is malformed or if its kind is 'user'. Both
 * the write-side indexer and this read-side query structurally exclude kind
 * User to prevent disclosing legal name changes. The query predicate combines
 * the exact search key check with an explicit `$not: { kind: 'user' }` check so
 * that no non-User entity can launder a User former ref. This function never
 * throws.
 *
 * @param formerRef - Candidate former entity reference string to resolve.
 * @returns A FilterPredicate to query against the catalog, or undefined if no query should be run.
 * @internal
 */
export function buildFormerEntityRefQuery(
  formerRef: string,
): FilterPredicate | undefined {
  try {
    const parsed = parseEntityRef(formerRef);
    if (parsed.kind.toLowerCase() === 'user') {
      return undefined;
    }

    const canonicalRef = stringifyEntityRef(parsed);
    const key = `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}${canonicalRef}`;

    return {
      $all: [{ [key]: true }, { $not: { kind: 'user' } }],
    } as FilterPredicate;
  } catch {
    return undefined;
  }
}
