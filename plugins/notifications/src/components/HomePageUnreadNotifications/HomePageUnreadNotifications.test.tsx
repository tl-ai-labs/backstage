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
import { signalApiRef, type SignalApi } from '@backstage/plugin-signals-react';
import { toastApiRef, type ToastApi } from '@backstage/frontend-plugin-api';
import type {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { notificationsApiRef, type NotificationsApi } from '../../api';
import { rootRouteRef } from '../../routes';
import { Content } from './HomePageUnreadNotifications';
import { NotificationsTable } from '../NotificationsTable';
import { NotificationsPage } from '../NotificationsPage';
import { HomePageUnreadNotifications } from '../../plugin';
import notificationsAlphaPlugin from '../../alpha';

const sampleNotifications: Notification[] = [
  {
    id: 'notif-1',
    user: 'user:default/guest',
    created: new Date('2026-01-01T12:00:00Z'),
    saved: undefined,
    read: undefined,
    updated: undefined,
    origin: 'plugin-catalog',
    payload: {
      title: 'First unread notification',
      description: 'First notification description',
      severity: 'high',
      topic: 'catalog-topic',
    },
  },
  {
    id: 'notif-2',
    user: 'user:default/guest',
    created: new Date('2026-01-01T11:00:00Z'),
    saved: undefined,
    read: undefined,
    updated: undefined,
    origin: 'plugin-scaffolder',
    payload: {
      title: 'Second unread notification',
      description: 'Second notification description',
      severity: 'normal',
      topic: 'scaffolder-topic',
    },
  },
];

function createMockNotificationsApi(
  overrides: Partial<jest.Mocked<NotificationsApi>> = {},
): jest.Mocked<NotificationsApi> {
  return {
    getNotifications: jest.fn().mockResolvedValue({
      notifications: sampleNotifications,
      totalCount: sampleNotifications.length,
    }),
    getNotification: jest.fn().mockResolvedValue(sampleNotifications[0]),
    getStatus: jest.fn().mockResolvedValue({ unread: 2, read: 0 }),
    updateNotifications: jest.fn().mockResolvedValue([]),
    getNotificationSettings: jest.fn().mockResolvedValue({ channels: [] }),
    updateNotificationSettings: jest.fn().mockResolvedValue({ channels: [] }),
    getTopics: jest.fn().mockResolvedValue({ topics: [] }),
    ...overrides,
  };
}

const mockToastApi: ToastApi = {
  post: jest.fn(),
};

describe('HomePageUnreadNotifications', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders unread notifications and deep-links to /notifications?id=<id>', async () => {
    const notificationsApi = createMockNotificationsApi();

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <Content />
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
    expect(
      screen.getByText('First notification description'),
    ).toBeInTheDocument();
    expect(screen.getByText(/plugin-catalog/)).toBeInTheDocument();
    expect(screen.getByText(/catalog-topic/)).toBeInTheDocument();

    expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
      read: false,
      sort: 'created',
      sortOrder: 'desc',
      limit: 5,
    });

    const firstLink = screen
      .getByText('First unread notification')
      .closest('a');
    expect(firstLink).toHaveAttribute('href', '/notifications?id=notif-1');

    const secondLink = screen
      .getByText('Second unread notification')
      .closest('a');
    expect(secondLink).toHaveAttribute('href', '/notifications?id=notif-2');
  });

  it('renders empty state and error state', async () => {
    const emptyApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockResolvedValue({ notifications: [], totalCount: 0 }),
    });

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, emptyApi]]}>
        <Content />
      </TestApiProvider>,
    );

    expect(
      await screen.findByText('No unread notifications'),
    ).toBeInTheDocument();
    unmount();

    const errorApi = createMockNotificationsApi({
      getNotifications: jest
        .fn()
        .mockRejectedValue(new Error('Backend unavailable')),
    });

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, errorApi]]}>
        <Content />
      </TestApiProvider>,
    );

    await waitFor(() => {
      expect(errorApi.getNotifications).toHaveBeenCalled();
    });
    const errorElements = await screen.findAllByText(/Backend unavailable/i);
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('marks a notification as read and removes it from the list, or posts a toast on error', async () => {
    const notificationsApi = createMockNotificationsApi();
    const toastApi: ToastApi = { post: jest.fn() };

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, toastApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
    );

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();

    const markButtons = screen.getAllByRole('button', {
      name: 'Mark as read',
    });
    expect(markButtons).toHaveLength(2);

    fireEvent.click(markButtons[0]);

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
    expect(screen.getByText('Second unread notification')).toBeInTheDocument();

    notificationsApi.updateNotifications.mockRejectedValueOnce(
      new Error('Update failed'),
    );

    const remainingButton = screen.getByRole('button', {
      name: 'Mark as read',
    });
    fireEvent.click(remainingButton);

    await waitFor(() => {
      expect(toastApi.post).toHaveBeenCalledWith({
        title: 'Failed to mark notification as read',
        status: 'danger',
      });
    });

    expect(screen.getByText('Second unread notification')).toBeInTheDocument();
  });

  it('refreshes when a notifications signal arrives and unsubscribes on unmount', async () => {
    const notificationsApi = createMockNotificationsApi();
    let signalCallback: ((msg: NotificationSignal) => void) | undefined;
    const unsubscribe = jest.fn();
    const signalApi: SignalApi = {
      subscribe: jest.fn((channel: string, fn: (msg: any) => void) => {
        if (channel === 'notifications') {
          signalCallback = fn;
        }
        return { unsubscribe };
      }),
    };

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [signalApiRef, signalApi],
        ]}
      >
        <Content />
      </TestApiProvider>,
    );

    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();
    expect(signalApi.subscribe).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
    );
    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      signalCallback?.({
        action: 'new_notification',
        notification_id: 'notif-3',
      });
    });

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('falls back to polling when signals are unavailable and clears the interval on unmount', async () => {
    jest.useFakeTimers();
    const notificationsApi = createMockNotificationsApi();

    const { unmount } = await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <Content pollingIntervalMs={5000} />
      </TestApiProvider>,
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
      jest.advanceTimersByTime(15000);
    });

    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('highlights the targeted notification on NotificationsTable and NotificationsPage for ?id=<id>', async () => {
    const notificationsApi = createMockNotificationsApi();

    const { unmount } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsTable
          isUnread
          notifications={sampleNotifications}
          onUpdate={() => {}}
          setContainsText={() => {}}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          page={0}
          pageSize={5}
          totalCount={sampleNotifications.length}
        />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=notif-1'],
      },
    );

    const firstTitle = await screen.findByText('First unread notification');
    const firstHighlightContainer = firstTitle.closest('[aria-current="true"]');
    expect(firstHighlightContainer).not.toBeNull();
    expect(firstHighlightContainer).toHaveClass('highlightedRow');

    const secondTitle = screen.getByText('Second unread notification');
    expect(secondTitle.closest('[aria-current="true"]')).toBeNull();

    unmount();

    const { unmount: unmountWithoutParam } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsTable
          isUnread
          notifications={sampleNotifications}
          onUpdate={() => {}}
          setContainsText={() => {}}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
          page={0}
          pageSize={5}
          totalCount={sampleNotifications.length}
        />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications'],
      },
    );

    const unhighlightedTitle = await screen.findByText(
      'First unread notification',
    );
    expect(unhighlightedTitle.closest('[aria-current="true"]')).toBeNull();
    unmountWithoutParam();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [notificationsApiRef, notificationsApi],
          [toastApiRef, mockToastApi],
        ]}
      >
        <NotificationsPage />
      </TestApiProvider>,
      {
        routeEntries: ['/notifications?id=notif-1'],
      },
    );

    const pageFirstTitle = await screen.findByText('First unread notification');
    const pageHighlightContainer = pageFirstTitle.closest(
      '[aria-current="true"]',
    );
    expect(pageHighlightContainer).not.toBeNull();
    expect(pageHighlightContainer).toHaveClass('highlightedRow');
  });

  it('registers HomePageUnreadNotifications for legacy and alpha frontend systems', async () => {
    const notificationsApi = createMockNotificationsApi();

    await renderInTestApp(
      <TestApiProvider apis={[[notificationsApiRef, notificationsApi]]}>
        <HomePageUnreadNotifications />
      </TestApiProvider>,
    );

    expect(await screen.findByText('Unread notifications')).toBeInTheDocument();
    expect(
      await screen.findByText('First unread notification'),
    ).toBeInTheDocument();

    const widgetExtension = notificationsAlphaPlugin.getExtension(
      'home-page-widget:notifications/unread-notifications',
    );
    expect(widgetExtension).toBeDefined();
  });
});
