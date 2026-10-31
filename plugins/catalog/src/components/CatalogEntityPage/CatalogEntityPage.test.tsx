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

import { CatalogApi } from '@backstage/catalog-client';
import {
  CompoundEntityRef,
  Entity,
  parseEntityRef,
} from '@backstage/catalog-model';
import { alertApiRef } from '@backstage/core-plugin-api';
import { mockApis } from '@backstage/frontend-test-utils';
import {
  catalogApiRef,
  entityRouteRef,
  MockStarredEntitiesApi,
  starredEntitiesApiRef,
} from '@backstage/plugin-catalog-react';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import { permissionApiRef } from '@backstage/plugin-permission-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { EntityLayout } from '../EntityLayout';
import { rootRouteRef } from '../../routes';
import { CatalogEntityPage } from './CatalogEntityPage';

const newEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'new', namespace: 'default' },
};

const defaultRoutePath = '/catalog/:namespace/:kind/:name/*';
const renamedNotice = 'This entity was renamed from component:default/old.';

function LocationProbe() {
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <p>{`location: ${pathname}${search}${hash}`}</p>
      <p>{`state: ${JSON.stringify(state)}`}</p>
      <button onClick={() => navigate(-1)}>Back</button>
      <button
        onClick={() => navigate(pathname, { state: { formerEntityRef: 42 } })}
      >
        Set numeric former ref
      </button>
    </div>
  );
}

function exactLookup(...names: string[]) {
  return jest.fn(async (ref: string | CompoundEntityRef) =>
    names.includes(parseEntityRef(ref).name) ? newEntity : undefined,
  );
}

async function renderPage(options: {
  catalogApi: Partial<CatalogApi>;
  routeEntries: string[];
  routePath?: string;
  mountedRoutes?: Parameters<typeof renderInTestApp>[1] extends infer T
    ? T extends { mountedRoutes?: infer M }
      ? M
      : never
    : never;
}) {
  const routePath = options.routePath ?? defaultRoutePath;
  await renderInTestApp(
    <TestApiProvider
      apis={[
        [catalogApiRef, options.catalogApi],
        [alertApiRef, mockApis.alert()],
        [starredEntitiesApiRef, new MockStarredEntitiesApi()],
        [permissionApiRef, mockApis.permission()],
      ]}
    >
      <LocationProbe />
      <Routes>
        <Route path={routePath} element={<CatalogEntityPage />}>
          <Route
            path="*"
            element={
              <EntityLayout>
                <EntityLayout.Route path="/" title="Overview">
                  <div>overview content</div>
                </EntityLayout.Route>
                <EntityLayout.Route path="/ci" title="CI">
                  <div>ci content</div>
                </EntityLayout.Route>
              </EntityLayout>
            }
          />
        </Route>
        <Route path="*" element={<div>earlier page</div>} />
      </Routes>
    </TestApiProvider>,
    {
      routeEntries: options.routeEntries,
      mountedRoutes: options.mountedRoutes ?? {
        [routePath]: entityRouteRef,
        '/catalog': rootRouteRef,
      },
    },
  );
}

