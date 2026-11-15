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
import type { CardLayout, CardSettings } from '@backstage/plugin-home-react';

// Shared configuration for the unread notifications home page card, used by
// both the legacy card extension and the new frontend system widget.

export const unreadNotificationsCardName = 'UnreadNotificationsCard';

export const unreadNotificationsCardTitle = 'Unread notifications';

export const unreadNotificationsCardDescription =
  'Lists your latest unread notifications, updating live as they arrive';

export const unreadNotificationsCardLayout: CardLayout = {
  width: { minColumns: 3, defaultColumns: 4 },
  height: { minRows: 3, defaultRows: 4 },
};

export const unreadNotificationsCardSettings: CardSettings = {
  schema: {
    title: 'Unread notifications',
    type: 'object',
    properties: {
      limit: {
        title: 'Number of notifications to show',
        type: 'integer',
        default: 5,
        minimum: 1,
        maximum: 20,
      },
    },
  },
};
