# Stack profile — learned from repo scan

Built 2026-10-29 for run `20261029-bugfix-userouteref-startup` (Tier 2b; no shipped adapter matches). This is a targeted sample focused on routing and plugin wiring. It is not exhaustive across 233 packages: per AGENTS.md, each package's local style wins.

## Language & runtime

TypeScript ~5.7 on Node 22 or 24. Yarn 4.18 workspaces (`nodeLinker: node-modules`). Source is ESM-style `import`/`export` compiled by `@backstage/cli`. There are no default exports except plugin/feature entry objects (ADR003 says avoid default exports). Each package declares `backstage.role` in package.json (`web-library`, `frontend-plugin`, `backend-plugin`, `node-library`, ...). Package scripts delegate to `backstage-cli package {build,lint,test}`.

## Framework

Backstage, the in-house plugin framework, built on React 18 + react-router v6 for the frontend and Express + Knex for the backend. There are two frontend systems side by side:

- old: `@backstage/core-plugin-api`, `@backstage/core-app-api`, `packages/app-legacy`
- new: `@backstage/frontend-plugin-api`, `@backstage/frontend-app-api`, `packages/app`

The backend system lives in `@backstage/backend-plugin-api` and `backend-defaults`.

## Conventions detected

### File naming

- Hooks and functions use camelCase files: `useRouteRef.tsx`, `useRouteRefParams.ts`, `describeParentCallSite.ts`.
- Classes and types use PascalCase files: `RouteRef.ts`, `SubRouteRef.ts`, `RouteResolver.ts`, `CatalogBuilder.ts`.
- Tests sit next to their source as `<name>.test.ts(x)`.
- Folders have an `index.ts` barrel with named re-exports.

### Every source file header

```ts
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 */
```

New files use the current year. Never change the year on existing files.

### Hook / public API shape (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`)

```ts
/**
 * React hook for constructing URLs to routes.
 * ...
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
  const routeFunc = useMemo(
    () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
    [routeResolutionApi, routeRef, pathname],
  );
  return routeFunc;
}
```

Every exported symbol has TSDoc with a release tag (`@public`, `@alpha`, `@internal`). The tags drive API reports (`report*.api.md`).

### Barrel shape (`routing/index.ts`)

```ts
export type { AnyRouteRefParams } from './types';
export { createRouteRef, type RouteRef } from './RouteRef';
export { useRouteRef } from './useRouteRef';
```

### Frontend plugin wiring (`plugins/catalog/src/alpha/plugin.tsx`)

```tsx
export default createFrontendPlugin({
  pluginId: 'catalog',
  routes: { catalogIndex: rootRouteRef, catalogEntity: entityRouteRef },
  externalRoutes: { viewTechDoc: viewTechDocRouteRef, ... },
  extensions: [...apis, ...pages, ...filters, ...entityCards],
});
```

Routes register through the `routes`/`externalRoutes` maps on the plugin. The app resolves bindings in `packages/frontend-app-api/src/routing/` (`resolveRouteBindings.ts`, `extractRouteInfoFromAppNode.ts`, `RouteResolver.ts`).

### Backend plugin shape (`plugins/catalog-backend/src/service/CatalogPlugin.ts`, `packages/backend/src/index.ts`)

`createBackendPlugin({ pluginId, register(env) { env.registerExtensionPoint(...); env.registerInit({ deps: { ...coreServices }, init }) } })`. The backend composes features with `const backend = createBackend(); backend.add(import('@backstage/plugin-...'));`. Extension point implementations are small classes with `#private` fields.

### Test shape (`useRouteRef.test.tsx`)

```tsx
import { renderHook } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';

describe('v1 consumer', () => {
  it('should resolve routes', () => {
    const resolve = jest.fn(() => () => '/hello');
    const renderedHook = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, { resolve }]]}>
          <MemoryRouter initialEntries={['/my-page']} children={children} />
        </TestApiProvider>
      ),
    });
    ...
```

- Tests use Jest (`describe`/`it`, `jest.fn`) with RTL `renderHook`/`render`, and supply APIs through `TestApiProvider`.
- Type-level checks inside tests use `// @ts-expect-error`.
- The new frontend system uses `@backstage/frontend-test-utils`, and backend tests use `@backstage/backend-test-utils`.
- RTL style: `screen` + `findBy*`, with no test IDs.

### Config

App config lives in YAML (`app-config.yaml`). Each package declares its config schema in `config.d.ts` (e.g. `plugins/catalog-backend/config.d.ts`) and reads it through `coreServices.rootConfig` (`config.has(...)`, `config.getOptionalString(...)`). Zod is used for some option and schema validation.

### Data layer

Knex via `coreServices.database` (`packages/backend-defaults/src/entrypoints/database/DatabaseManager.ts`). Plugins keep their own `migrations/` folder. Postgres and SQLite (better-sqlite3) run in tests.

### Generated code

`**/src/schema/openapi/generated/**` comes from OpenAPI specs, and `report*.api.md` comes from `yarn build:api-reports`. Never hand-edit either.

## Sample files inspected

- packages/frontend-plugin-api/src/routing/useRouteRef.tsx (kind: hook / public API)
- packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx (kind: test)
- packages/frontend-plugin-api/src/routing/index.ts (kind: barrel)
- plugins/catalog/src/alpha/plugin.tsx (kind: frontend plugin wiring)
- plugins/catalog-backend/src/service/CatalogPlugin.ts (kind: backend plugin / service)
- packages/backend/src/index.ts (kind: backend entry point)
- packages/app/src/index.tsx (kind: frontend entry point)

## Notes for downstream codegen

- Keep fixes local to the package. Old-system (`core-*`) and new-system (`frontend-*`) routing are separate implementations, so check whether the bug exists in both.
- Exported API changes need TSDoc + release tag, regenerated API reports, and a changeset. Bump rules: patch for <1.0 fixes, minor for <1.0 breaking.
- Use named exports and type-only imports where possible (`import type`). Format with Prettier (`@backstage/cli/config/prettier`).
- Tests run with `CI=1 yarn test <path>` from the repo root.
