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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderInTestApp } from '@backstage/frontend-test-utils';
import {
  ANNOTATION_FORMER_ENTITY_REFS,
  Entity,
} from '@backstage/catalog-model';
import {
  entityRouteRef,
  MockStarredEntitiesApi,
  starredEntitiesApiRef,
} from '@backstage/plugin-catalog-react';
import { defaultEntityContentGroupDefinitions } from '@backstage/plugin-catalog-react/alpha';
import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';
import { CatalogEntityPage } from './CatalogEntityPage';

const renamedEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    namespace: 'default',
    name: 'new',
    title: 'Renamed entity',
    annotations: {
      [ANNOTATION_FORMER_ENTITY_REFS]: 'component:default/old',
    },
  },
  spec: { type: 'service', lifecycle: 'experimental' },
};

const noticeText = 'This entity was renamed from component:default/old.';
const contentPrefix = 'Renamed content at';

function Content() {
  const { pathname, search, hash } = useLocation();
  return <div>{`${contentPrefix} ${pathname}${search}${hash}`}</div>;
}

async function renderPage(options: {
  path: string;
  legacyHeader?: boolean;
  unbound?: boolean;
}) {
  const content = {
    path: '/overview',
    title: 'Overview',
    element: <Content />,
    children: <Content />,
  };
  const headers = options.legacyHeader
    ? [{ element: <div>Legacy header</div>, filter: () => true }]
    : [];

  return renderInTestApp(
    <CatalogEntityPage
      menuItems={[]}
      headerLayouts={[]}
      headers={headers}
      routes={[content]}
      groupDefinitions={defaultEntityContentGroupDefinitions}
      defaultContentOrder="title"
      showNavItemIcons={false}
    />,
    {
      apis: [
        catalogApiMock({ entities: [renamedEntity] }),
        [starredEntitiesApiRef, new MockStarredEntitiesApi()],
      ],
      config: {
        app: { title: 'Custom app' },
        backend: { baseUrl: 'http://localhost:7000' },
      },
      mountPath: '/catalog/:namespace/:kind/:name/*',
      initialRouteEntries: [options.path],
      ...(options.unbound
        ? {}
        : {
            mountedRoutes: {
              '/catalog/:namespace/:kind/:name/*': entityRouteRef,
            },
          }),
    },
  );
}

describe('CatalogEntityPage', () => {
  const oldLink = '/catalog/default/component/old/overview?tab=1#top';
  const landing = `${contentPrefix} /catalog/default/component/new/overview?tab=1#top`;

  it('redirects and shows the notice in the BUI layout', async () => {
    await renderPage({ path: oldLink });

    expect(await screen.findByText(landing)).toBeInTheDocument();
    expect(await screen.findByText(noticeText)).toBeInTheDocument();
    expect(screen.queryByText('Legacy header')).not.toBeInTheDocument();
  });

  it('redirects and shows the notice in the MUI layout', async () => {
    await renderPage({ path: oldLink, legacyHeader: true });

    expect(await screen.findByText(landing)).toBeInTheDocument();
    expect(screen.getByText('Legacy header')).toBeInTheDocument();
    expect(await screen.findByText(noticeText)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByText(noticeText)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(landing)).toBeInTheDocument();
  });

  it('shows no notice on a direct visit', async () => {
    const path = '/catalog/default/component/new/overview';
    const content = `${contentPrefix} ${path}`;

    const bui = await renderPage({ path });
    expect(await screen.findByText(content)).toBeInTheDocument();
    expect(screen.queryByText(noticeText)).not.toBeInTheDocument();
    bui.unmount();

    await renderPage({ path, legacyHeader: true });
    expect(await screen.findByText(content)).toBeInTheDocument();
    expect(screen.getByText('Legacy header')).toBeInTheDocument();
    expect(screen.queryByText(noticeText)).not.toBeInTheDocument();
  });

  it('shows the not-found page when the entity route is not bound', async () => {
    await renderPage({
      path: '/catalog/default/component/old',
      unbound: true,
    });

    expect(await screen.findByText('Entity not found')).toBeInTheDocument();
    expect(screen.queryByText(/^Renamed content at/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No path for/)).not.toBeInTheDocument();
  });
});
