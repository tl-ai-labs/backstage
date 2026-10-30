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
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { NfsNotificationsPage } from './NotificationsPage';

const createNotification = (id: string, title: string): Notification => ({
  id,
  user: 'user:default/john',
  created: new Date('2026-01-01T00:00:00Z'),
  origin: 'test-origin',
  payload: {
    title,
    description: `${title} description`,
    severity: 'low',
    topic: 'test-topic',
  },
  updated: undefined,
});

const n1 = createNotification('n1', 'First notification');
const n2 = createNotification('n2', 'Second notification');

describe('NotificationsPage', () => {
  const notificationsApi = {
    getNotifications: jest.fn(),
    getStatus: jest.fn(),
    getTopics: jest.fn(),
    updateNotifications: jest.fn(),
  };

  const originalScrollIntoView = Element.prototype.scrollIntoView;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [n1, n2],
      totalCount: 2,
    });
    notificationsApi.getStatus.mockResolvedValue({ unread: 2, read: 0 });
    notificationsApi.getTopics.mockResolvedValue({ topics: [] });
    notificationsApi.updateNotifications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('highlights and scrolls to the notification named by the id query parameter', async () => {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        mountedRoutes: { '/notifications': rootRouteRef },
        routeEntries: ['/notifications?id=n1'],
      },
    );

    const firstTitle = await screen.findByText('First notification');
    const secondTitle = await screen.findByText('Second notification');

    expect(firstTitle.closest('[aria-current="true"]')).not.toBeNull();
    expect(secondTitle.closest('[aria-current="true"]')).toBeNull();
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'center' });
  });

  it('renders without a highlight when the id is absent or unknown', async () => {
    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        mountedRoutes: { '/notifications': rootRouteRef },
        routeEntries: ['/notifications'],
      },
    );

    let firstTitle = await screen.findByText('First notification');
    let secondTitle = await screen.findByText('Second notification');
    expect(firstTitle.closest('[aria-current="true"]')).toBeNull();
    expect(secondTitle.closest('[aria-current="true"]')).toBeNull();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    unmount();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        mountedRoutes: { '/notifications': rootRouteRef },
        routeEntries: ['/notifications?id=missing'],
      },
    );

    firstTitle = await screen.findByText('First notification');
    secondTitle = await screen.findByText('Second notification');
    expect(firstTitle.closest('[aria-current="true"]')).toBeNull();
    expect(secondTitle.closest('[aria-current="true"]')).toBeNull();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
