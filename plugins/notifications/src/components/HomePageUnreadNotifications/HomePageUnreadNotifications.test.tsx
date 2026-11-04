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
import { act, fireEvent, screen } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { Notification } from '@backstage/plugin-notifications-common';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { NotificationsPage } from '../NotificationsPage';
import { Content } from './HomePageUnreadNotifications';

const createNotification = (
  id: string,
  title: string,
  origin: string,
): Notification =>
  ({
    id,
    user: 'user:default/guest',
    created: new Date(),
    origin,
    read: undefined,
    saved: undefined,
    payload: {
      title,
      description: `Description of ${title}`,
      severity: 'normal',
      topic: 'general',
    },
  } as unknown as Notification);

const makeSignalApi = () => {
  const listeners: Array<(message: any) => void> = [];
  const unsubscribe = jest.fn();
  const subscribe = jest.fn((first: any, second?: any) => {
    const onMessage =
      typeof first === 'string' ? second : first?.onMessage ?? first?.callback;
    listeners.push(onMessage);
    return { unsubscribe };
  });
  const emit = (message: any) => {
    act(() => {
      listeners.forEach(l => l(message));
    });
  };
  return { api: { subscribe }, emit, unsubscribe };
};

describe('HomePageUnreadNotifications', () => {
  const toastApi = { post: jest.fn(), close: jest.fn() };

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    toastApi.post.mockClear();
  });

  it('fetches and renders latest unread notifications and links each item to /notifications?id=<id>', async () => {
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [
          createNotification('notif-1', 'First unread title', 'origin-alpha'),
          createNotification('notif-2', 'Second unread title', 'origin-beta'),
        ],
        totalCount: 2,
      }),
      updateNotifications: jest.fn(),
    };
    const signal = makeSignalApi();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signal.api],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

    const first = await screen.findByRole('link', {
      name: 'First unread title',
    });
    const second = await screen.findByRole('link', {
      name: 'Second unread title',
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });
    expect(first).toHaveAttribute('href', '/notifications?id=notif-1');
    expect(second).toHaveAttribute('href', '/notifications?id=notif-2');
    expect(await screen.findByText(/origin-alpha/)).toBeInTheDocument();
    expect(await screen.findByText(/origin-beta/)).toBeInTheDocument();
  });

  it('renders empty state when there are no unread notifications', async () => {
    const notificationsApi = {
      getNotifications: jest
        .fn()
        .mockResolvedValue({ notifications: [], totalCount: 0 }),
      updateNotifications: jest.fn(),
    };
    const signal = makeSignalApi();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signal.api],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

    expect(
      await screen.findByText(/no unread notifications/i),
    ).toBeInTheDocument();
  });

  it('renders error state when getNotifications rejects', async () => {
    const notificationsApi = {
      getNotifications: jest.fn().mockRejectedValue(new Error('boom failure')),
      updateNotifications: jest.fn(),
    };
    const signal = makeSignalApi();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signal.api],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

    const matches = await screen.findAllByText(/boom failure/);
    expect(matches[0]).toBeInTheDocument();
  });

  it('marks a notification as read and removes it from the unread list', async () => {
    const notificationsApi = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [
            createNotification('notif-1', 'Mark me title', 'origin-alpha'),
          ],
          totalCount: 1,
        })
        .mockResolvedValue({ notifications: [], totalCount: 0 }),
      updateNotifications: jest.fn().mockResolvedValue(undefined),
    };
    const signal = makeSignalApi();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signal.api],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

    expect(await screen.findByText('Mark me title')).toBeInTheDocument();
    const button = await screen.findByRole('button', {
      name: /mark as read/i,
    });
    fireEvent.click(button);

    expect(await screen.findByText(/no unread notifications/i)).toBeVisible();
    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['notif-1'],
      read: true,
    });
    expect(screen.queryByText('Mark me title')).not.toBeInTheDocument();
  });

  it.each(['new_notification', 'notification_read', 'notification_unread'])(
    'refreshes unread notifications when a %s signal is received',
    async action => {
      const notificationsApi = {
        getNotifications: jest
          .fn()
          .mockResolvedValueOnce({
            notifications: [
              createNotification('notif-1', 'Initial title', 'origin-alpha'),
            ],
            totalCount: 1,
          })
          .mockResolvedValue({
            notifications: [
              createNotification('notif-3', 'Refreshed title', 'origin-gamma'),
            ],
            totalCount: 1,
          }),
        updateNotifications: jest.fn(),
      };
      const signal = makeSignalApi();

      await renderInTestApp(
        <TestApiProvider
          apis={[
            [notificationsApiRef, notificationsApi],
            [signalApiRef, signal.api],
            [toastApiRef, toastApi],
          ]}
        >
          <Content />
        </TestApiProvider>,
        { mountedRoutes: { '/notifications': rootRouteRef } },
      );

      expect(await screen.findByText('Initial title')).toBeInTheDocument();
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

      signal.emit({ action });

      expect(await screen.findByText('Refreshed title')).toBeInTheDocument();
      expect(
        notificationsApi.getNotifications.mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  it('falls back to polling when signals are unavailable and cleans up interval on unmount', async () => {
    jest.useFakeTimers();
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [
          createNotification('notif-1', 'Polled title', 'origin-alpha'),
        ],
        totalCount: 1,
      }),
      updateNotifications: jest.fn(),
    };
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

    expect(await screen.findByText('Polled title')).toBeInTheDocument();
    const initialCalls = notificationsApi.getNotifications.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    const afterFirstTick = notificationsApi.getNotifications.mock.calls.length;
    expect(afterFirstTick).toBeGreaterThan(initialCalls);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    const afterSecondTick = notificationsApi.getNotifications.mock.calls.length;
    expect(afterSecondTick).toBeGreaterThan(afterFirstTick);

    unmount();
    expect(clearSpy).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(
      afterSecondTick,
    );
  });

  it('highlights the matching notification on NotificationsPage when navigated to /notifications?id=<id>', async () => {
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [
          createNotification('notif-1', 'Plain row item', 'origin-alpha'),
          createNotification('notif-2', 'Highlighted row item', 'origin-beta'),
          createNotification('notif-3', 'Another plain item', 'origin-gamma'),
        ],
        totalCount: 3,
      }),
      getStatus: jest.fn().mockResolvedValue({ unread: 3, read: 0 }),
      getTopics: jest.fn().mockResolvedValue({ topics: [] }),
      updateNotifications: jest.fn().mockResolvedValue(undefined),
    };
    const signal = makeSignalApi();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signal.api],
          [toastApiRef, toastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        mountedRoutes: { '/notifications': rootRouteRef },
        routeEntries: ['/notifications?id=notif-2'],
      },
    );

    expect(await screen.findByText('Highlighted row item')).toBeInTheDocument();
    const rows = await screen.findAllByRole('row');
    const matchingRow = rows.find(r =>
      r.textContent?.includes('Highlighted row item'),
    ) as HTMLElement;
    const nonMatchingRow = rows.find(r =>
      r.textContent?.includes('Plain row item'),
    ) as HTMLElement;
    expect(matchingRow).toBeDefined();
    expect(nonMatchingRow).toBeDefined();

    expect(matchingRow.style.backgroundColor).toBe(
      'var(--bui-bg-neutral-1, rgba(0, 0, 0, 0.04))',
    );
    expect(nonMatchingRow.style.backgroundColor).toBe('');
  }, 30000);
});
