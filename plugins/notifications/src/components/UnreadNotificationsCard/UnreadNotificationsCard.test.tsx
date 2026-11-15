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
import { signalApiRef, SignalApi } from '@backstage/plugin-signals-react';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { UnreadNotificationsCardContent } from './UnreadNotificationsCard';

function makeNotification(id: string, title: string): Notification {
  return {
    id,
    user: 'user:default/guest',
    created: new Date('2026-01-01T00:00:00Z'),
    origin: 'plugin-test',
    payload: { title, severity: 'normal' },
  };
}

function mockNotificationsApi() {
  return {
    getNotifications: jest.fn(),
    updateNotifications: jest.fn().mockResolvedValue([]),
  } satisfies Partial<NotificationsApi>;
}

function mockSignalApi() {
  const listeners = new Map<string, (message: any) => void>();
  const unsubscribe = jest.fn();
  const api: SignalApi = {
    subscribe: jest.fn((channel, onMessage) => {
      listeners.set(channel, onMessage);
      return { unsubscribe };
    }),
  };
  const publish = (channel: string, message: object) =>
    act(() => listeners.get(channel)?.(message));
  return { api, publish, unsubscribe };
}

async function renderCard(options: {
  notificationsApi: ReturnType<typeof mockNotificationsApi>;
  signalApi?: SignalApi;
  pollingIntervalMs?: number;
}) {
  const toastApi = { post: jest.fn() };
  const rendered = await renderInTestApp(
    <TestApiProvider
      apis={[
        [notificationsApiRef, options.notificationsApi],
        [toastApiRef, toastApi],
        ...(options.signalApi
          ? [[signalApiRef, options.signalApi] as const]
          : []),
      ]}
    >
      <UnreadNotificationsCardContent
        pollingIntervalMs={options.pollingIntervalMs}
      />
    </TestApiProvider>,
    { mountedRoutes: { '/notifications': rootRouteRef } },
  );
  return { ...rendered, toastApi };
}

describe('UnreadNotificationsCardContent', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists unread notifications with deep links and marks them as read', async () => {
    const notificationsApi = mockNotificationsApi();
    notificationsApi.getNotifications
      .mockResolvedValueOnce({
        notifications: [
          makeNotification('n1', 'Scaffolder task failed'),
          makeNotification('n2', 'Entity has errors'),
        ],
        totalCount: 3,
      })
      .mockResolvedValue({
        notifications: [makeNotification('n2', 'Entity has errors')],
        totalCount: 2,
      });
    const { api: signalApi } = mockSignalApi();

    await renderCard({ notificationsApi, signalApi });

    expect(
      await screen.findByRole('link', { name: 'Scaffolder task failed' }),
    ).toHaveAttribute('href', '/notifications?id=n1');
    expect(
      screen.getByRole('link', { name: 'Entity has errors' }),
    ).toHaveAttribute('href', '/notifications?id=n2');
    expect(
      screen.getByRole('link', {
        name: 'View all unread notifications (3)',
      }),
    ).toHaveAttribute('href', '/notifications');
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[0]);

    expect(
      await screen.findByRole('link', {
        name: 'View all unread notifications (2)',
      }),
    ).toBeInTheDocument();
    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });
    expect(
      screen.queryByRole('link', { name: 'Scaffolder task failed' }),
    ).not.toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('shows an error toast when marking as read fails', async () => {
    const notificationsApi = mockNotificationsApi();
    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [makeNotification('n1', 'Scaffolder task failed')],
      totalCount: 1,
    });
    notificationsApi.updateNotifications.mockRejectedValue(new Error('boom'));

    const { toastApi } = await renderCard({ notificationsApi });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Mark as read' }),
    );

    await act(async () => {});
    expect(toastApi.post).toHaveBeenCalledWith({
      title: 'Failed to mark notification as read',
      status: 'danger',
    });
    expect(
      screen.getByRole('link', { name: 'Scaffolder task failed' }),
    ).toBeInTheDocument();
  });

  it('refreshes when a notifications signal arrives and unsubscribes on unmount', async () => {
    const notificationsApi = mockNotificationsApi();
    notificationsApi.getNotifications
      .mockResolvedValueOnce({ notifications: [], totalCount: 0 })
      .mockResolvedValue({
        notifications: [makeNotification('n1', 'Broadcast from platform')],
        totalCount: 1,
      });
    const { api: signalApi, publish, unsubscribe } = mockSignalApi();

    const { unmount } = await renderCard({
      notificationsApi,
      signalApi,
      pollingIntervalMs: 1000,
    });

    expect(
      await screen.findByText('You have no unread notifications.'),
    ).toBeInTheDocument();
    expect(signalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );

    publish('notifications', {
      action: 'new_notification',
      notification_id: 'n1',
    });

    expect(
      await screen.findByRole('link', { name: 'Broadcast from platform' }),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('polls for updates when signals are unavailable and stops on unmount', async () => {
    jest.useFakeTimers();
    const notificationsApi = mockNotificationsApi();
    notificationsApi.getNotifications
      .mockResolvedValueOnce({ notifications: [], totalCount: 0 })
      .mockResolvedValue({
        notifications: [makeNotification('n1', 'Entity has errors')],
        totalCount: 1,
      });

    const { unmount } = await renderCard({
      notificationsApi,
      pollingIntervalMs: 30_000,
    });

    expect(
      await screen.findByText('You have no unread notifications.'),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(29_999);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(
      await screen.findByRole('link', { name: 'Entity has errors' }),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });
});
