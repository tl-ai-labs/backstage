# Stack profile: learned from repo scan

Built 2026-11-04 by run `20261104-184235-bugfix-routeref-startup-crash` (Tier 2b; no shipped adapter matches).

## Language & runtime
TypeScript in a Yarn 4 workspace monorepo (`packages/*`, `plugins/*`, 233 packages), Node 22 or 24. The root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json` with `jsx: react-jsx`, `useUnknownInCatchVariables: false`, and `outDir: dist-types`. Source is ESM-style TypeScript (`import`/`export`, named exports only per ADR003). Knex migrations are plain CommonJS JS with `// @ts-check`. Every package is built and tested through `backstage-cli package <cmd>`. The package `backstage.role` field (for example `web-library`) controls build and test behavior.

## Framework
Backstage's own framework:
- **New frontend system**: `@backstage/frontend-plugin-api` (extensions, blueprints, route refs) and `@backstage/frontend-app-api` (app tree, route resolution).
- **Old frontend system**: `@backstage/core-plugin-api` and `core-app-api`, bridged by `core-compat-api`.
- **Backend system**: `@backstage/backend-plugin-api` (`createBackendPlugin`, `coreServices`) on top of Express (`express-promise-router`) and Knex.

Internal shared code lives in `@internal/*` packages (for example `@internal/frontend` provides `OpaqueRouteRef` and `OpaqueFrontendPlugin`).

## Conventions detected

### File naming
- Each exported concept gets a PascalCase file, with a sibling test: `packages/frontend-plugin-api/src/routing/RouteRef.ts` and `RouteRef.test.ts`. React files use `.tsx`: `useRouteRef.tsx`, `useRouteRef.test.tsx`.
- camelCase files for functions: `collectRouteIds.ts`, `resolveRouteBindings.ts`, `describeParentCallSite.ts`.
- Feature folders with an `index.ts` barrel: `src/routing/index.ts`, `src/blueprints/index.ts`.
- Every source file starts with the 15-line Apache 2.0 header `Copyright <year> The Backstage Authors`.

### Public API shape (opaque refs)
Public types are thin, branded interfaces. Behavior hides behind an internal opaque implementation, and every export has a TSDoc release tag (`@public`, `@internal`, `@alpha`):
```ts
export interface RouteRef<TParams extends AnyRouteRefParams = AnyRouteRefParams> {
  readonly $$type: '@backstage/RouteRef';
  readonly T: TParams;
}
...
  return OpaqueRouteRef.createInstance('v1', {
    T: undefined as any,
    getParams() { return params; },
    getDescription() { ... },
    alias: config?.aliasFor,
    setId(newId: string) {
      if (!newId) { throw new Error(`RouteRef id must be a non-empty string`); }
```
(`packages/frontend-plugin-api/src/routing/RouteRef.ts`)

### Frontend extension / blueprint shape
```tsx
export const SubPageBlueprint = createExtensionBlueprint({
  kind: 'sub-page',
  attachTo: { relative: { kind: 'page' }, input: 'pages' },
  output: [
    coreExtensionData.routePath,
    coreExtensionData.reactElement,
    coreExtensionData.title,
    coreExtensionData.routeRef.optional(),
    coreExtensionData.icon.optional(),
  ],
  configSchema: { path: optionalStringSchema, title: optionalStringSchema },
  *factory(params: { path: string; title: string; loader: () => Promise<JSX.Element>; routeRef?: RouteRef }, { config, node }) {
```
(`packages/frontend-plugin-api/src/blueprints/SubPageBlueprint.tsx`)

### App-wiring / error collection shape (frontend-app-api)
Startup problems are reported to an `ErrorCollector` with a code and context, instead of being thrown:
```ts
export function collectRouteIds(features: FrontendFeature[], collector: ErrorCollector): RouteRefsById {
  ...
    for (const [name, ref] of Object.entries(feature.routes)) {
      const refId = `${feature.id}.${name}`;
      if (routesById.has(refId)) {
        collector.report({
          code: 'ROUTE_DUPLICATE',
          message: `Duplicate route id '${refId}' encountered while collecting routes`,
          context: { routeId: refId },
        });
        continue;
      }
```
(`packages/frontend-app-api/src/routing/collectRouteIds.ts`)

