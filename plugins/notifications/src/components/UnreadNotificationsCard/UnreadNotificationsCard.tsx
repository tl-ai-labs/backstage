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
import { useApi, useApiHolder, useRouteRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { useSignal } from '@backstage/plugin-signals-react';
import { ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCheckboxCircleLine, RiRssFill } from '@remixicon/react';

import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { notificationsTranslationRef } from '../../translation';
import { NotificationIcon } from '../NotificationsTable/NotificationIcon';
import styles from './UnreadNotificationsCard.module.css';

const DEFAULT_MAX_ITEMS = 5;
const DEFAULT_POLL_INTERVAL_MS = 60_000;

/** @public */
export type UnreadNotificationsCardProps = {
  /** Maximum number of unread notifications to display. Defaults to 5. */
  maxItems?: number;
  /** Polling interval in milliseconds when signals are unavailable. Defaults to 60000. */
  pollIntervalMs?: number;
  /** Optional card title override. */
  title?: string;
};

function useNotificationsRoute(): string {
  try {
    const routeLink = useRouteRef(rootRouteRef);
    return routeLink();
  } catch {
    return '/notifications';
  }
}

/**
 * Inner content for the home-page unread notifications card.
 *
 * @public
 */
export const UnreadNotificationsContent = (
  props: UnreadNotificationsCardProps,
) => {
  const {
    maxItems = DEFAULT_MAX_ITEMS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const apiHolder = useApiHolder();
  const toastApi = apiHolder.get(toastApiRef);
  const notificationsRoute = useNotificationsRoute();
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set());

  const { value, loading, error, retry } = useNotificationsApi(
    api =>
      api.getNotifications({
        read: false,
        sort: 'created',
        sortOrder: 'desc',
        limit: maxItems,
      }),
    [maxItems],
  );

  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');
  const lastProcessedSignalRef = useRef<NotificationSignal | null>(null);
  const retryRef = useRef(retry);
  retryRef.current = retry;

  useEffect(() => {
    if (
      lastSignal &&
      lastSignal.action &&
      lastSignal !== lastProcessedSignalRef.current
    ) {
      lastProcessedSignalRef.current = lastSignal;
      retryRef.current();
    }
  }, [lastSignal]);

  useEffect(() => {
    if (isSignalsAvailable) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      retryRef.current();
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [isSignalsAvailable, pollIntervalMs]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      setMarkingIds(prev => new Set(prev).add(id));
      try {
        await notificationsApi.updateNotifications({
          ids: [id],
          read: true,
        });
        retry();
      } catch {
        toastApi?.post({
          title: t('homePageCard.errors.markAsReadFailed'),
          status: 'danger',
        });
      } finally {
        setMarkingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [notificationsApi, retry, toastApi, t],
  );

  if (loading && !value) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const notifications = value?.notifications ?? [];

  if (notifications.length === 0) {
    return (
      <Text variant="body-medium" color="secondary">
        {t('homePageCard.emptyMessage')}
      </Text>
    );
  }

  return (
    <div>
      <ul className={styles.list}>
        {notifications.map(notification => (
          <li key={notification.id} className={styles.listItem}>
            <div className={styles.itemContent}>
              <div className={styles.icon}>
                <NotificationIcon notification={notification} />
              </div>
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
                <Flex gap="1" align="center" className={styles.meta}>
                  {!notification.user && (
                    <RiRssFill size={14} className={styles.broadcastIcon} />
                  )}
                  {notification.origin && (
                    <>
                      <Text as="span" variant="body-small" color="secondary">
                        {notification.origin}
                      </Text>
                      <Text as="span" variant="body-small" color="secondary">
                        &bull;
                      </Text>
                    </>
                  )}
                  {notification.payload.topic && (
                    <>
                      <Text as="span" variant="body-small" color="secondary">
                        {notification.payload.topic}
                      </Text>
                      <Text as="span" variant="body-small" color="secondary">
                        &bull;
                      </Text>
                    </>
                  )}
                  {notification.created && (
                    <Text as="span" variant="body-small" color="secondary">
                      <RelativeTime value={notification.created} />
                    </Text>
                  )}
                </Flex>
              </Flex>
            </div>
            <ButtonIcon
              aria-label={t('homePageCard.markAsRead')}
              icon={<RiCheckboxCircleLine size={16} />}
              variant="tertiary"
              isDisabled={markingIds.has(notification.id)}
              onPress={() => handleMarkAsRead(notification.id)}
            />
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <Link to={notificationsRoute}>{t('homePageCard.viewAll')}</Link>
      </div>
    </div>
  );
};

/**
 * Home-page card displaying the signed-in user's latest unread notifications.
 *
 * @public
 */
export const UnreadNotificationsCard = (
  props: UnreadNotificationsCardProps,
) => {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const { title = t('homePageCard.title'), ...rest } = props;

  return (
    <InfoCard title={title} divider>
      <UnreadNotificationsContent {...rest} />
    </InfoCard>
  );
};
