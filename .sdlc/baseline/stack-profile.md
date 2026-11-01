# Stack profile — learned from repo scan

Built by run `20261101-093743-feature-new-home-notifications-card` at git HEAD `fe6ace679f34`.
Trigger: the primary stack (Backstage on React and Express, TypeScript) has no pre-authored adapter.

## Language & runtime

TypeScript `~5.7.0` on Node `22 || 24`, with Yarn `4.8.1` workspaces (`packages/*`, `plugins/*`). The shared config is `packages/cli/config/tsconfig.json`: `strict`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters`, `module: ES2020`, `moduleResolution: bundler`, `target: ES2022`. The root `tsconfig.json` sets `jsx: react-jsx` and `useUnknownInCatchVariables: false`. Source uses ESM syntax and is built by `backstage-cli`, so there is no per-package tsc build. Knex migrations are the exception: they are plain CommonJS JavaScript. Frontend packages declare peers of React `^17.0.0 || ^18.0.0`, and root `resolutions` pin `@types/react` to `^18.0.0`. `docs-ui` and `microsite` use React 19, but they are separate Yarn projects.

## Framework

Backstage's own framework, which this repo defines. Three systems run side by side, and `AGENTS.md` names them by package prefix:

- **New frontend system** (`frontend-*`): `createFrontendPlugin`, extension blueprints, `packages/app`.
- **Old frontend system** (`core-*`): `createPlugin`, `packages/app-legacy`.
- **Backend system** (`backend-*`): `createBackendPlugin` on Express, `packages/backend`.

Each package declares its kind in `package.json#backstage.role`. Counts: 77 `backend-plugin-module`, 32 `web-library`, 30 `node-library`, 23 `frontend-plugin`, 23 `common-library`, 18 `backend-plugin`, 14 `cli-module`, 5 `cli`, 3 `frontend`, 3 `frontend-plugin-module`, 1 `backend`, 1 none.

A feature is split across sibling packages, listed in `backstage.pluginPackages`. `plugins/notifications/package.json` names `plugin-notifications`, `-backend`, `-common` and `-node`. `plugins/home` pairs with `plugins/home-react`, which owns the widget extension API.

## Conventions detected

### File naming

- Components and classes are PascalCase and one per file, in a folder with a barrel: `plugins/org/src/components/Cards/User/UserProfileCard/{UserProfileCard.tsx,UserProfileCard.test.tsx,UserProfileCard.stories.tsx,index.ts}`.
- Hooks are camelCase: `plugins/notifications/src/hooks/useNotificationsApi.ts`.
- Backend wiring uses fixed names: `src/plugin.ts`, `src/service/router.ts`.
- Migrations are timestamped: `plugins/user-settings-backend/migrations/20220824183000_init.js`.
- Tests sit next to the source as `*.test.ts(x)`.
- Package entry points are `src/index.ts` and `src/alpha.tsx`, exposed through `package.json#exports` (`.`, `./alpha`).

### License header and release tags

Every source file starts with the 15-line Apache 2.0 block (`* Copyright 2025 The Backstage Authors`). New files use the current year; existing years stay as they are. Exported symbols carry TSDoc release tags: `/** @public */`, `/** @alpha */`, `/** @internal */`. API reports check these tags.

### Frontend plugin shape (new system)

From `plugins/notifications/src/alpha.tsx`:

```tsx
const page = PageBlueprint.make({
  params: {
    path: '/notifications',
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/NotificationsPage').then(m => (
        <m.NfsNotificationsPage />
      )),
  },
});

/** @alpha */
export default createFrontendPlugin({
  pluginId: 'notifications',
  title: 'Notifications',
  icon: <RiNotification3Line />,
  info: { packageJson: () => import('../package.json') },
  routes: {
    root: rootRouteRef,
  },
  extensions: [page, api],
});
```

### Home page widget shape

From `plugins/home/src/alpha.tsx`. The blueprint is `HomePageWidgetBlueprint` from `@backstage/plugin-home-react/alpha`. It attaches to `page:home`, input `widgets`:

```tsx
const homePageStarredEntitiesWidget = HomePageWidgetBlueprint.make({
  name: 'starred-entities',
  params: {
    name: 'HomePageStarredEntities',
    title: 'Your Starred Entities',
    description: 'Shows entities you have starred in the catalog',
    components: () =>
      import('./homePageComponents/StarredEntities').then(m => ({
        Content: m.Content,
      })),
  },
});
```

