# Stack profile, learned from a repo scan

Built 2026-11-04 by run `20261104-000000-feature-new-home-unread-notifications-card`. Sampling was focused on the packages this feature touches.

## Language & runtime
The repo is TypeScript throughout. React 18 types, with peer support for `react ^17 || ^18`. Modules are ESM-style imports, compiled by `backstage-cli`, and each package's `exports` field points straight at `src/*.ts(x)`. There is one root `tsconfig.json`, and `yarn tsc` is run only from the root. Node 22 or 24, Yarn 4.8.1 workspaces (`packages/*`, `plugins/*`).

## Framework
Backstage runs two frontend systems side by side:
- **Legacy** (`@backstage/core-plugin-api`): `createPlugin`, `createApiFactory`, `createRoutableExtension`, `plugin.provide(...)`. Exported from each package's `src/index.ts`.
- **New frontend system (NFS)** (`@backstage/frontend-plugin-api`): `createFrontendPlugin`, `PageBlueprint`, `ApiBlueprint` and extension blueprints. Exported as the default export of `src/alpha.tsx`, which is the `./alpha` subpath.
Home cards use `createCardExtension` (legacy, from `@backstage/plugin-home-react`) and `HomePageWidgetBlueprint` (NFS, from `@backstage/plugin-home-react/alpha`).
UI mixes Material UI v4 (`@material-ui/core`, `makeStyles`) with `@backstage/ui` plus CSS modules (`*.module.css`). Icons come from `@remixicon/react`. The notifications plugin leans toward `@backstage/ui` and remixicon; plugins/home still uses MUI v4.

## Conventions detected

### File naming
- Each component gets a PascalCase folder holding a same-named file and an `index.ts` barrel, for example `plugins/notifications/src/components/NotificationsSideBarItem/{NotificationsSideBarItem.tsx,index.ts,NotificationsSideBarItem.module.css}`.
- A home card is a folder under `homePageComponents/<CardName>/` with `Content.tsx`, optional `Actions.tsx`, `Settings.tsx` and `Context.tsx`, an `index.ts` that re-exports `Content`, `Content.test.tsx`, and `<CardName>.stories.tsx`. Example: `plugins/home/src/homePageComponents/StarredEntities/`.
- Hooks are camelCase files under `src/hooks/` (`useNotificationsApi.ts`, `useTitleCounter.ts`), re-exported from `src/hooks/index.ts`.
- Every source file opens with the Apache 2.0 header `Copyright <year> The Backstage Authors`. New files use 2026.

### Card component shape (plugins/home/src/homePageComponents/StarredEntities/Content.tsx)
```tsx
/**
 * Props for the StarredEntities component
 *
 * @public
 */
export type StarredEntitiesProps = {
  noStarredEntitiesMessage?: ReactNode | undefined;
  groupByKind?: boolean;
};

/** ... @public */
export const Content = ({ noStarredEntitiesMessage, groupByKind }: StarredEntitiesProps) => {
  const catalogApi = useApi(catalogApiRef);
  const { t } = useTranslationRef(homeTranslationRef);
  const entities = useAsync(async () => { ... }, [catalogApi, starredEntities]);
  if (entities.loading) { return <Progress />; }
  return entities.error ? <ResponseErrorPanel error={entities.error} /> : (...);
};
```

### Card registration: legacy (plugins/home/src/plugin.ts)
```ts
/**
 * A component to display a list of starred entities for the user.
 *
 * @public
 */
export const HomePageStarredEntities = homePlugin.provide(
  createCardExtension<Partial<StarredEntitiesProps>>({
    name: 'HomePageStarredEntities',
    title: 'Your Starred Entities',
    components: () => import('./homePageComponents/StarredEntities'),
  }),
);
```

### Card registration: NFS (plugins/home/src/alpha.tsx; cross-plugin precedent plugins/search/src/alpha.tsx)
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
The widget then goes into the `extensions: [...]` array of `createFrontendPlugin`. It attaches to `page:home` input `widgets` by default. plugins/search ships its own widget this way and lists `@backstage/plugin-home-react` as a dependency.

### API / data access (plugins/notifications)
- `notificationsApiRef = createApiRef<NotificationsApi>({ id: 'plugin.notifications.service' })`, implemented by `NotificationsClient({ discoveryApi, fetchApi })`.
- `useNotificationsApi(api => api.getNotifications({...}), deps)` wraps `react-use/esm/useAsyncRetry` and returns `{ loading, error, value, retry }`.
- `GetNotificationsOptions`: `{ search, read, saved, createdAfter, minimumSeverity, offset, limit, sort: 'created'|'topic'|'origin', sortOrder: 'asc'|'desc', topic }`.
- `Notification` (from `@backstage/plugin-notifications-common`) has `id`, `user`, `created: Date`, `read?: Date`, `saved?`, `origin`, and `payload: { title, description?, link?, severity?, topic?, ... }`.

