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

import { Route, Routes, useLocation } from 'react-router-dom';
import { alertApiRef } from '@backstage/core-plugin-api';
import { mockApis } from '@backstage/frontend-test-utils';
import {
  catalogApiRef,
  entityRouteRef,
  useAsyncEntity,
} from '@backstage/plugin-catalog-react';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import { CatalogEntityPage } from './CatalogEntityPage';

function Probe() {
  const { entity, loading } = useAsyncEntity();
  const location = useLocation();

  if (loading) {
    return <div>loading</div>;
  }

  return (
    <div>
      <div>{entity ? `entity: ${entity.metadata.name}` : 'not found'}</div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
    </div>
  );
}

describe('<CatalogEntityPage />', () => {
  it('redirects an old URL to the renamed entity and shows the notice', async () => {
    const alertApi = mockApis.alert();
    const entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'new-name',
        annotations: {
          'backstage.io/former-names': 'old-name',
        },
      },
      spec: {
        type: 'service',
      },
    };

    const api = catalogApiMock({ entities: [entity] });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [catalogApiRef, api],
          [alertApiRef, alertApi],
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
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
        routeEntries: ['/catalog/default/component/old-name/docs?x=1'],
      },
    );

    expect(await screen.findByText('entity: new-name')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent(
      '/catalog/default/component/new-name/docs',
    );
    expect(screen.getByTestId('search')).toHaveTextContent('?x=1');

    const alerts = alertApi.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('component:default/old-name');
  });

  it('keeps the not-found result when the lookup finds nothing', async () => {
    const alertApi = mockApis.alert();
    const api = {
      getEntityByRef: jest.fn().mockResolvedValue(undefined),
      getEntityRefByFormerRef: jest.fn().mockResolvedValue(undefined),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [catalogApiRef, api],
          [alertApiRef, alertApi],
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
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
        routeEntries: ['/catalog/default/component/missing/docs?x=1'],
      },
    );

    expect(await screen.findByText('not found')).toBeInTheDocument();
    expect(screen.getByTestId('pathname')).toHaveTextContent(
      '/catalog/default/component/missing/docs',
    );
    expect(screen.getByTestId('search')).toHaveTextContent('?x=1');
    expect(alertApi.getAlerts()).toHaveLength(0);
  });

  it('makes no former-ref call on a normal load', async () => {
    const alertApi = mockApis.alert();
    const entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'new-name',
      },
      spec: {
        type: 'service',
      },
    };
    const api = {
      getEntityByRef: jest.fn().mockResolvedValue(entity),
      getEntityRefByFormerRef: jest.fn(),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [catalogApiRef, api],
          [alertApiRef, alertApi],
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
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
        routeEntries: ['/catalog/default/component/new-name'],
      },
    );

    expect(await screen.findByText('entity: new-name')).toBeInTheDocument();
    expect(api.getEntityByRef).toHaveBeenCalledTimes(1);
    expect(api.getEntityRefByFormerRef).not.toHaveBeenCalled();
    expect(alertApi.getAlerts()).toHaveLength(0);
  });
});
