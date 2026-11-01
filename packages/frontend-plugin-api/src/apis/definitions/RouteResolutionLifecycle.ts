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
import type { RouteResolutionApi } from './RouteResolutionApi';

// This file is internal and must not be exported from definitions/index.ts or
// any other index. Each package bundles its own copy of it through a relative
// import, which is why the key is global.

/**
 * The key that a route resolution API carries its lifecycle under.
 *
 * @internal
 */
export const routeResolutionLifecycleKey = Symbol.for(
  '@backstage/frontend-plugin-api:route-resolution-lifecycle',
);

/**
 * Signals when route resolution has been finalized for an app instance.
 *
 * @internal
 */
export interface RouteResolutionLifecycle {
  /**
   * Whether the app is finalized. Moves from false to true at most once.
   */
  isFinalized(): boolean;

  /**
   * Subscribes to finalization and returns the unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Tracks whether route resolution is finalized for the provided API. An API
 * without the lifecycle signal always counts as finalized.
 *
 * @internal
 */
export function useRouteResolutionFinalized(
  routeResolutionApi: RouteResolutionApi | undefined,
): boolean {
  const lifecycle = (
    routeResolutionApi as
      | { [routeResolutionLifecycleKey]?: RouteResolutionLifecycle }
      | undefined
  )?.[routeResolutionLifecycleKey];

  const [finalized, setFinalized] = useState(
    () => lifecycle?.isFinalized() ?? true,
  );

  useEffect(() => {
    if (!lifecycle) {
      return undefined;
    }

    const update = () => setFinalized(lifecycle.isFinalized());

    // Catches a finalization between render and subscribe
    update();

    return lifecycle.subscribe(update);
  }, [lifecycle]);

  return lifecycle ? finalized : true;
}
