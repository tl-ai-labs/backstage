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
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

const notifications: Notification[] = [
  {
    id: 'notif-1',
    user: 'user:default/guest',
    created: new Date('2026-11-15T10:00:00Z'),
    origin: 'scaffolder',
    payload: {
      title: 'First notification',
      severity: 'normal',
    },
  },
  {
    id: 'notif-2',
    user: 'user:default/guest',
    created: new Date('2026-11-15T11:00:00Z'),
    origin: 'catalog',
    payload: {
      title: 'Highlighted notification',
      severity: 'high',
    },
  },
];

describe('NotificationsPage', () => {
  it('highlights the notification matching the ?id= query parameter', async () => {
    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications,
        totalCount: notifications.length,
      }),
      getStatus: jest.fn().mockResolvedValue({ unread: 2, read: 0 }),
      getTopics: jest.fn().mockResolvedValue({ topics: [] }),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=notif-2'],
      },
    );

    const highlightedTitle = await screen.findByText(
      'Highlighted notification',
    );
    const highlightedItem = highlightedTitle.closest('[aria-current="true"]');
    expect(highlightedItem).toBeInTheDocument();

    const firstTitle = screen.getByText('First notification');
    expect(firstTitle.closest('[aria-current="true"]')).toBeNull();
  });
});