async function expectNotFoundPanel() {
  expect(
    await screen.findByText('Warning: Entity not found'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
  expect(screen.queryByText(/renamed from/)).not.toBeInTheDocument();
}

describe('CatalogEntityPage', () => {
  let consoleError: jest.SpyInstance;

  const hookOrderErrors = () =>
    consoleError.mock.calls.filter(args =>
      /order of Hooks|more hooks|fewer hooks/.test(args.map(String).join(' ')),
    );

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redirects an old link and shows the notice', async () => {
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup('new'),
      getEntityByFormerRef: jest.fn().mockResolvedValue(newEntity),
    });

    await renderPage({
      catalogApi,
      routeEntries: ['/catalog/default/component/old/ci?tab=1#top'],
    });

    expect(
      await screen.findByText(
        'location: /catalog/default/component/new/ci?tab=1#top',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('ci content')).toBeInTheDocument();
    expect(await screen.findByText(renamedNotice)).toBeInTheDocument();
  });

  it('replaces the history entry', async () => {
    const getEntityByFormerRef = jest.fn().mockResolvedValue(newEntity);
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup('new'),
      getEntityByFormerRef,
    });

    await renderPage({
      catalogApi,
      routeEntries: ['/earlier', '/catalog/default/component/old'],
    });

    expect(
      await screen.findByText('location: /catalog/default/component/new'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('location: /earlier')).toBeInTheDocument();
    expect(await screen.findByText('earlier page')).toBeInTheDocument();
    expect(getEntityByFormerRef).toHaveBeenCalledTimes(1);
  });

  it('builds the target through the route ref', async () => {
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup('new'),
      getEntityByFormerRef: jest.fn().mockResolvedValue(newEntity),
    });

    await renderPage({
      catalogApi,
      routePath: '/custom/:namespace/:kind/:name/*',
      routeEntries: ['/custom/default/component/old'],
    });

    expect(
      await screen.findByText('location: /custom/default/component/new'),
    ).toBeInTheDocument();
  });

  it('stays loading while the lookup is pending', async () => {
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup(),
      getEntityByFormerRef: jest.fn(() => new Promise<undefined>(() => {})),
    });

    await renderPage({
      catalogApi,
      routeEntries: ['/catalog/default/component/old'],
    });

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Warning: Entity not found'),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      'a client with no method',
      () => {
        const catalogApi = catalogApiMock.mock({
          getEntityByRef: exactLookup(),
        });
        delete (catalogApi as CatalogApi).getEntityByFormerRef;
        return catalogApi;
      },
    ],
    [
      'a lookup resolving undefined',
      () =>
        catalogApiMock.mock({
          getEntityByRef: exactLookup(),
          getEntityByFormerRef: jest.fn().mockResolvedValue(undefined),
        }),
    ],
    [
      'a lookup that rejects',
      () =>
        catalogApiMock.mock({
          getEntityByRef: exactLookup(),
          getEntityByFormerRef: jest.fn().mockRejectedValue(new Error('boom')),
        }),
    ],
  ])('leaves the not-found page unchanged with %s', async (_, createApi) => {
    await renderPage({
      catalogApi: createApi(),
      routeEntries: ['/catalog/default/component/old'],
    });

    await expectNotFoundPanel();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(
      screen.getByText('location: /catalog/default/component/old'),
    ).toBeInTheDocument();
  });

  it('does nothing extra for an entity found by exact lookup', async () => {
    const getEntityByFormerRef = jest.fn().mockResolvedValue(newEntity);
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup('new'),
      getEntityByFormerRef,
    });
    const url =
      '/catalog/default/component/new?formerEntityRef=component:default/old';

    await renderPage({ catalogApi, routeEntries: [url] });

    expect(await screen.findByText('overview content')).toBeInTheDocument();
    expect(screen.getByText(`location: ${url}`)).toBeInTheDocument();
    expect(getEntityByFormerRef).not.toHaveBeenCalled();
    expect(screen.queryByText(/renamed from/)).not.toBeInTheDocument();
  });

  it('shows no notice for a non-string former ref in location state', async () => {
    const getEntityByFormerRef = jest.fn().mockResolvedValue(newEntity);
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup('new'),
      getEntityByFormerRef,
    });

    await renderPage({
      catalogApi,
      routeEntries: ['/catalog/default/component/new'],
    });

    expect(await screen.findByText('overview content')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Set numeric former ref' }),
    );

    expect(
      await screen.findByText('state: {"formerEntityRef":42}'),
    ).toBeInTheDocument();
    expect(await screen.findByText('overview content')).toBeInTheDocument();
    expect(screen.queryByText(/renamed from/)).not.toBeInTheDocument();
    expect(getEntityByFormerRef).not.toHaveBeenCalled();
  });

  it('shows the not-found page when the entity route is unbound', async () => {
    const getEntityByRef = exactLookup();
    const getEntityByFormerRef = jest.fn().mockResolvedValue(newEntity);
    const catalogApi = catalogApiMock.mock({
      getEntityByRef,
      getEntityByFormerRef,
    });

    await renderPage({
      catalogApi,
      routeEntries: [
        '/catalog/default/component/other',
        '/catalog/default/component/old',
      ],
      mountedRoutes: { '/catalog': rootRouteRef },
    });

    await expectNotFoundPanel();
    expect(
      screen.getByText('location: /catalog/default/component/old'),
    ).toBeInTheDocument();
    expect(getEntityByFormerRef).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      await screen.findByText('location: /catalog/default/component/other'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(getEntityByRef).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'other' }),
      ),
    );
    await expectNotFoundPanel();
    expect(getEntityByFormerRef).not.toHaveBeenCalled();
    expect(hookOrderErrors()).toEqual([]);
  });

  it('shows the not-found page when the route function throws', async () => {
    const getEntityByFormerRef = jest.fn().mockResolvedValue(newEntity);
    const catalogApi = catalogApiMock.mock({
      getEntityByRef: exactLookup(),
      getEntityByFormerRef,
    });

    await renderPage({
      catalogApi,
      routePath: '/t/:tenant/:namespace/:kind/:name/*',
      routeEntries: ['/t/acme/default/component/old'],
    });

    await expectNotFoundPanel();
    expect(getEntityByFormerRef).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('location: /t/acme/default/component/old'),
    ).toBeInTheDocument();
    expect(hookOrderErrors()).toEqual([]);
  });
});
