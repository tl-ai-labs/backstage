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

import { TestDatabases } from '@backstage/backend-test-utils';
import { ANNOTATION_FORMER_NAMES, Entity } from '@backstage/catalog-model';
import { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { applyDatabaseMigrations } from '../../migrations';
import { DbFormerEntityRefsRow, DbRefreshStateRow } from '../../tables';
import {
  getFormerRefStatusItems,
  listContestedFormerRefs,
  syncFormerEntityRefs,
} from './formerEntityRefs';

jest.setTimeout(60_000);

const databases = TestDatabases.create();

describe.each(databases.eachSupportedId())(
  'formerEntityRefs, %p',
  databaseId => {
    async function createDatabase() {
      const knex = await databases.init(databaseId);
      await applyDatabaseMigrations(knex);
      return knex;
    }

    async function insertRefreshState(
      knex: Knex,
      entityId: string,
      entityRef = `component:default/${entityId}`,
    ) {
      await knex<DbRefreshStateRow>('refresh_state').insert({
        entity_id: entityId,
        entity_ref: entityRef,
        unprocessed_entity: '{}',
        errors: '[]',
        next_update_at: '2021-04-01 13:37:00',
        last_discovery_at: '2021-04-01 13:37:00',
      });
    }

    async function allFormerRefs(knex: Knex): Promise<DbFormerEntityRefsRow[]> {
      return knex<DbFormerEntityRefsRow>('former_entity_refs')
        .select('entity_id', 'entity_ref', 'former_entity_ref')
        .orderBy(['entity_id', 'former_entity_ref']);
    }

    it('writes only the claims that changed', async () => {
      const knex = await createDatabase();
      const entityId = randomUUID();
      const entityRef = 'component:default/current';
      await insertRefreshState(knex, entityId, entityRef);

      await knex.transaction(tx =>
        syncFormerEntityRefs(tx, {
          entityId,
          entityRef,
          formerRefs: ['component:default/a', 'component:default/b'],
        }),
      );

      await expect(allFormerRefs(knex)).resolves.toEqual([
        {
          entity_id: entityId,
          entity_ref: entityRef,
          former_entity_ref: 'component:default/a',
        },
        {
          entity_id: entityId,
          entity_ref: entityRef,
          former_entity_ref: 'component:default/b',
        },
      ]);

      await knex.transaction(tx =>
        syncFormerEntityRefs(tx, {
          entityId,
          entityRef,
          formerRefs: ['component:default/b', 'component:default/c'],
        }),
      );

      await expect(allFormerRefs(knex)).resolves.toEqual([
        {
          entity_id: entityId,
          entity_ref: entityRef,
          former_entity_ref: 'component:default/b',
        },
        {
          entity_id: entityId,
          entity_ref: entityRef,
          former_entity_ref: 'component:default/c',
        },
      ]);

      const queries: string[] = [];
      const onQuery = (query: { sql: string }) => {
        if (query.sql.toLowerCase().includes('former_entity_refs')) {
          queries.push(query.sql.toLowerCase());
        }
      };
      knex.on('query', onQuery);
      try {
        await knex.transaction(tx =>
          syncFormerEntityRefs(tx, {
            entityId,
            entityRef,
            formerRefs: ['component:default/b', 'component:default/c'],
          }),
        );
      } finally {
        knex.off('query', onQuery);
      }

      expect(queries).toHaveLength(1);
      expect(queries[0]).toMatch(/^select\b/);
    });

    it('does no write for an entity with no claims', async () => {
      const knex = await createDatabase();
      const entityId = randomUUID();
      const entityRef = 'component:default/unannotated';
      await insertRefreshState(knex, entityId, entityRef);

      const queries: string[] = [];
      const onQuery = (query: { sql: string }) => {
        if (query.sql.toLowerCase().includes('former_entity_refs')) {
          queries.push(query.sql.toLowerCase());
        }
      };
      knex.on('query', onQuery);
      try {
        await knex.transaction(tx =>
          syncFormerEntityRefs(tx, {
            entityId,
            entityRef,
            formerRefs: [],
          }),
        );
      } finally {
        knex.off('query', onQuery);
      }

      expect(queries).toHaveLength(1);
      expect(queries[0]).toMatch(/^select\b/);
      await expect(allFormerRefs(knex)).resolves.toEqual([]);
    });

    it('removes claims when the entity is deleted', async () => {
      const knex = await createDatabase();
      const entityId = randomUUID();
      const entityRef = 'component:default/doomed';
      await insertRefreshState(knex, entityId, entityRef);

      await knex.transaction(tx =>
        syncFormerEntityRefs(tx, {
          entityId,
          entityRef,
          formerRefs: ['component:default/old-name'],
        }),
      );
      await expect(allFormerRefs(knex)).resolves.toHaveLength(1);

      await knex<DbRefreshStateRow>('refresh_state')
        .where({ entity_id: entityId })
        .delete();

      await expect(allFormerRefs(knex)).resolves.toEqual([]);
    });

    it('tolerates the same claim from two entities', async () => {
      const knex = await createDatabase();
      const firstId = randomUUID();
      const secondId = randomUUID();
      await insertRefreshState(knex, firstId, 'component:default/first');
      await insertRefreshState(knex, secondId, 'component:default/second');

      await Promise.all([
        knex.transaction(tx =>
          syncFormerEntityRefs(tx, {
            entityId: firstId,
            entityRef: 'component:default/first',
            formerRefs: [
              'component:default/shared-z',
              'component:default/shared-a',
              'component:default/only-first',
            ],
          }),
        ),
        knex.transaction(tx =>
          syncFormerEntityRefs(tx, {
            entityId: secondId,
            entityRef: 'component:default/second',
            formerRefs: [
              'component:default/shared-z',
              'component:default/shared-a',
            ],
          }),
        ),
      ]);

      await expect(allFormerRefs(knex)).resolves.toHaveLength(5);

      await expect(
        listContestedFormerRefs(knex, {
          entityId: firstId,
          formerRefs: [
            'component:default/shared-z',
            'component:default/shared-a',
            'component:default/only-first',
          ],
        }),
      ).resolves.toEqual([
        'component:default/shared-a',
        'component:default/shared-z',
      ]);

      await expect(
        listContestedFormerRefs(knex, {
          entityId: secondId,
          formerRefs: [
            'component:default/shared-z',
            'component:default/shared-a',
          ],
        }),
      ).resolves.toEqual([
        'component:default/shared-a',
        'component:default/shared-z',
      ]);

      const queries: string[] = [];
      const onQuery = (query: { sql: string }) => {
        queries.push(query.sql);
      };
      knex.on('query', onQuery);
      try {
        await expect(
          listContestedFormerRefs(knex, {
            entityId: firstId,
            formerRefs: [],
          }),
        ).resolves.toEqual([]);
      } finally {
        knex.off('query', onQuery);
      }
      expect(queries).toEqual([]);
    });

    it('builds warnings for bad entries and contested claims', async () => {
      const knex = await createDatabase();
      const myId = randomUUID();
      const otherId = randomUUID();
      await insertRefreshState(knex, myId, 'component:default/mine');
      await insertRefreshState(knex, otherId, 'component:default/rival');

      await knex.transaction(tx =>
        syncFormerEntityRefs(tx, {
          entityId: otherId,
          entityRef: 'component:default/rival',
          formerRefs: ['component:default/contested'],
        }),
      );

      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'mine',
          annotations: {
            [ANNOTATION_FORMER_NAMES]: 'user:default/wrong-kind, contested',
          },
        },
      };

      const items = await getFormerRefStatusItems(knex, {
        entityId: myId,
        entity,
      });

      expect(items).toHaveLength(2);
      for (const item of items) {
        expect(item.level).toBe('warning');
        expect(item.type).toBe('backstage.io/catalog-processing');
        expect(item.message).not.toContain('rival');
        expect(JSON.stringify(item)).not.toContain('rival');
      }
      expect(items[0].message).toContain(
        "InputError: Ignored former name 'user:default/wrong-kind'",
      );
      expect(items[1].message).toBe(
        "InputError: Former name 'component:default/contested' is claimed by more than one entity, so it does not redirect",
      );

      const plainEntity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'plain' },
      };
      const queries: string[] = [];
      const onQuery = (query: { sql: string }) => {
        queries.push(query.sql);
      };
      knex.on('query', onQuery);
      try {
        await expect(
          getFormerRefStatusItems(knex, {
            entityId: myId,
            entity: plainEntity,
          }),
        ).resolves.toEqual([]);
      } finally {
        knex.off('query', onQuery);
      }
      expect(queries).toEqual([]);
    });
  },
);
