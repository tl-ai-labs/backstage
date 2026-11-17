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
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { Notification } from '@backstage/plugin-notifications-common';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { NotificationsPage } from './NotificationsPage';

const makeNotification = (id: string, title: string): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-11-17T08:00:00Z'),
  origin: 'scaffolder',
  payload: {
    title,
    severity: 'normal',
  },
});

const createMockNotificationsApi = (
  overrides: Partial<jest.Mocked<NotificationsApi>> = {},
): jest.Mocked<NotificationsApi> =>
  ({
    getNotifications: jest.fn().mockResolvedValue({
      notifications: [],
      totalCount: 0,
    }),
    getNotification: jest.fn(),
    getStatus: jest.fn().mockResolvedValue({ unread: 1, read: 0 }),
    updateNotifications: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
    getTopics: jest.fn().mockResolvedValue({ topics: [] }),
    ...overrides,
  }) as jest.Mocked<NotificationsApi>;

describe('NotificationsPage', () => {
  it('highlights and scrolls to the notification matching the id query param', async () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const notif1 = makeNotification('notif-1', 'First notification');
    const notif2 = makeNotification('notif-2', 'Highlighted notification');

    const mockApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [notif1, notif2],
        totalCount: 2,
      }),
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockApi],
          [toastApiRef, { post: jest.fn() } as any],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=notif-2'],
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    const highlightedText = await screen.findByText('Highlighted notification');
    const highlightedContainer = highlightedText.closest('[aria-current="true"]');
    expect(highlightedContainer).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(mockApi.getNotification).not.toHaveBeenCalled();
  });

  it('fetches and pins the notification at the top when id is not in the loaded list', async () => {
    const notif1 = makeNotification('notif-1', 'Loaded notification');
    const pinned = makeNotification('notif-99', 'Pinned deep-link notification');

    const mockApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [notif1],
        totalCount: 1,
      }),
      getNotification: jest.fn().mockResolvedValue(pinned),
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockApi],
          [toastApiRef, { post: jest.fn() } as any],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=notif-99'],
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    const pinnedText = await screen.findByText('Pinned deep-link notification');
    expect(pinnedText.closest('[aria-current="true"]')).toBeInTheDocument();
    expect(mockApi.getNotification).toHaveBeenCalledWith('notif-99');

    const rows = screen.getAllByRole('row');
    const dataRows = rows.filter(row => row.querySelector('td'));
    expect(dataRows[0]).toHaveTextContent('Pinned deep-link notification');
    expect(dataRows[1]).toHaveTextContent('Loaded notification');
  });
});
