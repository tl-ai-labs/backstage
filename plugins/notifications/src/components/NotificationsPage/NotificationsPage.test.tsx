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

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { notificationsApiRef } from '../../api';
import { alertApiRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { NotificationsPage as NfsNotificationsPage } from './NotificationsPage';
import { Notification } from '@backstage/plugin-notifications-common';

describe('NotificationsPage', () => {
  const createNotification = (
    id: string,
    title: string,
    read: boolean = false,
  ): Notification => ({
    id,
    user: 'user:default/john',
    created: new Date('2026-01-01T00:00:00Z'),
    payload: {
      title,
      description: `Description for ${title}`,
    },
    read: read ? new Date('2026-01-01T01:00:00Z') : undefined,
    origin: 'plugin-test',
  });

  const defaultMockApi = {
    getNotifications: jest.fn(),
    getNotification: jest.fn(),
    getStatus: jest.fn(),
    getTopics: jest.fn(),
    markAsRead: jest.fn(),
    updateNotifications: jest.fn(),
  };

  const alertApiMock = {
    post: jest.fn(),
  };

  const toastApiMock = {
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    defaultMockApi.getStatus.mockResolvedValue({ unread: 5, read: 10 });
    defaultMockApi.getTopics.mockResolvedValue({ topics: [] });
  });

  it('shows and highlights a notification the filters would hide', async () => {
    const listNotifications = [
      createNotification('1', 'Notification 1'),
      createNotification('2', 'Notification 2'),
      createNotification('3', 'Notification 3'),
      createNotification('4', 'Notification 4'),
      createNotification('5', 'Notification 5'),
    ];
    const hiddenNotification = createNotification(
      'hidden',
      'Hidden Notification',
      true,
    );

    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: listNotifications,
      totalCount: listNotifications.length,
    });
    defaultMockApi.getNotification.mockResolvedValue(hiddenNotification);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=hidden'],
      },
    );

    expect(defaultMockApi.getNotification).toHaveBeenCalledWith('hidden');

    const highlightedElement = (
      await screen.findByText('Hidden Notification')
    ).closest('[aria-current="true"]');
    expect(highlightedElement).toBeInTheDocument();

    for (const item of listNotifications) {
      expect(await screen.findByText(item.payload.title)).toBeInTheDocument();
    }
  });

  it('shows a notification from the current page only once', async () => {
    const item = createNotification('n-1', 'Notification N-1');
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [item],
      totalCount: 1,
    });
    defaultMockApi.getNotification.mockResolvedValue(item);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=n-1'],
      },
    );

    const occurrences = await screen.findAllByText('Notification N-1');
    expect(occurrences).toHaveLength(1);

    const highlighted = occurrences[0].closest('[aria-current="true"]');
    expect(highlighted).toBeInTheDocument();
  });

  it('treats a failed lookup as nothing to highlight', async () => {
    const listNotifications = [createNotification('1', 'Notification 1')];
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: listNotifications,
      totalCount: listNotifications.length,
    });
    defaultMockApi.getNotification.mockRejectedValue(
      new Error('lookup failed'),
    );

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=gone'],
      },
    );

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    expect(document.querySelector('[aria-current="true"]')).toBeNull();
    expect(screen.queryByText('lookup failed')).toBeNull();
  });

  it('does not look anything up without an id', async () => {
    const listNotifications = [createNotification('1', 'Notification 1')];
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: listNotifications,
      totalCount: listNotifications.length,
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
    );

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    expect(defaultMockApi.getNotification).not.toHaveBeenCalled();
    expect(document.querySelector('[aria-current="true"]')).toBeNull();
  });

  it('keeps its row when lookup fails for an id present in the list', async () => {
    const item = createNotification('item-1', 'Notification Item 1');
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [item],
      totalCount: 1,
    });
    defaultMockApi.getNotification.mockRejectedValue(
      new Error('lookup failed'),
    );

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=item-1'],
      },
    );

    expect(await screen.findByText('Notification Item 1')).toBeInTheDocument();
    expect(document.querySelector('[aria-current="true"]')).toBeNull();
    expect(screen.queryByText('lookup failed')).toBeNull();
  });

  it('refreshes the lookup when the highlighted block action is pressed', async () => {
    const item = createNotification(
      'item-unread',
      'Unread Notification',
      false,
    );
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [],
      totalCount: 0,
    });
    defaultMockApi.getNotification.mockResolvedValue(item);
    defaultMockApi.updateNotifications.mockResolvedValue([]);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=item-unread'],
      },
    );

    const block = (await screen.findByText('Unread Notification')).closest(
      '[aria-current="true"]',
    );
    expect(block).not.toBeNull();

    const readButton = within(block as HTMLElement).getByRole('button', {
      name: 'Mark selected as read',
    });
    fireEvent.click(readButton);

    expect(defaultMockApi.updateNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['item-unread'], read: true }),
    );

    await waitFor(() => {
      expect(defaultMockApi.getNotification).toHaveBeenCalledTimes(2);
    });
  });

  it('shows a row of the current page only in the highlight', async () => {
    const first = createNotification('first-id', 'First Notification');
    const second = createNotification('second-id', 'Second Notification');

    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [first, second],
      totalCount: 2,
    });
    defaultMockApi.getNotification.mockResolvedValue(first);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=first-id'],
      },
    );

    const occurrences = await screen.findAllByText('First Notification');
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].closest('[aria-current="true"]')).toBeInTheDocument();

    const secondElement = await screen.findByText('Second Notification');
    expect(secondElement).toBeInTheDocument();
    expect(secondElement.closest('[aria-current="true"]')).toBeNull();
  });

  it('hides the empty message only when the highlight is the only row', async () => {
    const item = createNotification('single-id', 'Single Notification');

    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [item],
      totalCount: 1,
    });
    defaultMockApi.getNotification.mockResolvedValue(item);

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=single-id'],
      },
    );

    await screen.findByText('Single Notification');
    expect(screen.queryByText('No records to display')).toBeNull();

    unmount();

    const readItem = createNotification('read-1', 'Read notification', true);
    defaultMockApi.getNotifications.mockResolvedValue({
      notifications: [],
      totalCount: 0,
    });
    defaultMockApi.getNotification.mockResolvedValue(readItem);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, defaultMockApi],
          [alertApiRef, alertApiMock],
          [toastApiRef, toastApiMock],
        ]}
      >
        <NfsNotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/?id=read-1'],
      },
    );

    expect(
      await screen.findByText('No records to display'),
    ).toBeInTheDocument();
    expect(screen.getByText('Read notification')).toBeInTheDocument();
  });
});
