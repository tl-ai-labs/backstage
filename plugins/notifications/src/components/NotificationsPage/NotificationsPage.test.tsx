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
  mockApis,
  renderInTestApp,
  TestApiProvider,
} from '@backstage/test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    user: 'user:default/guest',
    created: new Date('2026-01-02T10:00:00Z'),
    origin: 'plugin:scaffolder',
    payload: {
      title: 'First notification',
      severity: 'normal',
    },
  },
  {
    id: 'notif-2',
    user: 'user:default/guest',
    created: new Date('2026-01-01T10:00:00Z'),
    origin: 'plugin:catalog',
    payload: {
      title: 'Highlighted notification',
      severity: 'high',
    },
  },
];

describe('NotificationsPage', () => {
  it('highlights the notification row matching the ?id= query parameter', async () => {
    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
      }),
      getStatus: jest.fn().mockResolvedValue({ unread: 2, read: 0 }),
      getTopics: jest.fn().mockResolvedValue({ topics: [] }),
    };
    const signalApi = {
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    };
    const toastApi = {
      post: jest.fn(),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signalApi],
          [configApiRef, mockApis.config()],
          [toastApiRef, toastApi],
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
    const firstTitle = await screen.findByText('First notification');

    expect(highlightedTitle.closest('.highlightedRow')).not.toBeNull();
    expect(firstTitle.closest('.highlightedRow')).toBeNull();
  });
});
