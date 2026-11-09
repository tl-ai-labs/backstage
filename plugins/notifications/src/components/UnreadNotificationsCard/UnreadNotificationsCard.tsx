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

import { useEffect, useState } from 'react';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  ErrorPanel,
  InfoCard,
  Link,
  Progress,
} from '@backstage/core-components';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckLine } from '@remixicon/react';
import { useSignal } from '@backstage/plugin-signals-react';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';

const DEFAULT_LIMIT = 5;
const DEFAULT_POLLING_INTERVAL_MS = 60000;
const MIN_POLLING_INTERVAL_MS = 10000;

export type UnreadNotificationsCardProps = {
  /** Maximum number of unread notifications to display (default: 5). */
  limit?: number;
  /** Polling interval in milliseconds when signals are unavailable (default: 60000, minimum: 10000). */
  pollingIntervalMs?: number;
};

export function UnreadNotificationsCardContent(
  props: UnreadNotificationsCardProps,
): JSX.Element {
  const {
    limit = DEFAULT_LIMIT,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  } = props;
  const interval = Math.max(pollingIntervalMs, MIN_POLLING_INTERVAL_MS);

  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsLink = useRouteRef(rootRouteRef)();

  const { loading, error, value, retry } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        limit,
        sort: 'created',
        sortOrder: 'desc',
      }),
    [limit],
  );

  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (lastSignal) {
      setRefresh(true);
    }
  }, [lastSignal]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }
    const handle = setInterval(() => setRefresh(true), interval);
    return () => clearInterval(handle);
  }, [isSignalsAvailable, interval]);

  useEffect(() => {
    if (refresh && !loading) {
      retry();
      setRefresh(false);
    }
  }, [refresh, loading, retry]);

  const handleMarkAsRead = (id: string) => {
    notificationsApi
      .updateNotifications({ ids: [id], read: true })
      .then(() => {
        setRefresh(true);
      })
      .catch(() => {
        toastApi.post({
          title: t('unreadNotificationsCard.errors.markAsReadFailed'),
          status: 'danger',
        });
      });
  };

  const renderContent = () => {
    if (error) {
      return (
        <ErrorPanel
          error={error}
          title={t('unreadNotificationsCard.errors.fetchFailed')}
        />
      );
    }

    if (loading && !value) {
      return <Progress />;
    }

    const notifications = value?.notifications ?? [];
    if (notifications.length === 0) {
      return (
        <Text variant="body-medium" color="secondary">
          {t('unreadNotificationsCard.emptyMessage')}
        </Text>
      );
    }

    return notifications.map(notification => {
      const itemLink = `${notificationsLink}?id=${encodeURIComponent(
        notification.id,
      )}`;

      return (
        <Flex key={notification.id} align="center" justify="between">
          <Flex direction="column" gap="1">
            <Text variant="body-medium">
              <Link to={itemLink}>{notification.payload.title}</Link>
            </Text>
            {notification.payload.description && (
              <Text variant="body-small" color="secondary" truncate>
                {notification.payload.description}
              </Text>
            )}
            <Text variant="body-small" color="secondary">
              <RelativeTime value={notification.created} />
            </Text>
          </Flex>
          <ButtonIcon
            aria-label={t('unreadNotificationsCard.markAsRead')}
            icon={<RiCheckLine size={16} />}
            variant="tertiary"
            onPress={() => handleMarkAsRead(notification.id)}
          />
        </Flex>
      );
    });
  };

  return (
    <Flex direction="column" gap="3">
      {renderContent()}
      <Text variant="body-small">
        <Link to={notificationsLink}>
          {t('unreadNotificationsCard.viewAll')}
        </Link>
      </Text>
    </Flex>
  );
}

export function UnreadNotificationsCard(
  props: UnreadNotificationsCardProps,
): JSX.Element {
  const { t } = useTranslationRef(notificationsTranslationRef);

  return (
    <InfoCard title={t('unreadNotificationsCard.title')}>
      <UnreadNotificationsCardContent {...props} />
    </InfoCard>
  );
}
