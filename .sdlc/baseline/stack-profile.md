# Stack profile, learned from repo scan

This profile comes from a focused sample (plugins/notifications, plugins/home-react, plugins/home, plugins/search,
packages/app). Backstage packages differ from one another, so match the conventions of the package you edit.

## Language & runtime

TypeScript with React 18 (peer deps allow 17 or 18). Node 22/24 and Yarn 4 workspaces. Source is ESM-style TS that
backstage-cli builds. Packages export `./src/index.ts` (public) and often `./alpha` (new frontend system).
API Extractor release tags (`@public`, `@alpha`) are required on every exported symbol.

## Framework

Backstage has two frontend systems:

- Old: `@backstage/core-plugin-api` (`createPlugin`, `createRoutableExtension`, `createApiFactory`).
- New: `@backstage/frontend-plugin-api` (`createFrontendPlugin`, `PageBlueprint`, `ApiBlueprint` and other `*Blueprint`s).

The UI is built with `@backstage/ui` (Flex, Text, Button ...) plus `@backstage/core-components` (Link, Table,
InfoCard ...), with CSS modules for styling.

## Conventions detected

### File naming

- Components live in a PascalCase folder with a PascalCase file and an `index.ts` barrel, for example
  `src/components/NotificationsTable/NotificationsTable.tsx` with `index.ts`. Styles sit alongside in
  `NotificationsTable.module.css`.
- Hooks are camelCase files under `src/hooks/` with an `index.ts` re-export (`useNotificationsApi.ts`).
- Tests are colocated as `*.test.ts(x)`.
- Every source file starts with the Apache-2.0 header (`Copyright <year> The Backstage Authors`).
- Named exports only (ADR003). Function components without React.FC (ADR006).

### Component / data-fetch shape

```tsx
const { lastSignal } = useSignal('notifications');
const { error, value, retry, loading } = useNotificationsApi<
  [GetNotificationsResponse, NotificationStatus, GetTopicsResponse]
>(
  api =>
    Promise.all([
      api.getNotifications(options),
      api.getStatus(),
      api.getTopics(options),
    ]),
  [
    /* deps */
  ],
);
```

NotificationsPage calls `retry()` in a `useEffect` whenever `lastSignal` changes. That is how live refresh works.

### Link rendering (NotificationsTable.tsx)

```tsx
{
  notification.payload.link ? (
    <Link
      to={notification.payload.link}
      onClick={() => {
        /* mark read if enabled */
      }}
    >
      {notification.payload.title}
    </Link>
  ) : (
    notification.payload.title
  );
}
```

### Home widget, new system (plugins/search/src/alpha.tsx)

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
```

### Home card, old system (plugins/home/src/plugin.ts)

```ts
export const HomePageToolkit = homePlugin.provide(
  createCardExtension<ToolkitContentProps>({
    name: 'HomePageToolkit',
    title: 'Toolkit',
    components: () => import('./homePageComponents/Toolkit'),
  }),
);
```

The `components` module exports `Content` and, optionally, `Actions`, `Settings` and `ContextProvider`.

### Test shape

```tsx
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
describe('UserNotificationSettingsPanel', () => {
  it('renders each origin only once ...', async () => {
    await renderInTestApp(<Component ... />);
    expect(screen.getAllByText('Origin 1')).toHaveLength(1);
  });
});
```

API mocks use `TestApiProvider` / `renderInTestApp` with `apis`. HTTP clients are tested with MSW (ADR007).
Prefer `findBy*` over `waitFor`. Add no test IDs.

### Config

New-system extensions take a zod `configSchema` through `makeWithOverrides` (see the toolkit widget in
`plugins/home/src/alpha.tsx`). The app enables or disables extensions in `app-config.yaml` under
`app.extensions` (`home-page-widget:<pluginId>/<name>`).

### Data layer

On the frontend this is API refs (`createApiRef`) with client classes that use `discoveryApiRef` and `fetchApiRef`.

### Framework-owned wiring

- New system: extensions are listed in `createFrontendPlugin({ extensions: [...] })`, and widgets attach to `page:home`.
- Old system: components are exported via `plugin.provide(createCardExtension(...))` and composed by the app
  in `packages/app-legacy/src/components/home/CustomizableHomePage.tsx`.

## Sample files inspected

- plugins/notifications/src/api/NotificationsApi.ts (api)
- plugins/notifications/src/alpha.tsx, src/plugin.ts (entry/wiring)
- plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx (component)
- plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx (component)
- plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx (component)
- plugins/notifications/src/hooks/useNotificationsApi.ts (hook)
- plugins/notifications/src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx (test)
- plugins/home-react/src/extensions.tsx, src/alpha/blueprints/HomePageWidgetBlueprint.tsx (framework)
- plugins/search/src/alpha.tsx, plugins/home/src/plugin.ts, plugins/home/src/alpha.tsx (widget examples)
- plugins/signals-react/src/hooks/useSignal.ts (live updates)

## Notes for downstream codegen

- Add `@backstage/plugin-home-react: workspace:^` to plugins/notifications dependencies when adding a card or widget.
- Lazy-load card content (`components: () => import(...)`) so the main bundle stays small.
- Reuse NotificationIcon, SeverityIcon and the `payload.link` Link pattern. Reuse translations from `src/translation.ts`.
- Live updates: `useSignal('notifications')` with `retry()` on change. Signals are optional.
- Export new public symbols with TSDoc and release tags. Regenerate `report*.api.md` and add a `patch` changeset.
