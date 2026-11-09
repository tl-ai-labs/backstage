# Stack profile — learned from repo scan

Built for run 20261109-123717-feature-new-home-unread-notifs (2026-11-09). Trigger: the primary stack is React/TypeScript (Backstage), and no pre-authored adapter matches it (shipped: generic, nest, python). Sampling focused on the frontend plugins touched by the current intent: `plugins/notifications`, `plugins/home-react`, `plugins/home`, `plugins/search`.

## Language & runtime
TypeScript in a Yarn 4.8.1 workspaces monorepo (`packages/*`, `plugins/*`), Node 22 || 24. Source is ESM-style TS/TSX, run straight from `src/` (`exports` map points at `./src/index.ts`). There is no build step during development. React 18 (peer `^17 || ^18`), react-router-dom 6.30. Type check with root `yarn tsc` only.

## Framework
Backstage. Two frontend systems live side by side:
- **Legacy** (`@backstage/core-plugin-api`): `createPlugin`, `createRoutableExtension`, `createApiFactory`, `useApi`. Home cards use `createCardExtension` from `@backstage/plugin-home-react`.
- **New frontend system (NFS)** (`@backstage/frontend-plugin-api`): `createFrontendPlugin`, `PageBlueprint`, `ApiBlueprint`, exposed from a package's `./alpha` entry. Home widgets use `HomePageWidgetBlueprint` from `@backstage/plugin-home-react/alpha`.

## Conventions detected

### File naming
- Components: PascalCase folder plus a PascalCase file and an `index.ts` barrel, e.g. `src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx` + `index.ts`. CSS modules sit next to the component (`NotificationsSideBarItem.module.css`).
- Home card modules: `homePageComponents/<Name>/{Content,Actions,Settings,Context}.tsx` + `index.ts` re-exporting the named parts (e.g. `plugins/home/src/homePageComponents/RandomJoke/`).
- Hooks: camelCase `useX.ts` in `src/hooks/` with an `index.ts` barrel.
- Tests are colocated: `X.test.ts(x)` next to the source. `src/setupTests.ts` holds the jest-dom import.
- Every source file opens with the Apache-2.0 header, `Copyright <year> The Backstage Authors`. New files use 2026.

### Handler / controller shape (legacy plugin + extension) — `plugins/notifications/src/plugin.ts`
```ts
/** @public */
export const notificationsPlugin = createPlugin({
  id: 'notifications',
  routes: { root: rootRouteRef },
  apis: [
    createApiFactory({
      api: notificationsApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new NotificationsClient({ discoveryApi, fetchApi }),
    }),
  ],
});
```

### Legacy home card — `plugins/home/src/plugin.ts`
```ts
export const HomePageRandomJoke = homePlugin.provide(
  createCardExtension<{ defaultCategory?: 'any' | 'programming' }>({
    name: 'HomePageRandomJoke',
    title: 'Random Joke',
    components: () => import('./homePageComponents/RandomJoke'),
    description: 'Shows a random joke about optional category',
    layout: { height: { minRows: 4 }, width: { minColumns: 3 } },
    settings: { schema: { /* JSON schema */ } },
  }),
);
```

### NFS home widget — `plugins/search/src/alpha.tsx`
```ts
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
```
The widget then goes in the `extensions: [...]` array of `createFrontendPlugin` (see `plugins/notifications/src/alpha.tsx`, which today has `extensions: [page, api]`).

### Service shape (API ref + client) — `plugins/notifications/src/api/`
`NotificationsApi.ts` declares an interface plus `notificationsApiRef` (`createApiRef`). `NotificationsClient.ts` implements it with `discoveryApi` and `fetchApi`. Components reach it through `useApi(notificationsApiRef)` or the hook `useNotificationsApi(api => api.getStatus())`, which wraps `react-use/esm/useAsyncRetry`.

### Realtime pattern — `NotificationsSideBarItem.tsx`
```ts
const { loading, error, value, retry } = useNotificationsApi(api =>
  api.getStatus(),
);
const [unreadCount, setUnreadCount] = useState(0);
const { lastSignal } = useSignal<NotificationSignal>('notifications');
// effect on lastSignal -> setRefresh(true); effect on refresh -> retry();
// effect on [loading, error, value] -> setUnreadCount(value.unread)
```

