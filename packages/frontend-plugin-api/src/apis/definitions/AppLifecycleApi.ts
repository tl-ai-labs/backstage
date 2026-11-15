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

import { Observable } from '@backstage/types';
import { createApiRef } from '../system';

/**
 * The current lifecycle phase of the app.
 *
 * @public
 */
export type AppLifecyclePhase = 'bootstrap' | 'finalized';

/**
 * Provides visibility into the lifecycle phase of the app, such as whether
 * the app is still bootstrapping or has been finalized.
 *
 * @public
 */
export interface AppLifecycleApi {
  /**
   * Returns the current lifecycle phase of the app.
   */
  getPhase(): AppLifecyclePhase;

  /**
   * Observes transitions in the app lifecycle phase.
   */
  phase$(): Observable<AppLifecyclePhase>;
}

/**
 * The `ApiRef` of {@link AppLifecycleApi}.
 *
 * @public
 */
export const appLifecycleApiRef = createApiRef<AppLifecycleApi>().with({
  id: 'core.app-lifecycle',
  pluginId: 'app',
});
