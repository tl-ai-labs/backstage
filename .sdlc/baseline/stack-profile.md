# Stack profile — learned from repo scan

Built 2026-11-04 for run 20261104-170616-bugfix-routeref-startup (Tier 2b trigger: React/TypeScript stack, no shipped adapter matches; only generic/nest/python exist). Sampling was narrow and aimed at the new frontend system (`packages/frontend-*`, `plugins/app`), plus one backend plugin for contrast.

## Language & runtime
TypeScript, strict mode (`@backstage/cli/config/tsconfig.json`: `strict: true`, `target: ES2022`, `module: ES2020`; root `tsconfig.json` overrides `jsx: react-jsx`). Node 22 or 24, Yarn 4.18 (node-modules linker). ESM-style `import` syntax everywhere in source, with relative imports inside a package and `@backstage/*` package imports across packages (no path aliases). React 18 (peer `^17 || ^18`), react-router-dom 6.30. Tests run on Jest via `backstage-cli package test`; from the repo root, use `CI=1 yarn test <path>`.

## Framework
Backstage's own framework, which comes in two systems:
- **New frontend system** (`@backstage/frontend-plugin-api`, `@backstage/frontend-app-api`, `@backstage/frontend-defaults`, `@backstage/plugin-app`). It is built from extensions, blueprints and utility APIs, and the app tree is assembled from them.
- **Legacy frontend system** (`core-*` packages) and the **backend system** (`backend-*` packages, `createBackendPlugin`, Express routers).

## Conventions detected

### File naming
- Components, classes and blueprints are PascalCase, e.g. `RouteResolver.ts`, `AppRootElementBlueprint.tsx` and `RouteAliasResolver.ts`.
- Hooks and functions are camelCase, e.g. `useRouteRef.tsx`, `extractRouteInfoFromAppNode.ts`, `createSpecializedApp.tsx` and `phaseApis.tsx`.
- Tests sit next to the file they test with a `.test.ts(x)` suffix, e.g. `useRouteRef.test.tsx`.
- Use `.tsx` only when the file contains JSX.
- Every folder has an `index.ts` barrel, and `src/index.ts` (plus `alpha.ts` where present) defines the public API.

### Every source file starts with the Apache header
```ts
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 */
```
New files use the current year (2026). Never change the year on existing files.

### Hook shape (packages/frontend-plugin-api/src/routing/useRouteRef.tsx)
```tsx
export function useRouteRef<TParams extends AnyRouteRefParams>(
  routeRef: RouteRef<TParams> | SubRouteRef<TParams> | ExternalRouteRef<TParams>,
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
Public exports carry TSDoc with release tags (`@public`, `@alpha`, `@internal`). API reports (`report.api.md`) are checked against these tags.

### Extension / blueprint shape (packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx)
```tsx
export const AppRootElementBlueprint = createExtensionBlueprint({
  kind: 'app-root-element',
  attachTo: { id: 'app/root', input: 'elements' },
  output: [coreExtensionData.reactElement],
  *factory(params: { element: JSX.Element }, { node }) {
    yield coreExtensionData.reactElement(
      <ExtensionBoundary node={node} errorPresentation="error-api">
        {params.element}
      </ExtensionBoundary>,
    );
  },
});
```
Blueprints are used like this (plugins/app/src/extensions/elements.tsx):
```tsx
export const oauthRequestDialogAppRootElement = AppRootElementBlueprint.make({
  name: 'oauth-request-dialog',
  params: { element: <OAuthRequestDialog /> },
});
```
Config schemas use `zod/v4` (`configSchema: { x: z.number().default(5000) }`) together with `makeWithOverrides`.

### Service / internal-class shape (packages/frontend-app-api/src/wiring/phaseApis.tsx)
Classes use `#private` fields, are constructed with plain option objects, and use proxies that fill in their target later (`RouteResolutionApiProxy.initialize(routeInfo, routeRefsById)` sets `#delegate`). Before that, `resolve()` throws `"You can't access the RouteResolver during initialization of the app tree..."`. Route info comes from `extractRouteInfoFromAppNode(tree.root, createRouteAliasResolver(...))`, which runs after tree instantiation in `phaseApis.tsx`. The bootstrap/finalize split lives in `prepareSpecializedApp.tsx` (929 lines; that is past the 500-line sampling bound, so I only grepped it and did not read it fully).

### Test shape (packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx)
```tsx
it('should resolve routes', () => {
  const resolve = jest.fn(() => () => '/hello');
  const routeRef = createRouteRef();
  const renderedHook = renderHook(() => useRouteRef(routeRef), {
    wrapper: ({ children }: PropsWithChildren<{}>) => (
      <TestApiProvider apis={[[routeResolutionApiRef, { resolve }]]}>
        <MemoryRouter initialEntries={['/my-page']} children={children} />
      </TestApiProvider>
    ),
  });
  expect(renderedHook.result.current?.()).toBe('/hello');
});
```
Tests use Jest `describe`/`it` with `@testing-library/react`. Following project rules, write fewer, more thorough tests with several assertions each, prefer `screen` + `findBy*` over `waitFor`, and add no test IDs. App-level wiring tests live in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (1915 lines). They build apps with `createSpecializedApp` / `prepareSpecializedApp` and test features, and they are the natural home for a regression test for app-root-element startup behavior.

### Config
On the frontend, extension `configSchema` uses zod v4 and app config is read via `configApiRef`. On the backend, `@backstage/config` with `app-config.yaml` plus `coreServices.rootConfig`.

### Data layer
Backend only: Knex migrations in `plugins/*/migrations/*.js` (e.g. `plugins/catalog-backend/migrations/20260912000000_refresh_state_maintenance.js`). The frontend system has no data layer.

### Framework-owned wiring
- A frontend extension registers by being listed in `createFrontendPlugin({ pluginId, extensions: [...] })` (see `plugins/app/src/plugin.ts`) and attaches to a parent via `attachTo: { id, input }`.
- Routes come from `coreExtensionData.routePath` / `routeRef` outputs, which are collected into route info after the tree is instantiated.
- On the backend, the pattern is `createBackendPlugin({ pluginId, register(env) { env.registerInit({ deps: {...}, async init(...) {...} }) } })`.

## Sample files inspected
- packages/frontend-plugin-api/src/routing/useRouteRef.tsx (kind: hook)
- packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx (kind: test)
- packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx (kind: blueprint)
- plugins/app/src/extensions/elements.tsx (kind: extension instances)
- plugins/app/src/plugin.ts (kind: plugin wiring)
- packages/frontend-app-api/src/wiring/phaseApis.tsx (kind: service/internal wiring)
- packages/app/src/App.tsx (kind: entry point)
- plugins/example-todo-list-backend/src/plugin.ts (kind: backend plugin)

## Notes for downstream codegen
- Within a package, match the local style. Packages can differ, and consistency inside a package matters more than consistency across the repo.
- Fixes in `@backstage/frontend-app-api` (0.16.9-next.0) or `@backstage/frontend-plugin-api` (0.18.2-next.0) need a `patch` changeset in `.changeset/`. Write it by hand, aim it at adopters, and leave code symbols out. First check the 79 existing changesets in case one already covers the fix.
- If a public API changes, the package's `report*.api.md` must be regenerated (`yarn build:api-reports`) before a PR.
- Keep `useRouteRef`'s return contract unchanged: it returns `RouteFunc | undefined` and must not throw for unresolvable refs, per its TSDoc.
- Don't add `index.ts` exports for internals. `src/index.ts` and `src/alpha.ts` are the public API.
