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
import {
  appLifecycleApiRef,
  RouteFunc,
  routeResolutionApiRef,
  useApi,
  useApiHolder,
} from '../apis';

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
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
  const apiHolder = useApiHolder();
  const appLifecycleApi = apiHolder.get(appLifecycleApiRef);

  const [lifecyclePhase, setLifecyclePhase] = useState(() =>
    appLifecycleApi?.getPhase(),
  );

  useEffect(() => {
    if (!appLifecycleApi) {
      return undefined;
    }

    const currentPhase = appLifecycleApi.getPhase();
    if (currentPhase !== lifecyclePhase) {
      setLifecyclePhase(currentPhase);
    }

    if (currentPhase === 'finalized') {
      return undefined;
    }

    const subscription = appLifecycleApi.phase$().subscribe(phase => {
      setLifecyclePhase(phase);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [appLifecycleApi, lifecyclePhase]);

  const routeFunc = useMemo(
    () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
    // lifecyclePhase is included so route resolution re-runs once the app finalizes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeResolutionApi, routeRef, pathname, lifecyclePhase],
  );

  return routeFunc;
}
