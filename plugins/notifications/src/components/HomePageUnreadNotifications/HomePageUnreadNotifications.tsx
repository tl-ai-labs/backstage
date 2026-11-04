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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useSignal } from '@backstage/plugin-signals-react';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';

/** @public */
export type HomePageUnreadNotificationsProps = {
  /** Maximum number of unread notifications to show. Defaults to 5. */
  limit?: number;
  /** Polling interval in ms used when signals are unavailable. Defaults to 10000. */
  pollingIntervalMs?: number;
};

const formatRelative = (date: Date): string => {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(seconds, 'second');
};

const RelativeTime = ({ value }: { value: Date | string }) => {
  const date = value instanceof Date ? value : new Date(value);
  return <time dateTime={date.toISOString()}>{formatRelative(date)}</time>;
};

/** @public */
export function Content(props: HomePageUnreadNotificationsProps) {
  const { limit = 5, pollingIntervalMs = 10000 } = props;
  const notificationsRootRoute = useRouteRef(rootRouteRef);
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');
  const [readIds, setReadIds] = useState<string[]>([]);

  const { value, loading, error, retry } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      }),
    [limit],
  );

  const notifications = useMemo(
    () => (value?.notifications ?? []).filter(n => !readIds.includes(n.id)),
    [value, readIds],
  );

  useEffect(() => {
    if (
      lastSignal?.action === 'new_notification' ||
      lastSignal?.action === 'notification_read' ||
      lastSignal?.action === 'notification_unread'
    ) {
      retry();
    }
  }, [lastSignal, retry]);

  useEffect(() => {
    if (isSignalsAvailable !== false || !(pollingIntervalMs > 0)) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      retry();
    }, pollingIntervalMs);
    return () => {
      clearInterval(intervalId);
    };
  }, [isSignalsAvailable, pollingIntervalMs, retry]);

  const markAsRead = useCallback(
    async (id: string) => {
      setReadIds(prev => [...prev, id]);
      try {
        await notificationsApi.updateNotifications({ ids: [id], read: true });
      } catch (e) {
        setReadIds(prev => prev.filter(x => x !== id));
        toastApi.post({
          title: t('homeWidget.errors.markAsReadFailed'),
          status: 'danger',
        });
      }
      retry();
    },
    [notificationsApi, toastApi, retry, t],
  );

  if (loading && !value) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (notifications.length === 0) {
    return <Text>{t('homeWidget.emptyMessage')}</Text>;
  }

  return (
    <Flex direction="column" gap="3">
      {notifications.map(notification => (
        <Flex key={notification.id} align="start" gap="2">
          <SeverityIcon severity={notification.payload.severity} />
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Link
              to={`${notificationsRootRoute()}?id=${encodeURIComponent(
                notification.id,
              )}`}
            >
              {notification.payload.title}
            </Link>
            {notification.payload.description && (
              <Text variant="body-small">
                {notification.payload.description}
              </Text>
            )}
            <Text variant="body-small" color="secondary">
              {[notification.origin, notification.payload.topic]
                .filter(Boolean)
                .join(' · ')}
              {notification.origin || notification.payload.topic ? ' · ' : ''}
              <RelativeTime value={notification.created} />
            </Text>
          </Flex>
          <ButtonIcon
            variant="tertiary"
            size="small"
            icon={<RiCheckboxCircleLine />}
            aria-label={t('homeWidget.markAsRead')}
            onPress={() => markAsRead(notification.id)}
          />
        </Flex>
      ))}
    </Flex>
  );
}
