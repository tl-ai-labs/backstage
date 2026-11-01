/*
 * Copyright 2025 The Backstage Authors
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
  ApiBlueprint,
  PageBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { RiNotification3Line } from '@remixicon/react';
import type { RendererProps } from '@backstage/plugin-home-react';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { rootRouteRef } from './routes';
import { NotificationsClient, notificationsApiRef } from './api';

const page = PageBlueprint.make({
  params: {
    path: '/notifications',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/NotificationsPage').then(m => (
        <m.NfsNotificationsPage />
      )),
  },
});

const api = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: notificationsApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new NotificationsClient({ discoveryApi, fetchApi }),
    }),
});

function UnreadNotificationsWidgetRenderer({
  Content,
  ...props
}: RendererProps) {
  return <Content {...props} />;
}

const unreadNotificationsHomeWidget = HomePageWidgetBlueprint.make({
  name: 'unread-notifications',
  params: {
    name: 'UnreadNotifications',
    title: 'Unread notifications',
    description: 'Shows your latest unread notifications',
    layout: {
      width: { minColumns: 4, maxColumns: 12, defaultColumns: 6 },
      height: { minRows: 4, maxRows: 14, defaultRows: 8 },
    },
    componentProps: { Renderer: UnreadNotificationsWidgetRenderer },
    components: () =>
      import('./components/UnreadNotificationsCard').then(m => ({
        Content: m.UnreadNotificationsCard,
      })),
  },
});

/** @alpha */
export default createFrontendPlugin({
  pluginId: 'notifications',
  title: 'Notifications',
  icon: <RiNotification3Line />,
  info: { packageJson: () => import('../package.json') },
  routes: {
    root: rootRouteRef,
  },
  // TODO(Rugvip): Nav item (i.e. NotificationsSidebarItem) currently needs to be installed manually
  extensions: [page, api, unreadNotificationsHomeWidget],
});

import { notificationsTranslationRef as _notificationsTranslationRef } from './translation';

/**
 * @alpha
 * @deprecated Import from `@backstage/plugin-notifications` instead.
 */
export const notificationsTranslationRef = _notificationsTranslationRef;