### Live updates (signals)
```ts
import { useSignal } from '@backstage/plugin-signals-react';
import { NotificationSignal } from '@backstage/plugin-notifications-common';

const { lastSignal } = useSignal<NotificationSignal>('notifications');
useEffect(() => { /* refetch / retry() on lastSignal */ }, [lastSignal]);
```
`useSignal` returns `{ lastSignal, isSignalsAvailable }`. It reads signalApi through `useApiHolder`, so it degrades gracefully when signals are not installed. Signal actions are `new_notification` (with `notification_id`) and `notification_read` / `notification_unread` (with `notification_ids`).

### Deep links
In `NotificationsSideBarItem.tsx` and `NotificationsTable.tsx`: `notification.payload.link ?? notificationsRoute`, where `notificationsRoute = useRouteRef(rootRouteRef)()`. Internal links use the core-components `Link` with `to={notification.payload.link}`. There is an optional `markAsReadOnLinkOpen` that calls `updateNotifications({ ids: [id], read: true })`.

### Translations
Each plugin has a `src/translation.ts`: `createTranslationRef({ id: 'plugin.notifications', messages: { ... } })` from `@backstage/frontend-plugin-api`. Components read it with `const { t } = useTranslationRef(notificationsTranslationRef)`. Plural keys use the `_one` / `_other` suffixes.

### Test shape (plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx)
```tsx
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';

describe('StarredEntitiesContent', () => {
  it('should render list of starred entities', async () => {
    const { getByText } = await renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [starredEntitiesApiRef, mockedApi]]}>
        <Content />
      </TestApiProvider>,
      { mountedRoutes: { '/catalog/:namespace/:kind/:name': entityRouteRef } },
    );
    expect(getByText('mock-starred-entity').closest('a')).toHaveAttribute('href', '/catalog/default/component/mock-starred-entity');
  });
});
```
This is Jest 30 with `describe`/`it`, `jest.fn()`, `renderInTestApp` plus `TestApiProvider`, and `mountedRoutes` for route refs. CLAUDE.md asks for `screen` and `findBy*`, fewer but thorough tests, and no test IDs. Mock the signal API with `[signalApiRef, { subscribe: ... }]` from `@backstage/plugin-signals-react`. Root jest config sets `rejectFrontendNetworkRequests: true`.

### Config
Nothing is env-driven in these frontend packages. Config, where used, comes through `configApiRef` and `config.d.ts` (for example `plugins/home/config.d.ts`).

### Data layer
Frontend only. Data comes over HTTP through the `NotificationsClient` (fetchApi plus discoveryApi). The backend (`plugins/notifications-backend`) uses knex and already supports `read`, `sort` and `limit` filters.

### Framework-owned wiring
- Legacy app: a JSX `<Route>` in `packages/app-legacy/src/App.tsx`. Home cards go into `packages/app-legacy/src/components/home/HomePage.tsx` and `CustomizableHomePage.tsx` as JSX in a `Grid` or `CustomHomepageGrid`.
- NFS app: features go in the `features` list in `packages/app/src/App.tsx` (`homePlugin` from `@backstage/plugin-home/alpha`, notifications plugin). Widgets attach automatically through the blueprint attach point. `packages/app/src/HomePage.tsx` holds a `CustomHomepageGrid` `defaultConfig` keyed by card `name`.

## Sample files inspected
- plugins/home/src/homePageComponents/StarredEntities/Content.tsx (kind: card component)
- plugins/home/src/homePageComponents/StarredEntities/index.ts (kind: barrel)
- plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx (kind: test)
- plugins/home/src/plugin.ts (kind: legacy registration)
- plugins/home/src/alpha.tsx (kind: NFS registration)
- plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx (kind: blueprint)
- plugins/search/src/alpha.tsx (kind: cross-plugin widget precedent)
- plugins/notifications/src/plugin.ts, src/alpha.tsx (kind: plugin wiring)
- plugins/notifications/src/api/NotificationsApi.ts (kind: API)
- plugins/notifications/src/hooks/useNotificationsApi.ts (kind: hook)
- plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx (kind: signals + link consumer)
- plugins/notifications/src/translation.ts (kind: i18n)
- plugins/notifications-common/src/types.ts (kind: shared types)
- plugins/signals-react/src/hooks/useSignal.ts (kind: hook)
- packages/app/src/HomePage.tsx, packages/app/src/modules/appModuleHome.tsx, packages/app-legacy/src/components/home/HomePage.tsx (kind: app wiring)

## Notes for downstream codegen
- Match each package's own style. plugins/notifications is moving to `@backstage/ui`, CSS modules and remixicon. plugins/home uses MUI v4 `makeStyles`.
- Public exports need TSDoc tags (`@public` or `@alpha`). New exports change `report.api.md` / `report-alpha.api.md`, which `yarn build:api-reports` regenerates.
- Lazy-load card bodies (`components: () => import('./...')`). Keep `index.ts` barrels.
- To get live updates, use `retry()` from `useNotificationsApi` on each `lastSignal` change. Do not hand-roll websockets.
- Add a changeset file in `.changeset/` for each published package touched (patch for packages below 1.0.0) and update docs (README or `docs/notifications/usage.md`).
- Do not edit ESLint, Prettier or tsconfig. Do not edit `docs/releases`.
