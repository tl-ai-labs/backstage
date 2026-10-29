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
import throttle from 'lodash/throttle';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useSignal } from '@backstage/plugin-signals-react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { notificationsTranslationRef } from '../../translation';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { NotificationIcon } from '../NotificationsTable/NotificationIcon';

const ThrottleDelayMs = 2000;

/**
 * Props for the unread notifications home page card.
 *
 * @public
 */
export type UnreadNotificationsCardProps = {
  /** Maximum number of notifications shown, defaults to 5 */
  limit?: number;
  /** Refresh interval in milliseconds, used only when signals are unavailable, defaults to 60000 */
  pollingIntervalMs?: number;
};

/**
 * Lists the latest unread notifications of the signed-in user.
 */
export function UnreadNotificationsCardContent(
  props: UnreadNotificationsCardProps,
) {
  const { limit = 5, pollingIntervalMs = 60000 } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  let root = '/notifications';
  try {
    // useRouteRef throws after running its own hooks when the page is not
    // mounted, so the hook count is the same on every render.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    root = useRouteRef(rootRouteRef)();
  } catch {
    // The notifications page is not mounted, keep the fallback
  }
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  const { error, value, retry, loading } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      }),
    [limit],
  );

  const [items, setItems] = useState<Notification[] | undefined>(undefined);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (value) {
      setItems(value.notifications);
    }
  }, [value]);

  const throttledSetRefresh = useMemo(
    () => throttle(setRefresh, ThrottleDelayMs),
    [],
  );

  useEffect(() => {
    if (refresh && !loading) {
      retry();
      setRefresh(false);
    }
  }, [refresh, retry, loading]);

  useEffect(() => {
    if (lastSignal && lastSignal.action) {
      throttledSetRefresh(true);
    }
  }, [lastSignal, throttledSetRefresh]);

  useEffect(() => {
    return () => throttledSetRefresh.cancel();
  }, [throttledSetRefresh]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const interval = setInterval(() => setRefresh(true), pollingIntervalMs);
    return () => clearInterval(interval);
  }, [isSignalsAvailable, pollingIntervalMs]);

  const onMarkAsRead = useCallback(
    (id: string) => {
      notificationsApi
        .updateNotifications({ ids: [id], read: true })
        .then(() => {
          setItems(prev => prev?.filter(item => item.id !== id));
        })
        .catch(() => {
          toastApi.post({
            title: t('unreadNotificationsCard.errors.markAsReadFailed'),
            status: 'danger',
          });
        });
    },
    [notificationsApi, toastApi, t],
  );

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (items === undefined) {
    return <Progress />;
  }

  return (
    <Flex direction="column" gap="3">
      {items.length === 0 ? (
        <Text variant="body-medium" color="secondary">
          {t('unreadNotificationsCard.emptyMessage')}
        </Text>
      ) : (
        items.map(notification => (
          <Flex key={notification.id} gap="3" align="center">
            <NotificationIcon notification={notification} />
            <Flex direction="column" gap="1">
              <Text variant="body-medium">
                <Link to={`${root}?id=${encodeURIComponent(notification.id)}`}>
                  {notification.payload.title}
                </Link>
              </Text>
              <Text variant="body-small" color="secondary">
                <RelativeTime value={notification.created} />
              </Text>
            </Flex>
            <ButtonIcon
              aria-label={t('unreadNotificationsCard.markAsRead')}
              icon={<RiCheckboxCircleLine size={16} />}
              variant="secondary"
              onPress={() => onMarkAsRead(notification.id)}
            />
          </Flex>
        ))
      )}
      <Link to={root}>{t('unreadNotificationsCard.viewAll')}</Link>
    </Flex>
  );
}
