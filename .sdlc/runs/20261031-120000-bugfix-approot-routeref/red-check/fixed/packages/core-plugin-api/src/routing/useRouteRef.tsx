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
import { matchRoutes, useLocation } from 'react-router-dom';
import { useVersionedContext } from '@backstage/version-bridge';
import {
  RouteResolutionApi,
  routeResolutionApiRef,
  useApi,
} from '@backstage/frontend-plugin-api';
import {
  AnyParams,
  ExternalRouteRef,
  RouteFunc,
  RouteRef,
  SubRouteRef,
} from './types';

/**
 * @internal
 */
export interface RouteResolver {
  resolve<Params extends AnyParams>(
    anyRouteRef:
      | RouteRef<Params>
      | SubRouteRef<Params>
      | ExternalRouteRef<Params, any>,
    sourceLocation: Parameters<typeof matchRoutes>[1],
  ): RouteFunc<Params> | undefined;
}

function useRouteResolutionApi(): RouteResolutionApi | undefined {
  try {
    return useApi(routeResolutionApiRef);
  } catch {
    return undefined;
  }
}

function isRouteResolutionFinalized(
  api: RouteResolutionApi | undefined,
): boolean {
  if (!api) {
    return true;
  }
  if (
    typeof api.isFinalized === 'function' &&
    typeof api.onFinalized === 'function'
  ) {
    return api.isFinalized();
  }
  return true;
}

function useRouteResolutionFinalized(
  api: RouteResolutionApi | undefined,
): boolean {
  const [signalled, setSignalled] = useState(false);
  const finalized = signalled || isRouteResolutionFinalized(api);

  useEffect(() => {
    if (
      finalized ||
      !api ||
      typeof api.isFinalized !== 'function' ||
      typeof api.onFinalized !== 'function'
    ) {
      return undefined;
    }

    const unsubscribe = api.onFinalized(() => {
      setSignalled(true);
    });

    if (api.isFinalized()) {
      setSignalled(true);
    }

    return unsubscribe;
  }, [api, finalized]);

  return finalized;
}

// Used while the app is still being bootstrapped and page routes are not known yet.
const bootstrapRouteFunc = () => '';

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
 *
 * @param routeRef - The ref to route that should be converted to URL.
 * @returns A function that will in turn return the concrete URL of the `routeRef`.
 * During bootstrap, a non-optional ref that cannot be resolved yet gives a function
 * that returns an empty string, and it updates to the real link once the app is finalized.
 * @public
 */
export function useRouteRef<Optional extends boolean, Params extends AnyParams>(
  routeRef: ExternalRouteRef<Params, Optional>,
): Optional extends true ? RouteFunc<Params> | undefined : RouteFunc<Params>;

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
 *
 * @param routeRef - The ref to route that should be converted to URL.
 * @returns A function that will in turn return the concrete URL of the `routeRef`.
 * During bootstrap, a non-optional ref that cannot be resolved yet gives a function
 * that returns an empty string, and it updates to the real link once the app is finalized.
 * @public
 */
export function useRouteRef<Params extends AnyParams>(
  routeRef: RouteRef<Params> | SubRouteRef<Params>,
): RouteFunc<Params>;

/**
 * React hook for constructing URLs to routes.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/plugins/composability#routing-system}
 *
 * @param routeRef - The ref to route that should be converted to URL.
 * @returns A function that will in turn return the concrete URL of the `routeRef`.
 * During bootstrap, a non-optional ref that cannot be resolved yet gives a function
 * that returns an empty string, and it updates to the real link once the app is finalized.
 * @public
 */
export function useRouteRef<Params extends AnyParams>(
  routeRef:
    | RouteRef<Params>
    | SubRouteRef<Params>
    | ExternalRouteRef<Params, any>,
): RouteFunc<Params> | undefined {
  const { pathname } = useLocation();
  const routeResolutionApi = useRouteResolutionApi();
  const finalized = useRouteResolutionFinalized(routeResolutionApi);
  const versionedContext = useVersionedContext<{ 1: RouteResolver }>(
    'routing-context',
  );

  const resolver = versionedContext?.atVersion(1);

  const newRouteFunc = useMemo(() => {
    if (!routeResolutionApi) {
      return null;
    }

    try {
      return routeResolutionApi?.resolve(routeRef, {
        sourcePath: pathname,
      });
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeResolutionApi, routeRef, pathname, finalized]);

  const legacyRouteFunc = useMemo(
    () => resolver && resolver.resolve(routeRef, { pathname }),
    [resolver, routeRef, pathname],
  );

  if (newRouteFunc !== null) {
    const isOptional = 'optional' in routeRef && routeRef.optional;
    if (!newRouteFunc && !isOptional) {
      if (!finalized) {
        return bootstrapRouteFunc as RouteFunc<Params>;
      }
      throw new Error(`No path for ${routeRef}`);
    }
    return newRouteFunc;
  }

  if (!versionedContext) {
    throw new Error('Routing context is not available');
  }

  if (!resolver) {
    throw new Error('RoutingContext v1 not available');
  }

  const isOptional = 'optional' in routeRef && routeRef.optional;
  if (!legacyRouteFunc && !isOptional) {
    throw new Error(`No path for ${routeRef}`);
  }

  return legacyRouteFunc;
}
