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
import { screen } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Notification } from '@backstage/plugin-notifications-common';
import { NotificationsApi, notificationsApiRef } from '../../api';
import { NotificationsPage } from './NotificationsPage';

const createNotification = (id: string, title: string): Notification => ({
  id,
  user: 'user:default/guest',
  created: new Date('2026-01-01T10:00:00Z'),
  origin: 'test',
  payload: { title, severity: 'normal' },
});

const n1 = createNotification('n1', 'First');
const n2 = createNotification('n2', 'Second');

const api = {
  getNotifications: jest.fn(),
  getNotification: jest.fn(),
  getStatus: jest.fn(),
  getTopics: jest.fn(),
  updateNotifications: jest.fn(),
} as unknown as jest.Mocked<NotificationsApi>;

const toastApi = { post: jest.fn() };

const renderPage = (id: string) =>
  renderInTestApp(
    <TestApiProvider
      apis={[
        [notificationsApiRef, api],
        [toastApiRef, toastApi],
      ]}
    >
      <NotificationsPage />
    </TestApiProvider>,
    { routeEntries: [`/notifications?id=${id}`] },
  );

const highlightOf = async (title: string) =>
  (await screen.findByText(title)).closest('[aria-current="true"]');

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    api.getNotifications.mockResolvedValue({
      notifications: [n1, n2],
      totalCount: 2,
    });
    api.getStatus.mockResolvedValue({ unread: 2, read: 0 });
    api.getTopics.mockResolvedValue({ topics: [] });
  });

  it('highlights the deep-linked notification when it is on the current page', async () => {
    await renderPage('n2');

    expect(await highlightOf('Second')).not.toBeNull();
    expect(await highlightOf('First')).toBeNull();
    expect(api.getNotification).not.toHaveBeenCalled();
  });

  it('pins and highlights a deep-linked notification missing from the current page', async () => {
    api.getNotification.mockResolvedValue(createNotification('n9', 'Linked'));

    await renderPage('n9');

    const linked = await screen.findByText('Linked');
    const first = await screen.findByText('First');
    expect(api.getNotification).toHaveBeenCalledWith('n9');
    expect(
      linked.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(await highlightOf('Linked')).not.toBeNull();
    expect(await highlightOf('First')).toBeNull();
    expect(await highlightOf('Second')).toBeNull();
  });

  it('keeps the page working when the deep-linked notification cannot be loaded', async () => {
    api.getNotification.mockRejectedValue(new Error('not found'));

    await renderPage('missing');

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(await screen.findByText('Second')).toBeInTheDocument();
    expect(api.getNotification).toHaveBeenCalledWith('missing');
    expect(document.querySelector('[aria-current="true"]')).toBeNull();
  });
});
