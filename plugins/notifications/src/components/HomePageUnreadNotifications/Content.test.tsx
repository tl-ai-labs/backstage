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
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { SignalApi, signalApiRef } from '@backstage/plugin-signals-react';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { HomePageUnreadNotifications } from '../../plugin';
import { Content } from './Content';

const createNotification = (
  id: string,
  overrides: Partial<Notification> = {},
): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-01-15T10:00:00Z'),
  origin: 'scaffolder',
  payload: {
    title: `Notification ${id}`,
    description: `Description for ${id}`,
    severity: 'normal',
    topic: 'builds',
  },
  ...overrides,
});

const createMockNotificationsApi = (
  overrides: Partial<jest.Mocked<NotificationsApi>> = {},
): jest.Mocked<NotificationsApi> => ({
  getNotifications: jest.fn().mockResolvedValue({
    notifications: [],
    totalCount: 0,
  }),
  getNotification: jest.fn(),
  getStatus: jest.fn().mockResolvedValue({ unread: 0, read: 0 }),
  updateNotifications: jest.fn().mockResolvedValue([]),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
  getTopics: jest.fn().mockResolvedValue({ topics: [] }),
  ...overrides,
});

describe('HomePageUnreadNotifications', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders latest unread notifications with deep links, supports custom limit, and handles empty state', async () => {
    const n1 = createNotification('notif-1', {
      payload: {
        title: 'Scaffolder task failed',
        severity: 'critical',
        topic: 'scaffolder',
      },
    });
    const n2 = createNotification('notif-2', {
      origin: 'catalog',
      payload: {
        title: 'Entity processing error',
        severity: 'high',
      },
    });

    const mockApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [n1, n2],
        totalCount: 2,
      }),
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <Content limit={3} />
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

    const secondLink = screen.getByRole('link', {
      name: 'Entity processing error',
    });
    expect(secondLink).toHaveAttribute('href', '/notifications?id=notif-2');

    expect(mockApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 3,
      sort: 'created',
      sortOrder: 'desc',
    });

    unmount();

    const emptyApi = createMockNotificationsApi();
    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, emptyApi]]}>
        <Content />
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
    expect(emptyApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });
  });

  it('marks an item as read and removes it from the list', async () => {
    const n1 = createNotification('notif-1', {
      payload: { title: 'First unread alert', severity: 'high' },
    });
    const n2 = createNotification('notif-2', {
      payload: { title: 'Second unread alert', severity: 'normal' },
    });

    const mockApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [n1, n2],
        totalCount: 2,
      }),
      updateNotifications: jest.fn().mockResolvedValue([n1]),
    });

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <Content />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('First unread alert')).toBeInTheDocument();
    expect(screen.getByText('Second unread alert')).toBeInTheDocument();

    const markAsReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    expect(markAsReadButtons).toHaveLength(2);

    fireEvent.click(markAsReadButtons[0]);

    expect(mockApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['notif-1'],
      read: true,
    });

    // Wait for the state update to remove the first item
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText('First unread alert')).not.toBeInTheDocument();
    expect(screen.getByText('Second unread alert')).toBeInTheDocument();
  });

  it('refreshes on notification signals and unsubscribes on unmount without polling', async () => {
    jest.useFakeTimers();

    const n1 = createNotification('notif-1', {
      payload: { title: 'Initial alert', severity: 'normal' },
    });
    const n2 = createNotification('notif-2', {
      payload: { title: 'Live signal alert', severity: 'critical' },
    });

    const mockApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({ notifications: [n1], totalCount: 1 })
        .mockResolvedValueOnce({ notifications: [n2, n1], totalCount: 2 }),
    });

    let signalCallback: ((msg: NotificationSignal) => void) | undefined;
    const unsubscribe = jest.fn();
    const mockSignalApi: SignalApi = {
      subscribe: jest.fn((_channel, onMessage) => {
        signalCallback = onMessage as unknown as (
          msg: NotificationSignal,
        ) => void;
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
        <Content pollingIntervalMs={5000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Initial alert')).toBeInTheDocument();
    expect(mockSignalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);

    // Polling should not run when signals are available
    act(() => {
      jest.advanceTimersByTime(15000);
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);

    // Triggering a signal refreshes the list
    act(() => {
      signalCallback?.({
        action: 'new_notification',
        notification_id: 'notif-2',
      });
    });

    expect(await screen.findByText('Live signal alert')).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);

    // Unmounting cleans up the signal subscription
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to polling when signals are unavailable and clears timer on unmount', async () => {
    jest.useFakeTimers();

    const n1 = createNotification('notif-1', {
      payload: { title: 'Before poll alert', severity: 'normal' },
    });
    const n2 = createNotification('notif-2', {
      payload: { title: 'After poll alert', severity: 'high' },
    });

    const mockApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValueOnce({ notifications: [n1], totalCount: 1 })
        .mockResolvedValueOnce({ notifications: [n2, n1], totalCount: 2 }),
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <Content pollingIntervalMs={10000} />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Before poll alert')).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(await screen.findByText('After poll alert')).toBeInTheDocument();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);

    // Unmounting clears the polling interval
    unmount();
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('renders the HomePageUnreadNotifications card extension with title and actions', async () => {
    const n1 = createNotification('notif-1', {
      payload: { title: 'Card extension alert', severity: 'normal' },
    });
    const mockApi = createMockNotificationsApi({
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [n1],
        totalCount: 1,
      }),
    });

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, mockApi]]}>
        <HomePageUnreadNotifications />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: 'Card extension alert' }),
    ).toHaveAttribute('href', '/notifications?id=notif-1');
    expect(
      screen.getByRole('link', { name: 'View all notifications' }),
    ).toHaveAttribute('href', '/notifications');
  });
});
