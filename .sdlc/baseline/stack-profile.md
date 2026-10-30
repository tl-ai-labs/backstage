# Stack profile — learned from repo scan

Built 2026-10-30 at HEAD 8b5ba7f431 (run 20261030-142814-feature-new-home-unread-notifications). This was a light sample focused on the frontend plugins in scope: notifications, home, home-react, signals-react.

## Language & runtime

TypeScript ~5.7, React 18, Node 22/24, Yarn 4.8.1 workspaces (`packages/*`, `plugins/*`). Packages are built by `backstage-cli` (`package build/test/lint`). ESM-style imports in source. Each package has `src/index.ts` (public) and often `src/alpha.ts(x)` (new frontend system, `./alpha` export plus `typesVersions`). Every source file starts with an Apache 2.0 header (`Copyright <year> The Backstage Authors`).

## Framework

Backstage, with two frontend systems side by side:

- Old system: `@backstage/core-plugin-api` (`createPlugin`, `createRoutableExtension`, `createReactExtension`, `useApi`, `useApp`, `createRouteRef`).
- New system: `@backstage/frontend-plugin-api` (`createFrontendPlugin`, `PageBlueprint`, `ApiBlueprint`, `createExtensionBlueprint`, `ExtensionBoundary`, `useTranslationRef`, `createTranslationRef`).
  UI: Material UI v4 (`@material-ui/core/<Component>` default imports) in home/home-react. notifications is migrating to `@backstage/ui` (`Flex`, `ButtonIcon`, `Grid`) plus `@remixicon/react` icons and CSS modules (`*.module.css`).

## Conventions detected

### File naming

- Components use PascalCase folders, each with an `index.ts` barrel: `plugins/notifications/src/components/NotificationsSideBarItem/{NotificationsSideBarItem.tsx,index.ts}`.
- Home widgets use one folder per widget with generic file names: `plugins/home/src/homePageComponents/StarredEntities/{Content.tsx,index.ts,Content.test.tsx,StarredEntities.stories.tsx}`, plus optional `Actions.tsx`, `Settings.tsx`, `Context.tsx`.
- Hooks: `src/hooks/useXxx.ts` re-exported from `src/hooks/index.ts`.
- Tests sit next to the code as `*.test.ts(x)`. `src/setupTests.ts` exists per package.

### Handler / controller shape (new-system widget registration — plugins/home/src/alpha.tsx)

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

The blueprint (`plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx`) has kind `home-page-widget`, attaches to `{ id: 'page:home', input: 'widgets' }`, and the resulting extension ID is `home-page-widget:<pluginId>/<name>`. It wraps `CardExtension` in `lazy()` and `<ExtensionBoundary node={node}>`.

New-system plugin shape (`plugins/notifications/src/alpha.tsx`):

```tsx
/** @alpha */
export default createFrontendPlugin({
  pluginId: 'notifications',
  title: 'Notifications',
  icon: <RiNotification3Line />,
  info: { packageJson: () => import('../package.json') },
  routes: { root: rootRouteRef },
  extensions: [page, api],
});
```

### Service shape (API ref + client)

`plugins/notifications/src/api/NotificationsApi.ts` uses `createApiRef<NotificationsApi>({ id: 'plugin.notifications.service' })` with an interface and `/** @public */` option types. `NotificationsClient` takes `{ discoveryApi, fetchApi }`. Components access data through a hook:

```ts
export function useNotificationsApi<T>(
  f: (api: NotificationsApi) => Promise<T>,
  deps: any[] = [],
) {
  const notificationsApi = useApi(notificationsApiRef);
  return useAsyncRetry(async () => await f(notificationsApi), deps);
}
```

Signals subscription (`plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx`):

```tsx
const { lastSignal } = useSignal<NotificationSignal>('notifications');
// useSignal also returns isSignalsAvailable -> use it to decide on a polling fallback
```

### Test shape

Jest with React Testing Library through `@backstage/test-utils`: `renderInTestApp(<TestApiProvider apis={[[apiRef, mock]]}>...</TestApiProvider>, { mountedRoutes: {...} })`. Uses `describe`/`it`, `jest.fn()`, and `mockApis.*`. The project prefers `screen` and `findBy*` over `waitFor`, no test IDs, and fewer, thorough tests. Plugin tests check extensions with `plugin.getExtension('home-page-widget:home/...')` (see `plugins/home/src/alpha.test.ts`). The repo root sets `rejectFrontendNetworkRequests: true`, so APIs must be mocked.

### Config

Frontend packages don't read env vars. Config schemas live in `config.d.ts` (e.g. `plugins/home/config.d.ts`). Widget settings use RJSF schemas through `settings.schema`.

### Data layer

None on the frontend. The REST client (`NotificationsClient`) builds `URLSearchParams` and calls `fetchApi.fetch` on the URL from `discoveryApi.getBaseUrl('notifications')`.

### Framework-owned wiring

- New system: put the extension in the `extensions: [...]` array of `createFrontendPlugin` (or in a `createFrontendModule({ pluginId, extensions })`, see `packages/app/src/modules/appModuleHome.tsx`).
- Old system: `plugin.provide(createCardExtension({...}))` in `plugins/home/src/plugin.ts`.
- Translations: `createTranslationRef({ id: 'plugin.<id>', messages })` in `src/translation.ts`, used with `const { t } = useTranslationRef(ref)`.
- Routes: `createRouteRef({ id })` in `src/routes.ts`. Link with `useRouteRef(rootRouteRef)()`.

## Sample files inspected

- plugins/home-react/src/extensions.tsx (kind: card wrapper; uses `useApp()` for `Progress`)
- plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx (kind: blueprint)
- plugins/home-react/src/alpha.ts, src/index.ts (kind: exports)
- plugins/home/src/alpha.tsx (kind: widget registration)
- plugins/home/src/homePageComponents/StarredEntities/Content.tsx, RandomJoke/Content.tsx (kind: widget content)
- plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx, plugins/home/src/alpha.test.ts (kind: test)
- plugins/notifications/src/alpha.tsx, src/api/NotificationsApi.ts, src/hooks/useNotificationsApi.ts, src/translation.ts, src/routes.ts (kind: plugin/service)
- plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx, NotificationsPage/NotificationsPage.tsx (kind: signals usage)
- plugins/signals-react/src/hooks/useSignal.ts (kind: hook)
- packages/app/src/modules/appModuleHome.tsx (kind: app wiring)

## Notes for downstream codegen

- Match the style of the package being edited. notifications leans toward `@backstage/ui` and remixicon, while home and home-react use MUI v4.
- New files need the Apache header with `Copyright 2026 The Backstage Authors`. Existing headers keep their year.
- Mark public exports with TSDoc release tags (`@public` / `@alpha`). API reports (`report*.api.md`) are generated, so don't hand-edit them.
- Lazy-load widget parts with `components: () => import('./...').then(m => ({ Content: m.Content }))`.
- `CardExtension` currently needs app context through `useApp().getComponents().Progress`. A context-free fallback such as `Progress` from `@backstage/core-components` is the obvious decoupling point.
- Deep links: `NotificationsPage` has no `?id=` handling today.
- Add a changeset for each package (`.changeset/<slug>.md`). For packages below 1.0, new features are `patch`.
