# Stack profile: learned from repo scan

Built 2026-11-03T19:30Z (UTC), run `20261104-005757-feature-new-home-unread-notifications-card`. Tier 2b was triggered because node-typescript/React has no pre-authored adapter. The sampling focused on the frontend plugin packages relevant to the active intent (notifications, home, home-react, search).

## Language & runtime
TypeScript ~5.7 (`yarn tsc` from the root), React 17/18 (peer), Node 22 or 24, Yarn 4 workspaces. Source is ESM-style TS compiled by `@backstage/cli`. Imports are relative inside a package and use `@backstage/*` package names across packages, with no path aliases. Every source file starts with an Apache-2.0 license block comment ("Copyright <year> The Backstage Authors"). New files use the current year.

## Framework
Backstage has two frontend systems that live side by side in each plugin:
- **Old system**: `createPlugin`, `plugin.provide(createRoutableExtension|createCardExtension(...))`, exported from `src/index.ts`. API types are marked `@public`.
- **New system**: `createFrontendPlugin({ pluginId, extensions: [...] })` as the default export of `src/alpha.tsx` (`./alpha` export, `@alpha` TSDoc). Extensions are built from blueprints (`PageBlueprint`, `ApiBlueprint`, `HomePageWidgetBlueprint`).

## Conventions detected

### File naming
- Components use PascalCase folders with `index.ts` barrels: `src/components/NotificationsTable/{NotificationsTable.tsx,index.ts}`, plus CSS modules such as `NotificationsTable.module.css`.
- Home cards: `src/homePageComponents/<CardName>/{Content.tsx,index.ts,Content.test.tsx,<CardName>.stories.tsx}`. They can also have `Actions.tsx`, `Settings.tsx` and `Context.tsx`.
- Hooks use camelCase in `src/hooks/useX.ts`. APIs live in `src/api/{XApi.ts,XClient.ts}`.

### Card (old system) shape, `plugins/home/src/plugin.ts`
```ts
export const HomePageStarredEntities = homePlugin.provide(
  createCardExtension<Partial<StarredEntitiesProps>>({
    name: 'HomePageStarredEntities',
    title: 'Your Starred Entities',
    components: () => import('./homePageComponents/StarredEntities'),
  }),
);
```

### Widget (new system) shape, `plugins/search/src/alpha.tsx`
```tsx
const homePageSearchBarWidget = HomePageWidgetBlueprint.make({
  name: 'search-bar',
  params: {
    name: 'HomePageSearchBar',
    title: 'Search',
    description: 'A search bar that navigates to the search page on submit',
    components: () =>
      import('./components/HomePageComponent').then(m => ({
        Content: m.HomePageSearchBar,
      })),
  },
});
// ... createFrontendPlugin({ pluginId: 'search', ..., extensions: [searchApi, searchPage, homePageSearchBarWidget] })
```

### API + data hook shape, `plugins/notifications/src/hooks/useNotificationsApi.ts`
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

### Live-update shape, `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`
```ts
const { lastSignal } = useSignal('notifications');
const throttledSetRefresh = useMemo(() => throttle(setRefresh, ThrottleDelayMs), [setRefresh]);
useEffect(() => { if (refresh && !loading) { retry(); setRefresh(false); } }, [refresh, setRefresh, retry, loading]);
useEffect(() => { if (lastSignal && lastSignal.action) { throttledSetRefresh(true); } }, [lastSignal, throttledSetRefresh]);
```

### UI components
The notifications plugin mixes `@backstage/ui` (`Flex`, `Text`), `@backstage/core-components` (`Link`, `Table`, `Progress`, `ResponseErrorPanel`, `InfoCard`) and `@remixicon/react` icons. The home plugin cards still use `@material-ui/core` (v4) plus `makeStyles`. Match the package you edit. Strings go through `useTranslationRef(<plugin>TranslationRef)`.

### Test shape, `plugins/notifications/src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx`
```tsx
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
describe('UserNotificationSettingsPanel', () => {
  it('renders each origin only once ...', async () => {
    await renderInTestApp(<NotificationFormatProvider ...><UserNotificationSettingsPanel ... /></NotificationFormatProvider>);
    expect(screen.getAllByText('Origin 1')).toHaveLength(1);
  });
});
```
With API dependencies, wrap the component in `<TestApiProvider apis={[[notificationsApiRef, mockApi]]}>` (see `plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx`). Tests are Jest `describe`/`it` files next to the source. Use `screen.findBy*`, no test IDs and no real network calls (`rejectFrontendNetworkRequests`).

### Config
Frontend extension config uses zod (`import { z } from 'zod/v4'`) through `configSchema` in `makeWithOverrides` (see `plugins/home/src/alpha.tsx`). App config schemas go in the package's `config.d.ts`.

### Data layer
The frontend has none. It calls the backend through `fetchApi` and `discoveryApi` (`discoveryApi.getBaseUrl('notifications')`). The backend `notifications-backend` uses Knex (`DatabaseNotificationsStore.ts`, `migrations/`).

### Framework-owned wiring
- Old system: export the card from `src/index.ts`. The app places `<NotificationsXCard />` inside `CustomHomepageGrid` or `Grid` (`packages/app-legacy/src/components/home/*.tsx`).
- New system: add the widget to the plugin's `extensions` array in `src/alpha.tsx`. It attaches to `page:home`/`widgets` automatically when the home plugin is installed.

## Sample files inspected
- plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx (blueprint)
- plugins/home-react/src/extensions.tsx (old-system card factory)
- plugins/home/src/plugin.ts, plugins/home/src/alpha.tsx (card and widget registration)
- plugins/home/src/homePageComponents/StarredEntities/Content.tsx (card content)
- plugins/search/src/alpha.tsx (widget from a non-home plugin)
- packages/app/src/modules/appModuleHome.tsx (app-level widget module)
- plugins/notifications/src/api/NotificationsApi.ts, src/hooks/useNotificationsApi.ts (API and hook)
- plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx, NotificationsTable/NotificationsTable.tsx, NotificationsSideBarItem/NotificationsSideBarItem.tsx (signals, links)
- plugins/signals-react/src/hooks/useSignal.ts (signal hook)
- plugins/notifications/src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx, plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx (tests)

## Notes for downstream codegen
- Put the license header on every new `.ts`/`.tsx` file, and do not touch the year on existing files.
- Public symbols need TSDoc release tags (`@public` in index exports, `@alpha` in alpha). API Extractor reports (`report*.api.md`) must be regenerated with `yarn build:api-reports`.
- Lazy-load card content (`components: () => import('./...')`) so that `plugin.ts` and `alpha.tsx` stay light.
- For a card in the notifications plugin, add `@backstage/plugin-home-react: workspace:^` to its dependencies.
- Use the `'notifications'` signal channel with `NotificationSignal` types, the `getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })` query, and `core-components` `Link` with `to={payload.link}`.
- Add a changeset (patch, since all relevant packages are below 1.0) under `.changeset/`, and update the README and `docs/notifications/usage.md`.
