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

import { createRouteRef } from '@backstage/frontend-plugin-api';
import { getRouteResolutionSubscription } from '@internal/frontend';
import { createExactRouteAliasResolver } from '../routing/RouteAliasResolver';
import { RouteResolutionApiProxy } from './phaseApis';

describe('RouteResolutionApiProxy', () => {
  const emptyAliasResolver = createExactRouteAliasResolver(new Map());

  it('throws before initialization', () => {
    const proxy = new RouteResolutionApiProxy(new Map(), '');
    const routeRef = createRouteRef();

    expect(() => proxy.resolve(routeRef)).toThrow(
      `You can't access the RouteResolver during initialization of the app tree. Please move occurrences of this out of the initialization of the factory`,
    );
  });

  it('returns undefined instead of throwing during bootstrap, and throws after finalization', () => {
    const proxy = new RouteResolutionApiProxy(new Map(), '');
    const parentRef = createRouteRef();
    const childRef = createRouteRef();

    // Child ref is known with a parent ref whose path is not yet resolved
    proxy.initialize(
      {
        routePaths: new Map([[childRef, 'child']]),
        routeParents: new Map([[childRef, parentRef]]),
        routeObjects: [],
        routeAliasResolver: emptyAliasResolver,
      },
      new Map(),
      { isBootstrap: true },
    );

    expect(proxy.resolve(childRef)).toBeUndefined();

    // After finalization, the same broken parent mapping throws as expected
    proxy.initialize(
      {
        routePaths: new Map([[childRef, 'child']]),
        routeParents: new Map([[childRef, parentRef]]),
        routeObjects: [],
        routeAliasResolver: emptyAliasResolver,
      },
      new Map(),
    );

    expect(() => proxy.resolve(childRef)).toThrow(`No path for ${parentRef}`);
  });

  it('notifies subscribers and updates snapshot on initialize', () => {
    const proxy = new RouteResolutionApiProxy(new Map(), '');
    const subscription = getRouteResolutionSubscription(proxy);
    expect(subscription).toBeDefined();

    const initialSnapshot = subscription!.getSnapshot();
    const listener = jest.fn();
    const unsubscribe = subscription!.subscribe(listener);

    proxy.initialize(
      {
        routePaths: new Map(),
        routeParents: new Map(),
        routeObjects: [],
        routeAliasResolver: emptyAliasResolver,
      },
      new Map(),
      { isBootstrap: true },
    );

    expect(listener).toHaveBeenCalledTimes(1);
    const bootstrapSnapshot = subscription!.getSnapshot();
    expect(bootstrapSnapshot).not.toBe(initialSnapshot);
    expect(subscription!.getSnapshot()).toBe(bootstrapSnapshot);

    proxy.initialize(
      {
        routePaths: new Map(),
        routeParents: new Map(),
        routeObjects: [],
        routeAliasResolver: emptyAliasResolver,
      },
      new Map(),
    );

    expect(listener).toHaveBeenCalledTimes(2);
    expect(subscription!.getSnapshot()).not.toBe(bootstrapSnapshot);

    unsubscribe();
    proxy.initialize(
      {
        routePaths: new Map(),
        routeParents: new Map(),
        routeObjects: [],
        routeAliasResolver: emptyAliasResolver,
      },
      new Map(),
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
