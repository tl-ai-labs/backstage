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

import { useCallback, useEffect, useRef, useState } from 'react';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { useSignal } from '@backstage/plugin-signals-react';
import {
  useApi,
  useApiHolder,
  useRouteRef,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import {
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { ButtonIcon, Flex, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';
import styles from './Content.module.css';

const DEFAULT_LIMIT = 5;
const DEFAULT_POLLING_INTERVAL_MS = 60_000;

/**
 * Props for the {@link HomePageUnreadNotifications} home page card.
 *
 * @public
 */
export type HomePageUnreadNotificationsProps = {
  /** Maximum number of unread notifications to display. Defaults to 5. */
  limit?: number;
  /** Polling interval in milliseconds when signals are unavailable. Defaults to 60000. */
  pollingIntervalMs?: number;
};

function useNotificationsRoute(): string {
  try {
    return useRouteRef(rootRouteRef)();
  } catch {
    return '/notifications';
  }
}

export const Content = (props: HomePageUnreadNotificationsProps) => {
  const {
    limit = DEFAULT_LIMIT,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  } = props;

  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const apiHolder = useApiHolder();
  const toastApi = apiHolder.get(toastApiRef);
  const notificationsRoute = useNotificationsRoute();
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsApi.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      });
      if (mountedRef.current) {
        setNotifications(response.notifications);
        setError(undefined);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [notificationsApi, limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (lastSignal) {
      fetchNotifications();
    }
  }, [lastSignal, fetchNotifications]);

  useEffect(() => {
    if (isSignalsAvailable || pollingIntervalMs <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      fetchNotifications();
    }, pollingIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [isSignalsAvailable, pollingIntervalMs, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      setMarkingReadIds(prev => new Set(prev).add(id));
      try {
        await notificationsApi.updateNotifications({
          ids: [id],
          read: true,
        });
        if (mountedRef.current) {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }
      } catch {
        toastApi?.post({
          title: t('homePageCard.errors.markAsReadFailed'),
          status: 'danger',
        });
      } finally {
        if (mountedRef.current) {
          setMarkingReadIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
    },
    [notificationsApi, toastApi, t],
  );

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (notifications.length === 0) {
    return (
      <Text variant="body-medium" color="secondary">
        {t('homePageCard.emptyMessage')}
      </Text>
    );
  }

  const markAsReadLabel = t('homePageCard.markAsRead');

  return (
    <ul className={styles.list} aria-label={t('homePageCard.title')}>
      {notifications.map(notification => {
        const href = `${notificationsRoute}?id=${encodeURIComponent(
          notification.id,
        )}`;
        return (
          <li key={notification.id} className={styles.item}>
            <Flex gap="3" align="center" justify="between">
              <Flex gap="3" align="center" className={styles.itemContent}>
                <SeverityIcon severity={notification.payload.severity} />
                <Flex direction="column" gap="1" className={styles.itemText}>
                  <Link to={href} className={styles.itemLink}>
                    {notification.payload.title}
                  </Link>
                  <Text variant="body-small" color="secondary">
                    {notification.origin && (
                      <>
                        <span className={styles.metaItem}>
                          {notification.origin}
                        </span>
                        &bull;
                      </>
                    )}
                    {notification.payload.topic && (
                      <>
                        <span className={styles.metaItem}>
                          {notification.payload.topic}
                        </span>
                        &bull;
                      </>
                    )}
                    {notification.created && (
                      <RelativeTime
                        value={notification.created}
                        className={styles.metaItem}
                      />
                    )}
                  </Text>
                </Flex>
              </Flex>
              <TooltipTrigger>
                <ButtonIcon
                  aria-label={markAsReadLabel}
                  icon={<RiCheckboxCircleLine size={16} />}
                  variant="secondary"
                  isDisabled={markingReadIds.has(notification.id)}
                  onPress={() => handleMarkAsRead(notification.id)}
                />
                <Tooltip>{markAsReadLabel}</Tooltip>
              </TooltipTrigger>
            </Flex>
          </li>
        );
      })}
    </ul>
  );
};

export const Actions = () => {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsRoute = useNotificationsRoute();
  return <Link to={notificationsRoute}>{t('homePageCard.viewAll')}</Link>;
};
