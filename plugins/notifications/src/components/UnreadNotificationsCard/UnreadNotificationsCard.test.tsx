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
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Notification } from '@backstage/plugin-notifications-common';
import { SignalApi, signalApiRef } from '@backstage/plugin-signals-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import {
  UnreadNotificationsCard,
  UnreadNotificationsCardProps,
} from './UnreadNotificationsCard';

const createNotification = (
  id: string,
  title: string,
  payload: Partial<Notification['payload']> = {},
): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date(Date.now() - 2 * 60 * 60 * 1000),
  origin: 'test',
  payload: { title, ...payload },
});

const createNotificationsApi = (): jest.Mocked<NotificationsApi> => ({
  getNotifications: jest.fn(),
  getNotification: jest.fn(),
  getStatus: jest.fn(),
  updateNotifications: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
  getTopics: jest.fn(),
});

const listOf = (...notifications: Notification[]) => ({
  notifications,
  totalCount: notifications.length,
});

const createSignals = () => {
  let emit: (message: object) => void = () => {};
  const unsubscribe = jest.fn();
  const signalApi = {
    subscribe: jest.fn(
      (_channel: string, onMessage: (message: object) => void) => {
        emit = onMessage;
        return { unsubscribe };
      },
    ),
  } as unknown as SignalApi;

  return {
    signalApi,
    unsubscribe,
    sendSignal: async (notificationId: string) => {
      await act(async () => {
        emit({ action: 'new_notification', notification_id: notificationId });
      });
    },
  };
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('UnreadNotificationsCard', () => {
  let notificationsApi: jest.Mocked<NotificationsApi>;
  let toastApi: { post: jest.Mock };

  const renderCard = (
    options: {
      props?: UnreadNotificationsCardProps;
      signalApi?: SignalApi;
      mountPath?: string;
    } = {},
  ) => {
    const { props, signalApi, mountPath = '/notifications' } = options;
    const card = <UnreadNotificationsCard {...props} />;

    return renderInTestApp(
      signalApi ? (
        <TestApiProvider
          apis={[
            [notificationsApiRef, notificationsApi],
            [toastApiRef, toastApi],
            [signalApiRef, signalApi],
          ]}
        >
          {card}
        </TestApiProvider>
      ) : (
        <TestApiProvider
          apis={[
            [notificationsApiRef, notificationsApi],
            [toastApiRef, toastApi],
          ]}
        >
          {card}
        </TestApiProvider>
      ),
      { mountedRoutes: { [mountPath]: rootRouteRef } },
    );
  };

  beforeEach(() => {
    notificationsApi = createNotificationsApi();
    toastApi = { post: jest.fn() };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists unread notifications with title, severity and time', async () => {
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(
        createNotification('1', 'First title', { severity: 'critical' }),
        createNotification('2', 'Second title'),
      ),
    );

    await renderCard();

    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(screen.getByText('Second title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });
    expect(screen.getByRole('img', { name: 'Critical' })).toBeInTheDocument();
    expect(screen.getAllByText(/ago/)).toHaveLength(2);
  });

  it('passes a custom limit to the API', async () => {
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    await renderCard({ props: { limit: 3 } });

    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 }),
    );
  });

  it('shows the loading state', async () => {
    notificationsApi.getNotifications.mockReturnValue(new Promise(() => {}));

    await renderCard();

    expect(await screen.findByTestId('progress')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No unread notifications'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    notificationsApi.getNotifications.mockResolvedValue(listOf());

    await renderCard();

    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
  });

  it('shows the error state when the first load fails', async () => {
    notificationsApi.getNotifications.mockRejectedValue(new Error('Failed'));

    await renderCard();

    expect(
      await screen.findByText('Failed to load notifications'),
    ).toBeInTheDocument();
  });

  it('keeps the list when a background refresh fails', async () => {
    const { signalApi, sendSignal } = createSignals();
    notificationsApi.getNotifications
      .mockResolvedValueOnce(listOf(createNotification('1', 'First title')))
      .mockRejectedValue(new Error('Failed'));

    await renderCard({ signalApi });
    expect(await screen.findByText('First title')).toBeInTheDocument();

    await sendSignal('2');

    await waitFor(() =>
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2),
    );
    await act(async () => {});
    expect(screen.getByText('First title')).toBeInTheDocument();
    expect(
      screen.queryByText('Failed to load notifications'),
    ).not.toBeInTheDocument();
  });

  it('marks an item as read and removes it', async () => {
    notificationsApi.getNotifications
      .mockResolvedValueOnce(listOf(createNotification('1', 'First title')))
      .mockResolvedValue(listOf());
    notificationsApi.updateNotifications.mockResolvedValue([]);

    await renderCard();

    fireEvent.click(
      await screen.findByRole('button', { name: /mark as read/i }),
    );

    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['1'],
      read: true,
    });
    expect(screen.queryByText('First title')).not.toBeInTheDocument();
    expect(toastApi.post).not.toHaveBeenCalled();
  });

  it('keeps the item and reports the failure when marking as read fails', async () => {
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );
    notificationsApi.updateNotifications.mockRejectedValue(new Error('Failed'));

    await renderCard();

    fireEvent.click(
      await screen.findByRole('button', { name: /mark as read/i }),
    );

    await waitFor(() =>
      expect(toastApi.post).toHaveBeenCalledWith({
        title: 'Failed to mark notification as read',
        status: 'danger',
      }),
    );
    expect(screen.getByText('First title')).toBeInTheDocument();
  });

  it('links each item to the notifications page by id', async () => {
    const id = 'id with/slash';
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification(id, 'First title', { link: '/catalog' })),
    );

    await renderCard();

    expect(
      await screen.findByRole('link', { name: 'First title' }),
    ).toHaveAttribute('href', `/notifications?id=${encodeURIComponent(id)}`);
  });

  it('follows a non-default mount path', async () => {
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    await renderCard({ mountPath: '/inbox' });

    const link = await screen.findByRole('link', { name: 'First title' });
    expect(link.getAttribute('href')).toMatch(/^\/inbox\?id=/);
  });

  it('refreshes on signals within the throttle', async () => {
    jest.useFakeTimers();
    const { signalApi, sendSignal } = createSignals();
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    await renderCard({ signalApi });
    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await sendSignal('a');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    await advance(100);
    await sendSignal('b');
    await advance(100);
    await sendSignal('c');
    await advance(100);
    await sendSignal('d');
    await advance(1500);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    await advance(200);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(3);

    await advance(5000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(3);
  });

  it('does not start a refresh while one is running', async () => {
    jest.useFakeTimers();
    const { signalApi, sendSignal } = createSignals();
    const list = listOf(createNotification('1', 'First title'));
    let resolveRefresh: (value: typeof list) => void = () => {};
    notificationsApi.getNotifications
      .mockResolvedValueOnce(list)
      .mockReturnValueOnce(
        new Promise<typeof list>(resolve => {
          resolveRefresh = resolve;
        }),
      )
      .mockResolvedValue(list);

    await renderCard({ signalApi });
    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await sendSignal('a');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    await sendSignal('b');
    await advance(2100);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh(list);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(3);

    await advance(5000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(3);
  });

  it('polls when signals are unavailable', async () => {
    jest.useFakeTimers();
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    const { unmount } = await renderCard();
    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await advance(59000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await advance(1000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    notificationsApi.getNotifications.mockClear();

    await renderCard({ props: { pollIntervalMs: 10000 } });
    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await advance(9000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await advance(1000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('does not poll when signals are available', async () => {
    jest.useFakeTimers();
    const { signalApi } = createSignals();
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    await renderCard({ signalApi });
    expect(await screen.findByText('First title')).toBeInTheDocument();

    await advance(180000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', async () => {
    jest.useFakeTimers();
    const { signalApi, sendSignal, unsubscribe } = createSignals();
    notificationsApi.getNotifications.mockResolvedValue(
      listOf(createNotification('1', 'First title')),
    );

    const withSignals = await renderCard({ signalApi });
    expect(await screen.findByText('First title')).toBeInTheDocument();
    await sendSignal('a');
    await sendSignal('b');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    withSignals.unmount();
    expect(unsubscribe).toHaveBeenCalled();
    await advance(180000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    notificationsApi.getNotifications.mockClear();

    const withoutSignals = await renderCard();
    expect(await screen.findByText('First title')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    withoutSignals.unmount();
    await advance(180000);
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
  });
});
