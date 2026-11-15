/*
 * Copyright 2020 The Backstage Authors
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

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AnyRouteRefParams } from './types';
import { RouteRef } from './RouteRef';
import { SubRouteRef } from './SubRouteRef';
import { ExternalRouteRef } from './ExternalRouteRef';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import {
  AppLifecycleApi,
  appLifecycleApiRef,
  RouteFunc,
  routeResolutionApiRef,
  useApi,
  useApiHolder,
} from '../apis';

// Used when the app does not provide a lifecycle API, in which case we assume
// that the app is already finalized and routes never change.
const appLifecycleApiFallback: AppLifecycleApi = {
  isFinalized: () => true,
  subscribe: () => () => {},
};

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
 *
 * Elements that render before the app has been finalized, such as
 * `app/root.elements` extensions, will receive `undefined` for routes that
 * are not yet known. The route is resolved again once the app is finalized.
 *
 * @param routeRef - The ref to route that should be converted to URL.
 * @returns A function that will in turn return the concrete URL of the `routeRef`, or `undefined` if the route is not available.
 * @public
 */
export function useRouteRef<TParams extends AnyRouteRefParams>(
  routeRef:
    | RouteRef<TParams>
    | SubRouteRef<TParams>
    | ExternalRouteRef<TParams>,
): RouteFunc<TParams> | undefined {
  const { pathname } = useLocation();
  const routeResolutionApi = useApi(routeResolutionApiRef);
  const appLifecycleApi =
    useApiHolder().get(appLifecycleApiRef) ?? appLifecycleApiFallback;
  const isFinalized = useSyncExternalStore(
    appLifecycleApi.subscribe,
    appLifecycleApi.isFinalized,
  );

  const routeFunc = useMemo(
    () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
    // The route is resolved again once the app is finalized, since the
    // available routes are not known before that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeResolutionApi, routeRef, pathname, isFinalized],
  );

  return routeFunc;
}