### Backend plugin (service) shape
```ts
export const proxyPlugin = createBackendPlugin({
  pluginId: 'proxy',
  register(env) {
    env.registerExtensionPoint(proxyEndpointsExtensionPoint, { addProxyEndpoints(endpoints) { ... } });
    env.registerInit({
      deps: { config: coreServices.rootConfig, logger: coreServices.logger, httpRouter: coreServices.httpRouter, ... },
      async init({ config, logger, httpRouter, ... }) { await createRouter({ ... }); },
    });
  },
});
```
(`plugins/proxy-backend/src/plugin.ts`; HTTP handlers live in `src/service/router.ts` using `express-promise-router`)

### Test shape
Jest via `backstage-cli package test`, with co-located `*.test.ts(x)` files. A `describe` block holds a few thorough `it` cases with several assertions each. Tests reach into internals through the opaque helpers:
```ts
describe('RouteRef', () => {
  it('should be created and have a mutable ID', () => {
    const routeRef: RouteRef<undefined> = createRouteRef();
    const internal = OpaqueRouteRef.toInternal(routeRef);
    expect(internal.getParams()).toEqual([]);
    expect(() => internal.setId('')).toThrow('RouteRef id must be a non-empty string');
```
`src/setupTests.ts` imports `@testing-library/jest-dom`. React tests use RTL `screen` and `findBy*`, without test IDs. Run with `CI=1 yarn test <path>`.

### Config
App config is YAML (`app-config.yaml`) read through `coreServices.rootConfig`. Each package declares its schema in `config.d.ts` as `export interface Config { ... }` with TSDoc on each field (for example `plugins/proxy-backend/config.d.ts`). Frontend extensions declare `configSchema` in the blueprint.

### Data layer
Knex. Migrations live in `<plugin>/migrations/*.js`, named with a timestamp:
```js
// @ts-check
/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('static_assets_cache', table => { ... });
```
(`plugins/app-backend/migrations/20211229105307_init.js`)

### Framework-owned wiring
- Frontend (new): plugins export `routes`, `externalRoutes` and `extensions`. `createApp({ features: [...] })` in `packages/app/src/App.tsx` assembles them. Route IDs are `<pluginId>.<routeName>`, collected and bound in `packages/frontend-app-api/src/routing/`.
- Legacy plugins go through `convertLegacyPlugin` and `convertLegacyPageExtension` (`@backstage/core-compat-api`).
- Backend: `createBackend()` then `backend.add(import('...'))` or a `createBackendFeatureLoader` in `packages/backend/src/index.ts`.

## Sample files inspected
- packages/frontend-plugin-api/src/routing/RouteRef.ts (kind: domain/public API)
- packages/frontend-plugin-api/src/routing/RouteRef.test.ts (kind: test)
- packages/frontend-plugin-api/src/blueprints/SubPageBlueprint.tsx (kind: frontend extension)
- packages/frontend-plugin-api/src/setupTests.ts (kind: test setup)
- packages/frontend-app-api/src/routing/collectRouteIds.ts (kind: app wiring)
- plugins/proxy-backend/src/plugin.ts (kind: backend plugin)
- plugins/app-backend/src/service/router.ts (kind: express router, imports only)
- plugins/proxy-backend/config.d.ts (kind: config schema)
- plugins/app-backend/migrations/20211229105307_init.js (kind: migration)
- packages/app/src/App.tsx, packages/backend/src/index.ts (kind: entry points)

## Notes for downstream codegen
- Match the package you edit. Conventions differ between `core-*` (old frontend system), `frontend-*` (new frontend system) and `backend-*` packages, and route-ref logic exists twice (`core-plugin-api/src/routing` and `frontend-plugin-api/src/routing`).
- Keep public types opaque. Add behavior through the `Opaque*` internals in `@internal/*`, not on the public interface.
- In `frontend-app-api` wiring, report startup problems through `ErrorCollector.report({ code, message, context })` and continue, rather than throwing.
- Named exports only (ADR003). Tag every export `@public`, `@alpha` or `@internal`. Public API changes need regenerated `report*.api.md` files and a changeset.
- New files get the Apache 2.0 header with the current year. Never change the year on existing files.
