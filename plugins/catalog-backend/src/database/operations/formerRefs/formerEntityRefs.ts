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

import { ENTITY_STATUS_CATALOG_PROCESSING_TYPE } from '@backstage/catalog-client';
import { Entity, parseEntityFormerRefs } from '@backstage/catalog-model';
import { EntityStatusItem } from '@backstage/catalog-model/alpha';
import { Knex } from 'knex';
import lodash from 'lodash';
import { DbFormerEntityRefsRow } from '../../tables';

const BATCH_SIZE = 50;
const LOOKUP_BATCH_SIZE = 200;

/**
 * Synchronizes the former entity refs claimed by a given entity, applying only
 * the minimal set of changes needed. Rows that already exist are left
 * untouched, new rows are inserted, and stale rows are deleted.
 *
 * When nothing differs, the initial select is the only statement that runs, so
 * an entity without claims and without rows does no write.
 */
export async function syncFormerEntityRefs(
  tx: Knex.Transaction,
  options: { entityId: string; entityRef: string; formerRefs: string[] },
): Promise<void> {
  const { entityId, entityRef } = options;
  const wanted = lodash.uniq(options.formerRefs);

  const existingRows = await tx<DbFormerEntityRefsRow>('former_entity_refs')
    .where({ entity_id: entityId })
    .select('former_entity_ref');
  const existing = new Set(existingRows.map(r => r.former_entity_ref));
  const wantedSet = new Set(wanted);

  const toDelete = [...existing].filter(ref => !wantedSet.has(ref));
  const toInsert = wanted.filter(ref => !existing.has(ref));

  for (const chunk of lodash.chunk(toDelete, BATCH_SIZE)) {
    await tx<DbFormerEntityRefsRow>('former_entity_refs')
      .where({ entity_id: entityId })
      .whereIn('former_entity_ref', chunk)
      .delete();
  }

  for (const chunk of lodash.chunk(toInsert, BATCH_SIZE)) {
    const rows: DbFormerEntityRefsRow[] = chunk.map(formerRef => ({
      entity_id: entityId,
      entity_ref: entityRef,
      former_entity_ref: formerRef,
    }));
    await tx<DbFormerEntityRefsRow>('former_entity_refs')
      .insert(rows)
      .onConflict(['entity_id', 'former_entity_ref'])
      .ignore();
  }
}

/**
 * Returns the subset of the given former refs that are also claimed by at
 * least one other entity, sorted so that a hash over them is stable.
 */
export async function listContestedFormerRefs(
  knex: Knex | Knex.Transaction,
  options: { entityId: string; formerRefs: string[] },
): Promise<string[]> {
  const { entityId, formerRefs } = options;
  if (formerRefs.length === 0) {
    return [];
  }

  const contested = new Set<string>();
  for (const chunk of lodash.chunk(formerRefs, LOOKUP_BATCH_SIZE)) {
    const rows = await knex<DbFormerEntityRefsRow>('former_entity_refs')
      .whereIn('former_entity_ref', chunk)
      .whereNot('entity_id', entityId)
      .distinct('former_entity_ref');
    for (const row of rows) {
      contested.add(row.former_entity_ref);
    }
  }

  return [...contested].sort();
}

function toStatusItem(text: string): EntityStatusItem {
  return {
    type: ENTITY_STATUS_CATALOG_PROCESSING_TYPE,
    level: 'warning',
    message: `InputError: ${text}`,
    error: { name: 'InputError', message: text },
  };
}

/**
 * Builds the warning status items for an entity's former names: one for each
 * entry that was ignored, and one for each claim shared with another entity.
 * No message names another entity.
 */
export async function getFormerRefStatusItems(
  knex: Knex | Knex.Transaction,
  options: { entityId: string; entity: Entity },
): Promise<EntityStatusItem[]> {
  const { formerRefs, problems } = parseEntityFormerRefs(options.entity);
  if (formerRefs.length === 0 && problems.length === 0) {
    return [];
  }

  const contested = await listContestedFormerRefs(knex, {
    entityId: options.entityId,
    formerRefs,
  });

  return [
    ...problems.map(problem =>
      toStatusItem(`Ignored former name '${problem.entry}': ${problem.reason}`),
    ),
    ...contested.map(ref =>
      toStatusItem(
        `Former name '${ref}' is claimed by more than one entity, so it does not redirect`,
      ),
    ),
  ];
}
