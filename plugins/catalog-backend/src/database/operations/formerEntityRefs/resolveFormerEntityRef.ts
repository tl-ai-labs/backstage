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

import { Knex } from 'knex';
import { DbFormerEntityRefsRow, DbRefreshStateRow } from '../../tables';

/**
 * Resolves a former entity ref to the ref of the entity whose claim on it is
 * in effect. This is a single hop; the result is never followed further.
 *
 * @returns The claimant entity ref, if a claim is in effect.
 */
export async function resolveFormerEntityRef(options: {
  knex: Knex;
  formerEntityRef: string;
}): Promise<string | undefined> {
  const { knex, formerEntityRef } = options;

  const holder = await knex<DbRefreshStateRow>('refresh_state')
    .select('entity_ref')
    .where('entity_ref', formerEntityRef)
    .first();

  // An entity that holds the ref always wins over any claim on it
  if (holder) {
    return undefined;
  }

  const claim = await knex<DbFormerEntityRefsRow>('former_entity_refs')
    .select('claimant_entity_ref')
    .where('former_entity_ref', formerEntityRef)
    .whereNull('rejected_at')
    .orderBy([
      { column: 'claimed_at', order: 'asc' },
      { column: 'claimant_entity_ref', order: 'asc' },
    ])
    .first();

  return claim?.claimant_entity_ref;
}
