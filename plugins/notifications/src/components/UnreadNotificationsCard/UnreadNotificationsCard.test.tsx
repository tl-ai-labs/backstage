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
import { SignalApi, signalApiRef } from '@backstage/plugin-signals-react';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { UnreadNotificationsCard } from './UnreadNotificationsCard';

const makeNotification = (id: string, title: string): Notification => ({
  id,
  user: 'user:default/guest',
  origin: 'test',
  created: new Date(),
  payload: {
    title,
    severity: 'normal',
  },
});

describe('UnreadNotificationsCard', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the title, unread items with deep links and the view all link', async () => {
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [
          makeNotification('n1', 'First alert'),
          makeNotification('n2', 'Second alert'),
        ],
        totalCount: 2,
      }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ read: false, limit: 5 }),
    );

    const firstLink = (await screen.findByText('First alert')).closest('a');
    expect(firstLink?.getAttribute('href')).toMatch(/\/notifications\?id=n1$/);

    const secondLink = (await screen.findByText('Second alert')).closest('a');
    expect(secondLink?.getAttribute('href')).toMatch(/\/notifications\?id=n2$/);

    const viewAllLink = screen.getByRole('link', {
      name: 'View all notifications',
    });
    expect(viewAllLink.getAttribute('href')).toBe('/notifications');

    const markAsReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    expect(markAsReadButtons).toHaveLength(2);
  });

  it('shows the empty state when there are no unread notifications', async () => {
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [],
        totalCount: 0,
      }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
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
    expect(
      screen.queryByRole('button', { name: 'Mark as read' }),
    ).not.toBeInTheDocument();
  });

  it('marks an item as read and refetches the list', async () => {
    const notificationsApi = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [
            makeNotification('n1', 'First alert'),
            makeNotification('n2', 'Second alert'),
          ],
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          notifications: [makeNotification('n2', 'Second alert')],
          totalCount: 1,
        }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First alert')).toBeInTheDocument();

    const [firstButton] = screen.getAllByRole('button', {
      name: 'Mark as read',
    });

    await act(async () => {
      fireEvent.click(firstButton);
    });

    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });

    expect(await screen.findByText('Second alert')).toBeInTheDocument();
    expect(screen.queryByText('First alert')).toBeNull();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('posts a danger toast without refetching when marking as read fails', async () => {
    const post = jest.fn();
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [makeNotification('n1', 'First alert')],
        totalCount: 1,
      }),
      updateNotifications: jest.fn().mockRejectedValue(new Error('nope')),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post }],
        ]}
      >
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First alert')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    });

    expect(post).toHaveBeenCalledWith({
      title: 'Failed to mark notification as read',
      status: 'danger',
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
    expect(screen.getByText('First alert')).toBeInTheDocument();
  });

  it('shows an error panel when loading unread notifications fails', async () => {
    const notificationsApi = {
      getNotifications: jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable')),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    const messages = await screen.findAllByText(/Service unavailable/);
    expect(messages.length).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: 'Mark as read' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View all notifications' }),
    ).toBeInTheDocument();
  });

  it('refetches when a notifications signal arrives and unsubscribes on unmount', async () => {
    let signalCallback: ((message: NotificationSignal) => void) | undefined;
    const unsubscribe = jest.fn();
    const signalApi: SignalApi = {
      subscribe: jest.fn((channel, onMessage) => {
        if (channel === 'notifications') {
          signalCallback = onMessage as unknown as (
            message: NotificationSignal,
          ) => void;
        }
        return { unsubscribe };
      }),
    };

    const notificationsApi = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [makeNotification('n1', 'First alert')],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          notifications: [
            makeNotification('n1', 'First alert'),
            makeNotification('n3', 'Third alert'),
          ],
          totalCount: 2,
        }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
          [signalApiRef, signalApi],
        ]}
      >
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First alert')).toBeInTheDocument();
    expect(signalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );

    await act(async () => {
      signalCallback?.({
        action: 'new_notification',
        notification_id: 'n3',
      } as NotificationSignal);
    });

    expect(await screen.findByText('Third alert')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('polls when signals are unavailable and stops polling after unmount', async () => {
    jest.useFakeTimers();

    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [makeNotification('n1', 'First alert')],
        totalCount: 1,
      }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, { post: jest.fn() }],
        ]}
      >
        <UnreadNotificationsCard pollingIntervalMs={1000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First alert')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
