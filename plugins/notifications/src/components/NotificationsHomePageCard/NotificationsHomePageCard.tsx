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

import { useEffect, useRef } from 'react';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import {
  ErrorPanel,
  InfoCard,
  Link,
  Progress,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useSignal } from '@backstage/plugin-signals-react';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';

/** @public */
export type NotificationsHomePageCardProps = {
  /** Maximum number of unread notifications to show, defaults to 5 */
  limit?: number;
  /**
   * How often to refresh in milliseconds when real-time signals are not
   * available, defaults to 60000
   */
  pollIntervalMs?: number;
};

/**
 * A card listing the latest unread notifications of the signed-in user.
 *
 * @public
 */
export const NotificationsHomePageCard = (
  props: NotificationsHomePageCardProps,
) => {
  const { limit = 5, pollIntervalMs = 60000 } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();
  const { lastSignal, isSignalsAvailable } = useSignal('notifications');

  const { value, error, loading, retry } = useNotificationsApi(
    api => api.getNotifications({ read: false, limit }),
    [limit],
  );

  const retryRef = useRef(retry);
  retryRef.current = retry;

  useEffect(() => {
    if (lastSignal) {
      retryRef.current();
    }
  }, [lastSignal]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const interval = setInterval(() => retryRef.current(), pollIntervalMs);
    return () => clearInterval(interval);
  }, [isSignalsAvailable, pollIntervalMs]);

  const markAsRead = (id: string) => {
    notificationsApi
      .updateNotifications({ ids: [id], read: true })
      .then(() => retryRef.current())
      .catch(() => {
        toastApi.post({
          title: t('sidebar.errors.markAsReadFailed'),
          status: 'danger',
        });
      });
  };

  const notifications = value?.notifications ?? [];

  return (
    <InfoCard title={t('homePage.title')} variant="gridItem">
      {loading && !value && <Progress />}
      {error && !value && (
        <ErrorPanel title={t('homePage.errorTitle')} error={error} />
      )}
      {value && notifications.length === 0 && (
        <Text variant="body-medium">{t('homePage.empty')}</Text>
      )}
      {notifications.length > 0 && (
        <Flex direction="column" gap="3">
          {notifications.map(notification => (
            <Flex key={notification.id} justify="between" align="center">
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
                {notification.created && (
                  <Text variant="body-small" color="secondary">
                    <RelativeTime value={notification.created} />
                  </Text>
                )}
              </Flex>
              <ButtonIcon
                aria-label={t('homePage.markAsRead')}
                icon={<RiCheckLine size={16} />}
                variant="secondary"
                onPress={() => markAsRead(notification.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
      <Link to={notificationsRoute}>{t('homePage.viewAll')}</Link>
    </InfoCard>
  );
};
