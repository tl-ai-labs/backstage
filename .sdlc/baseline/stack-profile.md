# Stack profile — learned from repo scan

Built 2026-11-04 for run 20261104-120000-bugfix-useroutref-startup. Trigger: no matching pre-authored adapter (TS/React/Express Backstage monorepo; shipped adapters are generic, nest, python).

## Language & runtime
TypeScript ~5.7 on Node 22 or 24, with Yarn 4.18 workspaces (`packages/*`, `plugins/*`). Source is written as ESM-style `import` and `export`, and the backstage-cli toolchain handles compilation. Knex migrations are an exception: they are CommonJS `.js` files that use `// @ts-check` and JSDoc types. There is one root `tsconfig.json`. Type checking only runs from the root with `yarn tsc`. Jest 30 runs through `backstage-cli repo test`.

## Framework
Backstage is its own plugin framework. It has three API families:
- the **new frontend system**: `@backstage/frontend-plugin-api` (`createFrontendPlugin`, `PageBlueprint`, extensions)
- the **old frontend system**: `@backstage/core-plugin-api`. It is version 1.x and also bridges to the new system's APIs.
- the **backend system**: `@backstage/backend-plugin-api` (`createBackendPlugin`, `coreServices`), with Express routers.

The UI uses React 18 with react-router-dom. Some packages use Material UI v4 and others use MUI v5 or BUI.

## Conventions detected

### File naming
- Hooks and components use camelCase or PascalCase file names that match the export, with a colocated test next to each. Examples: `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` with `useRouteRef.test.tsx`, and `RouteRef.ts` with `RouteRef.test.ts`.
- The extension follows the content: `.tsx` for files with JSX, `.ts` for everything else.
- Each folder has an `index.ts` barrel. Plugins expose `src/index.ts` and `src/plugin.ts(x)`, plus `src/alpha.tsx` for new-system exports.
- Backend plugins put their routers in `src/service/router.ts`, with the test in `router.test.ts`.

### File header (mandatory)
Every source file begins with the Apache 2.0 block below. New files get the current year. Existing files keep their original year.
```ts
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 * limitations under the License.
 */
```

### Handler / hook shape (frontend, new system)
From `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`:
```ts
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
The old-system version is `packages/core-plugin-api/src/routing/useRouteRef.tsx`. It has overloads that depend on whether the ref is `optional`. It first tries the new `routeResolutionApiRef`, using `try { useApi(...) } catch { return undefined }`. If that fails, it falls back to `useVersionedContext('routing-context')`. When nothing resolves, it throws `No path for ${routeRef}`, `Routing context is not available` or `RoutingContext v1 not available`. Public functions carry TSDoc with `@remarks`, `@param`, `@returns` and a `@public` or `@internal` release tag, because API reports check these tags.

### Frontend plugin shape (new system)
From `plugins/auth/src/plugin.tsx`:
```tsx
export const AuthPage = PageBlueprint.make({
  params: {
    path: '/oauth2',
    routeRef: rootRouteRef,
    loader: () => import('./components/Router').then(m => <m.Router />),
  },
});

export default createFrontendPlugin({
  pluginId: 'auth',
  extensions: [AuthPage],
  routes: { root: rootRouteRef },
});
```

### Service shape (backend)
From `plugins/example-todo-list-backend/src/plugin.ts`:
```ts
export const exampleTodoListPlugin = createBackendPlugin({
  pluginId: 'todolist',
  register(env) {
    env.registerInit({
      deps: {
        httpAuth: coreServices.httpAuth,
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
      },
      async init({ httpAuth, logger, httpRouter }) {
        httpRouter.use(await createRouter({ httpAuth, logger }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });
      },
    });
  },
});
```
Routers use `express-promise-router` and raise errors from `@backstage/errors` (`InputError`, and similar). Dependencies are passed in as a typed `RouterOptions` interface.

### Test shape
- Jest uses `describe` and `it` blocks. The code under test is imported from its relative path.
- Frontend hooks are tested with `renderHook` from `@testing-library/react`. Wrappers come from `TestApiProvider` (in `@backstage/test-utils`, or `frontend-test-utils` for the new system) and `MemoryRouter`. Mocks use `jest.fn`.
- Type-level checks use `// @ts-expect-error` inside the tests.

