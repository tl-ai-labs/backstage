# Stack profile: learned from repo scan

Built 2026-11-04 for run `20261104-093718-feature-new-home-unread-notifs`. It is scoped to the frontend home, notifications and signals area, plus a backend sample.
Trigger: Tier 2b condition 1. The primary stack is React plus the Backstage plugin framework, and no pre-authored adapter matches (NestJS is not used).
The project rule from `AGENTS.md` takes precedence: match the style of the individual package and file you edit. Packages differ.

## Language & runtime
- TypeScript ~5.7, Node 22 or 24, Yarn 4 workspaces (`packages/*`, `plugins/*`).
- Source is ESM-style TS (`import`/`export`, no default exports per ADR003). Packages are built by `backstage-cli`.
- Backend migrations are CommonJS `.js` with `// @ts-check`.
- Every source file starts with an Apache-2.0 block header (`Copyright <year> The Backstage Authors`). New files use the current year, and existing years are never changed.

## Framework
Backstage in-house plugin framework, in two frontend systems that coexist:
- **New frontend system:** `@backstage/frontend-plugin-api`. It provides `createFrontendPlugin`, `*Blueprint.make` and `createFrontendModule`, and is exported from each plugin's `src/alpha.tsx` (`/alpha` entry).
- **Legacy frontend system:** `@backstage/core-plugin-api`. It provides `createPlugin`, `plugin.provide(...)`, `createApiRef` and `useApi`, and is exported from `src/index.ts` / `src/plugin.ts`.
- **Backend:** `@backstage/backend-plugin-api` (`createBackendPlugin`, `coreServices`, extension points). Routers use Express and storage uses Knex.
- **UI:** Material UI v4 (`@material-ui/core`, `makeStyles`), with `@backstage/core-components` (`Progress`, `ResponseErrorPanel`, `Link`, `InfoCard`). Newer code uses `@backstage/ui`. Icons come from `@material-ui/icons` or `@remixicon/react`.

## Conventions detected

### File naming
- Each card is a PascalCase folder under `src/homePageComponents/<Name>/` containing `Content.tsx`, `Content.test.tsx`, `index.ts`, `<Name>.stories.tsx` and sometimes `Actions.tsx`/`Context.tsx`. The folder `index.ts` re-exports the parts by name. Examples: `plugins/home/src/homePageComponents/StarredEntities/`, `.../VisitedByType/`.
- Components use PascalCase files (`NotificationsSideBarItem.tsx`). Hooks use camelCase `useX.ts` under `src/hooks/` with an `index.ts` barrel. APIs are `XApi.ts` (interface + ref) plus `XClient.ts` (implementation) under `src/api/`.
- Tests are colocated as `*.test.ts(x)`.

### Handler / controller shape (home card content, legacy and new)
```tsx
// plugins/home/src/homePageComponents/StarredEntities/Content.tsx
export type StarredEntitiesProps = {
  noStarredEntitiesMessage?: ReactNode | undefined;
  groupByKind?: boolean;
};

export const Content = ({ noStarredEntitiesMessage, groupByKind }: StarredEntitiesProps) => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const { t } = useTranslationRef(homeTranslationRef);
  const entities = useAsync(async () => { /* ... */ }, [catalogApi, starredEntities]);
  // Progress / ResponseErrorPanel / Typography empty-state handling
```
Imports are per-component Material UI (`import List from '@material-ui/core/List'`), `react-use/esm/useAsync`, and translations via `useTranslationRef(<plugin>TranslationRef)` from `src/translation.ts`.

### Card registration
- Legacy system, in `plugins/home/src/plugin.ts`:
```ts
export const HomePageStarredEntities = homePlugin.provide(
  createCardExtension<Partial<StarredEntitiesProps>>({
    name: 'HomePageStarredEntities',
    title: 'Your Starred Entities',
    components: () => import('./homePageComponents/StarredEntities'),
  }),
);
```
- New system, in `plugins/home/src/alpha.tsx` (`HomePageWidgetBlueprint` comes from `@backstage/plugin-home-react/alpha` and attaches to `page:home` input `widgets`):
```tsx
const homePageStarredEntitiesWidget = HomePageWidgetBlueprint.make({
  name: 'starred-entities',            // extension id suffix
  params: {
    name: 'HomePageStarredEntities',
    title: 'Your Starred Entities',
    components: () =>
      import('./homePageComponents/StarredEntities').then(m => ({ Content: m.Content })),
  },
});
```
Use `HomePageWidgetBlueprint.makeWithOverrides({ configSchema: { x: z... }, *factory(originalFactory, { config }) { yield* originalFactory({...}) } })` when the widget needs app-config. An app-level example is `packages/app/src/modules/appModuleHome.tsx`, which uses `createFrontendModule({ pluginId: 'home', extensions: [...] })`.

### Service shape (frontend API + hooks)
```ts
// plugins/notifications/src/hooks/useNotificationsApi.ts
/** @public */
export function useNotificationsApi<T>(f: (api: NotificationsApi) => Promise<T>, deps: any[] = []) {
  const notificationsApi = useApi(notificationsApiRef);
  return useAsyncRetry(async () => await f(notificationsApi), deps);
}
```
```ts
// plugins/signals-react/src/hooks/useSignal.ts
export const useSignal = <TMessage extends JsonObject = JsonObject>(channel: string) => {
  const apiHolder = useApiHolder();          // optional API: degrade if signals absent
  const signals = apiHolder.get(signalApiRef);
  ... return { lastSignal, isSignalsAvailable };
};
```
- Live updates in the notifications plugin: `NotificationsSidebarItem` calls `useSignal<NotificationSignal>('notifications')` and re-fetches on `new_notification` and read signals.
- `NotificationsApi.getNotifications({ read?, limit?, offset?, sort?, sortOrder?, ... })` and `getStatus()` (unread count) already exist.
- Frontend plugin API wiring (new system): `ApiBlueprint.make({ params: defineParams => defineParams({ api, deps, factory }) })` in `src/alpha.tsx`.
- Public exports carry TSDoc release tags (`/** @public */`, `/** @alpha */`). API Extractor reports (`report*.api.md`) are regenerated, never hand-edited.

