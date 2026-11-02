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
import { ApiProvider } from '@backstage/core-app-api';
import { alertApiRef } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  entityRouteRef,
  MockStarredEntitiesApi,
  starredEntitiesApiRef,
} from '@backstage/plugin-catalog-react';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import { permissionApiRef } from '@backstage/plugin-permission-react';
import { renderInTestApp, TestApiRegistry } from '@backstage/test-utils';
import { mockApis } from '@backstage/frontend-test-utils';
import { screen } from '@testing-library/react';
import {
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { rootRouteRef } from '../../routes';
import { EntityLayout } from '../EntityLayout';
import { CatalogEntityPage } from './CatalogEntityPage';

describe('CatalogEntityPage', () => {
  const newEntity: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'new-name',
      namespace: 'default',
    },
  };

  function LocationProbe() {
    const navigationType = useNavigationType();
    const location = useLocation();
    return (
      <div>
        <span>{navigationType}</span>
        <span>{`${location.pathname}${location.search}${location.hash}`}</span>
      </div>
    );
  }

  async function renderPage(options: {
    routeEntry: string;
    getEntityByRef: jest.Mock;
    resolveFormerEntityRef: jest.Mock;
  }) {
    const apis = TestApiRegistry.from(
      [
        catalogApiRef,
        catalogApiMock.mock({
          getEntityByRef: options.getEntityByRef,
          resolveFormerEntityRef: options.resolveFormerEntityRef,
        }),
      ],
      [alertApiRef, mockApis.alert()],
      [starredEntitiesApiRef, new MockStarredEntitiesApi()],
      [permissionApiRef, mockApis.permission()],
    );

    return renderInTestApp(
      <ApiProvider apis={apis}>
        <Routes>
          <Route
            path="/catalog/:namespace/:kind/:name/*"
            element={<CatalogEntityPage />}
          >
            <Route
              path="*"
              element={
                <>
                  <LocationProbe />
                  <EntityLayout>
                    <EntityLayout.Route path="/" title="Overview">
                      <div>overview-content</div>
                    </EntityLayout.Route>
                    <EntityLayout.Route path="/api" title="API">
                      <div>api-content</div>
                    </EntityLayout.Route>
                  </EntityLayout>
                </>
              }
            />
          </Route>
        </Routes>
      </ApiProvider>,
      {
        routeEntries: [options.routeEntry],
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
          '/catalog': rootRouteRef,
        },
      },
    );
  }

  it('redirects an old URL with replace and shows the notice', async () => {
    const getEntityByRef = jest.fn(async ({ name }: { name: string }) =>
      name === 'new-name' ? newEntity : undefined,
    );
    const resolveFormerEntityRef = jest
      .fn()
      .mockResolvedValue('component:default/new-name');

    await renderPage({
      routeEntry: '/catalog/default/component/old-name/api?x=1#h',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    expect(
      await screen.findByText('This entity was renamed from old-name.'),
    ).toBeInTheDocument();
    expect(screen.getByText('api-content')).toBeInTheDocument();
    expect(screen.getByText('REPLACE')).toBeInTheDocument();
    expect(
      screen.getByText('/catalog/default/component/new-name/api?x=1#h'),
    ).toBeInTheDocument();
    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);
    expect(resolveFormerEntityRef).toHaveBeenCalledWith({
      kind: 'component',
      namespace: 'default',
      name: 'old-name',
    });
  });

  it('shows the existing not-found state on a miss and on a resolver error', async () => {
    const getEntityByRef = jest.fn().mockResolvedValue(undefined);
    const resolveFormerEntityRef = jest.fn().mockResolvedValue(undefined);

    const { unmount } = await renderPage({
      routeEntry: '/catalog/default/component/old-name',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    expect(
      await screen.findByText('Warning: Entity not found'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This entity was renamed from/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('POP')).toBeInTheDocument();
    expect(
      screen.getByText('/catalog/default/component/old-name'),
    ).toBeInTheDocument();

    unmount();

    const rejectingResolver = jest
      .fn()
      .mockRejectedValue(new Error('resolver boom'));

    await renderPage({
      routeEntry: '/catalog/default/component/old-name',
      getEntityByRef,
      resolveFormerEntityRef: rejectingResolver,
    });

    expect(
      await screen.findByText('Warning: Entity not found'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This entity was renamed from/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('POP')).toBeInTheDocument();
    expect(
      screen.getByText('/catalog/default/component/old-name'),
    ).toBeInTheDocument();
  });

  it('does not ask the resolver for a found entity', async () => {
    const getEntityByRef = jest.fn().mockResolvedValue(newEntity);
    const resolveFormerEntityRef = jest.fn();

    await renderPage({
      routeEntry: '/catalog/default/component/new-name',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    expect(await screen.findByText('overview-content')).toBeInTheDocument();
    expect(resolveFormerEntityRef).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/This entity was renamed from/),
    ).not.toBeInTheDocument();
  });

  it('keeps loading while the resolver runs', async () => {
    let notifiedMiss = () => {};
    const missObserved = new Promise<void>(resolve => {
      notifiedMiss = resolve;
    });
    const getEntityByRef = jest.fn(async () => {
      notifiedMiss();
      return undefined;
    });
    const resolveFormerEntityRef = jest.fn(
      () => new Promise<string | undefined>(() => {}),
    );

    await renderPage({
      routeEntry: '/catalog/default/component/old-name',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    await missObserved;
    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Warning: Entity not found'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Entity was not found')).not.toBeInTheDocument();
  });
});
