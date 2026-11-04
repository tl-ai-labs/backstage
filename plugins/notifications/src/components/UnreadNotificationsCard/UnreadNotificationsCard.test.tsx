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

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { ApiBlueprint, toastApiRef } from '@backstage/frontend-plugin-api';
import { createExtensionTester } from '@backstage/frontend-test-utils';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { Notification } from '@backstage/plugin-notifications-common';
import { signalApiRef, useSignal } from '@backstage/plugin-signals-react';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import notificationsPlugin from '../../alpha';
import { UnreadNotificationsCard } from './UnreadNotificationsCard';

jest.mock('@backstage/plugin-signals-react', () => {
  const actual = jest.requireActual('@backstage/plugin-signals-react');
  return {
    ...actual,
    useSignal: jest.fn(),
  };
});

const mockedUseSignal = useSignal as jest.MockedFunction<typeof useSignal>;

const createNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 'notif-1',
  user: 'user:default/guest',
  created: new Date('2026-01-01T00:00:00.000Z'),
  saved: undefined,
  read: undefined,
  updated: new Date('2026-01-01T00:00:00.000Z'),
  origin: 'plugin:test',
  payload: {
    title: 'First unread notification',
    description: 'Notification description',
    severity: 'normal',
  },
  ...overrides,
});

describe('UnreadNotificationsCard', () => {
  let notificationsApi: jest.Mocked<NotificationsApi>;
  let toastApi: { post: jest.Mock };
  let signalSubscribers: Array<(msg: any) => void>;
  let signalApi: { subscribe: jest.Mock };

  beforeEach(() => {
    signalSubscribers = [];
    const actualSignals = jest.requireActual('@backstage/plugin-signals-react');
    mockedUseSignal.mockImplementation((channel: string) =>
      actualSignals.useSignal(channel),
    );

    notificationsApi = {
      getNotifications: jest.fn(),
      getNotification: jest.fn(),
      getStatus: jest.fn(),
      updateNotifications: jest.fn(),
      getNotificationSettings: jest.fn(),
      updateNotificationSettings: jest.fn(),
      getTopics: jest.fn(),
    };

    toastApi = {
      post: jest.fn(),
    };

    signalApi = {
      subscribe: jest.fn((_channel: string, fn: (msg: any) => void) => {
        signalSubscribers.push(fn);
        return {
          unsubscribe: jest.fn(),
        };
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders unread notifications with links to /notifications?id=<id> and view all link', async () => {
    const notifications = [
      createNotification({
        id: 'notif-1',
        payload: {
          title: 'First unread notification',
          description: 'First description',
          severity: 'normal',
        },
      }),
      createNotification({
        id: 'notif-2',
        payload: {
          title: 'Second unread notification',
          description: 'Second description',
          severity: 'high',
        },
      }),
    ];

    notificationsApi.getNotifications.mockResolvedValue({
      notifications,
      totalCount: 2,
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();
    expect(screen.getByText('Second unread notification')).toBeInTheDocument();

    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });

    const firstLink = screen
      .getByText('First unread notification')
      .closest('a');
    expect(firstLink).toHaveAttribute('href', '/notifications?id=notif-1');

    const secondLink = screen
      .getByText('Second unread notification')
      .closest('a');
    expect(secondLink).toHaveAttribute('href', '/notifications?id=notif-2');

    const viewAllLink = screen.getByText('View all notifications').closest('a');
    expect(viewAllLink).toHaveAttribute('href', '/notifications');
  });

  it('renders empty state when there are no unread notifications', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [],
      totalCount: 0,
    });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(
      await screen.findByText('No records to display'),
    ).toBeInTheDocument();
    const viewAllLink = screen.getByText('View all notifications').closest('a');
    expect(viewAllLink).toHaveAttribute('href', '/notifications');
  });

  it('marks a notification as read and removes it from the card', async () => {
    const notification = createNotification({
      id: 'notif-1',
      payload: {
        title: 'First unread notification',
        severity: 'normal',
      },
    });

    notificationsApi.getNotifications
      .mockResolvedValueOnce({
        notifications: [notification],
        totalCount: 1,
      })
      .mockResolvedValue({
        notifications: [],
        totalCount: 0,
      });

    notificationsApi.updateNotifications.mockResolvedValue([
      { ...notification, read: new Date('2026-01-01T01:00:00.000Z') },
    ]);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();

    const markAsReadButton = screen.getByLabelText('Mark as read');
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
        ids: ['notif-1'],
        read: true,
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByText('First unread notification'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows a toast error when marking a notification as read fails', async () => {
    const notification = createNotification({
      id: 'notif-1',
      payload: {
        title: 'First unread notification',
        severity: 'normal',
      },
    });

    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [notification],
      totalCount: 1,
    });
    notificationsApi.updateNotifications.mockRejectedValue(
      new Error('Update failed'),
    );

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();

    const markAsReadButton = screen.getByLabelText('Mark as read');
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(toastApi.post).toHaveBeenCalledWith({
        title: 'Failed to mark notification as read',
        status: 'danger',
      });
    });

    expect(screen.getByText('First unread notification')).toBeInTheDocument();
  });

  it('re-fetches unread notifications when a signal arrives', async () => {
    notificationsApi.getNotifications
      .mockResolvedValueOnce({
        notifications: [
          createNotification({
            id: 'notif-1',
            payload: {
              title: 'First unread notification',
              severity: 'normal',
            },
          }),
        ],
        totalCount: 1,
      })
      .mockResolvedValueOnce({
        notifications: [
          createNotification({
            id: 'notif-2',
            payload: {
              title: 'New signal notification',
              severity: 'normal',
            },
          }),
        ],
        totalCount: 1,
      });

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      signalSubscribers.forEach(subscriber =>
        subscriber({
          action: 'new_notification',
          notification_id: 'notif-2',
        }),
      );
    });

    expect(
      await screen.findByText('New signal notification'),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('polls for unread notifications when signals are unavailable and cleans up on unmount', async () => {
    jest.useFakeTimers();

    mockedUseSignal.mockReturnValue({
      lastSignal: null,
      isSignalsAvailable: false,
    });

    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [
        createNotification({
          id: 'notif-1',
          payload: {
            title: 'First unread notification',
            severity: 'normal',
          },
        }),
      ],
      totalCount: 1,
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    });

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('renders the unread-notifications HomePageWidgetBlueprint extension from alpha plugin', async () => {
    mockedUseSignal.mockReturnValue({
      lastSignal: null,
      isSignalsAvailable: false,
    });

    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [
        createNotification({
          id: 'notif-1',
          payload: {
            title: 'First unread notification',
            severity: 'normal',
          },
        }),
      ],
      totalCount: 1,
    });

    const mockNotificationsApiExtension = ApiBlueprint.make({
      name: 'notifications',
      params: defineParams =>
        defineParams({
          api: notificationsApiRef,
          deps: {},
          factory: () => notificationsApi,
        }),
    });

    const extension = notificationsPlugin.getExtension(
      'home-page-widget:notifications/unread-notifications',
    );

    const tester = createExtensionTester(extension).add(
      mockNotificationsApiExtension,
    );

    const widget = tester.get(HomePageWidgetBlueprint.dataRefs.widget);

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
        ]}
      >
        {widget.component}
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Unread notifications')).toHaveLength(1);
  });
});
