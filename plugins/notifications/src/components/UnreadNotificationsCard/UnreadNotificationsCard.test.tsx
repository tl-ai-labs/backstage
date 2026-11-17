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
import { Notification } from '@backstage/plugin-notifications-common';
import { SignalApi, signalApiRef } from '@backstage/plugin-signals-react';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { UnreadNotificationsCard } from './UnreadNotificationsCard';

const makeNotification = (
  id: string,
  title: string,
  severity: Notification['payload']['severity'] = 'normal',
): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-11-17T08:00:00Z'),
  origin: 'scaffolder',
  payload: {
    title,
    severity,
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
    getStatus: jest.fn(),
    updateNotifications: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
    getTopics: jest.fn(),
    ...overrides,
  }) as jest.Mocked<NotificationsApi>;

describe('UnreadNotificationsCard', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders unread notifications, deep links, view-all link, and handles mark-as-read', async () => {
    const first = makeNotification('notif-1', 'Scaffolder task failed', 'high');
    const second = makeNotification('notif-2', 'Entity error', 'critical');
    const third = makeNotification('notif-3', 'Remaining alert', 'normal');

    const mockApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [first, second],
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          notifications: [third],
          totalCount: 1,
        }),
    });

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <UnreadNotificationsCard limit={5} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    const firstLink = await screen.findByRole('link', {
      name: 'Scaffolder task failed',
    });
    expect(firstLink).toHaveAttribute('href', '/notifications?id=notif-1');
    expect(
      screen.getByRole('link', { name: 'Entity error' }),
    ).toHaveAttribute('href', '/notifications?id=notif-2');
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(mockApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });

    const markReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    fireEvent.click(markReadButtons[0]);

    expect(
      await screen.findByRole('link', { name: 'Remaining alert' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Scaffolder task failed' }),
    ).not.toBeInTheDocument();
    expect(mockApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['notif-1'],
      read: true,
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('renders empty and error states', async () => {
    const emptyApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [],
        totalCount: 0,
      }),
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, emptyApi]]}>
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
    unmount();

    const errorApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockRejectedValue(new Error('Network error')),
    });

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, errorApi]]}>
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('Error: Network error'),
    ).toBeInTheDocument();
  });

  it('refreshes on notifications signal and does not poll while signals are available', async () => {
    jest.useFakeTimers();

    const initial = makeNotification('notif-1', 'Initial alert');
    const updated = makeNotification('notif-2', 'New signal alert');

    const mockApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [initial],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          notifications: [updated],
          totalCount: 1,
        }),
    });

    let signalCallback: ((msg: any) => void) | undefined;
    const unsubscribe = jest.fn();
    const mockSignalApi: SignalApi = {
      subscribe: jest.fn((_channel, onMessage) => {
        signalCallback = onMessage;
        return { unsubscribe };
      }),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, mockApi],
          [signalApiRef, mockSignalApi],
        ]}
      >
        <UnreadNotificationsCard pollingIntervalMs={5000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByRole('link', { name: 'Initial alert' }),
    ).toBeInTheDocument();

    // Advance timers well past pollingIntervalMs — should NOT poll when signals are available
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);

    // Emit a signal — should trigger refresh
    await act(async () => {
      signalCallback?.({ action: 'new_notification', notification_id: 'notif-2' });
    });

    expect(
      await screen.findByRole('link', { name: 'New signal alert' }),
    ).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('falls back to polling when signals are unavailable and cleans up timers and in-flight requests on unmount', async () => {
    jest.useFakeTimers();

    const initial = makeNotification('notif-1', 'First poll');
    const polled = makeNotification('notif-2', 'Second poll');

    let resolveInFlight: ((value: any) => void) | undefined;
    const inFlightPromise = new Promise(resolve => {
      resolveInFlight = resolve;
    });

    const mockApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [initial],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          notifications: [polled],
          totalCount: 1,
        })
        .mockReturnValueOnce(inFlightPromise as any),
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <UnreadNotificationsCard pollingIntervalMs={10000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByRole('link', { name: 'First poll' }),
    ).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);

    // Advance by pollingIntervalMs -> triggers second fetch
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(
      await screen.findByRole('link', { name: 'Second poll' }),
    ).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);

    // Advance by pollingIntervalMs -> starts third (in-flight) fetch
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(3);

    // Unmount while third fetch is still in-flight
    unmount();

    // Resolving in-flight fetch after unmount should not throw or update state
    await act(async () => {
      resolveInFlight?.({
        notifications: [makeNotification('notif-3', 'After unmount')],
        totalCount: 1,
      });
    });

    // Advancing timers after unmount should not trigger any more polls
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(3);
  });
});
