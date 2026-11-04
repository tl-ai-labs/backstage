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
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useSignal } from '@backstage/plugin-signals-react';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { ButtonIcon, Flex, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiCheckLine } from '@remixicon/react';
import { notificationsApiRef, GetNotificationsResponse } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';

const DEFAULT_LIMIT = 5;
const DEFAULT_POLLING_INTERVAL_MS = 30_000;
const ThrottleDelayMs = 2000;

/** @public */
export type UnreadNotificationsCardProps = {
  title?: string;
  limit?: number;
  pollingIntervalMs?: number;
  className?: string;
};

/** @public */
export function UnreadNotificationsCardContent(
  props: Pick<UnreadNotificationsCardProps, 'limit' | 'pollingIntervalMs'> = {},
): JSX.Element {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const {
    limit = DEFAULT_LIMIT,
    pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
  } = props;

  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);

  let notificationsLink = '/notifications';
  try {
    const route = useRouteRef(rootRouteRef);
    if (route) {
      notificationsLink = route();
    }
  } catch {
    notificationsLink = '/notifications';
  }

  const [refreshCount, setRefreshCount] = useState(0);
  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');

  const { error, value, loading } =
    useNotificationsApi<GetNotificationsResponse>(
      api =>
        api.getNotifications({
          read: false,
          limit,
          sort: 'created',
          sortOrder: 'desc',
        }),
      [limit, refreshCount],
    );

  const triggerRefresh = useCallback(() => {
    setRefreshCount(c => c + 1);
  }, []);

  const throttledRefresh = useMemo(
    () => throttle(triggerRefresh, ThrottleDelayMs),
    [triggerRefresh],
  );

  useEffect(() => {
    return () => {
      throttledRefresh.cancel();
    };
  }, [throttledRefresh]);

  useEffect(() => {
    if (lastSignal && lastSignal.action) {
      throttledRefresh();
    }
  }, [lastSignal, throttledRefresh]);

  useEffect(() => {
    if (isSignalsAvailable || pollingIntervalMs <= 0) {
      return undefined;
    }
    const intervalId = window.setInterval(() => {
      setRefreshCount(c => c + 1);
    }, pollingIntervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSignalsAvailable, pollingIntervalMs]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationsApi.updateNotifications({
          ids: [id],
          read: true,
        });
        setRefreshCount(c => c + 1);
      } catch {
        toastApi.post({
          title: t('unreadNotificationsCard.errorMarkAsRead'),
          status: 'danger',
        });
      }
    },
    [notificationsApi, toastApi, t],
  );

  const notifications = value?.notifications ?? [];
  const isInitialLoading = loading && value === undefined;

  return (
    <>
      {isInitialLoading && <Progress />}
      {!isInitialLoading && error && <ResponseErrorPanel error={error} />}
      {!isInitialLoading && !error && (
        <Flex direction="column" gap="3">
          {notifications.length === 0 ? (
            <Text variant="body-medium" color="secondary">
              {t('unreadNotificationsCard.emptyMessage')}
            </Text>
          ) : (
            <Flex direction="column" gap="2">
              {notifications.map(notification => (
                <Flex
                  key={notification.id}
                  align="center"
                  justify="between"
                  gap="2"
                >
                  <Flex align="center" gap="2">
                    <SeverityIcon severity={notification.payload.severity} />
                    <Flex direction="column" gap="0">
                      <Link
                        to={`${notificationsLink}?id=${encodeURIComponent(
                          notification.id,
                        )}`}
                      >
                        <Text variant="body-medium" weight="bold">
                          {notification.payload.title}
                        </Text>
                      </Link>
                      {notification.payload.description && (
                        <Text variant="body-small" color="secondary">
                          {notification.payload.description}
                        </Text>
                      )}
                      <Text variant="body-small" color="secondary">
                        <RelativeTime value={notification.created} />
                      </Text>
                    </Flex>
                  </Flex>
                  <TooltipTrigger>
                    <ButtonIcon
                      variant="tertiary"
                      aria-label={t('unreadNotificationsCard.markAsRead')}
                      icon={<RiCheckLine />}
                      onClick={() => {
                        handleMarkAsRead(notification.id);
                      }}
                    />
                    <Tooltip>{t('unreadNotificationsCard.markAsRead')}</Tooltip>
                  </TooltipTrigger>
                </Flex>
              ))}
            </Flex>
          )}
          <Flex justify="end">
            <Link to={notificationsLink}>
              {t('unreadNotificationsCard.viewAll')}
            </Link>
          </Flex>
        </Flex>
      )}
    </>
  );
}

/** @public */
export function UnreadNotificationsCard(
  props: UnreadNotificationsCardProps = {},
): JSX.Element {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const {
    title = t('unreadNotificationsCard.title'),
    limit,
    pollingIntervalMs,
    className,
  } = props;

  return (
    <InfoCard title={title} className={className}>
      <UnreadNotificationsCardContent
        limit={limit}
        pollingIntervalMs={pollingIntervalMs}
      />
    </InfoCard>
  );
}
