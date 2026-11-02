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

import { resolveEntityRename } from './resolveEntityRename';

const routeFunc = (params: { kind: string; namespace: string; name: string }) =>
  `/catalog/${params.namespace}/${params.kind}/${params.name}`;

describe('resolveEntityRename', () => {
  it('keeps the sub-path, query and hash', async () => {
    const resolveFormerEntityRef = jest
      .fn()
      .mockResolvedValue('component:team/new');

    const result = await resolveEntityRename({
      catalogApi: { resolveFormerEntityRef },
      entityRef: { kind: 'component', namespace: 'default', name: 'old' },
      location: {
        pathname: '/catalog/default/component/old/api',
        search: '?x=1',
        hash: '#h',
      },
      routeFunc,
    });

    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      to: '/catalog/team/component/new/api?x=1#h',
      state: { entityRenamedFrom: 'old' },
    });
  });

  it('shows the namespace outside the default one', async () => {
    const result = await resolveEntityRename({
      catalogApi: {
        resolveFormerEntityRef: jest
          .fn()
          .mockResolvedValue('component:team-a/new'),
      },
      entityRef: { kind: 'component', namespace: 'team-a', name: 'old' },
      location: {
        pathname: '/catalog/team-a/component/old',
        search: '',
        hash: '',
      },
      routeFunc,
    });

    expect(result?.state).toEqual({ entityRenamedFrom: 'team-a/old' });
    expect(result?.to).toBe('/catalog/team-a/component/new');
  });

  it('drops a path that is not under the entity root', async () => {
    const result = await resolveEntityRename({
      catalogApi: {
        resolveFormerEntityRef: jest
          .fn()
          .mockResolvedValue('component:team/new'),
      },
      entityRef: { kind: 'component', namespace: 'default', name: 'old' },
      location: {
        pathname: '/somewhere/else/api',
        search: '?x=1',
        hash: '#h',
      },
      routeFunc,
    });

    expect(result?.to).toBe('/catalog/team/component/new?x=1#h');
    expect(result?.state).toEqual({ entityRenamedFrom: 'old' });
  });

  it('returns undefined for a miss, an error or an old implementation', async () => {
    const base = {
      entityRef: { kind: 'component', namespace: 'default', name: 'old' },
      location: {
        pathname: '/catalog/default/component/old',
        search: '',
        hash: '',
      },
      routeFunc,
    };

    await expect(
      resolveEntityRename({
        ...base,
        catalogApi: {
          resolveFormerEntityRef: jest.fn().mockResolvedValue(undefined),
        },
      }),
    ).resolves.toBeUndefined();

    await expect(
      resolveEntityRename({
        ...base,
        catalogApi: {
          resolveFormerEntityRef: jest
            .fn()
            .mockRejectedValue(new Error('boom')),
        },
      }),
    ).resolves.toBeUndefined();

    await expect(
      resolveEntityRename({ ...base, catalogApi: {} }),
    ).resolves.toBeUndefined();
  });
});
