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
import { GetNotificationsResponse, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { UnreadNotificationsCard } from './UnreadNotificationsCard';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';

describe('UnreadNotificationsCard', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;

  beforeEach(() => {
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  const createNotification = (
    id: string,
    title: string,
    overrides?: Partial<Notification>,
  ): Notification => ({
    id,
    user: 'user:default/john',
    created: new Date('2026-01-01T00:00:00.000Z'),
    origin: 'plugin-test',
    payload: { title },
    ...overrides,
  });

  it('lists the latest unread notifications and links each to the notifications page', async () => {
    const notifications: Notification[] = [
      createNotification('notif/1', 'First notification'),
      createNotification('notif-2', 'Second notification'),
    ];

    const getNotificationsMock = jest.fn().mockResolvedValue({
      notifications,
      totalCount: 2,
    });

    const notificationsApi = {
      getNotifications: getNotificationsMock,
      updateNotifications: jest.fn(),
    };
    const toastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(getNotificationsMock).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });

    const firstLink = await screen.findByRole('link', {
      name: 'First notification',
    });
    const secondLink = await screen.findByRole('link', {
      name: 'Second notification',
    });

    expect(firstLink).toBeInTheDocument();
    expect(secondLink).toBeInTheDocument();
    expect(firstLink.getAttribute('href')).toBe('/notifications?id=notif%2F1');
    expect(secondLink.getAttribute('href')).toBe('/notifications?id=notif-2');
  });

  it('shows the loading, empty and error states inside the card', async () => {
    const toastApi = { post: jest.fn() };

    // 1. Loading state
    let resolvePending: (val: GetNotificationsResponse) => void;
    const pendingPromise = new Promise<GetNotificationsResponse>(resolve => {
      resolvePending = resolve;
    });

    const notificationsApiLoading = {
      getNotifications: jest.fn().mockReturnValue(pendingPromise),
      updateNotifications: jest.fn(),
    };

    const { unmount: unmountLoading } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApiLoading],
          [toastApiRef, toastApi],
        ]}
      >
        <div>
          <span>Sibling element</span>
          <UnreadNotificationsCard />
        </div>
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(screen.getByTestId('progress')).toBeInTheDocument();
    expect(screen.getByText('Sibling element')).toBeInTheDocument();
    unmountLoading();
    resolvePending!({ notifications: [], totalCount: 0 });

    // 2. Empty state
    const notificationsApiEmpty = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [],
        totalCount: 0,
      }),
      updateNotifications: jest.fn(),
    };

    const { unmount: unmountEmpty } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApiEmpty],
          [toastApiRef, toastApi],
        ]}
      >
        <div>
          <span>Sibling element</span>
          <UnreadNotificationsCard />
        </div>
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
    expect(screen.getByText('Sibling element')).toBeInTheDocument();
    unmountEmpty();

    // 3. Error state
    const notificationsApiError = {
      getNotifications: jest
        .fn()
        .mockRejectedValue(new Error('Network error loading notifications')),
      updateNotifications: jest.fn(),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApiError],
          [toastApiRef, toastApi],
        ]}
      >
        <div>
          <span>Sibling element</span>
          <UnreadNotificationsCard />
        </div>
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    const errorElements = await screen.findAllByText(
      /Network error loading notifications/,
    );
    expect(errorElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Sibling element')).toBeInTheDocument();
  });

  it('marks an item as read and keeps it when that fails', async () => {
    const item1 = createNotification('1', 'Notification 1');
    const item2 = createNotification('2', 'Notification 2');

    let currentNotifications = [item1, item2];
    const getNotificationsMock = jest.fn().mockImplementation(() =>
      Promise.resolve({
        notifications: currentNotifications,
        totalCount: currentNotifications.length,
      }),
    );

    const updateNotificationsMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('Update failed'))
      .mockImplementationOnce(() => {
        currentNotifications = [item2];
        return Promise.resolve();
      });

    const notificationsApi = {
      getNotifications: getNotificationsMock,
      updateNotifications: updateNotificationsMock,
    };
    const toastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();

    const markAsReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });

    // Failed click
    await act(async () => {
      fireEvent.click(markAsReadButtons[0]);
    });

    expect(toastApi.post).toHaveBeenCalledWith({
      title: 'Failed to mark notification as read',
      status: 'danger',
    });
    expect(screen.getByText('Notification 1')).toBeInTheDocument();

    // Successful click
    await act(async () => {
      fireEvent.click(markAsReadButtons[0]);
    });

    expect(updateNotificationsMock).toHaveBeenCalledWith({
      ids: ['1'],
      read: true,
    });
    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
  });

  it('refetches on signals that change unread items and does not poll', async () => {
    let capturedOnMessage: ((message: NotificationSignal) => void) | undefined;
    const unsubscribeMock = jest.fn();
    const subscribeMock = jest.fn().mockImplementation((channel, onMessage) => {
      if (channel === 'notifications') {
        capturedOnMessage = onMessage;
      }
      return { unsubscribe: unsubscribeMock };
    });

    let currentNotifications = [
      createNotification('1', 'Initial Notification'),
    ];
    const getNotificationsMock = jest.fn().mockImplementation(() =>
      Promise.resolve({
        notifications: currentNotifications,
        totalCount: currentNotifications.length,
      }),
    );

    const notificationsApi = {
      getNotifications: getNotificationsMock,
      updateNotifications: jest.fn(),
    };
    const signalApi = {
      subscribe: subscribeMock,
    };
    const toastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signalApi],
          [toastApiRef, toastApi],
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

    expect(await screen.findByText('Initial Notification')).toBeInTheDocument();
    expect(subscribeMock).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );
    expect(getNotificationsMock).toHaveBeenCalledTimes(1);

    const pollCalls = setIntervalSpy.mock.calls.filter(
      ([, delay]) => delay === 60000,
    );
    expect(pollCalls).toHaveLength(0);

    // 1. new_notification
    currentNotifications = [createNotification('2', 'Notification 2')];
    await act(async () => {
      capturedOnMessage?.({
        action: 'new_notification',
        notification_id: '2',
      });
    });
    expect(await screen.findByText('Notification 2')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(2);

    // 2. notification_read
    currentNotifications = [createNotification('3', 'Notification 3')];
    await act(async () => {
      capturedOnMessage?.({
        action: 'notification_read',
        notification_ids: ['3'],
      });
    });
    expect(await screen.findByText('Notification 3')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(3);

    // 3. notification_unread
    currentNotifications = [createNotification('4', 'Notification 4')];
    await act(async () => {
      capturedOnMessage?.({
        action: 'notification_unread',
        notification_ids: ['4'],
      });
    });
    expect(await screen.findByText('Notification 4')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(4);

    // 4. unrelated action
    await act(async () => {
      capturedOnMessage?.({
        action: 'unrelated_action',
      } as unknown as NotificationSignal);
    });
    expect(getNotificationsMock).toHaveBeenCalledTimes(4);
  });

  it('refetches every 60 seconds without overlap when the signal API is not installed', async () => {
    let pendingFetchResolver:
      | ((val: GetNotificationsResponse) => void)
      | undefined;
    let holdFetchOpen = false;

    let currentNotifications = [createNotification('1', 'Notification 1')];
    const getNotificationsMock = jest.fn().mockImplementation(() => {
      if (holdFetchOpen) {
        return new Promise(resolve => {
          pendingFetchResolver = resolve;
        });
      }
      return Promise.resolve({
        notifications: currentNotifications,
        totalCount: currentNotifications.length,
      });
    });

    const notificationsApi = {
      getNotifications: getNotificationsMock,
      updateNotifications: jest.fn(),
    };
    const toastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
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

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(1);

    const pollCall = setIntervalSpy.mock.calls.find(
      ([, delay]) => delay === 60000,
    );
    expect(pollCall).toBeDefined();
    const intervalCallback = pollCall![0] as () => void;

    // Run tick 1
    currentNotifications = [createNotification('2', 'Notification 2')];
    await act(async () => {
      intervalCallback();
    });
    expect(await screen.findByText('Notification 2')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(2);

    // Tick 2: hold fetch open and trigger twice more
    holdFetchOpen = true;
    await act(async () => {
      intervalCallback();
    });
    expect(getNotificationsMock).toHaveBeenCalledTimes(3);

    // While fetch is open, trigger intervalCallback twice more
    await act(async () => {
      intervalCallback();
      intervalCallback();
    });
    expect(getNotificationsMock).toHaveBeenCalledTimes(3);

    // Resolve the open fetch
    holdFetchOpen = false;
    currentNotifications = [createNotification('3', 'Notification 3')];
    await act(async () => {
      pendingFetchResolver?.({
        notifications: currentNotifications,
        totalCount: currentNotifications.length,
      });
    });

    // Follow-up fetch runs
    expect(await screen.findByText('Notification 3')).toBeInTheDocument();
    expect(getNotificationsMock).toHaveBeenCalledTimes(4);
  });

  it('releases the subscription and timers on unmount and fetches no more', async () => {
    // 1. With signals
    const unsubscribeMock = jest.fn();
    const subscribeMock = jest.fn().mockReturnValue({
      unsubscribe: unsubscribeMock,
    });
    const notificationsApi = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [createNotification('1', 'Notification 1')],
        totalCount: 1,
      }),
      updateNotifications: jest.fn(),
    };
    const toastApi = { post: jest.fn() };

    const { unmount: unmountSignals } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, { subscribe: subscribeMock }],
          [toastApiRef, toastApi],
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

    expect(await screen.findByText('Notification 1')).toBeInTheDocument();
    unmountSignals();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);

    // 2. Without signals
    const notificationsApiWithoutSignals = {
      getNotifications: jest.fn().mockResolvedValue({
        notifications: [createNotification('2', 'Notification 2')],
        totalCount: 1,
      }),
      updateNotifications: jest.fn(),
    };

    const { unmount: unmountTimer } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApiWithoutSignals],
          [toastApiRef, toastApi],
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

    expect(await screen.findByText('Notification 2')).toBeInTheDocument();

    const pollCall = setIntervalSpy.mock.calls.find(
      ([, delay]) => delay === 60000,
    );
    expect(pollCall).toBeDefined();
    const capturedCallback = pollCall![0] as () => void;
    const intervalId = setIntervalSpy.mock.results.find(
      (_, idx) => setIntervalSpy.mock.calls[idx][1] === 60000,
    )?.value;

    unmountTimer();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    const callCountBefore =
      notificationsApiWithoutSignals.getNotifications.mock.calls.length;
    await act(async () => {
      capturedCallback();
    });
    expect(
      notificationsApiWithoutSignals.getNotifications.mock.calls.length,
    ).toBe(callCountBefore);
  });
});
