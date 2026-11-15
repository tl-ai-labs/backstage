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
import { NotificationSignal } from '@backstage/plugin-notifications-common';
import { useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { Link, Progress } from '@backstage/core-components';
import { useSignal } from '@backstage/plugin-signals-react';
import { Alert, Button, ButtonIcon, Flex, Text } from '@backstage/ui';
import { RiCloseLine } from '@remixicon/react';
import { notificationsApiRef } from '../../api';
import { useNotificationsApi } from '../../hooks';
import { notificationsTranslationRef } from '../../translation';
import { NotificationIcon } from '../NotificationsTable/NotificationIcon';
import { NotificationDescription } from '../NotificationsTable/NotificationDescription';
import styles from './HighlightedNotification.module.css';

/**
 * Shows a single notification, selected through the `id` query parameter of
 * the notifications page, in a highlighted panel above the notifications table.
 */
export function HighlightedNotification(props: {
  id: string;
  markAsReadOnLinkOpen?: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const { id, markAsReadOnLinkOpen, onUpdate, onDismiss } = props;
  const { t } = useTranslationRef(notificationsTranslationRef);
  const notificationsApi = useApi(notificationsApiRef);
  const toastApi = useApi(toastApiRef);
  const { lastSignal } = useSignal<NotificationSignal>('notifications');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (lastSignal?.action) {
      setRefreshKey(key => key + 1);
    }
  }, [lastSignal]);

  const { value: notification, error } = useNotificationsApi(
    api => api.getNotification(id),
    [id, refreshKey],
  );

  const setRead = async (read: boolean) => {
    try {
      await notificationsApi.updateNotifications({ ids: [id], read });
      setRefreshKey(key => key + 1);
      onUpdate();
    } catch {
      toastApi.post({
        title: t('notificationsPage.highlighted.updateFailed'),
        status: 'danger',
      });
    }
  };

  const dismissButton = (
    <ButtonIcon
      aria-label={t('notificationsPage.highlighted.dismiss')}
      icon={<RiCloseLine size={16} />}
      variant="tertiary"
      size="small"
      onPress={onDismiss}
    />
  );

  if (error && !notification) {
    return (
      <Alert
        status="warning"
        title={t('notificationsPage.highlighted.notFound')}
        customActions={dismissButton}
      />
    );
  }

  if (!notification) {
    return <Progress />;
  }

  const { payload } = notification;

  return (
    <section
      className={styles.highlighted}
      aria-label={t('notificationsPage.highlighted.label')}
    >
      <Flex gap="4" align="start">
        <div className={styles.icon}>
          <NotificationIcon notification={notification} />
        </div>
        <Flex direction="column" gap="2" className={styles.content}>
          <Text variant="title-x-small" weight="bold">
            {payload.link ? (
              <Link
                to={payload.link}
                onClick={() => {
                  if (markAsReadOnLinkOpen && !notification.read) {
                    setRead(true);
                  }
                }}
              >
                {payload.title}
              </Link>
            ) : (
              payload.title
            )}
          </Text>
          {payload.description ? (
            <NotificationDescription description={payload.description} />
          ) : null}
          <Text variant="body-small" color="secondary">
            {notification.origin && (
              <Text
                as="span"
                variant="body-small"
                color="secondary"
                className={styles.meta}
              >
                {notification.origin}
              </Text>
            )}
            {payload.topic && (
              <Text
                as="span"
                variant="body-small"
                color="secondary"
                className={styles.meta}
              >
                {payload.topic}
              </Text>
            )}
            {notification.created && (
              <RelativeTime
                value={notification.created}
                className={styles.meta}
              />
            )}
          </Text>
          <Flex gap="2">
            <Button
              size="small"
              variant="secondary"
              onPress={() => setRead(!notification.read)}
            >
              {notification.read
                ? t('notificationsPage.highlighted.markAsUnread')
                : t('notificationsPage.highlighted.markAsRead')}
            </Button>
          </Flex>
        </Flex>
        {dismissButton}
      </Flex>
    </section>
  );
}
