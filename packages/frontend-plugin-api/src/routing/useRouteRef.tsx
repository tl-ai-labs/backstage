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

import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnyRouteRefParams } from './types';
import { RouteRef } from './RouteRef';
import { SubRouteRef } from './SubRouteRef';
import { ExternalRouteRef } from './ExternalRouteRef';
import { RouteFunc, routeResolutionApiRef, useApi } from '../apis';

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
 *
 * Components that render before the app has finished loading, such as app
 * root elements, receive `undefined` for routes that are not known yet and
 * re-render with the resolved route once the app is ready.
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
  const [revision, setRevision] = useState(0);
  const isPending = routeResolutionApi.isPending?.();

  useEffect(() => {
    if (!routeResolutionApi.subscribe) {
      return undefined;
    }
    const unsubscribe = routeResolutionApi.subscribe(() =>
      setRevision(r => r + 1),
    );
    if (routeResolutionApi.isPending?.() !== isPending) {
      setRevision(r => r + 1);
    }
    return unsubscribe;
  }, [routeResolutionApi, isPending]);

  const routeFunc = useMemo(
    () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeResolutionApi, routeRef, pathname, revision],
  );

  return routeFunc;
}
