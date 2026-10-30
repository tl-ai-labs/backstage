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

import {
  ANNOTATION_FORMER_ENTITY_REFS,
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { FilterPredicate } from '@backstage/filter-predicates';
import { CatalogApi, CatalogRequestOptions } from './types/api';

const FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX = `metadata.annotations.${ANNOTATION_FORMER_ENTITY_REFS}.`;

/**
 * Result of attempting to resolve a former entity ref.
 *
 * @public
 */
export type FormerEntityRefResolution =
  | { status: 'resolved'; entity: Entity; formerEntityRef: string }
  | { status: 'unknown' };

/**
 * Resolves a possibly-former entity ref to the live entity that currently claims it.
 *
 * @remarks
 * This function never throws.
 *
 * It must be called only after a direct lookup for the requested ref has already
 * missed; this guarantees that a live entity holding the name always wins
 * unconditionally without requiring a redundant check here.
 *
 * The `'unknown'` status deliberately conflates:
 * - A ref that no entity claims
 * - A ref whose claimant the caller is not authorized to read
 * - A ref that is contested (claimed by two or more entities)
 * - An invalid entity ref syntax
 * - Any unexpected backend or network error
 *
 * Former refs whose kind parses to `'user'` are refused outright for privacy
 * without issuing any backend query.
 *
 * @param catalogApi - The {@link CatalogApi} client to query with.
 * @param formerEntityRef - The entity ref string to resolve.
 * @param options - Request options forwarded to {@link CatalogApi.queryEntities}.
 * @public
 */
export async function resolveFormerEntityRef(
  catalogApi: CatalogApi,
  formerEntityRef: string,
  options?: CatalogRequestOptions,
): Promise<FormerEntityRefResolution> {
  let canonicalRef: string;
  try {
    const parsed = parseEntityRef(formerEntityRef);
    if (parsed.kind.toLowerCase() === 'user') {
      return { status: 'unknown' };
    }
    canonicalRef = stringifyEntityRef(parsed);
  } catch {
    return { status: 'unknown' };
  }

  const key = `${FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}${canonicalRef}`;

  try {
    const response = await catalogApi.queryEntities(
      {
        query: {
          $all: [
            { [key]: true } as FilterPredicate,
            { $not: { kind: 'user' } },
          ],
        },
        limit: 2,
      },
      options,
    );

    if (response.items.length === 1) {
      return {
        status: 'resolved',
        entity: response.items[0],
        formerEntityRef: canonicalRef,
      };
    }
  } catch {
    return { status: 'unknown' };
  }

  return { status: 'unknown' };
}
