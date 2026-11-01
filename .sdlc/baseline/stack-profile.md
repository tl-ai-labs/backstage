# Stack profile — learned from repo scan

Built 2026-11-01 at commit `2e8b88268c8a`. Triggered because no pre-authored adapter matches a Backstage TypeScript monorepo. Sampling was weighted toward the frontend-system packages. Files over 500 lines were skipped, which excludes `createSpecializedApp.test.tsx` and `prepareSpecializedApp.tsx` from sampling; only grep hits were taken from the latter.

## Language & runtime

TypeScript `~5.7.0` on Node `22 || 24`. Source uses ES module syntax with `moduleResolution: bundler`, `isolatedModules`, `noUnusedLocals`, and `noUnusedParameters`. The root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json`, sets `jsx: react-jsx`, and turns off `useUnknownInCatchVariables`. Knex migrations are plain CommonJS JS with `// @ts-check`.

## Framework

Backstage, an in-repo framework. React and react-router on the frontend, Express and Knex on the backend. The two frontend systems coexist: `core-*` packages are the old one, `frontend-*` the new one. `backend-*` packages are the backend system.

## Conventions detected

### File naming

- Components, classes, and blueprints use PascalCase: `AppRootElementBlueprint.tsx`, `RouteResolver.ts`.
- Hooks and functions use camelCase: `useRouteRef.tsx`, `prepareSpecializedApp.tsx`.
- Tests sit beside the source as `<name>.test.ts(x)`.
- Backend plugins use `src/plugin.ts` and `src/service/router.ts`.

### Handler / controller shape

Frontend units are extensions, usually built from a blueprint:

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

Backend routes are Express routers from `express-promise-router`:

```ts
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth } = options;

  const router = Router();
  router.use(express.json());
```

### Service shape

Backend plugins declare dependencies through `coreServices`:

```ts
export const devtoolsPlugin = createBackendPlugin({
  pluginId: 'devtools',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
```

Frontend utility APIs are classes behind an API ref, consumed with `useApi(...)` or `apis.get(...)`. `RouteResolver` implements `RouteResolutionApi`, and `phaseApis.tsx` holds proxies for APIs that are initialized later in startup.

### Test shape

Jest with `describe`/`it`. React tests use React Testing Library. Project rules prefer fewer thorough tests, `screen` with `.findBy*` over `waitFor`, and no added test IDs.

```tsx
await renderTestApp({
  extensions: [
    AppRootElementBlueprint.makeWithOverrides({
      name: 'derp',
      factory(originalFactory, { apis }) {
        function TestComponent() {
          useEffect(() => {
            deferred.resolve(apis.get(dialogApiRef)!);
          }, []);
          return <div />;
        }
        return originalFactory({ element: <TestComponent /> });
      },
    }),
  ],
});
```

Hook tests use `renderHook` with `TestApiProvider` and `MemoryRouter`, as in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`.

### Config

App config lives in `app-config.yaml`, with `config.d.ts` schemas per package. Extensions declare `configSchema`, as in `plugins/app/src/extensions/AppRoutes.tsx:70`. Zod is used for validation in 66 packages.

### Data layer

Knex with timestamped migration files:

```js
exports.up = async function up(knex) {
  await knex.schema.createTable('user_settings', table => {
    table.comment('The table of user related settings');
```

### Framework-owned wiring

Extensions register by attachment, not by import: `attachTo: { id: 'app/root', input: 'elements' }` feeds the `elements` input declared by `AppRoot`. Backend routes register through `httpRouter.use(...)`. Frontend apps are composed with `createApp` from `@backstage/frontend-defaults`, as in `packages/app/src/App.tsx`.

## Sample files inspected

- `packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx` (kind: controller)
- `plugins/app/src/extensions/AppRoot.tsx` (kind: controller)
- `plugins/example-todo-list-backend/src/service/router.ts` (kind: controller)
- `plugins/devtools-backend/src/plugin.ts` (kind: service)
- `packages/frontend-app-api/src/routing/RouteResolver.ts` (kind: service)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (kind: service)
- `packages/frontend-app-api/src/wiring/createSpecializedApp.tsx` (kind: entry point)
- `packages/app/src/App.tsx` (kind: entry point)
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` (kind: test)
- `plugins/app/src/extensions/DialogDisplay.test.tsx` (kind: test)
- `plugins/user-settings-backend/migrations/20220824183000_init.js` (kind: migration)

## Notes for downstream codegen

- Match the conventions of the package being edited. Project rules put consistency within a package above consistency across the repo.
- New `.ts`, `.tsx`, `.js`, and `.jsx` files need the Apache 2.0 header with the current year. Leave the year on existing files alone.
- Keep old-system and new-system code separate. `@backstage/frontend-plugin-api` is the new-system API surface.
- `plugins/app` imports internals from `packages/frontend-app-api/src` by relative path with an eslint-disable comment, so an internal change there can reach `plugins/app`.
- Public API changes need TSDoc release tags and regenerated `report*.api.md` files.
