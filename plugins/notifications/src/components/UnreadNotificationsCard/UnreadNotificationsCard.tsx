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
import useMountedState from 'react-use/esm/useMountedState';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import { useNotificationsApi } from '../../hooks';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { rootRouteRef } from '../../routes';
import { useSignal } from '@backstage/plugin-signals-react';
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { GetNotificationsResponse, notificationsApiRef } from '../../api';
import { notificationsTranslationRef } from '../../translation';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';
import { ButtonIcon, Flex, Text, Tooltip, TooltipTrigger } from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';

const MaxItems = 5;
const PollIntervalMs = 60000;
const RefreshActions: NotificationSignal['action'][] = [
  'new_notification',
  'notification_read',
  'notification_unread',
];

export const UnreadNotificationsCard = (): JSX.Element => {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const toastApi = useApi(toastApiRef);
  const notificationsApi = useApi(notificationsApiRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();
  const isMounted = useMountedState();

  const [markedReadIds, setMarkedReadIds] = useState<Set<string>>(
    () => new Set(),
  );

  const { value, error, loading, retry } =
    useNotificationsApi<GetNotificationsResponse>(
      api =>
        api.getNotifications({
          read: false,
          limit: MaxItems,
          sort: 'created',
          sortOrder: 'desc',
        }),
      [],
    );

  const { lastSignal, isSignalsAvailable } =
    useSignal<NotificationSignal>('notifications');
  const [polls] = useState(!isSignalsAvailable);

  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (refresh && !loading) {
      retry();
      setRefresh(false);
    }
  }, [refresh, retry, loading]);

  useEffect(() => {
    if (lastSignal && RefreshActions.includes(lastSignal.action)) {
      setRefresh(true);
    }
  }, [lastSignal]);

  useEffect(() => {
    if (!polls) {
      return undefined;
    }
    const timer = setInterval(() => setRefresh(true), PollIntervalMs);
    return () => clearInterval(timer);
  }, [polls]);

  useEffect(() => {
    setMarkedReadIds(new Set());
  }, [value]);

  const markAsRead = useCallback(
    (id: string) => {
      notificationsApi
        .updateNotifications({ ids: [id], read: true })
        .then(() => {
          if (isMounted()) {
            setMarkedReadIds(prev => new Set(prev).add(id));
            setRefresh(true);
          }
        })
        .catch(() => {
          toastApi.post({
            title: t('unreadNotificationsCard.errors.markAsReadFailed'),
            status: 'danger',
          });
        });
    },
    [notificationsApi, isMounted, toastApi, t],
  );

  const visibleNotifications = useMemo(
    () =>
      (value?.notifications ?? []).filter(
        notification => !markedReadIds.has(notification.id),
      ),
    [value, markedReadIds],
  );

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!value) {
    return <Progress />;
  }

  if (visibleNotifications.length === 0) {
    return (
      <Text variant="body-medium" color="secondary">
        {t('unreadNotificationsCard.empty')}
      </Text>
    );
  }

  const markAsReadLabel = t('unreadNotificationsCard.markAsRead');

  return (
    <Flex direction="column" gap="2">
      {visibleNotifications.map(notification => (
        <Flex
          key={notification.id}
          direction="row"
          justify="between"
          align="center"
          gap="4"
        >
          <Flex direction="row" gap="4" align="center">
            <SeverityIcon severity={notification.payload.severity} />
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
                {notification.created && (
                  <RelativeTime value={notification.created} />
                )}
              </Text>
            </Flex>
          </Flex>
          <TooltipTrigger>
            <ButtonIcon
              aria-label={markAsReadLabel}
              onPress={() => markAsRead(notification.id)}
              icon={<RiCheckboxCircleLine size={16} />}
              variant="secondary"
            />
            <Tooltip>{markAsReadLabel}</Tooltip>
          </TooltipTrigger>
        </Flex>
      ))}
    </Flex>
  );
};
