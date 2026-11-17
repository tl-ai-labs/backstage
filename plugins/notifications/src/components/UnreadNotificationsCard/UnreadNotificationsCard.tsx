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
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  useApi,
  useApiHolder,
  useRouteRef,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { useSignal } from '@backstage/plugin-signals-react';
import { ButtonIcon, Text } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';
import styles from './UnreadNotificationsCard.module.css';

/** @public */
export type UnreadNotificationsCardProps = {
  /** Maximum number of unread notifications to display. Defaults to 5. */
  limit?: number;
  /** Polling interval in milliseconds when signals are unavailable. Defaults to 60000. */
  pollingIntervalMs?: number;
};

/** @public */
export const UnreadNotificationsCard = (
  props: UnreadNotificationsCardProps,
) => {
  const { limit = 5, pollingIntervalMs = 60000 } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const apiHolder = useApiHolder();
  const toastApi = apiHolder.get(toastApiRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  const [notifications, setNotifications] = useState<Notification[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const prevSignalRef = useRef<NotificationSignal | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      const response = await notificationsApi.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      });
      if (!mountedRef.current || fetchId !== fetchIdRef.current) {
        return;
      }
      setNotifications(response.notifications);
      setError(undefined);
    } catch (e) {
      if (!mountedRef.current || fetchId !== fetchIdRef.current) {
        return;
      }
      setError(e as Error);
    } finally {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [notificationsApi, limit]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (lastSignal && lastSignal !== prevSignalRef.current) {
      prevSignalRef.current = lastSignal;
      fetchNotifications();
    }
  }, [lastSignal, fetchNotifications]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, pollingIntervalMs);
    return () => {
      clearInterval(intervalId);
    };
  }, [isSignalsAvailable, pollingIntervalMs, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationsApi.updateNotifications({
          ids: [id],
          read: true,
        });
        if (mountedRef.current) {
          await fetchNotifications();
        }
      } catch {
        toastApi?.post({
          title: t('unreadNotificationsCard.errors.markAsReadFailed'),
          status: 'danger',
        });
      }
    },
    [notificationsApi, fetchNotifications, toastApi, t],
  );

  let content: JSX.Element;
  if (loading && notifications === undefined) {
    content = <Progress />;
  } else if (error) {
    content = <ResponseErrorPanel error={error} />;
  } else if (!notifications || notifications.length === 0) {
    content = (
      <Text variant="body-medium" color="secondary">
        {t('unreadNotificationsCard.emptyMessage')}
      </Text>
    );
  } else {
    content = (
      <ul className={styles.list}>
        {notifications.map(notification => (
          <li key={notification.id} className={styles.item}>
            <div className={styles.itemContent}>
              <SeverityIcon severity={notification.payload.severity} />
              <div className={styles.itemText}>
                <Text variant="body-medium">
                  <Link
                    to={`${notificationsRoute}?id=${encodeURIComponent(
                      notification.id,
                    )}`}
                  >
                    {notification.payload.title}
                  </Link>
                </Text>
                {notification.created && (
                  <Text variant="body-small" color="secondary">
                    <RelativeTime value={notification.created} />
                  </Text>
                )}
              </div>
            </div>
            <ButtonIcon
              aria-label={t('unreadNotificationsCard.markAsRead')}
              icon={<RiCheckboxCircleLine size={16} />}
              variant="tertiary"
              onPress={() => handleMarkAsRead(notification.id)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <InfoCard
      title={t('unreadNotificationsCard.title')}
      deepLink={{
        title: t('unreadNotificationsCard.viewAll'),
        link: notificationsRoute,
      }}
    >
      {content}
    </InfoCard>
  );
};