From `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`:
```tsx
const renderedHook = renderHook(() => useRouteRef(routeRef), {
  wrapper: ({ children }: PropsWithChildren<{}>) => (
    <TestApiProvider apis={[[routeResolutionApiRef, { resolve }]]}>
      <MemoryRouter initialEntries={['/my-page']} children={children} />
    </TestApiProvider>
  ),
});
```
- Backend routers are tested with `supertest` against `express().use(router)`, with dependencies from `mockServices.*.mock()` in `@backstage/backend-test-utils`.
- Project rule: prefer fewer, thorough tests with several assertions each. With RTL, use `screen` and `findBy*` rather than `waitFor`, and do not add test IDs.

### Config
Configuration is read at runtime through `@backstage/config` from `app-config*.yaml`. Each package declares its schema in a `config.d.ts` file that exports `interface Config` with TSDoc on every key; see `plugins/catalog-backend/config.d.ts` as an example. Env vars are only used for tooling and infrastructure toggles.

### Data layer
Data access uses Knex, with migrations in `plugins/<x>/migrations/*.js` named `YYYYMMDDHHMMSS_desc.js`. Each migration is CommonJS with `// @ts-check`, a JSDoc `@param {import('knex').Knex} knex` annotation, and `exports.up` / `exports.down`. Dialect checks look like `knex.client.config.client.includes('pg')`. Catalog-backend query changes have to run the perf battery described in `plugins/catalog-backend/CLAUDE.md`.

### Framework-owned wiring
- New frontend system: plugins export `createFrontendPlugin({ pluginId, extensions, routes, externalRoutes })`. Pages come from `PageBlueprint.make`. Route refs come from `createRouteRef`, `createSubRouteRef` and `createExternalRouteRef`. The app resolves them through `routeResolutionApiRef`.
- Old system: `createPlugin` together with `RoutingContext`, which is exposed through `@backstage/version-bridge` under the key `'routing-context'`, version 1.
- Backend: `createBackendPlugin`, with `registerInit` and `coreServices` dependencies. The plugin's router mounts under `/api/<pluginId>`.

## Sample files inspected
- packages/frontend-plugin-api/src/routing/useRouteRef.tsx (kind: hook)
- packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx (kind: test)
- packages/core-plugin-api/src/routing/useRouteRef.tsx (kind: hook, legacy bridge)
- plugins/auth/src/plugin.tsx (kind: frontend plugin / wiring)
- plugins/example-todo-list-backend/src/plugin.ts (kind: backend plugin / wiring)
- plugins/example-todo-list-backend/src/service/router.ts (kind: controller)
- plugins/example-todo-list-backend/src/service/router.test.ts (kind: test)
- plugins/catalog-backend/config.d.ts (kind: config)
- plugins/catalog-backend/migrations/20260912000000_refresh_state_maintenance.js (kind: migration)

## Notes for downstream codegen
- Match the style of the package being edited. The two `useRouteRef` versions differ on purpose: core is 1.x and its overloads throw, while frontend-plugin-api is 0.x and returns `undefined`.
- Any change to a public export in a published package must keep the API report valid (run `yarn build:api-reports`) and needs a changeset in `.changeset/`.
  - Breaking changes: minor for packages below 1.0 (frontend-plugin-api), major for packages at 1.0 or above (core-plugin-api).
  - Fixes and other non-breaking changes: patch.
- Keep the TSDoc release tags (`@public`, `@internal`, `@alpha`) on exports.
- Do not use default exports in library code (ADR003). The exception is the plugin's `default export` in new-system `plugin.tsx` and `alpha.tsx` files.
- Avoid `React.FC` (ADR006). Mock HTTP with msw (ADR007).
- Use single quotes, trailing commas and a 2-space indent (prettier from `@backstage/cli/config/prettier`). Run prettier only on the files you changed.