`components` loads a `ComponentParts` object lazily. A card folder such as `plugins/home/src/homePageComponents/RandomJoke/` holds `Content.tsx`, `Actions.tsx`, `Settings.tsx`, `Context.tsx` and an `index.ts` barrel. Widgets with config use `makeWithOverrides` with a zod `configSchema` (see `homePageToolkitWidget`). An app can also define widgets in a frontend module, as `packages/app/src/modules/appModuleHome.tsx` does.

### Frontend component shape

Packages are mid-migration from Material UI v4 to `@backstage/ui`. `plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx` mixes both, and it imports MUI per-path with `makeStyles` carrying a named class prefix:

```tsx
import { Avatar, Box, Flex, Text } from '@backstage/ui';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';

const useStyles = makeStyles(
  theme =>
    createStyles({
      list: {
        overflowWrap: 'anywhere',
      },
    }),
  { name: 'PluginOrgUserProfileCard' },
);
```

The migration level differs per package: `plugins/notifications` imports `@backstage/ui` in components such as `NotificationsPage.tsx`, while `plugins/home` does not depend on `@backstage/ui` at all. Match the package you are editing. User-facing strings go through `createTranslationRef` (`plugins/notifications/src/translation.ts`) and `useTranslationRef`. Icons differ too: `plugins/notifications/src/alpha.tsx` uses `@remixicon/react`, and `plugins/home/src/alpha.tsx` uses `@material-ui/icons`.

### API client and hook shape

From `plugins/notifications/src/hooks/useNotificationsApi.ts`:

```ts
/** @public */
export function useNotificationsApi<T>(
  f: (api: NotificationsApi) => Promise<T>,
  deps: any[] = [],
) {
  const notificationsApi = useApi(notificationsApiRef);

  return useAsyncRetry(async () => {
    return await f(notificationsApi);
  }, deps);
}
```

The client (`NotificationsClient.ts`) takes `{ discoveryApi, fetchApi }` in its constructor and throws `ResponseError` from `@backstage/errors`. It is registered through `ApiBlueprint` with `deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef }`. `react-use` imports use the `react-use/esm/...` path.

### Handler / controller shape

Backend plugins declare dependencies and mount a router. From `plugins/signals-backend/src/plugin.ts`:

```ts
export const signalsPlugin = createBackendPlugin({
  pluginId: 'signals',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ httpRouter, logger }) {
        httpRouter.use(await createRouter({ logger }));
      },
    });
  },
});
```

This snippet is trimmed to two of the eight dependencies. Routers are `async function createRouter(options: RouterOptions): Promise<express.Router>` built with `express-promise-router`. Some plugins, `notifications-backend` among them, use an OpenAPI-generated router under `src/schema/openapi/generated/`. Its files say `THIS IS AN AUTOGENERATED FILE`, and the `generate` script in the package regenerates them.

### Service shape

Classes use a static factory and a private constructor, with typed options. From `plugins/signals-backend/src/service/SignalManager.ts`:

```ts
/** @internal */
export class SignalManager {
  static create(options: SignalManagerOptions) {
    return new SignalManager(options);
  }

  private constructor(options: SignalManagerOptions) {
    this.events = options.events;
```

### Test shape

Jest through `backstage-cli`. Tests use `describe`/`it`. `AGENTS.md` asks for fewer thorough tests, `screen` with `.findBy*` over `waitFor`, and no added test IDs.

Frontend, from `plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.test.tsx`:

```tsx
await renderInTestApp(
  <EntityProvider entity={userEntity}>
    <UserProfileCard />
  </EntityProvider>,
  {
    mountedRoutes: {
      '/catalog/:namespace/:kind/:name': entityRouteRef,
    },
  },
);
```

Backend, from `plugins/signals-backend/src/service/router.test.ts`:

```ts
const router = await createRouter({
  logger: mockServices.logger.mock(),
  events: eventsServiceMock,
  config: mockServices.rootConfig(),
  auth: mockServices.auth(),
});
app = express().use(router).use(mockErrorHandler());
```

This snippet omits some options. Requests go through `supertest`, and `msw` is available in 58 packages.

### Config

