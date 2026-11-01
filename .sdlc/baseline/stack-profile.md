# Stack profile — learned from repo scan

Built for run `20261101-102810-feature-new-home-notifications-card`. Trigger: no pre-authored adapter fits this
React and Express Backstage monorepo. Sampling favored the notifications, home, signals and search plugins, so
frontend coverage is deeper than backend coverage. Migrations, the catalog backend and most other packages were
not sampled. `plugins/notifications-backend/src/service/router.ts` and its store and test files exceed 500 lines,
so they were only grepped.

## Language & runtime
TypeScript ~5.7 on Node 22 or 24, Yarn 4.8.1 with `nodeLinker: node-modules`. ESM-style source imports, compiled
through `@backstage/cli`. Packages point `main` and `types` at `src/index.ts` until publish. React 17 or 18 is a
peer dependency of frontend packages.

## Framework
Backstage, with several systems side by side. `core-*` packages are the old frontend system, `frontend-*` the new
one, and `backend-*` the backend system. Frontend plugins commonly expose both: `src/plugin.ts` plus `src/index.ts`
for the legacy system, and `src/alpha.tsx` for the new one through the `./alpha` export.

## Conventions detected

### File naming
- Components use PascalCase folders with a barrel: `plugins/home/src/homePageComponents/StarredEntities/Content.tsx`
  and `index.ts` beside it. Tests and stories sit next to the source as `Content.test.tsx` and `*.stories.tsx`.
- Hooks are camelCase in `src/hooks/`, for example `plugins/notifications/src/hooks/useNotificationsApi.ts`.
- CSS modules are named after the component: `SeverityIcon.module.css` beside `SeverityIcon.tsx`.

### Handler / controller shape
New frontend system widget, from `plugins/home/src/alpha.tsx`:

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

Legacy card, from `plugins/home/src/plugin.ts`:

```ts
export const HomePageRandomJoke = homePlugin.provide(
  createCardExtension<{ defaultCategory?: 'any' | 'programming' }>({
    name: 'HomePageRandomJoke',
    title: 'Random Joke',
    components: () => import('./homePageComponents/RandomJoke'),
    description: 'Shows a random joke about optional category',
```

Backend routes, from `plugins/notifications-backend/src/service/router.ts`:

```ts
router.get('/notifications', listNotificationsHandler);

router.get('/status', async (req, res) => {
  const user = await getUser(req);
  const status = await store.getStatus({ user });
  res.json(status);
});
```

### Service shape
Frontend APIs are a `createApiRef` plus an interface and a client class, registered with `ApiBlueprint` in
`alpha.tsx` and `createApiFactory` in `plugin.ts`. From `plugins/notifications/src/hooks/useNotificationsApi.ts`:

```ts
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

Live refresh pattern, from `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`:

```tsx
const { lastSignal } = useSignal('notifications');
const throttledSetRefresh = useMemo(
  () => throttle(setRefresh, ThrottleDelayMs),
  [setRefresh],
);

useEffect(() => {
  if (refresh && !loading) {
    retry();
    setRefresh(false);
  }
}, [refresh, setRefresh, retry, loading]);

useEffect(() => {
  if (lastSignal && lastSignal.action) {
    throttledSetRefresh(true);
  }
}, [lastSignal, throttledSetRefresh]);
```

Backend plugins use `createBackendPlugin` with `register(env)` and `env.registerInit({ deps, init })`, taking
`coreServices.*` as dependencies. See `plugins/notifications-backend/src/plugin.ts`.

### Test shape
Jest with `describe` and `it`, using `renderInTestApp` from `@backstage/test-utils` and `TestApiProvider` for API
mocks. From `plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx`:

```tsx
describe('StarredEntitiesContent', () => {
  it('should render list of starred entities', async () => {
    const mockedApi = new MockStarredEntitiesApi();
    mockedApi.toggleStarred('component:default/mock-starred-entity');
```

Backend route tests use `supertest` with `mockServices`, `mockCredentials` and `TestDatabases`, as in
`plugins/notifications-backend/src/service/router.test.ts`. `plugins/home/src/alpha.lazy.test.tsx` guards against
eager loading of lazy modules.

### Config
Static app config lives in `app-config.yaml`, typed by a package `config.d.ts` with `@visibility` tags. Extension
config uses zod through `configSchema`, as in the `homePageToolkitWidget` in `plugins/home/src/alpha.tsx`. Per-widget
user settings use JSON Schema under `settings.schema`.

### Data layer
Knex through `coreServices.database`, with JavaScript migrations in `plugins/notifications-backend/migrations/`.
OpenAPI types and routers are generated into `src/schema/openapi/generated/`. From
`plugins/notifications-backend/src/database/DatabaseNotificationsStore.ts`:

```ts
const query = this.db.from(subQuery).where(q => {
  q.where('user', user).orWhereNull('user');
```

### Framework-owned wiring
- A widget registers by being listed in `extensions` of `createFrontendPlugin` or `createFrontendModule`. It attaches
  to `page:home` input `widgets` by default.
- `packages/app` sets `app.packages: all`, so installed packages are discovered automatically.
- Default layout entries live in `app-config.yaml` under `page:home` as `defaultConfig`, keyed by the widget `name`.
- A widget defined outside the home plugin depends on `@backstage/plugin-home-react`. `plugins/search/src/alpha.tsx`
  is the precedent.

## Sample files inspected
- plugins/home/src/alpha.tsx (kind: entry point, widget)
- plugins/home/src/plugin.ts (kind: entry point, legacy card)
- plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx (kind: framework extension)
- plugins/search/src/alpha.tsx (kind: cross-plugin widget, partial)
- packages/app/src/modules/appModuleHome.tsx (kind: app module widget)
- plugins/home/src/homePageComponents/StarredEntities/Content.tsx (kind: component, partial)
- plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx (kind: test, partial)
- plugins/notifications/src/alpha.tsx (kind: entry point)
- plugins/notifications/src/plugin.ts (kind: entry point)
- plugins/notifications/src/api/NotificationsApi.ts (kind: service)
- plugins/notifications/src/hooks/useNotificationsApi.ts (kind: service hook)
- plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx (kind: component, partial)
- plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx (kind: component, partial)
- plugins/notifications-common/src/types.ts (kind: shared types, partial)
- plugins/signals-react/src/hooks/useSignal.ts (kind: hook)
- plugins/notifications-backend/src/plugin.ts (kind: backend entry point, partial)

## Notes for downstream codegen
- Styling differs by package, and the repo rule is to match the package. `plugins/home` and `plugins/home-react` use
  Material UI v4 with `makeStyles`. `plugins/notifications/src` has no `@material-ui` imports: it uses
  `@backstage/ui`, `@remixicon/react` and CSS modules.
- User-facing strings go through translation refs: `homeTranslationRef` and `notificationsTranslationRef`.
- Public exports need TSDoc release tags (`@public` or `@alpha`). API reports are regenerated, never hand-edited.
- New source files use the Apache 2.0 header with the current year.
- Tests should be few and thorough. Prefer `screen` with `.findBy*` over `waitFor`, and do not add test IDs.
