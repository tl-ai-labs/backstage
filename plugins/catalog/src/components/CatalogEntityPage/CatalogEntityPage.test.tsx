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
  CompoundEntityRef,
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  catalogApiRef,
  entityRouteRef,
  useAsyncEntity,
} from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { CatalogEntityPage } from './CatalogEntityPage';

const renamedNotice =
  /This entity was renamed from component:default.*old-name/;

const newEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'new-name', namespace: 'default' },
};

function EntityProbe() {
  const { entity, loading } = useAsyncEntity();
  const location = useLocation();
  return (
    <div>
      <div>entity: {entity ? entity.metadata.name : 'none'}</div>
      <div>{loading ? 'loading' : 'not-loading'}</div>
      <div>path: {`${location.pathname}${location.search}`}</div>
    </div>
  );
}

describe('CatalogEntityPage', () => {
  const catalogApi = {
    getEntityByRef: jest.fn(async (ref: string | CompoundEntityRef) =>
      stringifyEntityRef(parseEntityRef(ref)) === 'component:default/new-name'
        ? newEntity
        : undefined,
    ),
    getEntityByFormerRef: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = (url: string) =>
    renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, catalogApi]]}>
        <Routes>
          <Route
            path="/catalog/:namespace/:kind/:name/*"
            element={<CatalogEntityPage />}
          >
            <Route path="*" element={<EntityProbe />} />
          </Route>
        </Routes>
      </TestApiProvider>,
      {
        routeEntries: [url],
        mountedRoutes: { '/catalog/:namespace/:kind/:name': entityRouteRef },
      },
    );

  it('redirects an old ref to the current entity and shows a dismissible notice', async () => {
    catalogApi.getEntityByFormerRef.mockResolvedValue(newEntity);

    await renderPage('/catalog/default/component/old-name/docs?view=table');

    expect(await screen.findByText('entity: new-name')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'path: /catalog/default/component/new-name/docs?view=table',
      ),
    ).toBeInTheDocument();
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledTimes(1);
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledWith({
      kind: 'component',
      namespace: 'default',
      name: 'old-name',
    });

    expect(await screen.findByText(renamedNotice)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(screen.queryByText(renamedNotice)).not.toBeInTheDocument(),
    );
  });

  it('keeps the not-found state when no entity claims the ref', async () => {
    catalogApi.getEntityByFormerRef.mockResolvedValue(undefined);

    await renderPage('/catalog/default/component/unknown');

    expect(await screen.findByText('not-loading')).toBeInTheDocument();
    expect(screen.getByText('entity: none')).toBeInTheDocument();
    expect(
      screen.getByText('path: /catalog/default/component/unknown'),
    ).toBeInTheDocument();
    expect(catalogApi.getEntityByFormerRef).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/This entity was renamed/)).toBeNull();
  });

  it('does not look up former refs for an existing entity', async () => {
    await renderPage('/catalog/default/component/new-name');

    expect(await screen.findByText('entity: new-name')).toBeInTheDocument();
    expect(screen.getByText('not-loading')).toBeInTheDocument();
    expect(catalogApi.getEntityByFormerRef).not.toHaveBeenCalled();
    expect(screen.queryByText(/This entity was renamed/)).toBeNull();
  });
});
