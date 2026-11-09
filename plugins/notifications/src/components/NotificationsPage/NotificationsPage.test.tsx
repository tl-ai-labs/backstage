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
import { NotificationsPage } from './NotificationsPage';

const mockNotification1: Notification = {
  id: 'n1',
  user: 'user:default/john',
  origin: 'plugin-test',
  created: new Date('2026-01-01T00:00:00Z'),
  payload: {
    title: 'First alert',
    severity: 'low',
  },
};

const mockNotification2: Notification = {
  id: 'n2',
  user: 'user:default/john',
  origin: 'plugin-test',
  created: new Date('2026-01-02T00:00:00Z'),
  payload: {
    title: 'Second alert',
    severity: 'high',
  },
};

describe('NotificationsPage', () => {
  const mockNotificationsApi = {
    getNotifications: jest.fn(),
    getStatus: jest.fn(),
    getTopics: jest.fn(),
    updateNotifications: jest.fn(),
  };

  const mockToastApi = {
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationsApi.getNotifications.mockResolvedValue({
      notifications: [mockNotification1, mockNotification2],
      totalCount: 2,
    });
    mockNotificationsApi.getStatus.mockResolvedValue({ unread: 2, read: 0 });
    mockNotificationsApi.getTopics.mockResolvedValue({ topics: [] });
    mockNotificationsApi.updateNotifications.mockResolvedValue([]);
  });

  it('highlights the notification named in the id search parameter', async () => {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockNotificationsApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=n2'],
      },
    );

    const first = await screen.findByText('First alert');
    const second = await screen.findByText('Second alert');

    const highlightedElement = second.closest('[aria-current="true"]');
    expect(highlightedElement).toBeInTheDocument();
    expect(highlightedElement).toHaveClass('highlighted');

    expect(first.closest('[aria-current="true"]')).toBeNull();

    const allCurrentElements = document.querySelectorAll(
      '[aria-current="true"]',
    );
    expect(allCurrentElements).toHaveLength(1);
  });

  it('highlights nothing without an id search parameter', async () => {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockNotificationsApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications'],
      },
    );

    await screen.findByText('First alert');
    await screen.findByText('Second alert');

    const allCurrentElements = document.querySelectorAll(
      '[aria-current="true"]',
    );
    expect(allCurrentElements).toHaveLength(0);
  });
});
