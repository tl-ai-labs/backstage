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
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { NotificationsHomePageCard } from './NotificationsHomePageCard';

const makeNotification = (id: string, title: string) => ({
  id,
  user: 'user:default/me',
  created: new Date(),
  origin: 'test',
  read: undefined,
  payload: { title, severity: 'normal' as const },
});

describe('NotificationsHomePageCard', () => {
  let unread: ReturnType<typeof makeNotification>[];
  const notificationsApi = {
    getNotifications: jest.fn(async () => ({
      notifications: unread,
      totalCount: unread.length,
    })),
    updateNotifications: jest.fn(async (options: { ids: string[] }) => {
      unread = unread.filter(n => !options.ids.includes(n.id));
      return [];
    }),
  };
  const toastApi = { post: jest.fn() };

  const render = (
    props: { limit?: number; pollIntervalMs?: number } = {},
    signals?: { subscribe: jest.Mock },
  ) =>
    renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
          ...(signals ? [[signalApiRef, signals] as const] : []),
        ]}
      >
        <NotificationsHomePageCard {...props} />
      </TestApiProvider>,
      { mountedRoutes: { '/notifications': rootRouteRef } },
    );

  beforeEach(() => {
    jest.clearAllMocks();
    unread = [
      makeNotification('a', 'First one'),
      makeNotification('b', 'Second one'),
    ];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders unread notifications, links to them and marks them as read', async () => {
    await render({ limit: 3 });

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    expect(await screen.findByText('First one')).toHaveAttribute(
      'href',
      '/notifications?id=a',
    );
    expect(screen.getByText('Second one')).toHaveAttribute(
      'href',
      '/notifications?id=b',
    );
    expect(screen.getByText('View all notifications')).toHaveAttribute(
      'href',
      '/notifications',
    );
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 3,
    });

    fireEvent.click(screen.getAllByLabelText('Mark as read')[0]);

    expect(notificationsApi.updateNotifications).toHaveBeenCalledWith({
      ids: ['a'],
      read: true,
    });
    await waitFor(() =>
      expect(screen.queryByText('First one')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Second one')).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByLabelText('Mark as read'));
    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
  });

  it('refetches on a new signal and does not poll when signals are available', async () => {
    jest.useFakeTimers();
    const unsubscribe = jest.fn();
    let onSignal: (msg: any) => void = () => {};
    const signals = {
      subscribe: jest.fn((_channel: string, cb: (msg: any) => void) => {
        onSignal = cb;
        return { unsubscribe };
      }),
    };
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const { unmount } = await render({ pollIntervalMs: 1000 }, signals);
    await screen.findByText('First one');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    unread = [makeNotification('c', 'Brand new')];
    act(() => onSignal({ action: 'new_notification' }));
    await screen.findByText('Brand new');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    expect(setIntervalSpy.mock.calls.filter(c => c[1] === 1000)).toHaveLength(
      0,
    );

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('polls when signals are unavailable and stops after unmount', async () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = await render({ pollIntervalMs: 1000 });
    await screen.findByText('First one');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    unread = [makeNotification('c', 'Polled in')];
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await screen.findByText('Polled in');
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    const callsAfterUnmount = clearIntervalSpy.mock.calls.length;
    expect(callsAfterUnmount).toBeGreaterThan(0);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    clearIntervalSpy.mockRestore();
  });
});
