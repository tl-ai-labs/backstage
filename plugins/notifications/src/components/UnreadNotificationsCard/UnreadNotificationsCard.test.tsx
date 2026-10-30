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
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import {
  UnreadNotificationsCardContent,
  UNREAD_NOTIFICATIONS_LIMIT,
  UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS,
} from './UnreadNotificationsCard';

const n1: Notification = {
  id: 'n1',
  user: 'user:default/john',
  created: new Date('2026-01-01T12:00:00Z'),
  origin: 'test',
  payload: {
    title: 'First unread notification',
    severity: 'high',
  },
};

const n2: Notification = {
  id: 'n2',
  user: 'user:default/john',
  created: new Date('2026-01-01T11:00:00Z'),
  origin: 'test',
  payload: {
    title: 'Second unread notification',
    severity: 'normal',
  },
};

describe('UnreadNotificationsCardContent', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists unread notifications with deep links and severity and marks one as read', async () => {
    const getNotifications = jest
      .fn()
      .mockResolvedValueOnce({ notifications: [n1, n2], totalCount: 2 })
      .mockResolvedValueOnce({ notifications: [n2], totalCount: 1 });
    const updateNotifications = jest.fn().mockResolvedValue([]);
    const toastApi = { post: jest.fn() };
    const unsubscribe = jest.fn();
    const signalApi = {
      subscribe: jest.fn().mockReturnValue({ unsubscribe }),
    };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, { getNotifications, updateNotifications }],
          [toastApiRef, toastApi],
          [signalApiRef, signalApi],
        ]}
      >
        <UnreadNotificationsCardContent />
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
    expect(getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        read: false,
        limit: UNREAD_NOTIFICATIONS_LIMIT,
        sort: 'created',
        sortOrder: 'desc',
      }),
    );

    const link1 = screen.getByRole('link', {
      name: 'First unread notification',
    });
    const link2 = screen.getByRole('link', {
      name: 'Second unread notification',
    });
    expect(link1).toHaveAttribute('href', '/notifications?id=n1');
    expect(link2).toHaveAttribute('href', '/notifications?id=n2');

    expect(screen.getByText(/High/)).toBeInTheDocument();
    expect(screen.queryByText(/Normal/)).not.toBeInTheDocument();

    const markAsReadButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    fireEvent.click(markAsReadButtons[0]);

    expect(updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText('First unread notification'),
    );
    expect(getNotifications).toHaveBeenCalledTimes(2);
  });

  it('posts a toast when marking as read fails', async () => {
    const getNotifications = jest
      .fn()
      .mockResolvedValue({ notifications: [n1], totalCount: 1 });
    const updateNotifications = jest
      .fn()
      .mockRejectedValue(new Error('Failed to update'));
    const toastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, { getNotifications, updateNotifications }],
          [toastApiRef, toastApi],
        ]}
      >
        <UnreadNotificationsCardContent />
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

    const markAsReadButton = screen.getByRole('button', {
      name: 'Mark as read',
    });
    fireEvent.click(markAsReadButton);

    expect(updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });

    await screen.findByText('First unread notification');
    expect(toastApi.post).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to mark notification as read',
        status: 'danger',
      }),
    );
  });

  it('refreshes on a notifications signal and does not poll while signals are available', async () => {
    jest.useFakeTimers();
    let emit: ((msg: NotificationSignal) => void) | undefined;
    const unsubscribe = jest.fn();
    const signalApi = {
      subscribe: jest.fn((_channel, onMessage) => {
        emit = onMessage;
        return { unsubscribe };
      }),
    };
    const getNotifications = jest
      .fn()
      .mockResolvedValue({ notifications: [n1], totalCount: 1 });
    const updateNotifications = jest.fn().mockResolvedValue([]);
    const toastApi = { post: jest.fn() };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, { getNotifications, updateNotifications }],
          [toastApiRef, toastApi],
          [signalApiRef, signalApi],
        ]}
      >
        <UnreadNotificationsCardContent />
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
    expect(signalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );
    expect(getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      emit?.({ action: 'new_notification', notification_id: 'n3' });
    });

    expect(getNotifications).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS);
    });

    expect(getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('polls when signals are unavailable and stops polling after unmount', async () => {
    jest.useFakeTimers();
    const getNotifications = jest
      .fn()
      .mockResolvedValue({ notifications: [n1], totalCount: 1 });
    const updateNotifications = jest.fn().mockResolvedValue([]);
    const toastApi = { post: jest.fn() };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, { getNotifications, updateNotifications }],
          [toastApiRef, toastApi],
        ]}
      >
        <UnreadNotificationsCardContent />
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
    expect(getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS);
    });

    expect(getNotifications).toHaveBeenCalledTimes(2);

    unmount();

    act(() => {
      jest.advanceTimersByTime(UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS * 2);
    });

    expect(getNotifications).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state and the error state', async () => {
    const getNotifications = jest
      .fn()
      .mockResolvedValueOnce({ notifications: [], totalCount: 0 });
    const updateNotifications = jest.fn().mockResolvedValue([]);
    const toastApi = { post: jest.fn() };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, { getNotifications, updateNotifications }],
          [toastApiRef, toastApi],
        ]}
      >
        <UnreadNotificationsCardContent />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('You have no unread notifications'),
    ).toBeInTheDocument();

    unmount();

    const failingGetNotifications = jest
      .fn()
      .mockRejectedValue(new Error('boom'));

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            notificationsApiRef,
            {
              getNotifications: failingGetNotifications,
              updateNotifications,
            },
          ],
          [toastApiRef, toastApi],
        ]}
      >
        <UnreadNotificationsCardContent />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/notifications': rootRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('Failed to load unread notifications'),
    ).toBeInTheDocument();
  });
});
