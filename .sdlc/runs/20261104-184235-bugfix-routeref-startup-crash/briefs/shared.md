## Conventions

- All TypeScript and TSX files use Prettier formatting with 2-space indentation, single quotes, and trailing commas.
- New files must start with the standard Backstage Apache 2.0 license header (Copyright 2026 The Backstage Authors).
- Avoid adding required members to public interfaces implemented outside scope (such as RouteResolutionApi implemented by CompatRouteResolutionApi in @backstage/core-compat-api).
- React hooks in @backstage/frontend-plugin-api must support React 17 and React 18 using standard React hooks (useState, useEffect, useMemo).
- Tests use @testing-library/react with Jest and must avoid triggering un-acted state updates or infinite render loops.

## Decisions

- Notifying useRouteRef when route resolution is re-initialized at app finalization: Add a subscribe(listener: () => void): () => void method on RouteResolutionApiProxy in @backstage/frontend-app-api that notifies registered listeners whenever initialize() replaces the underlying RouteResolver delegate, and have useRouteRef in @backstage/frontend-plugin-api subscribe to routeResolutionApi.subscribe?.(...) via useEffect to increment a local state counter included in its useMemo dependency array. (not Adding a required subscribe method to the public RouteResolutionApi interface; not Creating a separate public lifecycle APIRef in @backstage/frontend-plugin-api; not Clearing and remounting app/root.elements instances during clearFinalizationBoundaryInstances) — Adding a required member to RouteResolutionApi breaks CompatRouteResolutionApi in @backstage/core-compat-api (outside scope); clearing app/root.elements would unmount persistent root elements across sign-in; an optional/duck-typed subscribe method on RouteResolutionApiProxy keeps public API reports unchanged and directly invalidates useRouteRef memoization and triggers re-render on finalization.

## Files of this change

- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (U01, edit)
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` (U02, edit)
- `packages/frontend-app-api/src/wiring/phaseApis.tsx` (U03, edit) — import: `import { RouteResolutionApiProxy } from './phaseApis';`
  - `class RouteResolutionApiProxy(routeBindings: Map<ExternalRouteRef, RouteRef | SubRouteRef>, appBasePath: string): RouteResolutionApiProxy`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (U04, edit) — import: `import { useRouteRef } from './useRouteRef';`
  - `function useRouteRef(routeRef: RouteRef<TParams> | SubRouteRef<TParams> | ExternalRouteRef<TParams>): RouteFunc<TParams> | undefined`
- `docs/frontend-system/architecture/10-app.md` (U05, edit)
- `.changeset/fix-root-element-route-ref.md` (U06, create)
