/*
 * Copyright 2023 The Backstage Authors
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

import {
  AnyApiFactory,
  ApiHolder,
  AppLifecycleApi,
  appLifecycleApiRef,
  AppTree,
  AppTreeApi,
  appTreeApiRef,
  ConfigApi,
  configApiRef,
  coreExtensionData,
  createApiFactory,
  ExternalRouteRef,
  identityApiRef,
  RouteFunc,
  RouteRef,
  RouteResolutionApi,
  routeResolutionApiRef,
  SubRouteRef,
  type AnyRouteRefParams,
  type AppNode,
  type AppNodeInstance,
  type ExtensionFactoryMiddleware,
  type IdentityApi,
} from '@backstage/frontend-plugin-api';
import { matchRoutes } from 'react-router-dom';
// eslint-disable-next-line @backstage/no-relative-monorepo-imports
import { AppIdentityProxy } from '../../../core-app-api/src/apis/implementations/IdentityApi/AppIdentityProxy';
import { createRouteAliasResolver } from '../routing/RouteAliasResolver';
import { RouteResolver } from '../routing/RouteResolver';
import { collectRouteIds } from '../routing/collectRouteIds';
import {
  extractRouteInfoFromAppNode,
  type RouteInfo,
} from '../routing/extractRouteInfoFromAppNode';
import { type BackstageRouteObject } from '../routing/types';
import {
  instantiateAppNodeSubtree,
  instantiateAppNodeTree,
} from '../tree/instantiateAppNodeTree';
// eslint-disable-next-line @backstage/no-relative-monorepo-imports
import { toInternalExtension } from '../../../frontend-plugin-api/src/wiring/resolveExtensionDefinition';
import {
  FrontendApiRegistry,
  FrontendApiResolver,
} from './FrontendApiRegistry';
import { type ExtensionPredicateContext } from './predicates';
import {
  createErrorCollector,
  type ErrorCollector,
} from './createErrorCollector';

// Helps delay callers from reaching out to the API before the app tree has been materialized
export class AppTreeApiProxy implements AppTreeApi {
  #routeInfo?: RouteInfo;
  private readonly tree: AppTree;
  private readonly appBasePath: string;

  constructor(tree: AppTree, appBasePath: string) {
    this.tree = tree;
    this.appBasePath = appBasePath;
  }

  private checkIfInitialized() {
    if (!this.#routeInfo) {
      throw new Error(
        `You can't access the AppTreeApi during initialization of the app tree. Please move occurrences of this out of the initialization of the factory`,
      );
    }
  }

  getTree() {
    this.checkIfInitialized();

    return { tree: this.tree };
  }

  getNodesByRoutePath(routePath: string): { nodes: AppNode[] } {
    this.checkIfInitialized();
    const routeInfo = this.#routeInfo;
    if (!routeInfo) {
      throw new Error(
        `You can't access the AppTreeApi during initialization of the app tree. Please move occurrences of this out of the initialization of the factory`,
      );
    }

    let path = routePath;
    if (path.startsWith(this.appBasePath)) {
      path = path.slice(this.appBasePath.length);
    }

    const matchedRoutes = matchRoutes(routeInfo.routeObjects, path);

    const matchedAppNodes =
      matchedRoutes?.flatMap(routeObj => {
        const appNode = routeObj.route.appNode;
        return appNode ? [appNode] : [];
      }) || [];

    return { nodes: matchedAppNodes };
  }

  initialize(routeInfo: RouteInfo) {
    this.#routeInfo = routeInfo;
  }
}

// Helps delay callers from reaching out to the API before the app tree has been materialized
export class RouteResolutionApiProxy implements RouteResolutionApi {
  #delegate: RouteResolutionApi | undefined;
  #routeObjects: BackstageRouteObject[] | undefined;

  private readonly routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>;
  private readonly appBasePath: string;

  constructor(
    routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>,
    appBasePath: string,
  ) {
    this.routeBindings = routeBindings;
    this.appBasePath = appBasePath;
  }

  resolve<TParams extends AnyRouteRefParams>(
    anyRouteRef:
      | RouteRef<TParams>
      | SubRouteRef<TParams>
      | ExternalRouteRef<TParams>,
    options?: { sourcePath?: string },
  ): RouteFunc<TParams> | undefined {
    if (!this.#delegate) {
      throw new Error(
        `You can't access the RouteResolver during initialization of the app tree. Please move occurrences of this out of the initialization of the factory`,
      );
    }

    const delegate = this.#delegate;
    const resolved = delegate.resolve(anyRouteRef, options);
    if (!resolved) {
      return undefined;
    }

    // useRouteRef memoizes on this proxy, which keeps its identity across
    // finalization, so the returned function has to follow the new resolver.
    let cached: { delegate: RouteResolutionApi; func: RouteFunc<TParams> } = {
      delegate,
      func: resolved,
    };
    return ((...args: unknown[]) => {
      const current = this.#delegate;
      if (current && current !== cached.delegate) {
        cached = {
          delegate: current,
          // Intentionally keep the bootstrap function if the finalized
          // resolver can't resolve the ref, rather than throwing mid-render.
          func: current.resolve(anyRouteRef, options) ?? resolved,
        };
      }
      // RouteFunc's params are conditional on TParams, so tsc can't relate them
      // to a plain rest array; hence the casts on the call and the wrapper.
      return (cached.func as unknown as (...a: unknown[]) => string)(...args);
    }) as unknown as RouteFunc<TParams>;
  }

  initialize(
    routeInfo: RouteInfo,
    routeRefsById: Map<string, RouteRef | SubRouteRef>,
  ) {
    this.#delegate = new RouteResolver(
      routeInfo.routePaths,
      routeInfo.routeParents,
      routeInfo.routeObjects,
      this.routeBindings,
      this.appBasePath,
      routeInfo.routeAliasResolver,
      routeRefsById,
    );
    this.#routeObjects = routeInfo.routeObjects;

    return routeInfo;
  }

  getRouteObjects() {
    return this.#routeObjects;
  }
}

export class DefaultAppLifecycleApi implements AppLifecycleApi {
  #finalized = false;
  readonly #listeners = new Set<() => void>();

  isFinalized = () => this.#finalized;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  };

  markFinalized() {
    this.#finalized = true;

    for (const listener of this.#listeners) {
      listener();
    }
  }
}

export class PreparedAppIdentityProxy extends AppIdentityProxy {
  #onTargetSet?:
    | ((identityApi: Parameters<AppIdentityProxy['setTarget']>[0]) => void)
    | undefined;

  setTargetHandlers(options: {
    onTargetSet?(
      identityApi: Parameters<AppIdentityProxy['setTarget']>[0],
    ): void;
  }) {
    this.#onTargetSet = options.onTargetSet;
  }

  clearTargetHandlers() {
    this.#onTargetSet = undefined;
  }

  override setTarget(
    identityApi: Parameters<AppIdentityProxy['setTarget']>[0],
    targetOptions: Parameters<AppIdentityProxy['setTarget']>[1],
  ) {
    super.setTarget(identityApi, targetOptions);

    const onTargetSet = this.#onTargetSet;
    if (!onTargetSet) {
      return;
    }

    this.clearTargetHandlers();
    onTargetSet(identityApi);
  }
}

export function createPhaseApis(options: {
  tree: AppTree;
  config: ConfigApi;
  appApiRegistry: FrontendApiRegistry;
  fallbackApis?: ApiHolder;
  includeConfigApi: boolean;
  appBasePath: string;
  routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>;
  staticFactories: AnyApiFactory[];
}) {
  const appTreeApi = new AppTreeApiProxy(options.tree, options.appBasePath);
  const routeResolutionApi = new RouteResolutionApiProxy(
    options.routeBindings,
    options.appBasePath,
  );
  const identityProxy = new PreparedAppIdentityProxy();
  const appLifecycleApi = new DefaultAppLifecycleApi();
  const phaseApiRegistry = new FrontendApiRegistry();
  phaseApiRegistry.registerAll([
    createApiFactory(appTreeApiRef, appTreeApi),
    createApiFactory(appLifecycleApiRef, appLifecycleApi),
    ...(options.includeConfigApi
      ? [createApiFactory(configApiRef, options.config)]
      : []),
    createApiFactory(routeResolutionApiRef, routeResolutionApi),
    createApiFactory(identityApiRef, identityProxy),
    ...options.staticFactories,
  ]);

  const apis = new FrontendApiResolver({
    primaryRegistry: phaseApiRegistry,
    secondaryRegistry: options.appApiRegistry,
    fallbackApis: options.fallbackApis,
  });

  return {
    apis,
    routeResolutionApi,
    appTreeApi,
    appLifecycleApi,
    identityApiProxy: identityProxy,
  };
}

export function instantiateAndInitializePhaseTree(options: {
  tree: AppTree;
  apis: ApiHolder;
  collector: ErrorCollector;
  extensionFactoryMiddleware?: ExtensionFactoryMiddleware;
  routeResolutionApi: RouteResolutionApiProxy;
  appTreeApi: AppTreeApiProxy;
  routeRefsById: ReturnType<typeof collectRouteIds>;
  skipChild?(ctx: { node: AppNode; input: string; child: AppNode }): boolean;
  onMissingApi?(ctx: { node: AppNode; apiRefId: string }): void;
  predicateContext?: ExtensionPredicateContext;
  stopAtAttachment?(ctx: { node: AppNode; input: string }): boolean;
}) {
  instantiateAppNodeTree(
    options.tree.root,
    options.apis,
    options.collector,
    options.extensionFactoryMiddleware,
    {
      ...(options.stopAtAttachment
        ? { stopAtAttachment: options.stopAtAttachment }
        : {}),
      skipChild: options.skipChild,
      onMissingApi: options.onMissingApi,
      predicateContext: options.predicateContext,
    },
  );

  const routeInfo = extractRouteInfoFromAppNode(
    options.tree.root,
    createRouteAliasResolver(options.routeRefsById),
    options.stopAtAttachment
      ? collectDeferredRouteInstances({
          tree: options.tree,
          extensionFactoryMiddleware: options.extensionFactoryMiddleware,
          stopAtAttachment: options.stopAtAttachment,
        })
      : undefined,
  );

  options.routeResolutionApi.initialize(
    routeInfo,
    options.routeRefsById.routes,
  );
  options.appTreeApi.initialize(routeInfo);
}

const EMPTY_API_HOLDER: ApiHolder = {
  get() {
    return undefined;
  },
};

// Bootstrap stops at the session boundary, but app root elements still need
// the routes of pages mounted behind it, so those are instantiated detached.
function collectDeferredRouteInstances(options: {
  tree: AppTree;
  extensionFactoryMiddleware?: ExtensionFactoryMiddleware;
  stopAtAttachment(ctx: { node: AppNode; input: string }): boolean;
}): Map<AppNode, AppNodeInstance> {
  const instances = new Map<AppNode, AppNodeInstance>();
  const routeDataIds = new Set<string>([
    coreExtensionData.routePath.id,
    coreExtensionData.routeRef.id,
  ]);

  const declaresRouteOutput = (node: AppNode) => {
    const internal = toInternalExtension(node.spec.extension);
    const refs =
      internal.version === 'v1'
        ? Object.values(internal.output)
        : internal.output;
    return refs.some(ref => routeDataIds.has(ref.id));
  };

  const deferredVisited = new Set<AppNode>();
  const visitDeferred = (node: AppNode) => {
    if (deferredVisited.has(node)) {
      return;
    }
    deferredVisited.add(node);
    // Predicate-gated pages are only resolvable after finalization
    if (node.spec.disabled || node.spec.if !== undefined) {
      return;
    }

    if (!node.instance && declaresRouteOutput(node)) {
      // Instantiate only this node first so descendant factories don't run
      // here and again when they are visited; fall back to the full subtree
      // if that fails, e.g. when a required input is missing.
      const instantiate = (skipChildren: boolean) =>
        instantiateAppNodeSubtree({
          rootNode: node,
          apis: EMPTY_API_HOLDER,
          collector: createErrorCollector(),
          extensionFactoryMiddleware: options.extensionFactoryMiddleware,
          writeNodeInstances: false,
          reuseExistingInstances: false,
          ...(skipChildren ? { skipChild: () => true } : {}),
        });
      let detached = instantiate(true);
      if (!detached?.instance) {
        detached = instantiate(false);
      }
      if (detached?.instance) {
        instances.set(node, detached.instance);
      }
    }

    for (const children of node.edges.attachments.values()) {
      for (const child of children) {
        visitDeferred(child);
      }
    }
  };

  const visited = new Set<AppNode>();
  const walk = (node: AppNode) => {
    if (visited.has(node)) {
      return;
    }
    visited.add(node);
    for (const [input, children] of node.edges.attachments) {
      const deferred = options.stopAtAttachment({ node, input });
      for (const child of children) {
        if (deferred) {
          visitDeferred(child);
        } else {
          walk(child);
        }
      }
    }
  };
  walk(options.tree.root);

  return instances;
}

export function setIdentityApiTarget(options: {
  identityApiProxy: AppIdentityProxy;
  identityApi: IdentityApi;
  signOutTargetUrl: string;
}) {
  options.identityApiProxy.setTarget(options.identityApi, {
    signOutTargetUrl: options.signOutTargetUrl,
  });
}
