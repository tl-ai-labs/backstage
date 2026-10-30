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
import useMountedState from 'react-use/esm/useMountedState';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { Link, Progress } from '@backstage/core-components';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { useSignal } from '@backstage/plugin-signals-react';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';

export const UNREAD_NOTIFICATIONS_LIMIT = 5;
export const UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS = 60000;

const SeverityLabelKeys = {
  critical: 'filters.severity.critical',
  high: 'filters.severity.high',
  normal: 'filters.severity.normal',
  low: 'filters.severity.low',
} as const;

/**
 * Content of the unread notifications home-page widget.
 *
 * @alpha
 */
export function UnreadNotificationsCardContent(): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  const isMounted = useMountedState();

  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();

  const { loading, error, value } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        limit: UNREAD_NOTIFICATIONS_LIMIT,
        sort: 'created',
        sortOrder: 'desc',
      }),
    [refreshKey],
  );

  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  useEffect(() => {
    if (lastSignal?.action) {
      refresh();
    }
  }, [lastSignal, refresh]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const handle = setInterval(
      refresh,
      UNREAD_NOTIFICATIONS_POLLING_INTERVAL_MS,
    );
    return () => clearInterval(handle);
  }, [isSignalsAvailable, refresh]);

  const onMarkAsRead = useCallback(
    (id: string) => {
      notificationsApi
        .updateNotifications({ ids: [id], read: true })
        .then(() => {
          if (isMounted()) {
            refresh();
          }
        })
        .catch(() => {
          toastApi.post({
            title: t('unreadNotificationsCard.markAsReadFailed'),
            status: 'danger',
          });
        });
    },
    [notificationsApi, isMounted, refresh, toastApi, t],
  );

  if (error) {
    return (
      <Text color="danger">{t('unreadNotificationsCard.errorMessage')}</Text>
    );
  }

  if (loading && !value) {
    return <Progress />;
  }

  if (!value?.notifications || value.notifications.length === 0) {
    return (
      <Text color="secondary">{t('unreadNotificationsCard.emptyMessage')}</Text>
    );
  }

  return (
    <Flex
      direction="column"
      gap="3"
      role="list"
      aria-label={t('unreadNotificationsCard.title')}
    >
      {value.notifications.map(notification => {
        const severity = notification.payload.severity;
        const hasNonNormalSeverity = severity && severity !== 'normal';
        return (
          <Flex
            role="listitem"
            key={notification.id}
            justify="between"
            align="center"
          >
            <Flex direction="column" gap="1">
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
                <RelativeTime value={notification.created} />
                {hasNonNormalSeverity && ` • ${t(SeverityLabelKeys[severity])}`}
              </Text>
            </Flex>
            <ButtonIcon
              aria-label={t('unreadNotificationsCard.markAsRead')}
              icon={<RiCheckboxCircleLine size={16} />}
              variant="secondary"
              onPress={() => onMarkAsRead(notification.id)}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