### Test shape
- Jest 30 + React Testing Library, run via `backstage-cli` (`CI=1 yarn test <path>`). Tests use `describe` / `it` and live in colocated `*.test.tsx` files.
- `renderInTestApp` and `TestApiProvider` come from `@backstage/test-utils` (legacy) or `@backstage/frontend-test-utils` (new system). API mocks are injected via `TestApiProvider apis={[[someApiRef, mock]]}`, `catalogApiMock.mock({...})` and `jest.fn()`.
- Existing home tests destructure `getByText` from the render result. The project guideline (`AGENTS.md`) prefers `screen` and `findBy*` over `waitFor`, no test IDs, and fewer, more thorough tests with multiple assertions.
- `jest.rejectFrontendNetworkRequests: true` is set at the root, so frontend tests must mock APIs. MSW is used for client tests (ADR007).

### Config
- Typed app-config schema in each package's `config.d.ts` (`export interface Config { notifications?: {...} }`), declared via `"configSchema": "config.d.ts"` in `package.json`.
- Values come from `app-config*.yaml`. The new frontend system uses zod `configSchema` on extensions (`app.extensions[...].config`).

### Data layer
- Knex. Stores are classes such as `plugins/notifications-backend/src/database/DatabaseNotificationsStore.ts` behind an interface (`NotificationsStore.ts`).
- Migrations live in `plugins/<pkg>/migrations/YYYYMMDD_name.js`:
```js
// @ts-check
exports.up = async function up(knex) {
  await knex.schema.alterTable('user_settings', table => { table.string('topic').nullable(); });
};
```

### Framework-owned wiring
- **New frontend system:** plugins expose extensions from `createFrontendPlugin({ pluginId, extensions: [...] })` in `src/alpha.tsx`. Apps install them in `packages/app/src/App.tsx` (`createApp({ features: [homePlugin, appModuleHome, ...] })`).
- **Legacy frontend system:** cards are JSX-composed in the app (`packages/app-legacy/src/components/home/HomePage.tsx` uses a MUI `Grid` of `<HomePage... />`, and `CustomizableHomePage.tsx` uses `CustomHomepageGrid`). Routing: `/home` goes to `HomepageCompositionRoot`.
- **Backend:** `createBackendPlugin({ pluginId, register(env) { env.registerInit({ deps: { ...coreServices, signals: signalsServiceRef }, async init(...) {...} }) } })`. Installed in `packages/backend/src/index.ts` via `backend.add(import(...))`.
- Cross-package deps use `"workspace:^"`. Adding a dependency to a plugin means editing its `package.json` (lint-staged then regenerates `catalog-info.yaml`).

## Sample files inspected
- `plugins/home/src/homePageComponents/StarredEntities/Content.tsx` (kind: component/card)
- `plugins/home/src/homePageComponents/StarredEntities/index.ts` (kind: barrel)
- `plugins/home/src/homePageComponents/index.ts` (kind: barrel)
- `plugins/home/src/plugin.ts` (kind: legacy card registration)
- `plugins/home/src/alpha.tsx` (kind: new-system widget registration)
- `plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx` (kind: extension blueprint)
- `packages/app/src/App.tsx`, `packages/app/src/modules/appModuleHome.tsx` (kind: app wiring, new system)
- `packages/app-legacy/src/App.tsx`, `packages/app-legacy/src/components/home/HomePage.tsx` (kind: app wiring, legacy)
- `plugins/notifications/src/hooks/useNotificationsApi.ts` (kind: hook)
- `plugins/notifications/src/api/NotificationsApi.ts` (kind: API interface)
- `plugins/notifications/src/alpha.tsx` (kind: new-system plugin)
- `plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx` (kind: live-updating component; grep only)
- `plugins/signals-react/src/hooks/useSignal.ts` (kind: hook)
- `plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx`, `.../VisitedByType/VisitedByType.test.tsx` (kind: test)
- `plugins/notifications-backend/src/plugin.ts` (kind: backend plugin)
- `plugins/notifications-backend/config.d.ts` (kind: config schema)
- `plugins/notifications-backend/migrations/20250317_addTopic.js` (kind: migration)

## Notes for downstream codegen
- Copy the shape of the nearest sibling inside the same package. Home cards should mirror `homePageComponents/<Name>/{Content.tsx,index.ts,Content.test.tsx}`.
- New features usually ship in both systems. The legacy export goes through `createCardExtension`/`plugin.provide` in `src/plugin.ts` and is re-exported from `src/index.ts`. The new-system widget goes through `HomePageWidgetBlueprint` in `src/alpha.tsx`. Check whether the target package does both before deciding.
- Plugin dependency direction matters: `plugin-home` currently depends on catalog, search and similar packages, but not on `plugin-notifications`. Adding a cross-plugin dependency changes `package.json`, `catalog-info.yaml` (auto-generated), API reports and knip reports.
- User-facing strings go through the package's `translation.ts` (`createTranslationRef`), not hard-coded English.
- Treat signals as optional (`useApiHolder().get(signalApiRef)` or `useSignal`'s `isSignalsAvailable`). Fall back to fetch-on-mount.
- Every published-package change needs a `.changeset/*.md` (patch for 0.x feature additions), TSDoc on public exports, and docs/README updates.
