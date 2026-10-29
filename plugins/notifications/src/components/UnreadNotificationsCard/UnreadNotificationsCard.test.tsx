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
import { Notification } from '@backstage/plugin-notifications-common';
import { UnreadNotificationsCardContent } from './UnreadNotificationsCard';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';

const makeNotification = (
  id: string,
  title: string,
  created: string,
): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date(created),
  origin: 'test',
  payload: { title, severity: 'normal' },
});

const n1 = makeNotification('n1', 'Newest', '2026-10-29T10:00:00Z');
const n2 = makeNotification('n/2', 'Older', '2026-10-28T10:00:00Z');

const mountedRoutes = { mountedRoutes: { '/notifications': rootRouteRef } };

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('UnreadNotificationsCardContent', () => {
  let api: NotificationsApi;
  let toastApi: { post: jest.Mock };
  let publish: (message: unknown) => void;
  let signalApi: { subscribe: jest.Mock };

  beforeEach(() => {
    jest.resetAllMocks();
    api = {
      getNotifications: jest.fn(),
      updateNotifications: jest.fn(),
    } as unknown as NotificationsApi;
    toastApi = { post: jest.fn() };
    signalApi = {
      subscribe: jest.fn((_channel, onMessage) => {
        publish = onMessage;
        return { unsubscribe: jest.fn() };
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderCard = (element: JSX.Element, withSignals: boolean = false) => {
    if (withSignals) {
      return renderInTestApp(
        <TestApiProvider
          apis={[
            [notificationsApiRef, api],
            [toastApiRef, toastApi],
            [signalApiRef, signalApi],
          ]}
        >
          {element}
        </TestApiProvider>,
        mountedRoutes,
      );
    }
    return renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, api],
          [toastApiRef, toastApi],
        ]}
      >
        {element}
      </TestApiProvider>,
      mountedRoutes,
    );
  };

  it('lists unread notifications newest first with deep links', async () => {
    (api.getNotifications as jest.Mock).mockResolvedValue({
      notifications: [n1, n2],
      totalCount: 2,
    });

    await renderCard(<UnreadNotificationsCardContent />);

    const newest = await screen.findByText('Newest');
    const older = screen.getByText('Older');
    expect(
      newest.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(api.getNotifications).toHaveBeenCalledTimes(1);
    expect(api.getNotifications).toHaveBeenCalledWith({
      read: false,
      limit: 5,
      sort: 'created',
      sortOrder: 'desc',
    });
    expect(newest.closest('a')).toHaveAttribute('href', '/notifications?id=n1');
    expect(older.closest('a')).toHaveAttribute(
      'href',
      '/notifications?id=n%2F2',
    );
    expect(
      screen.getByText('View all notifications').closest('a'),
    ).toHaveAttribute('href', '/notifications');
  });

  it('honours the limit prop', async () => {
    (api.getNotifications as jest.Mock).mockResolvedValue({
      notifications: [],
      totalCount: 0,
    });

    await renderCard(<UnreadNotificationsCardContent limit={3} />);

    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
    expect(api.getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 }),
    );
  });

  it('shows the error state when fetching fails', async () => {
    (api.getNotifications as jest.Mock).mockRejectedValue(new Error('Boom'));

    await renderCard(<UnreadNotificationsCardContent />);

    const messages = await screen.findAllByText('Boom');
    expect(messages.length).toBeGreaterThan(0);
    expect(
      screen.queryByText('View all notifications'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mark as read' }),
    ).not.toBeInTheDocument();
  });

  it('marks a notification as read and removes it, and keeps it when the update fails', async () => {
    (api.getNotifications as jest.Mock).mockResolvedValue({
      notifications: [n1, n2],
      totalCount: 2,
    });
    (api.updateNotifications as jest.Mock)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('nope'));

    await renderCard(<UnreadNotificationsCardContent />);
    await screen.findByText('Newest');

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[0]);
    await waitForElementToBeRemoved(() => screen.queryByText('Newest'));
    expect(api.updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark as read' })[0]);
    await flush();
    await flush();
    expect(api.updateNotifications).toHaveBeenCalledWith({
      ids: ['n/2'],
      read: true,
    });
    expect(screen.getByText('Older')).toBeInTheDocument();
    expect(toastApi.post).toHaveBeenCalledWith({
      title: 'Failed to mark notification as read',
      status: 'danger',
    });
  });

  it('refetches when a notifications signal arrives', async () => {
    (api.getNotifications as jest.Mock)
      .mockResolvedValueOnce({ notifications: [n1], totalCount: 1 })
      .mockResolvedValueOnce({
        notifications: [
          makeNotification('n3', 'Fresh', '2026-10-29T11:00:00Z'),
        ],
        totalCount: 1,
      });

    await renderCard(<UnreadNotificationsCardContent />, true);
    await screen.findByText('Newest');
    expect(api.getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      publish({ action: 'new_notification', notification_id: 'n3' });
    });

    expect(await screen.findByText('Fresh')).toBeInTheDocument();
    expect(api.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('polls when signals are unavailable and stops after unmount', async () => {
    jest.useFakeTimers();
    (api.getNotifications as jest.Mock).mockResolvedValue({
      notifications: [n1],
      totalCount: 1,
    });

    const { unmount } = await renderCard(<UnreadNotificationsCardContent />);
    await flush();
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(api.getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(59999);
    });
    expect(api.getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    await flush();
    expect(api.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    act(() => {
      jest.advanceTimersByTime(180000);
    });
    expect(api.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('does not poll when signals are available', async () => {
    jest.useFakeTimers();
    (api.getNotifications as jest.Mock).mockResolvedValue({
      notifications: [n1],
      totalCount: 1,
    });

    await renderCard(<UnreadNotificationsCardContent />, true);
    await flush();
    expect(screen.getByText('Newest')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(180000);
    });
    await flush();
    expect(api.getNotifications).toHaveBeenCalledTimes(1);
  });
});
