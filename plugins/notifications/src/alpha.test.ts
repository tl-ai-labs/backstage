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

import notificationsPlugin from './alpha';

describe('notifications alpha plugin', () => {
  it('provides the notifications page, API and unread notifications home widget', () => {
    expect(
      notificationsPlugin.getExtension('page:notifications'),
    ).toBeDefined();
    expect(notificationsPlugin.getExtension('api:notifications')).toBeDefined();
    expect(
      notificationsPlugin.getExtension(
        'home-page-widget:notifications/unread-notifications',
      ),
    ).toBeDefined();
  });
});
