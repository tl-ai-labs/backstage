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

import { Entity } from '@backstage/catalog-model';
import { errorApiRef } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  entityRouteRef,
  useAsyncEntity,
} from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { CatalogEntityPage } from './CatalogEntityPage';

function Probe() {
  const { entity, loading } = useAsyncEntity();
  const location = useLocation();
  const state = location.state as { renamedFrom?: string } | null;
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="entity">
        {entity
          ? `${entity.metadata.namespace}/${entity.metadata.name}`
          : 'none'}
      </div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="renamedFrom">{state?.renamedFrom ?? 'none'}</div>
    </div>
  );
}

describe('useEntityFromUrl', () => {
  const errorApi = { post: jest.fn(), error$: jest.fn() };

  const liveEntity: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'my-entity', namespace: 'default' },
  };
  const newEntity: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'new-name', namespace: 'custom-ns' },
  };

  async function renderAt(
    path: string,
    catalogApi: {
      getEntityByRef: jest.Mock;
      getEntityByFormerRef: jest.Mock;
    },
  ) {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [catalogApiRef, catalogApi],
          [errorApiRef, errorApi],
        ]}
      >
        <Routes>
          <Route
            path="/catalog/:namespace/:kind/:name/*"
            element={<CatalogEntityPage />}
          >
            <Route path="*" element={<Probe />} />
          </Route>
        </Routes>
      </TestApiProvider>,
      {
        routeEntries: [path],
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
      },
    );
  }

  it('returns live entity directly without calling getEntityByFormerRef', async () => {
    const catalogApi = {
      getEntityByRef: jest.fn().mockResolvedValue(liveEntity),
      getEntityByFormerRef: jest.fn().mockResolvedValue(undefined),
    };

    await renderAt('/catalog/default/component/my-entity', catalogApi);

    await waitFor(() =>
      expect(screen.getByTestId('entity')).toHaveTextContent(
        'default/my-entity',
      ),
    );
    expect(screen.getByTestId('pathname')).toHaveTextContent(
      '/catalog/default/component/my-entity',
    );
    expect(screen.getByTestId('renamedFrom')).toHaveTextContent('none');
    expect(catalogApi.getEntityByFormerRef).not.toHaveBeenCalled();
  });

  it('redirects to the current entity route preserving sub-path and sets renamedFrom location state on a former-name hit', async () => {
    const catalogApi = {
      getEntityByRef: jest
        .fn()
        .mockImplementation(async (ref: { name: string }) =>
          ref.name === 'new-name' ? newEntity : undefined,
        ),
      getEntityByFormerRef: jest.fn().mockResolvedValue(newEntity),
    };

    await renderAt('/catalog/default/component/old-name/ci-cd', catalogApi);

    await waitFor(() =>
      expect(screen.getByTestId('pathname')).toHaveTextContent(
        '/catalog/custom-ns/component/new-name/ci-cd',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('entity')).toHaveTextContent(
        'custom-ns/new-name',
      ),
    );
    expect(screen.getByTestId('renamedFrom')).toHaveTextContent(
      'component:default/old-name',
    );
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledWith({
      kind: 'component',
      namespace: 'default',
      name: 'old-name',
    });
  });

  it('resolves to undefined entity when both getEntityByRef and getEntityByFormerRef miss', async () => {
    const catalogApi = {
      getEntityByRef: jest.fn().mockResolvedValue(undefined),
      getEntityByFormerRef: jest.fn().mockResolvedValue(undefined),
    };

    await renderAt('/catalog/default/component/unknown', catalogApi);

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('entity')).toHaveTextContent('none');
    expect(screen.getByTestId('pathname')).toHaveTextContent(
      '/catalog/default/component/unknown',
    );
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledTimes(1);
  });
});
