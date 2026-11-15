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
import { useCallback, useEffect, useState } from 'react';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useSignal } from '@backstage/plugin-signals-react';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { NotificationIcon } from '../NotificationsTable/NotificationIcon';
import styles from './UnreadNotificationsCard.module.css';

const DEFAULT_LIMIT = 5;
const DEFAULT_POLLING_INTERVAL_MS = 60_000;

/**
 * Props for the unread notifications home page card.
 *
 * @public
 */
export type UnreadNotificationsCardProps = {
  /**
   * The maximum number of unread notifications to list. Defaults to 5.
   */
  limit?: number;
  /**
   * How often to reload the list, in milliseconds, when the signals plugin is
   * not installed. When signals are available the list updates live instead.
   * Set to 0 to disable polling. Defaults to 60000 (one minute).
   */
  pollingIntervalMs?: number;
};

/**
 * Returns a counter that increments whenever the list of notifications should
 * be reloaded: when a notifications signal is received, or on an interval if
 * signals are not available.
 */
function useRefreshKey(pollingIntervalMs: number) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(key => key + 1), []);
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  useEffect(() => {
    if (lastSignal?.action) {
      refresh();
    }
  }, [lastSignal, refresh]);

  useEffect(() => {
    if (isSignalsAvailable || pollingIntervalMs <= 0) {
      return undefined;
    }
    const interval = setInterval(refresh, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [isSignalsAvailable, pollingIntervalMs, refresh]);

  return { refreshKey, refresh };
}

/**
 * Lists the signed-in user's latest unread notifications, updating live as
 * notifications arrive or are read elsewhere.
 */
export const UnreadNotificationsCardContent = (
  props: UnreadNotificationsCardProps,
) => {
  const {
    limit = DEFAULT_LIMIT,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();
  const { refreshKey, refresh } = useRefreshKey(pollingIntervalMs);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const { value, error } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      }),
    [limit, refreshKey],
  );

  const onMarkAsRead = useCallback(
    async (id: Notification['id']) => {
      setPendingIds(ids => new Set(ids).add(id));
      try {
        await notificationsApi.updateNotifications({ ids: [id], read: true });
        refresh();
      } catch {
        toastApi.post({
          title: t('unreadNotificationsCard.errors.markAsReadFailed'),
          status: 'danger',
        });
      } finally {
        setPendingIds(ids => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
      }
    },
    [notificationsApi, refresh, toastApi, t],
  );

  // Keep showing the previous list while reloading to avoid flickering
  if (!value) {
    return error ? <ResponseErrorPanel error={error} /> : <Progress />;
  }

  const { notifications, totalCount } = value;

  if (notifications.length === 0) {
    return (
      <Text as="p" variant="body-medium" color="secondary">
        {t('unreadNotificationsCard.emptyMessage')}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="3">
      <ul className={styles.list}>
        {notifications.map(notification => (
          <li key={notification.id} className={styles.item}>
            <div className={styles.icon}>
              <NotificationIcon notification={notification} />
            </div>
            <Flex direction="column" gap="1" className={styles.content}>
              <Text variant="body-medium">
                <Link
                  to={`${notificationsRoute}?id=${encodeURIComponent(
                    notification.id,
                  )}`}
                >
                  {notification.payload.title}
                </Link>
              </Text>
              <Text variant="body-small" color="secondary">
                {notification.origin && (
                  <Text
                    as="span"
                    variant="body-small"
                    color="secondary"
                    className={styles.meta}
                  >
                    {notification.origin}
                  </Text>
                )}
                {notification.created && (
                  <RelativeTime
                    value={notification.created}
                    className={styles.meta}
                  />
                )}
              </Text>
            </Flex>
            <ButtonIcon
              aria-label={t('unreadNotificationsCard.markAsRead')}
              icon={<RiCheckLine size={16} />}
              variant="tertiary"
              size="small"
              isDisabled={pendingIds.has(notification.id)}
              onPress={() => onMarkAsRead(notification.id)}
            />
          </li>
        ))}
      </ul>
      <Text variant="body-small">
        <Link to={notificationsRoute}>
          {t('unreadNotificationsCard.viewAll', { count: totalCount })}
        </Link>
      </Text>
    </Flex>
  );
};
