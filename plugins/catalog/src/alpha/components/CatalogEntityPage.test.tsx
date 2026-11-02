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

import { useLocation, useNavigationType } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  entityRouteRef,
  MockStarredEntitiesApi,
  starredEntitiesApiRef,
} from '@backstage/plugin-catalog-react';
import { defaultEntityContentGroupDefinitions } from '@backstage/plugin-catalog-react/alpha';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import { CatalogEntityPage } from './CatalogEntityPage';

const newEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    namespace: 'default',
    name: 'new-name',
    title: 'New Name',
  },
  spec: { type: 'service', lifecycle: 'experimental' },
};

function Probe() {
  const type = useNavigationType();
  const { pathname, search, hash } = useLocation();
  return <div>{`${type} ${pathname}${search}${hash}`}</div>;
}

async function renderPage(options: {
  entry: string;
  getEntityByRef: jest.Mock;
  resolveFormerEntityRef: jest.Mock;
}) {
  return renderInTestApp(
    <CatalogEntityPage
      routes={[
        {
          path: '/',
          title: 'Overview',
          children: <Probe />,
        },
        {
          path: '/api',
          title: 'Api',
          children: <Probe />,
        },
      ]}
      menuItems={[]}
      headerLayouts={[]}
      headers={[]}
      groupDefinitions={defaultEntityContentGroupDefinitions}
      defaultContentOrder="title"
      showNavItemIcons={false}
    />,
    {
      apis: [
        catalogApiMock.mock({
          getEntityByRef: options.getEntityByRef,
          resolveFormerEntityRef: options.resolveFormerEntityRef,
        }),
        [starredEntitiesApiRef, new MockStarredEntitiesApi()],
      ],
      config: {
        app: { title: 'Custom app' },
        backend: { baseUrl: 'http://localhost:7000' },
      },
      mountPath: '/catalog/:namespace/:kind/:name/*',
      initialRouteEntries: [options.entry],
      mountedRoutes: {
        '/catalog/:namespace/:kind/:name/*': entityRouteRef,
      },
    },
  );
}

function findByRef(ref: unknown) {
  const key = typeof ref === 'string' ? ref : stringifyEntityRef(ref as any);
  return key === 'component:default/new-name' ? newEntity : undefined;
}

describe('CatalogEntityPage', () => {
  it('redirects an old URL with replace and shows the notice', async () => {
    const getEntityByRef = jest.fn(async (ref: unknown) => findByRef(ref));
    const resolveFormerEntityRef = jest.fn(
      async () => 'component:default/new-name',
    );

    await renderPage({
      entry: '/catalog/default/component/old-name/api?x=1#h',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    expect(
      await screen.findByText(
        'REPLACE /catalog/default/component/new-name/api?x=1#h',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('This entity was renamed from old-name.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Entity not found')).not.toBeInTheDocument();
    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);
  });

  it('shows the existing not-found state on a miss and on a resolver error', async () => {
    const getEntityByRef = jest.fn(async () => undefined);

    const first = await renderPage({
      entry: '/catalog/default/component/old-name',
      getEntityByRef,
      resolveFormerEntityRef: jest.fn(async () => undefined),
    });
    expect(await screen.findByText('Entity not found')).toBeInTheDocument();
    expect(screen.queryByText(/was renamed from/)).not.toBeInTheDocument();
    first.unmount();

    await renderPage({
      entry: '/catalog/default/component/old-name',
      getEntityByRef,
      resolveFormerEntityRef: jest.fn(async () => {
        throw new Error('boom');
      }),
    });
    expect(await screen.findByText('Entity not found')).toBeInTheDocument();
    expect(screen.queryByText(/was renamed from/)).not.toBeInTheDocument();
  });

  it('does not ask the resolver for a found entity', async () => {
    const getEntityByRef = jest.fn(async (ref: unknown) => findByRef(ref));
    const resolveFormerEntityRef = jest.fn(async () => undefined);

    await renderPage({
      entry: '/catalog/default/component/new-name',
      getEntityByRef,
      resolveFormerEntityRef,
    });

    expect(
      await screen.findByText('POP /catalog/default/component/new-name'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/was renamed from/)).not.toBeInTheDocument();
    expect(resolveFormerEntityRef).not.toHaveBeenCalled();
  });
});
