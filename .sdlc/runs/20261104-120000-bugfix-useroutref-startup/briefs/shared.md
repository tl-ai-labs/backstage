## Conventions

- Include the standard Backstage Apache-2.0 license header at the top of every TypeScript/TSX file.
- Use TypeScript strict typing matching existing @backstage/frontend-app-api and @backstage/frontend-plugin-api conventions.
- Format all files according to @backstage/cli/config/prettier (single quotes, trailing commas, 2-space indentation).
- Use const instead of let for any variable that is only assigned once (including variables captured by nested closures that are assigned once before the closure is invoked) to satisfy ESLint prefer-const.
- Do not run ESLint with --fix and do not hand-edit report*.api.md files; regenerate API reports via yarn build:api-reports.
- Use Jest and @testing-library/react for unit and integration tests.

## Decisions

- Unregistered ancestor route ref handling in RouteResolver: Return undefined from resolveBasePath and RouteResolver.resolve when any ancestor RouteRef in refDiffList has no entry in routePaths (not Throw Error('No path for ...') when an ancestor RouteRef is missing from routePaths; not Skip missing ancestor segments and resolve a partial path) — During bootstrap only a partial tree is instantiated so ancestor route paths may not be registered yet, and useRouteRef is documented to return undefined when a route cannot be resolved.
- RouteResolutionApi change notification contract: Add optional subscribe?(listener: () => void): () => void method to RouteResolutionApi and implement it on RouteResolutionApiProxy to notify listeners whenever initialize() updates the delegate RouteResolver (not Make subscribe required on RouteResolutionApi; not Replace RouteResolutionApiProxy instance identity in ApiHolder after finalization) — An optional subscribe method preserves backward compatibility for custom implementations and test mocks while allowing in-place re-initialization of RouteResolutionApiProxy to notify mounted hooks.
- useRouteRef re-resolution on RouteResolutionApi updates: Subscribe to routeResolutionApi.subscribe?.() in useEffect to increment a local state counter included in useMemo dependencies, and immediately re-check routeResolutionApi.resolve inside useEffect when the preceding render resolved to undefined so finalization occurring between initial render and effect subscription is also caught (not Only wait for future subscribe listener notifications without checking in useEffect whether finalization already happened between initial render and subscription; not Use useSyncExternalStore directly with routeResolutionApi.resolve as getSnapshot; not Call routeResolutionApi.resolve on every render without memoization) — Re-checking in useEffect right after subscribing closes the window where initialize() runs between the first render and effect commit, while avoiding infinite render loops from new closure instances returned by RouteResolver.resolve.

## Files of this change

- `packages/frontend-app-api/src/routing/RouteResolver.test.ts` (U01, edit)
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` (U02, edit)
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (U03, edit)
- `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts` (U04, edit) — import: `import { RouteResolutionApi, routeResolutionApiRef } from '@backstage/frontend-plugin-api';`
  - `interface RouteResolutionApi(): RouteResolutionApi`
- `packages/frontend-app-api/src/routing/RouteResolver.ts` (U05, edit) — import: `import { RouteResolver } from '../routing/RouteResolver';`
  - `class RouteResolver(routePaths: Map<RouteRef, string>, routeParents: Map<RouteRef, RouteRef | undefined>, routeObjects: BackstageRouteObject[], routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>, appBasePath: string, routeAliasResolver: RouteAliasResolver, routeRefsById: Map<string, RouteRef | SubRouteRef>): RouteResolver`
- `packages/frontend-app-api/src/wiring/phaseApis.tsx` (U06, edit) — import: `import { RouteResolutionApiProxy } from './phaseApis';`
  - `class RouteResolutionApiProxy(routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>, appBasePath: string): RouteResolutionApiProxy`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (U07, edit) — import: `import { useRouteRef } from '@backstage/frontend-plugin-api';`
  - `function useRouteRef(routeRef: RouteRef<TParams> | SubRouteRef<TParams> | ExternalRouteRef<TParams>): RouteFunc<TParams> | undefined`
- `docs/frontend-system/architecture/36-routes.md` (U08, edit)
- `docs/frontend-system/building-apps/03-built-in-extensions.md` (U09, edit)
- `.changeset/frontend-app-api-bootstrap-route-ref.md` (U10, edit)
- `.changeset/frontend-plugin-api-route-ref-finalize.md` (U11, edit)
