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
import useAsyncFn from 'react-use/esm/useAsyncFn';
import useMountedState from 'react-use/esm/useMountedState';
// @ts-ignore
import RelativeTime from 'react-relative-time';
import { Notification } from '@backstage/plugin-notifications-common';
import {
  Alert,
  ButtonIcon,
  Card,
  CardBody,
  CardHeader,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Link, Progress } from '@backstage/core-components';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { notificationsTranslationRef } from '../../translation';

import { notificationsApiRef } from '../../api';
import { useNotificationsApi, useNotificationsRefresh } from '../../hooks';
import { rootRouteRef } from '../../routes';
import { SeverityIcon } from '../NotificationsTable/SeverityIcon';

import styles from './UnreadNotificationsCard.module.css';

/**
 * Props for {@link UnreadNotificationsCard}.
 *
 * @internal
 */
export type UnreadNotificationsCardProps = {
  /** The maximum number of notifications to list. Defaults to 5. */
  limit?: number;
  /** The polling interval used when signals are unavailable. */
  pollIntervalMs?: number;
};

const UnreadNotificationRow = ({
  notification,
  notificationsRoute,
  onMarkedRead,
}: {
  notification: Notification;
  notificationsRoute: string;
  onMarkedRead: (id: string) => void;
}) => {
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const severity = notification.payload.severity ?? 'normal';
  const markAsReadText = t('unreadCard.markAsRead');

  const [{ loading: isMarkingAsRead }, markAsRead] = useAsyncFn(async () => {
    try {
      await notificationsApi.updateNotifications({
        ids: [notification.id],
        read: true,
      });
      onMarkedRead(notification.id);
    } catch {
      toastApi.post({
        title: t('sidebar.errors.markAsReadFailed'),
        status: 'danger',
      });
    }
  }, [notification.id, notificationsApi, onMarkedRead, t, toastApi]);

  return (
    <li className={styles.item}>
      <div
        className={styles.severity}
        role="img"
        aria-label={t(`filters.severity.${severity}`)}
      >
        <SeverityIcon severity={severity} />
      </div>
      <div className={styles.text}>
        <Text variant="body-medium" as="div" className={styles.title}>
          <Link
            to={`${notificationsRoute}?id=${encodeURIComponent(
              notification.id,
            )}`}
          >
            {notification.payload.title}
          </Link>
        </Text>
        <Text variant="body-small" color="secondary" as="div">
          <RelativeTime value={notification.created} />
        </Text>
      </div>
      <TooltipTrigger>
        <ButtonIcon
          aria-label={markAsReadText}
          isDisabled={isMarkingAsRead}
          onPress={() => {
            markAsRead();
          }}
          icon={<RiCheckboxCircleLine size={16} />}
          variant="secondary"
        />
        <Tooltip>{markAsReadText}</Tooltip>
      </TooltipTrigger>
    </li>
  );
};

/**
 * Home page card that lists the signed-in user's latest unread notifications.
 *
 * @internal
 */
export const UnreadNotificationsCard = (
  props: UnreadNotificationsCardProps,
) => {
  const { limit = 5, pollIntervalMs } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsRoute = useRouteRef(rootRouteRef)();
  const isMounted = useMountedState();
  const [rows, setRows] = useState<Notification[]>();

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

  useEffect(() => {
    if (value) {
      setRows(value.notifications);
    }
  }, [value]);

  const { requestRefresh } = useNotificationsRefresh({
    loading,
    retry,
    pollIntervalMs,
  });

  const onMarkedRead = useCallback(
    (id: string) => {
      if (!isMounted()) {
        return;
      }
      setRows(current =>
        current?.filter(notification => notification.id !== id),
      );
      requestRefresh();
    },
    [isMounted, requestRefresh],
  );

  let content = <Progress />;
  if (rows && rows.length > 0) {
    content = (
      <ul className={styles.list}>
        {rows.map(notification => (
          <UnreadNotificationRow
            key={notification.id}
            notification={notification}
            notificationsRoute={notificationsRoute}
            onMarkedRead={onMarkedRead}
          />
        ))}
      </ul>
    );
  } else if (rows) {
    content = <Text>{t('unreadCard.emptyState')}</Text>;
  } else if (error) {
    content = (
      <Alert status="danger" title={t('unreadCard.errors.loadFailed')} />
    );
  }

  return (
    <Card className={styles.card}>
      <CardHeader>
        <Text as="h3" variant="title-x-small">
          {t('unreadCard.title')}
        </Text>
      </CardHeader>
      <CardBody>{content}</CardBody>
    </Card>
  );
};
