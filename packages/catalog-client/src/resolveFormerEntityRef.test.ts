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
} from '@backstage/catalog-model';
import { CatalogApi } from './types/api';
import { resolveFormerEntityRef } from './resolveFormerEntityRef';

describe('resolveFormerEntityRef', () => {
  it('resolves a single claimant and issues one correctly shaped query', async () => {
    const mockEntity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        namespace: 'default',
      },
    };

    const queryEntities = jest
      .fn()
      .mockResolvedValueOnce({
        items: [mockEntity],
        totalItems: 1,
        pageInfo: {},
      })
      .mockResolvedValueOnce({
        items: [mockEntity],
        totalItems: 1,
        pageInfo: {},
      });

    const catalogApi = { queryEntities } as unknown as CatalogApi;
    const options = { token: 'secret-token' };

    const expectedKey = `metadata.annotations.${ANNOTATION_FORMER_ENTITY_REFS}.component:default/old-name`;

    const resultLower = await resolveFormerEntityRef(
      catalogApi,
      'component:default/old-name',
      options,
    );

    expect(resultLower).toEqual({
      status: 'resolved',
      entity: mockEntity,
      formerEntityRef: 'component:default/old-name',
    });
    expect(queryEntities).toHaveBeenCalledTimes(1);
    expect(queryEntities).toHaveBeenLastCalledWith(
      {
        query: {
          $all: [{ [expectedKey]: true }, { $not: { kind: 'user' } }],
        },
        limit: 2,
      },
      options,
    );

    const resultMixed = await resolveFormerEntityRef(
      catalogApi,
      'Component:Default/Old-Name',
      options,
    );

    expect(resultMixed).toEqual({
      status: 'resolved',
      entity: mockEntity,
      formerEntityRef: 'component:default/old-name',
    });
    expect(queryEntities).toHaveBeenCalledTimes(2);
    expect(queryEntities).toHaveBeenLastCalledWith(
      {
        query: {
          $all: [{ [expectedKey]: true }, { $not: { kind: 'user' } }],
        },
        limit: 2,
      },
      options,
    );
  });

  it('reports absent, forbidden and contested identically as unknown', async () => {
    const mockEntity1: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: { name: 'first' },
    };
    const mockEntity2: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: { name: 'second' },
    };

    const queryEntities = jest
      .fn()
      .mockResolvedValueOnce({ items: [], totalItems: 0, pageInfo: {} })
      .mockResolvedValueOnce({ items: [], totalItems: 0, pageInfo: {} })
      .mockResolvedValueOnce({
        items: [mockEntity1, mockEntity2],
        totalItems: 2,
        pageInfo: {},
      });

    const catalogApi = { queryEntities } as unknown as CatalogApi;

    const absentResult = await resolveFormerEntityRef(
      catalogApi,
      'component:default/absent',
    );
    const forbiddenResult = await resolveFormerEntityRef(
      catalogApi,
      'component:default/forbidden',
    );
    const contestedResult = await resolveFormerEntityRef(
      catalogApi,
      'component:default/contested',
    );

    expect(absentResult).toEqual({ status: 'unknown' });
    expect(forbiddenResult).toEqual({ status: 'unknown' });
    expect(contestedResult).toEqual({ status: 'unknown' });
    expect(absentResult).toStrictEqual(forbiddenResult);
    expect(absentResult).toStrictEqual(contestedResult);
  });

  it('refuses a User ref without issuing a request', async () => {
    const queryEntities = jest.fn();
    const catalogApi = { queryEntities } as unknown as CatalogApi;

    const lowerResult = await resolveFormerEntityRef(
      catalogApi,
      'user:default/x',
    );
    const mixedResult = await resolveFormerEntityRef(
      catalogApi,
      'User:default/X',
    );

    expect(lowerResult).toEqual({ status: 'unknown' });
    expect(mixedResult).toEqual({ status: 'unknown' });
    expect(queryEntities).not.toHaveBeenCalled();
  });

  it('never throws for a malformed ref or a failing backend', async () => {
    const queryEntities = jest
      .fn()
      .mockRejectedValue(new Error('backend failure'));
    const catalogApi = { queryEntities } as unknown as CatalogApi;

    await expect(resolveFormerEntityRef(catalogApi, '')).resolves.toEqual({
      status: 'unknown',
    });
    await expect(
      resolveFormerEntityRef(catalogApi, 'kindless-name'),
    ).resolves.toEqual({ status: 'unknown' });
    await expect(
      resolveFormerEntityRef(catalogApi, 'component:default/'),
    ).resolves.toEqual({ status: 'unknown' });
    expect(queryEntities).not.toHaveBeenCalled();

    await expect(
      resolveFormerEntityRef(catalogApi, 'component:default/failing'),
    ).resolves.toEqual({ status: 'unknown' });
    expect(queryEntities).toHaveBeenCalledTimes(1);
  });
});
