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

import { screen } from '@testing-library/react';
import {
  createExtensionTester,
  renderInTestApp,
} from '@backstage/frontend-test-utils';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import plugin from './alpha';
import { notificationsApiRef } from './api';
import { rootRouteRef } from './routes';

describe('unread notifications home page widget', () => {
  it('exports the card as a home page widget', () => {
    const extension = plugin.getExtension(
      'home-page-widget:notifications/unread-notifications',
    );
    const data = createExtensionTester(extension).get(
      HomePageWidgetBlueprint.dataRefs.widget,
    );

    expect(data.name).toBe('HomePageUnreadNotifications');
    expect(data.title).toBe('Unread notifications');
    expect(data.description).toBe('Shows your latest unread notifications');
  });

  it('renders the card title and its unread notifications', async () => {
    const extension = plugin.getExtension(
      'home-page-widget:notifications/unread-notifications',
    );
    const data = createExtensionTester(extension).get(
      HomePageWidgetBlueprint.dataRefs.widget,
    );

    const getNotifications = jest.fn().mockResolvedValue({
      notifications: [
        {
          id: 'test-1',
          user: 'user:default/john',
          created: new Date(),
          origin: 'plugin-test',
          payload: { title: 'A test notification' },
        },
      ],
      totalCount: 1,
    });
    const post = jest.fn();

    await renderInTestApp(data.component, {
      apis: [
        [notificationsApiRef, { getNotifications }],
        [toastApiRef, { post }],
      ],
      mountedRoutes: {
        '/notifications': rootRouteRef,
      },
    });

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    expect(await screen.findByText('A test notification')).toBeInTheDocument();
  }, 10000);
});
