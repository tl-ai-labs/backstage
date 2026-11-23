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
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

const mockToastApi = {
  post: jest.fn(),
};

const createNotification = (id: string, title: string): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-01-15T10:00:00Z'),
  origin: 'scaffolder',
  payload: {
    title,
    severity: 'normal',
  },
});

const createMockApi = (
  overrides: Partial<jest.Mocked<NotificationsApi>> = {},
): jest.Mocked<NotificationsApi> => ({
  getNotifications: jest.fn().mockResolvedValue({
    notifications: [],
    totalCount: 0,
  }),
  getNotification: jest.fn(),
  getStatus: jest.fn().mockResolvedValue({ unread: 2, read: 0 }),
  updateNotifications: jest.fn().mockResolvedValue([]),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
  getTopics: jest.fn().mockResolvedValue({ topics: [] }),
  ...overrides,
});

describe('NotificationsPage deep-link highlighting', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('highlights and scrolls to the notification specified by the id query parameter', async () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const n1 = createNotification('notif-1', 'First notification');
    const n2 = createNotification('notif-2', 'Highlighted notification');
    const mockApi = createMockApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [n1, n2],
        totalCount: 2,
      }),
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      { routeEntries: ['/notifications?id=notif-2'] },
    );

    const highlightedText = await screen.findByText('Highlighted notification');
    const highlightedContainer = highlightedText.closest('[aria-current]');
    expect(highlightedContainer).toHaveAttribute('aria-current', 'true');

    const firstText = screen.getByText('First notification');
    expect(firstText.closest('[aria-current]')).toBeNull();
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('fetches and highlights a deep-linked notification that is not in the current page', async () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const n1 = createNotification('notif-1', 'Page one notification');
    const deepLinked = createNotification('notif-99', 'Deep linked alert');
    const mockApi = createMockApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [n1],
        totalCount: 1,
      }),
      getNotification: jest.fn().mockResolvedValue(deepLinked),
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      { routeEntries: ['/notifications?id=notif-99'] },
    );

    const deepLinkedText = await screen.findByText('Deep linked alert');
    expect(deepLinkedText.closest('[aria-current]')).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(mockApi.getNotification).toHaveBeenCalledWith('notif-99');
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});
