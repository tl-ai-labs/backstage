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
import { Knex } from 'knex';
import { randomUUID as uuid } from 'node:crypto';
import { applyDatabaseMigrations } from '../../migrations';
import { DbFormerEntityRefsRow, DbRefreshStateRow } from '../../tables';
import { resolveFormerEntityRef } from './resolveFormerEntityRef';
import { syncFormerEntityRefClaims } from './syncFormerEntityRefClaims';

jest.setTimeout(60_000);

const databases = TestDatabases.create();

const formerRef = 'k:ns/old';

describe.each(databases.eachSupportedId())(
  'syncFormerEntityRefClaims, %p',
  databaseId => {
    async function createDatabase() {
      const knex = await databases.init(databaseId);
      await applyDatabaseMigrations(knex);
      return knex;
    }

    async function insertEntity(
      knex: Knex,
      entityRef: string,
      locationKey?: string,
    ) {
      const entityId = uuid();
      await knex<DbRefreshStateRow>('refresh_state').insert({
        entity_id: entityId,
        entity_ref: entityRef,
        unprocessed_entity: '{}',
        processed_entity: '{}',
        errors: '[]',
        location_key: locationKey,
        next_update_at: '2021-04-01 13:37:00',
        last_discovery_at: '2021-04-01 13:37:00',
      });
      return { entityId, entityRef, locationKey };
    }

    async function deleteEntity(knex: Knex, entityId: string) {
      await knex<DbRefreshStateRow>('refresh_state')
        .where({ entity_id: entityId })
        .delete();
    }

    async function sync(
      knex: Knex,
      claimant: { entityId: string; entityRef: string; locationKey?: string },
      formerEntityRefs: string[],
    ) {
      return await knex.transaction(tx =>
        syncFormerEntityRefClaims({
          tx,
          claimantEntityId: claimant.entityId,
          claimantEntityRef: claimant.entityRef,
          locationKey: claimant.locationKey,
          formerEntityRefs,
        }),
      );
    }

    async function readClaims(knex: Knex, claimantEntityId: string) {
      return await knex<DbFormerEntityRefsRow>('former_entity_refs')
        .where({ claimant_entity_id: claimantEntityId })
        .orderBy('former_entity_ref');
    }

    async function setClaimedAt(
      knex: Knex,
      claimantEntityId: string,
      claimedAt: string,
    ) {
      await knex<DbFormerEntityRefsRow>('former_entity_refs')
        .where({ claimant_entity_id: claimantEntityId })
        .update({ claimed_at: claimedAt });
    }

    function normalizeTimestamp(t: string | Date): number {
      return typeof t === 'string' ? new Date(t).getTime() : t.getTime();
    }

    it('records a free claim and leaves it alone on reprocessing', async () => {
      const knex = await createDatabase();
      const claimant = await insertEntity(knex, 'k:ns/new', 'url:claimant');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);

      // Moved away from the current time, so that a rewrite cannot go unseen
      await setClaimedAt(knex, claimant.entityId, '2021-04-01 13:37:00');
      const before = await readClaims(knex, claimant.entityId);

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      const after = await readClaims(knex, claimant.entityId);

      expect(before).toHaveLength(1);
      expect(after).toHaveLength(1);
      expect(after[0].former_entity_ref).toBe(formerRef);
      expect(after[0].claimant_entity_ref).toBe('k:ns/new');
      expect(after[0].rejected_at).toBeNull();
      expect(normalizeTimestamp(after[0].claimed_at)).toEqual(
        normalizeTimestamp(before[0].claimed_at),
      );
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/new');
    });

    it('removes a claim when it is no longer declared or the claimant is deleted', async () => {
      const knex = await createDatabase();
      const claimant = await insertEntity(knex, 'k:ns/new', 'url:claimant');

      await expect(
        sync(knex, claimant, ['k:ns/old1', 'k:ns/old2']),
      ).resolves.toEqual([
        { formerEntityRef: 'k:ns/old1', outcome: 'active' },
        { formerEntityRef: 'k:ns/old2', outcome: 'active' },
      ]);
      await expect(readClaims(knex, claimant.entityId)).resolves.toHaveLength(
        2,
      );

      await expect(sync(knex, claimant, ['k:ns/old2'])).resolves.toEqual([
        { formerEntityRef: 'k:ns/old2', outcome: 'active' },
      ]);
      const remaining = await readClaims(knex, claimant.entityId);
      expect(remaining.map(row => row.former_entity_ref)).toEqual([
        'k:ns/old2',
      ]);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: 'k:ns/old1' }),
      ).resolves.toBeUndefined();

      await deleteEntity(knex, claimant.entityId);

      await expect(readClaims(knex, claimant.entityId)).resolves.toEqual([]);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: 'k:ns/old2' }),
      ).resolves.toBeUndefined();
    });

    it('records a same-source claim on a live holder until the holder goes', async () => {
      const knex = await createDatabase();
      const holder = await insertEntity(knex, formerRef, 'url:shared');
      const claimant = await insertEntity(knex, 'k:ns/new', 'url:shared');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      const claims = await readClaims(knex, claimant.entityId);
      expect(claims).toHaveLength(1);
      expect(claims[0].rejected_at).toBeNull();
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBeUndefined();

      await deleteEntity(knex, holder.entityId);

      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/new');
    });

    it.each([
      {
        name: 'a different key',
        holderKey: 'url:holder',
        claimantKey: 'url:claimant',
      },
      {
        name: 'no key on either side',
        holderKey: undefined,
        claimantKey: undefined,
      },
    ])(
      'rejects a claim on a live entity of another source and keeps it rejected, with $name',
      async ({ holderKey, claimantKey }) => {
        const knex = await createDatabase();
        const holder = await insertEntity(knex, formerRef, holderKey);
        const claimant = await insertEntity(knex, 'k:ns/new', claimantKey);

        await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
          { formerEntityRef: formerRef, outcome: 'rejected' },
        ]);
        const claims = await readClaims(knex, claimant.entityId);
        expect(claims).toHaveLength(1);
        expect(claims[0].rejected_at).not.toBeNull();

        await deleteEntity(knex, holder.entityId);

        await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
          { formerEntityRef: formerRef, outcome: 'rejected' },
        ]);
        await expect(
          resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
        ).resolves.toBeUndefined();

        await expect(sync(knex, claimant, [])).resolves.toEqual([]);
        await expect(readClaims(knex, claimant.entityId)).resolves.toEqual([]);

        await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
          { formerEntityRef: formerRef, outcome: 'active' },
        ]);
        const fresh = await readClaims(knex, claimant.entityId);
        expect(fresh).toHaveLength(1);
        expect(fresh[0].rejected_at).toBeNull();
        await expect(
          resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
        ).resolves.toBe('k:ns/new');
      },
    );

    it('picks a stable winner among competing claims', async () => {
      const knex = await createDatabase();
      const holder = await insertEntity(knex, formerRef, 'url:holder');
      const rejected = await insertEntity(knex, 'k:ns/a', 'url:rejected');
      const later = await insertEntity(knex, 'k:ns/b', 'url:later');
      const tiedFirst = await insertEntity(knex, 'k:ns/c', 'url:first');
      const tiedSecond = await insertEntity(knex, 'k:ns/d', 'url:second');

      await sync(knex, rejected, [formerRef]);
      await deleteEntity(knex, holder.entityId);
      await sync(knex, tiedSecond, [formerRef]);
      await sync(knex, later, [formerRef]);
      await sync(knex, tiedFirst, [formerRef]);

      await setClaimedAt(knex, rejected.entityId, '2021-04-01 12:00:00');
      await setClaimedAt(knex, tiedFirst.entityId, '2021-04-01 13:00:00');
      await setClaimedAt(knex, tiedSecond.entityId, '2021-04-01 13:00:00');
      await setClaimedAt(knex, later.entityId, '2021-04-01 14:00:00');

      await expect(sync(knex, rejected, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'rejected' },
      ]);
      await expect(sync(knex, tiedFirst, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      await expect(sync(knex, tiedSecond, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'lost' },
      ]);
      await expect(sync(knex, later, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'lost' },
      ]);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/c');

      await deleteEntity(knex, tiedFirst.entityId);

      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/d');
      await expect(sync(knex, tiedSecond, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      await expect(sync(knex, later, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'lost' },
      ]);
      await expect(sync(knex, rejected, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'rejected' },
      ]);
    });

    it('goes inactive with no error when a new entity takes the ref', async () => {
      const knex = await createDatabase();
      const claimant = await insertEntity(knex, 'k:ns/new', 'url:claimant');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/new');

      const holder = await insertEntity(knex, formerRef, 'url:claimant');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      const claims = await readClaims(knex, claimant.entityId);
      expect(claims).toHaveLength(1);
      expect(claims[0].rejected_at).toBeNull();
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBeUndefined();

      await deleteEntity(knex, holder.entityId);

      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/new');
    });

    it('rejects a recorded claim when another source takes the ref', async () => {
      const knex = await createDatabase();
      const claimant = await insertEntity(knex, 'k:ns/new', 'url:claimant');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);

      const holder = await insertEntity(knex, formerRef, 'url:holder');

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'rejected' },
      ]);
      const claims = await readClaims(knex, claimant.entityId);
      expect(claims).toHaveLength(1);
      expect(claims[0].rejected_at).not.toBeNull();

      // Moved away from the current time, so that a rewrite cannot go unseen
      await knex<DbFormerEntityRefsRow>('former_entity_refs')
        .where({ claimant_entity_id: claimant.entityId })
        .update({ rejected_at: '2021-04-01 13:37:00' });
      const before = await readClaims(knex, claimant.entityId);

      await expect(sync(knex, claimant, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'rejected' },
      ]);
      const after = await readClaims(knex, claimant.entityId);
      expect(after).toHaveLength(1);
      expect(after[0].rejected_at).toEqual(before[0].rejected_at);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBeUndefined();

      await deleteEntity(knex, holder.entityId);

      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBeUndefined();
    });

    it('lets the real owner rename past a squatting claim that was rejected', async () => {
      const knex = await createDatabase();
      const squatter = await insertEntity(knex, 'k:ns/a', 'url:a');

      await expect(sync(knex, squatter, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);

      const owner = await insertEntity(knex, formerRef, 'url:owner');

      await expect(sync(knex, squatter, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'rejected' },
      ]);

      const renamed = await insertEntity(knex, 'k:ns/renamed', 'url:owner');

      await expect(sync(knex, renamed, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);

      await deleteEntity(knex, owner.entityId);

      await expect(sync(knex, renamed, [formerRef])).resolves.toEqual([
        { formerEntityRef: formerRef, outcome: 'active' },
      ]);
      await expect(
        resolveFormerEntityRef({ knex, formerEntityRef: formerRef }),
      ).resolves.toBe('k:ns/renamed');
    });
  },
);