Static config is declared by a `config.d.ts` at the package root (`plugins/notifications-backend/config.d.ts`) as a TSDoc-commented `export interface Config`, and read through `coreServices.rootConfig`. Values live in `app-config.yaml`. Frontend extensions validate their own config with `configSchema` and zod, using `import { z } from 'zod/v4'` in `plugins/home/src/alpha.tsx`.

### Data layer

Knex with raw migrations, and a store class per plugin. From `plugins/user-settings-backend/src/database/DatabaseUserSettingsStore.ts`:

```ts
static async create(options: {
  database: DatabaseService;
}): Promise<DatabaseUserSettingsStore> {
  const { database } = options;
  const client = await database.getClient();

  if (!database.migrations?.skip) {
    await client.migrate.latest({
      directory: migrationsDir,
    });
  }

  return new DatabaseUserSettingsStore(client);
}
```

Migrations are `// @ts-check` CommonJS with `exports.up` and `exports.down`, and they comment tables and columns. Some packages with migrations, `notifications-backend` among them, also carry a generated `report.sql.md` (13 in the repo).

### Framework-owned wiring

- Backend: add a line to `packages/backend/src/index.ts`, for example `backend.add(import('@backstage/plugin-signals-backend'));`.
- Frontend (new system): add the plugin or module to `features` in `packages/app/src/App.tsx`. Plugins expose their default export from `./alpha` for this.
- Frontend (old system): explicit routes and components in `packages/app-legacy/src/App.tsx`.
- Home widgets: attach automatically to `page:home` once the owning plugin or module is installed.

## Sample files inspected

- `plugins/notifications/src/alpha.tsx` (kind: frontend plugin)
- `plugins/home/src/alpha.tsx` (kind: frontend plugin, config)
- `plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx` (kind: frontend extension)
- `plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.tsx` (kind: component)
- `plugins/home/src/homePageComponents/RandomJoke/Content.tsx` (kind: component)
- `plugins/notifications/src/hooks/useNotificationsApi.ts` (kind: hook)
- `plugins/notifications/src/api/NotificationsClient.ts` (kind: API client)
- `plugins/notifications/src/translation.ts` (kind: translation)
- `plugins/signals-backend/src/plugin.ts` (kind: handler)
- `plugins/signals-backend/src/service/router.ts` (kind: handler)
- `plugins/signals-backend/src/service/SignalManager.ts` (kind: service)
- `plugins/signals-backend/src/service/router.test.ts` (kind: test)
- `plugins/org/src/components/Cards/User/UserProfileCard/UserProfileCard.test.tsx` (kind: test)
- `plugins/notifications-backend/config.d.ts` (kind: config)
- `plugins/user-settings-backend/src/database/DatabaseUserSettingsStore.ts` (kind: data layer)
- `plugins/user-settings-backend/migrations/20220824183000_init.js` (kind: data layer)
- `packages/backend/src/index.ts` (kind: entry point)
- `packages/app/src/App.tsx`, `packages/app/src/index.tsx`, `packages/app/src/modules/appModuleHome.tsx` (kind: entry point)

Sampling limits: file mtimes reflect recent checkouts rather than authorship, so "most recent" is only a rough signal here. Among files with similar mtimes, `plugins/home` and `plugins/notifications` were preferred because of this run's intent. Coverage of the other 150+ plugins is thin, so check the target package before relying on a pattern.

## Notes for downstream codegen

- `AGENTS.md` says consistency within a package beats consistency across the repo. Point `style_from` at files in the package being edited.
- New `.ts`, `.tsx`, `.js` and `.jsx` files need the Apache 2.0 header with the current year. Generated, config and docs files do not.
- Changes to published packages under `packages/` and `plugins/` need a hand-written file in `.changeset/`, never the CLI. Below 1.0.0, new APIs are `patch` and breaking changes are `minor`. At 1.0.0 and above, new APIs are `minor` and breaking changes are `major`. Write one per package, for adopters, with no internal symbol names.
- Public API changes need `yarn build:api-reports`, which rewrites `report*.api.md`.
- Do not run `yarn build`, `yarn changesets version` or `yarn release`. Do not change ESLint, Prettier or TypeScript config, or `docs/releases`.
- `plugins/home` has no dependency on `@backstage/ui` or `@backstage/plugin-notifications`. A card that needs either has to add it to `package.json`, which also changes `yarn.lock`.
- Keep new-system exports in `alpha` entry points and tag them `@alpha`. Features should be documented in TSDoc, the README or `docs/`.
