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

import type { RouteResolutionApi } from '@backstage/frontend-plugin-api';

/**
 * Symbol used by {@link RouteResolutionApi} implementations that support
 * subscribing to route resolution changes (such as bootstrap to finalization).
 *
 * @internal
 */
export const routeResolutionSubscriptionSymbol = Symbol.for(
  '@backstage/frontend-internal/route-resolution-subscription',
);

/**
 * Subscription interface for {@link RouteResolutionApi} implementations that
 * notify consumers when route resolution state changes.
 *
 * @internal
 */
export interface RouteResolutionSubscription {
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
}

/**
 * A {@link RouteResolutionApi} that optionally exposes a
 * {@link RouteResolutionSubscription}.
 *
 * @internal
 */
export type SubscribableRouteResolutionApi = RouteResolutionApi & {
  [routeResolutionSubscriptionSymbol]?: RouteResolutionSubscription;
};

/**
 * Returns the {@link RouteResolutionSubscription} for a
 * {@link RouteResolutionApi} instance if supported.
 *
 * @internal
 */
export function getRouteResolutionSubscription(
  api: RouteResolutionApi,
): RouteResolutionSubscription | undefined {
  return (api as SubscribableRouteResolutionApi)[
    routeResolutionSubscriptionSymbol
  ];
}
