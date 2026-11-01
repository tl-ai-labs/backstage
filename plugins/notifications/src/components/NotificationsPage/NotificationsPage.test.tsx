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

import { ReactNode } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Link } from 'react-router-dom';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Notification } from '@backstage/plugin-notifications-common';
import { signalApiRef } from '@backstage/plugin-signals-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

const HIGHLIGHTED_ROW = '[aria-current="true"]';

const createNotification = (
  id: string,
  title: string,
  read?: Date,
): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-01-01T10:00:00Z'),
  origin: 'test-origin',
  read,
  payload: { title },
});

const createApi = (
  notifications: Notification[],
): jest.Mocked<NotificationsApi> => ({
  getNotifications: jest.fn().mockResolvedValue({
    notifications,
    totalCount: notifications.length,
  }),
  getNotification: jest.fn(),
  getStatus: jest.fn().mockResolvedValue({ unread: 1, read: 0 }),
  updateNotifications: jest.fn().mockResolvedValue([]),
  getNotificationSettings: jest.fn().mockResolvedValue({ channels: [] }),
  updateNotificationSettings: jest.fn().mockResolvedValue({ channels: [] }),
  getTopics: jest.fn().mockResolvedValue({ topics: [] }),
});

const createSignalApi = () => {
  let listener: ((message: any) => void) | undefined;
  return {
    subscribe: (_channel: string, onMessage: (message: any) => void) => {
      listener = onMessage;
      return { unsubscribe: () => (listener = undefined) };
    },
    emit: (message: { action: string }) => listener?.(message),
  };
};

type RenderOptions = {
  signalApi?: ReturnType<typeof createSignalApi>;
  children?: ReactNode;
};

const renderPage = (
  api: jest.Mocked<NotificationsApi>,
  route: string,
  { signalApi = createSignalApi(), children }: RenderOptions = {},
) =>
  renderInTestApp(
    <TestApiProvider
      apis={[
        [notificationsApiRef, api],
        [toastApiRef, { post: jest.fn() }],
        [signalApiRef, signalApi],
      ]}
    >
      <NotificationsPage />
      {children}
    </TestApiProvider>,
    { routeEntries: [route] },
  );

describe('NotificationsPage', () => {
  it('highlights an item that is in the current list', async () => {
    const itemA = createNotification('a', 'Item a');
    const itemB = createNotification('b', 'Item b');
    const api = createApi([itemA, itemB]);
    api.getNotification.mockResolvedValue(itemA);

    await renderPage(api, '/notifications?id=a');

    await screen.findByText('Item a');
    await waitFor(() =>
      expect(
        screen.getByText('Item a').closest(HIGHLIGHTED_ROW),
      ).toBeInTheDocument(),
    );

    expect(api.getNotification).toHaveBeenCalledWith('a');
    expect(screen.getByText('Item b').closest(HIGHLIGHTED_ROW)).toBeNull();
    expect(screen.getAllByText('Item a')).toHaveLength(1);
  });

  it('shows an item outside the current list within the page size', async () => {
    const rows = [1, 2, 3, 4, 5].map(index =>
      createNotification(`row-${index}`, `List item ${index}`),
    );
    const api = createApi(rows);
    api.getNotification.mockResolvedValue(
      createNotification('outside', 'Outside item', new Date()),
    );

    await renderPage(api, '/notifications?id=outside');

    const outsideItem = await screen.findByText('Outside item');

    expect(outsideItem.closest(HIGHLIGHTED_ROW)).toBeInTheDocument();
    expect(
      outsideItem.compareDocumentPosition(screen.getByText('List item 1')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
    expect(screen.getByText('List item 3')).toBeInTheDocument();
    expect(screen.getByText('List item 4')).toBeInTheDocument();
    expect(screen.queryByText('List item 5')).not.toBeInTheDocument();
    expect(api.getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ read: false, offset: 0 }),
    );
  });

  it('keeps working for an unknown id', async () => {
    const api = createApi([createNotification('a', 'Item a')]);
    api.getNotification.mockRejectedValue(new Error('Notification not found'));

    const { container } = await renderPage(api, '/notifications?id=missing');

    await screen.findByText('Item a');
    await waitFor(() =>
      expect(api.getNotification).toHaveBeenCalledWith('missing'),
    );

    expect(container.querySelector(HIGHLIGHTED_ROW)).toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Notification not found/),
    ).not.toBeInTheDocument();
  });

  it('re-fetches the highlighted item when a signal arrives', async () => {
    const itemA = createNotification('a', 'Item a');
    const api = createApi([itemA]);
    api.getNotification.mockResolvedValue(itemA);
    const signalApi = createSignalApi();

    await renderPage(api, '/notifications?id=a', { signalApi });

    await screen.findByText('Item a');
    await waitFor(() => expect(api.getNotification).toHaveBeenCalledTimes(1));

    act(() => {
      signalApi.emit({ action: 'new_notification' });
    });

    await waitFor(() => expect(api.getNotification).toHaveBeenCalledTimes(2));
    expect(api.getNotification).toHaveBeenLastCalledWith('a');
  });

  it('drops the previous item while a new id loads', async () => {
    const first = createNotification('first', 'First item');
    const second = createNotification('second', 'Second item');
    const api = createApi([createNotification('a', 'Item a')]);
    let resolveSecond: (notification: Notification) => void = () => {};
    const pendingSecond = new Promise<Notification>(resolve => {
      resolveSecond = resolve;
    });
    api.getNotification.mockImplementation(id =>
      id === 'first' ? Promise.resolve(first) : pendingSecond,
    );

    await renderPage(api, '/notifications?id=first', {
      children: <Link to="/notifications?id=second">Open second</Link>,
    });

    await screen.findByText('First item');

    fireEvent.click(screen.getByText('Open second'));

    await waitFor(() =>
      expect(api.getNotification).toHaveBeenCalledWith('second'),
    );
    expect(screen.queryByText('First item')).not.toBeInTheDocument();
    expect(screen.getByText('Item a')).toBeInTheDocument();

    resolveSecond(second);

    const secondItem = await screen.findByText('Second item');
    expect(secondItem.closest(HIGHLIGHTED_ROW)).toBeInTheDocument();
  });

  it.each(['/notifications', '/notifications?id='])(
    'ignores a missing or empty id at %s',
    async route => {
      const api = createApi([createNotification('a', 'Item a')]);

      const { container } = await renderPage(api, route);

      await screen.findByText('Item a');

      expect(api.getNotification).not.toHaveBeenCalled();
      expect(container.querySelector(HIGHLIGHTED_ROW)).toBeNull();
    },
  );
});