### Test shape — `UserNotificationSettingsPanel.test.tsx`
```tsx
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';

describe('UserNotificationSettingsPanel', () => {
  it('renders each origin only once even if present in multiple channels', async () => {
    await renderInTestApp(<NotificationFormatProvider ...><UserNotificationSettingsPanel ... /></NotificationFormatProvider>);
    expect(screen.getAllByText('Origin 1')).toHaveLength(1);
  });
});
```
Jest (via `backstage-cli package test`) with `describe/it`. APIs are mocked with `TestApiProvider apis={[[ref, impl]]}` from `@backstage/test-utils` (see `plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx`). Routes are mocked with the `renderInTestApp(..., { mountedRoutes: { '/path': routeRef } })` option. AGENTS.md prefers `screen` + `findBy*`, fewer thorough tests, and no test IDs. For HTTP mocks, ADR-007 says use msw.

### Config
Frontend plugins read config through `configApiRef`. NFS extensions declare `configSchema` with zod (`z` from `@backstage/frontend-plugin-api`; see `plugins/search/src/alpha.tsx`). There are no env files.

### Data layer
Not applicable for frontend plugins. Data comes from backend REST through `fetchApi` and `discoveryApi`.

### Framework-owned wiring
- Legacy: `plugin.provide(createXExtension(...))`, exported from `src/index.ts` with a `/** @public */` TSDoc tag.
- NFS: blueprint instances are listed in `createFrontendPlugin({ extensions: [...] })` in `src/alpha.tsx`, which is the package's default export, tagged `/** @alpha */`.
- Translations: `createTranslationRef({ id: 'plugin.<id>', messages: {...} })` in `src/translation.ts`, used with `useTranslationRef` (imported from `@backstage/core-plugin-api/alpha` in this package).
- Every public export needs a release tag (`@public`/`@alpha`). API reports (`report.api.md`, `report-alpha.api.md`) are regenerated, never hand-edited.

## Sample files inspected
- plugins/notifications/src/plugin.ts (kind: plugin wiring, legacy)
- plugins/notifications/src/alpha.tsx (kind: plugin wiring, NFS)
- plugins/notifications/src/routes.ts (kind: routing)
- plugins/notifications/src/hooks/useNotificationsApi.ts (kind: service hook)
- plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx (kind: component, signals usage; imports only, the file is 392 lines)
- plugins/notifications/src/translation.ts (kind: i18n)
- plugins/notifications/src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx (kind: test)
- plugins/notifications/src/plugin.test.ts (kind: test)
- plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx (kind: test)
- plugins/home/src/homePageComponents/RandomJoke/Content.tsx (kind: home card content)
- plugins/home/src/plugin.ts (kind: legacy card wiring)
- plugins/search/src/alpha.tsx (kind: NFS widget wiring)
- plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx (kind: blueprint)
- plugins/home-react/src/index.ts, src/alpha.ts (kind: public surface)

## Notes for downstream codegen
- Use named exports only (ADR-003). Write plain function components and avoid `React.FC` (ADR-006).
- In `plugins/notifications` and `plugins/home-react`, `.eslintrc.js` forbids top-level MUI v4 imports. Use `import Typography from '@material-ui/core/Typography'`, never `import { Typography } from '@material-ui/core'`. `plugins/notifications` itself is moving to `@backstage/ui` + `@remixicon/react` and CSS modules. Prefer that over MUI4 in new notifications code.
- Use `react-use/esm/<hook>` deep imports, not `react-use`.
- A new public symbol needs TSDoc with a release tag, a regenerated API report, and a changeset per affected package. Both packages are pre-1.0, so new features take a `patch` bump.
- `plugins/home-react` has no test infrastructure. Tests there need `src/setupTests.ts` (`import '@testing-library/jest-dom';`) and devDeps `@backstage/test-utils`, `@testing-library/react`, `@testing-library/jest-dom`.
