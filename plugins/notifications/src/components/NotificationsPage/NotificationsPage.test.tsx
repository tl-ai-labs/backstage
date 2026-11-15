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
import { fireEvent, screen } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

const notification: Notification = {
  id: 'n1',
  user: 'user:default/guest',
  created: new Date('2026-01-01T00:00:00Z'),
  origin: 'plugin-test',
  payload: {
    title: 'Scaffolder task failed',
    description: 'The task for my-service failed',
    severity: 'high',
  },
};

function mockNotificationsApi() {
  return {
    getNotifications: jest
      .fn()
      .mockResolvedValue({ notifications: [], totalCount: 0 }),
    getStatus: jest.fn().mockResolvedValue({ unread: 0, read: 0 }),
    getTopics: jest.fn().mockResolvedValue({ topics: [] }),
    getNotification: jest.fn(),
    updateNotifications: jest.fn().mockResolvedValue([]),
  } satisfies Partial<NotificationsApi>;
}

function renderPage(api: ReturnType<typeof mockNotificationsApi>, url: string) {
  return renderInTestApp(
    <TestApiProvider
      apis={[
        [notificationsApiRef, api],
        [toastApiRef, { post: jest.fn() }],
      ]}
    >
      <NotificationsPage />
    </TestApiProvider>,
    { routeEntries: [url] },
  );
}

describe('NotificationsPage', () => {
  it('highlights the notification selected by the id query parameter', async () => {
    const api = mockNotificationsApi();
    api.getNotification
      .mockResolvedValueOnce(notification)
      .mockResolvedValue({ ...notification, read: new Date() });

    await renderPage(api, '/notifications?id=n1');

    const highlighted = await screen.findByRole('region', {
      name: 'Selected notification',
    });
    expect(highlighted).toHaveTextContent('Scaffolder task failed');
    expect(highlighted).toHaveTextContent('The task for my-service failed');
    expect(api.getNotification).toHaveBeenCalledWith('n1');

    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(
      await screen.findByRole('button', { name: 'Mark as unread' }),
    ).toBeInTheDocument();
    expect(api.updateNotifications).toHaveBeenCalledWith({
      ids: ['n1'],
      read: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(
      screen.queryByRole('region', { name: 'Selected notification' }),
    ).not.toBeInTheDocument();
  });

  it('shows a message when the selected notification cannot be found, and nothing without an id', async () => {
    const api = mockNotificationsApi();
    api.getNotification.mockRejectedValue(new Error('Not found'));

    const { unmount } = await renderPage(api, '/notifications?id=missing');
    expect(
      await screen.findByText('The selected notification could not be found.'),
    ).toBeInTheDocument();
    unmount();

    await renderPage(api, '/notifications');
    expect(
      await screen.findByText('Unread notifications (0)'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Selected notification' }),
    ).not.toBeInTheDocument();
    expect(api.getNotification).toHaveBeenCalledTimes(1);
  });
});
