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
import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import {
  Notification,
  NotificationSignal,
} from '@backstage/plugin-notifications-common';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { useApi, useApiHolder, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useSignal } from '@backstage/plugin-signals-react';
import { notificationsTranslationRef } from '../../translation';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';

/** @public */
export type HomePageUnreadNotificationsProps = {
  limit?: number;
  pollingIntervalMs?: number;
};

/** @public */
export const Content = ({
  limit = 5,
  pollingIntervalMs = 10000,
}: HomePageUnreadNotificationsProps) => {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const apiHolder = useApiHolder();
  const toastApi = apiHolder.get(toastApiRef);

  let notificationsRoute = '/notifications';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    notificationsRoute = useRouteRef(rootRouteRef)();
  } catch {
    // Fallback to default notifications route when route ref is not mounted
  }

  const { value, loading, error, retry } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        sort: 'created',
        sortOrder: 'desc',
        limit,
      }),
    [limit],
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const retryRef = useRef(retry);
  retryRef.current = retry;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (value?.notifications) {
      setNotifications(value.notifications);
    }
  }, [value]);

  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  useEffect(() => {
    if (isSignalsAvailable && lastSignal) {
      retryRef.current();
    }
  }, [isSignalsAvailable, lastSignal]);

  useEffect(() => {
    if (!isSignalsAvailable && pollingIntervalMs > 0) {
      const timer = setInterval(() => {
        retryRef.current();
      }, pollingIntervalMs);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isSignalsAvailable, pollingIntervalMs]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.updateNotifications({
        ids: [id],
        read: true,
      });
      if (isMountedRef.current) {
        setNotifications(prev => prev.filter(item => item.id !== id));
      }
    } catch {
      toastApi?.post({
        title: t('homePageCard.errors.markAsReadFailed'),
        status: 'danger',
      });
    }
  };

  if (loading && !value) {
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

  return (
    <Flex direction="column" gap="3">
      {notifications.map(notification => (
        <Flex key={notification.id} justify="between" align="center" gap="3">
          <Flex align="center" gap="3">
            <SeverityIcon severity={notification.payload.severity} />
            <Flex direction="column" gap="1">
              <Link
                to={`${notificationsRoute}?id=${encodeURIComponent(
                  notification.id,
                )}`}
              >
                {notification.payload.title}
              </Link>
              {notification.payload.description && (
                <Text variant="body-small" color="secondary">
                  {notification.payload.description}
                </Text>
              )}
              <Flex align="center" gap="2">
                {notification.origin && (
                  <Text variant="body-x-small" color="secondary">
                    {notification.origin}
                  </Text>
                )}
                {notification.payload.topic && (
                  <Text variant="body-x-small" color="secondary">
                    {notification.payload.topic}
                  </Text>
                )}
                {notification.created && (
                  <Text variant="body-x-small" color="secondary">
                    <RelativeTime value={notification.created} />
                  </Text>
                )}
              </Flex>
            </Flex>
          </Flex>
          <ButtonIcon
            aria-label={t('homePageCard.markAsRead')}
            icon={<RiCheckboxCircleLine size={16} />}
            variant="secondary"
            onPress={() => handleMarkAsRead(notification.id)}
          />
        </Flex>
      ))}
    </Flex>
  );
};
