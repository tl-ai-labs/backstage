/*
 * Copyright 2021 The Backstage Authors
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

import { createHash, Hash } from 'node:crypto';
import { DateTime } from 'luxon';
import waitForExpect from 'wait-for-expect';
import { DefaultProcessingDatabase } from '../database/DefaultProcessingDatabase';
import { DefaultCatalogProcessingEngine } from './DefaultCatalogProcessingEngine';
import { markForStitching } from '../database/operations/stitcher/markForStitching';
import { syncFormerEntityRefClaims } from '../database/operations/formerEntityRefs/syncFormerEntityRefClaims';
import { CatalogProcessingOrchestrator } from './types';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';
import { metricsServiceMock } from '@backstage/backend-test-utils/alpha';

jest.mock('../database/operations/stitcher/markForStitching');
const mockMarkForStitching = jest.mocked(markForStitching);

jest.mock('../database/operations/formerEntityRefs/syncFormerEntityRefClaims');
const mockSyncFormerEntityRefClaims = jest.mocked(syncFormerEntityRefClaims);

describe('DefaultCatalogProcessingEngine', () => {
  const db = {
    transaction: jest.fn(),
    getProcessableEntities: jest.fn(),
    updateProcessedEntity: jest.fn(),
    updateProcessedEntityErrors: jest.fn(),
    updateEntityCache: jest.fn(),
    listParents: jest.fn(),
    setRefreshKeys: jest.fn(),
  } as unknown as jest.Mocked<DefaultProcessingDatabase>;
  const orchestrator: jest.Mocked<CatalogProcessingOrchestrator> = {
    process: jest.fn(),
  };
  const hash = {
    update: () => hash,
    digest: jest.fn(),
  } as unknown as jest.Mocked<Hash>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should process stuff', async () => {
    orchestrator.process.mockResolvedValue({
      ok: true,
      completedEntity: {
        apiVersion: '1',
        kind: 'Location',
        metadata: { name: 'test' },
      },
      relations: [],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      createHash: () => hash,
      scheduler: mockServices.scheduler(),
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    const tx = (() => {}) as any;
    db.transaction.mockImplementation(cb => cb(tx));

    db.getProcessableEntities
      .mockImplementation(async () => {
        await engine.stop();
        return { items: [] };
      })
      .mockResolvedValueOnce({
        items: [
          {
            entityRef: 'foo',
            id: '1',
            unprocessedEntity: {
              apiVersion: '1',
              kind: 'Location',
              metadata: { name: 'test' },
            },
            resultHash: '',
            state: [] as any,
            nextUpdateAt: DateTime.now(),
          },
        ],
      });
    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.updateProcessedEntity.mockResolvedValue({
      relationsChange: { deleted: [], inserted: [] },
    });

    await engine.start();
    await waitForExpect(() => {
      expect(orchestrator.process).toHaveBeenCalledTimes(1);
      expect(orchestrator.process).toHaveBeenCalledWith({
        entity: {
          apiVersion: '1',
          kind: 'Location',
          metadata: { name: 'test' },
        },
        state: [], // State is forwarded as is, even if it's a bad format
      });
      expect(db.updateProcessedEntity).toHaveBeenCalledWith(
        tx,
        expect.anything(),
      );
      expect(mockMarkForStitching).toHaveBeenCalledWith({
        knex: tx,
        entityRefs: new Set(['location:default/test']),
      });
    });
    await engine.stop();
  });

  it('should process stuff even if the first attempt fail', async () => {
    orchestrator.process.mockResolvedValue({
      ok: true,
      completedEntity: {
        apiVersion: '1',
        kind: 'Location',
        metadata: { name: 'test' },
      },
      relations: [],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    db.getProcessableEntities
      .mockImplementation(async () => {
        await engine.stop();
        return { items: [] };
      })
      .mockRejectedValueOnce(new Error('I FAILED'))
      .mockResolvedValueOnce({
        items: [
          {
            entityRef: 'foo',
            id: '1',
            unprocessedEntity: {
              apiVersion: '1',
              kind: 'Location',
              metadata: { name: 'test' },
            },
            resultHash: '',
            state: { cache: { myProcessor: { myKey: 'myValue' } } },
            nextUpdateAt: DateTime.now(),
          },
        ],
      });
    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.updateProcessedEntity.mockImplementation(async () => ({
      relationsChange: { deleted: [], inserted: [] },
    }));

    await engine.start();
    await waitForExpect(() => {
      expect(orchestrator.process).toHaveBeenCalledTimes(1);
      expect(orchestrator.process).toHaveBeenCalledWith({
        entity: {
          apiVersion: '1',
          kind: 'Location',
          metadata: { name: 'test' },
        },
        state: { cache: { myProcessor: { myKey: 'myValue' } } },
      });
    });
    await engine.stop();
  });

  it('stores processing errors and schedules stitching in one transaction', async () => {
    const entity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: { name: 'test' },
    };
    orchestrator.process.mockResolvedValue({ ok: false, errors: [] });
    hash.digest.mockReturnValue('new-result-hash');

    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: { client: { config: { client: 'pg' } } } as any,
      orchestrator,
      createHash: () => hash,
      scheduler: mockServices.scheduler(),
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });
    db.transaction.mockImplementation(cb => cb((() => {}) as any));
    mockMarkForStitching
      .mockRejectedValueOnce(
        Object.assign(new Error('deadlock detected'), { code: '40P01' }),
      )
      .mockResolvedValue(undefined);
    db.getProcessableEntities
      .mockImplementation(async () => {
        await engine.stop();
        return { items: [] };
      })
      .mockResolvedValueOnce({
        items: [
          {
            entityRef: 'location:default/test',
            id: '1',
            unprocessedEntity: entity,
            resultHash: 'old-result-hash',
            state: {},
            nextUpdateAt: DateTime.now(),
          },
        ],
      });

    await engine.start();
    await waitForExpect(() => {
      const tx1 = db.updateProcessedEntityErrors.mock.calls[0]?.[0];
      const tx2 = db.updateProcessedEntityErrors.mock.calls[1]?.[0];
      expect(db.updateProcessedEntityErrors).toHaveBeenNthCalledWith(
        1,
        tx1,
        expect.objectContaining({ id: '1', resultHash: 'new-result-hash' }),
      );
      expect(mockMarkForStitching).toHaveBeenNthCalledWith(1, {
        knex: tx1,
        entityRefs: ['location:default/test'],
      });
      expect(db.updateProcessedEntityErrors).toHaveBeenNthCalledWith(
        2,
        tx2,
        expect.objectContaining({ id: '1', resultHash: 'new-result-hash' }),
      );
      expect(mockMarkForStitching).toHaveBeenNthCalledWith(2, {
        knex: tx2,
        entityRefs: ['location:default/test'],
      });
      expect(tx1).not.toBe(tx2);
    });
    await engine.stop();
  });

  it('recomputes changed relation sources when retrying a successful processing transaction', async () => {
    const entity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: { name: 'test' },
    };
    orchestrator.process.mockResolvedValue({
      ok: true,
      completedEntity: entity,
      relations: [],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });
    hash.digest.mockReturnValue('new-result-hash');
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: { client: { config: { client: 'pg' } } } as any,
      orchestrator,
      createHash: () => hash,
      scheduler: mockServices.scheduler(),
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });
    db.transaction.mockImplementation(cb => cb((() => {}) as any));
    db.listParents.mockResolvedValue({ entityRefs: [] });
    const relation = (source: string) => ({
      source_entity_ref: source,
      target_entity_ref: 'location:default/test',
      type: 'hasPart',
    });
    db.updateProcessedEntity
      .mockResolvedValueOnce({
        relationsChange: {
          deleted: [relation('component:default/rolled-back')],
          inserted: [],
        },
      })
      .mockResolvedValueOnce({
        relationsChange: {
          deleted: [relation('component:default/removed')],
          inserted: [relation('component:default/added')],
        },
      });
    mockMarkForStitching
      .mockRejectedValueOnce(
        Object.assign(new Error('deadlock detected'), { code: '40P01' }),
      )
      .mockResolvedValue(undefined);
    db.getProcessableEntities
      .mockImplementation(async () => {
        await engine.stop();
        return { items: [] };
      })
      .mockResolvedValueOnce({
        items: [
          {
            entityRef: 'location:default/test',
            id: '1',
            unprocessedEntity: entity,
            resultHash: 'old-result-hash',
            state: {},
            nextUpdateAt: DateTime.now(),
          },
        ],
      });

    try {
      await engine.start();
      await waitForExpect(() => {
        expect(mockMarkForStitching).toHaveBeenCalledTimes(2);
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(2);
        const tx1 = db.updateProcessedEntity.mock.calls[0][0];
        const tx2 = db.updateProcessedEntity.mock.calls[1][0];
        expect(tx1).not.toBe(tx2);
        expect(mockMarkForStitching).toHaveBeenNthCalledWith(1, {
          knex: tx1,
          entityRefs: new Set([
            'location:default/test',
            'component:default/rolled-back',
          ]),
        });
        expect(mockMarkForStitching).toHaveBeenNthCalledWith(2, {
          knex: tx2,
          entityRefs: new Set([
            'location:default/test',
            'component:default/removed',
            'component:default/added',
          ]),
        });
        expect(orchestrator.process).toHaveBeenCalledTimes(1);
      });
    } finally {
      await engine.stop();
    }
  });

  it('runs fully when hash mismatches, early-outs when hash matches', async () => {
    const entity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: { name: 'test' },
    };

    const refreshState = {
      id: '',
      entityRef: '',
      unprocessedEntity: entity,
      resultHash: 'the matching hash',
      state: {},
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    hash.digest.mockReturnValue('the matching hash');

    orchestrator.process.mockResolvedValue({
      ok: true,
      completedEntity: entity,
      relations: [],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });

    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities
      .mockResolvedValueOnce({
        items: [{ ...refreshState, resultHash: 'NOT RIGHT' }],
      })
      .mockResolvedValue({ items: [] });
    db.updateProcessedEntity.mockImplementation(async () => ({
      relationsChange: { deleted: [], inserted: [] },
    }));

    await engine.start();

    await waitForExpect(() => {
      expect(orchestrator.process).toHaveBeenCalledTimes(1);
      expect(hash.digest).toHaveBeenCalledTimes(1);
      expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
      expect(db.listParents).toHaveBeenCalledTimes(1);
      expect(mockMarkForStitching).toHaveBeenCalledTimes(1);
    });
    expect(db.updateEntityCache).not.toHaveBeenCalled();

    db.getProcessableEntities
      .mockReset()
      .mockResolvedValueOnce({
        items: [{ ...refreshState, state: { something: 'different' } }],
      })
      .mockResolvedValue({ items: [] });

    await waitForExpect(() => {
      expect(orchestrator.process).toHaveBeenCalledTimes(2);
      expect(hash.digest).toHaveBeenCalledTimes(2);
      expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
      expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
      expect(db.listParents).toHaveBeenCalledTimes(2);
      expect(mockMarkForStitching).toHaveBeenCalledTimes(1);
    });
    expect(db.updateEntityCache).toHaveBeenCalledWith(expect.anything(), {
      id: '',
      state: { ttl: 5 },
    });
    await engine.stop();
  });

  it('should decrease the state ttl if there are errors', async () => {
    const entity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: { name: 'test' },
    };

    const refreshState = {
      id: '',
      entityRef: '',
      unprocessedEntity: entity,
      resultHash: 'the matching hash',
      state: { some: 'value', ttl: 1 },
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    hash.digest.mockReturnValue('the matching hash');

    orchestrator.process.mockResolvedValue({
      ok: false,
      errors: [],
    });

    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    await engine.start();

    db.getProcessableEntities
      .mockResolvedValueOnce({
        items: [refreshState],
      })
      .mockResolvedValue({ items: [] });
    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.updateProcessedEntity.mockImplementation(async () => ({
      relationsChange: { deleted: [], inserted: [] },
    }));

    await waitForExpect(() => {
      expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
    });

    expect(db.updateEntityCache).toHaveBeenCalledWith(expect.anything(), {
      id: '',
      state: { some: 'value', ttl: 0 },
    });

    // Second run, the TTL should now reach 0 and the cache should be cleared
    db.getProcessableEntities
      .mockResolvedValueOnce({
        items: [
          {
            ...refreshState,
            state: db.updateEntityCache.mock.calls[0][1].state,
          },
        ],
      })
      .mockResolvedValue({ items: [] });

    db.updateEntityCache.mockReset();
    await waitForExpect(() => {
      expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
    });

    expect(db.updateEntityCache).toHaveBeenCalledWith(expect.anything(), {
      id: '',
      state: {},
    });

    await engine.stop();
  });

  it('should stitch both the previous and new sources when relations change', async () => {
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      pollingIntervalMs: 100,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    const entity = {
      apiVersion: '1',
      kind: 'k',
      metadata: { name: 'me', namespace: 'ns' },
    };
    const processableEntity = {
      entityRef: 'foo',
      id: '1',
      unprocessedEntity: entity,
      resultHash: '',
      state: [] as any,
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities
      .mockResolvedValueOnce({
        items: [processableEntity],
      })
      .mockResolvedValueOnce({
        items: [processableEntity],
      });
    db.updateProcessedEntity
      .mockImplementationOnce(async () => ({
        relationsChange: {
          deleted: [],
          inserted: [
            {
              source_entity_ref: 'k:ns/other1',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
            {
              source_entity_ref: 'k:ns/other2',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
          ],
        },
      }))
      .mockImplementationOnce(async () => ({
        relationsChange: {
          deleted: [
            {
              source_entity_ref: 'k:ns/other1',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
          ],
          inserted: [
            {
              source_entity_ref: 'k:ns/other3',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
          ],
        },
      }));

    orchestrator.process
      .mockResolvedValueOnce({
        ok: true,
        completedEntity: entity,
        relations: [
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other1' },
            target: { kind: 'k', namespace: 'ns', name: 'me' },
          },
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other2' },
            target: { kind: 'k', namespace: 'ns', name: 'me' },
          },
        ],
        errors: [],
        deferredEntities: [],
        state: {},
        refreshKeys: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        completedEntity: entity,
        relations: [
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other2' },
            target: { kind: 'k', namespace: 'ns', name: 'me' },
          },
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other3' },
            target: { kind: 'k', namespace: 'ns', name: 'me' },
          },
        ],
        errors: [],
        deferredEntities: [],
        state: {},
        refreshKeys: [],
      });

    await engine.start();
    await waitForExpect(() => {
      expect(mockMarkForStitching).toHaveBeenCalledTimes(2);
    });
    expect([...mockMarkForStitching.mock.calls[0][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other1', 'k:ns/other2']),
    );
    expect([...mockMarkForStitching.mock.calls[1][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other1', 'k:ns/other3']),
    );
    await engine.stop();
  });

  it('should stitch both the previous and new sources when relation target changes', async () => {
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      pollingIntervalMs: 100,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    const entity = {
      apiVersion: '1',
      kind: 'k',
      metadata: { name: 'me', namespace: 'ns' },
    };
    const processableEntity = {
      entityRef: 'foo',
      id: '1',
      unprocessedEntity: entity,
      resultHash: '',
      state: [] as any,
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities
      .mockResolvedValueOnce({
        items: [processableEntity],
      })
      .mockResolvedValueOnce({
        items: [processableEntity],
      });
    db.updateProcessedEntity
      .mockImplementationOnce(async () => ({
        relationsChange: {
          deleted: [],
          inserted: [
            {
              source_entity_ref: 'k:ns/other1',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
          ],
        },
      }))
      .mockImplementationOnce(async () => ({
        relationsChange: {
          deleted: [
            {
              source_entity_ref: 'k:ns/other1',
              type: 't',
              target_entity_ref: 'k:ns/me',
            },
          ],
          inserted: [
            {
              source_entity_ref: 'k:ns/other1',
              type: 't',
              target_entity_ref: 'k:ns/newtarget',
            },
          ],
        },
      }));

    orchestrator.process
      .mockResolvedValueOnce({
        ok: true,
        completedEntity: entity,
        relations: [
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other1' },
            target: { kind: 'k', namespace: 'ns', name: 'me' },
          },
        ],
        errors: [],
        deferredEntities: [],
        state: {},
        refreshKeys: [],
      })
      .mockResolvedValueOnce({
        ok: true,
        completedEntity: entity,
        // change just the target of the relationship to a new entity,
        // leaving the source and relation type the same.
        // see: https://github.com/backstage/backstage/issues/27325
        relations: [
          {
            type: 't',
            source: { kind: 'k', namespace: 'ns', name: 'other1' },
            target: { kind: 'k', namespace: 'ns', name: 'newtarget' },
          },
        ],
        errors: [],
        deferredEntities: [],
        state: {},
        refreshKeys: [],
      });

    await engine.start();
    await waitForExpect(() => {
      expect(mockMarkForStitching).toHaveBeenCalledTimes(2);
    });
    expect([...mockMarkForStitching.mock.calls[0][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other1']),
    );
    // As a result of switching the relationship for source other1 to
    // a new target entity, the other1 relationship source must be
    // restitched.
    expect([...mockMarkForStitching.mock.calls[1][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other1']),
    );
    await engine.stop();
  });

  it('should not stitch sources entities when relations are the same', async () => {
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      pollingIntervalMs: 100,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    const entity = {
      apiVersion: '1',
      kind: 'k',
      metadata: { name: 'me', namespace: 'ns' },
    };
    const processableEntity = {
      entityRef: 'foo',
      id: '1',
      unprocessedEntity: entity,
      resultHash: '',
      state: [] as any,
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities.mockResolvedValueOnce({
      items: [processableEntity],
    });
    db.updateProcessedEntity.mockImplementationOnce(async () => ({
      relationsChange: { deleted: [], inserted: [] },
    }));

    orchestrator.process.mockResolvedValueOnce({
      ok: true,
      completedEntity: entity,
      relations: [
        {
          type: 't',
          source: { kind: 'k', namespace: 'ns', name: 'other1' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
        {
          type: 't',
          source: { kind: 'k', namespace: 'ns', name: 'other2' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
      ],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });

    await engine.start();
    await waitForExpect(() => {
      expect(mockMarkForStitching).toHaveBeenCalledTimes(1);
    });
    expect([...mockMarkForStitching.mock.calls[0][0].entityRefs!]).toEqual([
      'k:ns/me',
    ]);
    await engine.stop();
  });

  it('should stitch sources entities when new relation of different type added', async () => {
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      pollingIntervalMs: 100,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    const entity = {
      apiVersion: '1',
      kind: 'k',
      metadata: { name: 'me', namespace: 'ns' },
    };
    const processableEntity = {
      entityRef: 'foo',
      id: '1',
      unprocessedEntity: entity,
      resultHash: '',
      state: [] as any,
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities.mockResolvedValueOnce({
      items: [processableEntity],
    });
    db.updateProcessedEntity.mockImplementationOnce(async () => ({
      relationsChange: {
        deleted: [],
        inserted: [
          {
            source_entity_ref: 'k:ns/other2',
            type: 'u',
            target_entity_ref: 'k:ns/me',
          },
        ],
      },
    }));

    orchestrator.process.mockResolvedValueOnce({
      ok: true,
      completedEntity: entity,
      relations: [
        {
          type: 't',
          source: { kind: 'k', namespace: 'ns', name: 'other1' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
        {
          type: 't',
          source: { kind: 'k', namespace: 'ns', name: 'other2' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
        {
          type: 'u',
          source: { kind: 'k', namespace: 'ns', name: 'other2' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
      ],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });

    await engine.start();
    await waitForExpect(() => {
      expect(mockMarkForStitching).toHaveBeenCalledTimes(1);
    });
    expect([...mockMarkForStitching.mock.calls[0][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other2']),
    );
    await engine.stop();
  });

  it('should stitch sources entities when relation is removed', async () => {
    const engine = new DefaultCatalogProcessingEngine({
      config: new ConfigReader({}),
      logger: mockServices.logger.mock(),
      processingDatabase: db,
      knex: {} as any,
      orchestrator: orchestrator,
      scheduler: mockServices.scheduler(),
      createHash: () => hash,
      pollingIntervalMs: 100,
      events: mockServices.events.mock(),
      metrics: metricsServiceMock.mock(),
    });

    db.transaction.mockImplementation(cb => cb((() => {}) as any));

    const entity = {
      apiVersion: '1',
      kind: 'k',
      metadata: { name: 'me', namespace: 'ns' },
    };
    const processableEntity = {
      entityRef: 'foo',
      id: '1',
      unprocessedEntity: entity,
      resultHash: '',
      state: [] as any,
      nextUpdateAt: DateTime.now(),
      lastDiscoveryAt: DateTime.now(),
    };

    db.listParents.mockResolvedValue({ entityRefs: [] });
    db.getProcessableEntities.mockResolvedValueOnce({
      items: [processableEntity],
    });
    db.updateProcessedEntity.mockImplementationOnce(async () => ({
      relationsChange: {
        deleted: [
          {
            source_entity_ref: 'k:ns/other2',
            type: 't',
            target_entity_ref: 'k:ns/me',
          },
        ],
        inserted: [],
      },
    }));

    orchestrator.process.mockResolvedValueOnce({
      ok: true,
      completedEntity: entity,
      relations: [
        {
          type: 't',
          source: { kind: 'k', namespace: 'ns', name: 'other1' },
          target: { kind: 'k', namespace: 'ns', name: 'me' },
        },
      ],
      errors: [],
      deferredEntities: [],
      state: {},
      refreshKeys: [],
    });

    await engine.start();
    await waitForExpect(() => {
      expect(mockMarkForStitching).toHaveBeenCalledTimes(1);
    });
    expect([...mockMarkForStitching.mock.calls[0][0].entityRefs!]).toEqual(
      expect.arrayContaining(['k:ns/me', 'k:ns/other2']),
    );
    await engine.stop();
  });

  describe('former entity refs', () => {
    type TestEntity = Parameters<
      CatalogProcessingOrchestrator['process']
    >[0]['entity'];
    type TestState = Parameters<
      CatalogProcessingOrchestrator['process']
    >[0]['state'];

    const plainEntity: TestEntity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: { name: 'test' },
    };
    const annotatedEntity: TestEntity = {
      apiVersion: '1',
      kind: 'Location',
      metadata: {
        name: 'test',
        annotations: {
          'backstage.io/former-entity-refs': 'location:default/old',
        },
      },
    };

    const createEngine = (
      hashFactory: () => Hash = () => hash,
    ): DefaultCatalogProcessingEngine =>
      new DefaultCatalogProcessingEngine({
        config: new ConfigReader({}),
        logger: mockServices.logger.mock(),
        processingDatabase: db,
        knex: { client: { config: { client: 'pg' } } } as any,
        orchestrator,
        createHash: hashFactory,
        scheduler: mockServices.scheduler(),
        pollingIntervalMs: 100,
        events: mockServices.events.mock(),
        metrics: metricsServiceMock.mock(),
      });

    const processable = (
      entity: TestEntity,
      state: TestState,
      resultHash: string = '',
    ) => ({
      entityRef: 'location:default/test',
      id: '1',
      unprocessedEntity: entity,
      resultHash,
      state,
      nextUpdateAt: DateTime.now(),
    });

    const mockSuccessfulProcessing = (entity: TestEntity) => {
      orchestrator.process.mockResolvedValue({
        ok: true,
        completedEntity: entity,
        relations: [],
        errors: [],
        deferredEntities: [],
        state: {},
        refreshKeys: [],
      });
    };

    const errorMessages = (errors: string | undefined): string[] =>
      JSON.parse(errors!).map((e: { message: string }) => e.message);

    beforeEach(() => {
      db.transaction.mockImplementation(cb => cb((() => {}) as any));
      db.listParents.mockResolvedValue({ entityRefs: [] });
      db.updateProcessedEntity.mockResolvedValue({
        relationsChange: { deleted: [], inserted: [] },
      });
      hash.digest.mockReturnValue('new-result-hash');
    });

    it('stores claim errors with the processed entity', async () => {
      const entity: TestEntity = {
        ...plainEntity,
        metadata: {
          name: 'test',
          annotations: {
            'backstage.io/former-entity-refs':
              'location:default/old, not-a-ref',
          },
        },
      };
      mockSuccessfulProcessing(entity);
      mockSyncFormerEntityRefClaims.mockResolvedValue([
        { formerEntityRef: 'location:default/old', outcome: 'rejected' },
      ]);
      db.getProcessableEntities
        .mockResolvedValueOnce({ items: [processable(entity, {})] })
        .mockResolvedValue({ items: [] });

      const engine = createEngine();
      await engine.start();
      await waitForExpect(() => {
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
        expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
      });
      await engine.stop();

      expect(mockSyncFormerEntityRefClaims).toHaveBeenCalledWith(
        expect.objectContaining({
          claimantEntityId: '1',
          claimantEntityRef: 'location:default/test',
          formerEntityRefs: ['location:default/old'],
        }),
      );
      const processed = db.updateProcessedEntity.mock.calls[0][1];
      expect(processed).toEqual(
        expect.objectContaining({ id: '1', processedEntity: entity }),
      );
      const messages = errorMessages(processed.errors);
      expect(messages).toHaveLength(2);
      expect(messages).toEqual(
        expect.arrayContaining([
          "Ignored former entity ref 'not-a-ref' in annotation backstage.io/former-entity-refs: it is not a full entity ref on the form kind:namespace/name",
          "Former entity ref 'location:default/old' was rejected because an entity from another source holds or held that ref. To clear this, remove the value from annotation backstage.io/former-entity-refs, then add it back once that entity is gone",
        ]),
      );
      expect(db.updateProcessedEntityErrors).not.toHaveBeenCalled();
      expect(db.updateEntityCache.mock.calls[0][1].state).toEqual(
        expect.objectContaining({ formerEntityRefClaims: true }),
      );
    });

    it('reprocesses when only a claim outcome changes', async () => {
      mockSuccessfulProcessing(annotatedEntity);
      mockSyncFormerEntityRefClaims
        .mockResolvedValueOnce([
          { formerEntityRef: 'location:default/old', outcome: 'active' },
        ])
        .mockResolvedValue([
          { formerEntityRef: 'location:default/old', outcome: 'lost' },
        ]);
      db.getProcessableEntities
        .mockResolvedValueOnce({
          items: [processable(annotatedEntity, {})],
        })
        .mockResolvedValue({ items: [] });

      const engine = createEngine(() => createHash('sha1'));
      await engine.start();
      await waitForExpect(() => {
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
      });
      const first = db.updateProcessedEntity.mock.calls[0][1];
      expect(errorMessages(first.errors)).toEqual([]);

      db.getProcessableEntities
        .mockReset()
        .mockResolvedValueOnce({
          items: [
            processable(
              annotatedEntity,
              { formerEntityRefClaims: true },
              first.resultHash,
            ),
          ],
        })
        .mockResolvedValue({ items: [] });

      await waitForExpect(() => {
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(2);
      });
      await engine.stop();

      const second = db.updateProcessedEntity.mock.calls[1][1];
      expect(second.resultHash).not.toBe(first.resultHash);
      expect(errorMessages(second.errors)).toEqual([
        "Former entity ref 'location:default/old' is not in effect because another entity claimed it first",
      ]);
    });

    it('leaves entities that never declared alone', async () => {
      mockSuccessfulProcessing(plainEntity);
      db.getProcessableEntities
        .mockResolvedValueOnce({ items: [processable(plainEntity, {})] })
        .mockResolvedValue({ items: [] });

      const engine = createEngine();
      await engine.start();
      await waitForExpect(() => {
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
      });
      await engine.stop();

      expect(mockSyncFormerEntityRefClaims).not.toHaveBeenCalled();
      expect(db.updateEntityCache).not.toHaveBeenCalled();
    });

    it('removes claims once the annotation is dropped', async () => {
      mockSuccessfulProcessing(plainEntity);
      mockSyncFormerEntityRefClaims.mockResolvedValue([]);
      db.getProcessableEntities
        .mockResolvedValueOnce({
          items: [processable(plainEntity, { formerEntityRefClaims: true })],
        })
        .mockResolvedValue({ items: [] });

      const engine = createEngine();
      await engine.start();
      await waitForExpect(() => {
        expect(db.updateProcessedEntity).toHaveBeenCalledTimes(1);
        expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
      });
      await engine.stop();

      expect(mockSyncFormerEntityRefClaims).toHaveBeenCalledTimes(1);
      expect(mockSyncFormerEntityRefClaims).toHaveBeenCalledWith(
        expect.objectContaining({ formerEntityRefs: [] }),
      );
      expect(db.updateEntityCache.mock.calls[0][1].state).not.toHaveProperty(
        'formerEntityRefClaims',
      );
    });

    it('keeps the marker through failed runs', async () => {
      orchestrator.process.mockResolvedValue({ ok: false, errors: [] });
      db.getProcessableEntities
        .mockResolvedValueOnce({
          items: [
            processable(annotatedEntity, {
              formerEntityRefClaims: true,
              ttl: 0,
            }),
          ],
        })
        .mockResolvedValue({ items: [] });

      const engine = createEngine();
      await engine.start();
      await waitForExpect(() => {
        expect(db.updateEntityCache).toHaveBeenCalledTimes(1);
      });
      await engine.stop();

      expect(db.updateEntityCache).toHaveBeenCalledWith(expect.anything(), {
        id: '1',
        state: { formerEntityRefClaims: true },
      });
      expect(mockSyncFormerEntityRefClaims).not.toHaveBeenCalled();
    });
  });
});
