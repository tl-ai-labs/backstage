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

import {
  act,
  fireEvent,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { SignalApi, signalApiRef } from '@backstage/plugin-signals-react';
import { JsonObject } from '@backstage/types';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import notificationsAlphaPlugin from '../../alpha';
import { UnreadNotificationsCard } from './UnreadNotificationsCard';

const makeNotification = (
  overrides: Partial<Notification> & { id: string; title: string },
): Notification => ({
  user: 'user:default/guest',
  created: new Date('2026-11-15T10:00:00Z'),
  origin: 'scaffolder',
  ...overrides,
  payload: {
    title: overrides.title,
    severity: 'high',
    topic: 'scaffolder-task',
    ...overrides.payload,
  },
});

describe('UnreadNotificationsCard', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders latest unread notifications with deep links and empty state', async () => {
    const notifications = [
      makeNotification({ id: 'notif-1', title: 'Scaffolder task failed' }),
      makeNotification({
        id: 'notif-2',
        title: 'Platform maintenance',
        user: null,
        origin: 'platform',
        payload: {
          title: 'Platform maintenance',
          severity: 'normal',
          topic: 'broadcast',
        },
      }),
    ];

    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({ notifications, totalCount: 2 })
        .mockResolvedValueOnce({ notifications: [], totalCount: 0 }),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    const firstLink = await screen.findByRole('link', {
      name: 'Scaffolder task failed',
    });
    expect(firstLink).toHaveAttribute('href', '/notifications?id=notif-1');

    const secondLink = screen.getByRole('link', {
      name: 'Platform maintenance',
    });
    expect(secondLink).toHaveAttribute('href', '/notifications?id=notif-2');
    expect(screen.getByText('scaffolder')).toBeInTheDocument();
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View all notifications' }),
    ).toHaveAttribute('href', '/notifications');
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      sort: 'created',
      sortOrder: 'desc',
      limit: 5,
    });

    unmount();

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
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
  });

  it('marks a notification as read and refreshes the list', async () => {
    const initialNotifications = [
      makeNotification({ id: 'notif-1', title: 'First alert' }),
      makeNotification({ id: 'notif-2', title: 'Second alert' }),
    ];
    const remainingNotifications = [
      makeNotification({ id: 'notif-2', title: 'Second alert' }),
    ];

    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: initialNotifications,
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          notifications: remainingNotifications,
          totalCount: 1,
        }),
      updateNotifications: jest.fn().mockResolvedValue([]),
    };

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <UnreadNotificationsCard />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First alert')).toBeInTheDocument();
    const markAsReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    fireEvent.click(markAsReadButtons[0]);

    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['notif-1'],
      read: true,
    });
    await waitForElementToBeRemoved(() => screen.queryByText('First alert'));
    expect(screen.getByText('Second alert')).toBeInTheDocument();
  });

  it('refreshes on signal events and cleans up subscription on unmount', async () => {
    let onMessage: ((message: NotificationSignal) => void) | undefined;
    const unsubscribe = jest.fn();
    const signalApi: SignalApi = {
      subscribe: jest.fn((_channel, cb) => {
        onMessage = cb as unknown as (message: NotificationSignal) => void;
        return { unsubscribe };
      }),
    };

    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [
            makeNotification({ id: 'notif-1', title: 'Initial alert' }),
          ],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          notifications: [
            makeNotification({ id: 'notif-2', title: 'Live signal alert' }),
            makeNotification({ id: 'notif-1', title: 'Initial alert' }),
          ],
          totalCount: 2,
        }),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
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

    expect(await screen.findByText('Initial alert')).toBeInTheDocument();
    expect(signalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );

    act(() => {
      onMessage?.({
        action: 'new_notification',
        notification_id: 'notif-2',
      } as NotificationSignal & JsonObject);
    });

    expect(await screen.findByText('Live signal alert')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to polling when signals are unavailable and cleans up timer on unmount', async () => {
    jest.useFakeTimers();

    const notificationsApi: Partial<NotificationsApi> = {
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({
          notifications: [
            makeNotification({ id: 'notif-1', title: 'Initial alert' }),
          ],
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          notifications: [
            makeNotification({ id: 'notif-2', title: 'Polled alert' }),
          ],
          totalCount: 1,
        }),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <UnreadNotificationsCard pollIntervalMs={5000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Initial alert')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(await screen.findByText('Polled alert')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('registers the home-page widget extension in the alpha plugin', () => {
    expect(
      notificationsAlphaPlugin.getExtension(
        'home-page-widget:notifications/unread-notifications',
      ),
    ).toBeDefined();
  });
});
