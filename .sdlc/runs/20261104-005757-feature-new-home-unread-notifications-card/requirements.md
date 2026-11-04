# Requirements — Home-page Unread Notifications Card

## In scope

1. **`@backstage/plugin-home-react` `CardExtension` fallback**: Update `CardExtension` in `plugins/home-react/src/extensions.tsx` so it falls back to a default progress indicator when rendered outside a Backstage `AppContext` (where `useApp()` would throw), while preserving existing behavior (`app.getComponents().Progress`) when inside an app context, and cover this with unit tests in `plugins/home-react/src/`.
2. **Unread notifications home card component**: Add a new home-page card component in `plugins/notifications/src/` that fetches and displays the signed-in user's latest unread notifications via `notificationsApiRef` (`getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })`), including loading, error, and empty states.
3. **Mark-as-read action on card items**: Provide an interactive mark-as-read action on each unread notification item in the card that invokes `notificationsApi.updateNotifications({ ids: [id], read: true })` and removes or refreshes the item from the unread list.
4. **Live refresh via signals with polling fallback**: Subscribe to the `'notifications'` channel via `useSignal('notifications')` from `@backstage/plugin-signals-react` to refresh the unread list on `new_notification`, `notification_read`, and `notification_unread` signals, and fall back to periodic polling when `isSignalsAvailable === false`, cleaning up subscriptions and timers on unmount.
5. **Deep-linking to `/notifications?id=<id>` and item highlighting**: Link each notification in the home card to `/notifications?id=<id>` resolved via `useRouteRef(rootRouteRef)` (not a hard-coded path), and update `NotificationsPage` (`plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`) and `NotificationsTable` (`plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`) to read the `id` query parameter and visually highlight the matching notification row.
6. **Legacy frontend system card extension export**: Export the card extension created via `notificationsPlugin.provide(createCardExtension(...))` from `plugins/notifications/src/plugin.ts` and re-export it from `plugins/notifications/src/index.ts`.
7. **New frontend system widget registration**: Register a `HomePageWidgetBlueprint.make(...)` widget extension in `plugins/notifications/src/alpha.tsx` and include it in the `extensions` array of the default `createFrontendPlugin` export.
8. **Translations**: Add translation keys and default English messages for the home card (title, empty state, mark-as-read action, etc.) to `notificationsTranslationRef` in `plugins/notifications/src/translation.ts`.
9. **Package dependency**: Add `@backstage/plugin-home-react` (`workspace:^`) to `dependencies` in `plugins/notifications/package.json` (and update `yarn.lock` if needed by workspace resolution).
10. **API reports, changesets, and documentation**: Regenerate `report.api.md`, `report-alpha.api.md`, and `knip-report.md` for `plugins/notifications` and `plugins/home-react`; add `patch` changeset files in `.changeset/*.md` for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`; and document the new card and widget in `plugins/notifications/README.md`, `docs/notifications/usage.md`, and `docs/notifications/usage--old.md`.

## Out of scope

1. Any changes to backend, common, or node notification packages (`plugins/notifications-backend/**`, `plugins/notifications-common/**`, `plugins/notifications-node/**`), database stores, REST endpoints, or signal payload definitions.
2. Any changes to `plugins/signals*/**` or `plugins/home/**`.
3. Wiring or registering the new card in example applications (`packages/app/**`, `packages/app-legacy/**`).
4. Any changes to `NotificationsSideBarItem` or to `NotificationsPage` / `NotificationsTable` beyond `?id=<id>` query parameter highlighting.
5. End-to-end (Playwright) or browser-level tests (verification is via jsdom Jest unit tests only).
6. Editing `docs/releases/**`, ESLint/Prettier/TypeScript configuration files, `.gitignore`, `.claude/**`, `.cursor/**`, `AGENTS.md`, or `.github/copilot-instructions.md`.
7. Fixing the pre-existing `DatabaseNotificationsStore` test failures on Postgres 9 and 11.

## Functional requirements per module

### Module 1: `plugins/home-react` — `CardExtension` fallback

- **FR-1**: `CardExtension` in `plugins/home-react/src/extensions.tsx` must obtain the `Progress` component for its `<Suspense>` fallback without throwing when rendered outside a Backstage `AppContext` (e.g., in isolated unit tests). When an `AppContext` is available, `CardExtension` must continue using `app.getComponents().Progress`; when no `AppContext` is present, it must fall back to a default progress indicator (such as `Progress` from `@backstage/core-components`).
- **FR-2**: Unit tests in `plugins/home-react/src/` must verify that a card created with `createCardExtension` or rendered via `CardExtension` renders without throwing when no `AppContext` is provided.

### Module 2: `plugins/notifications` — Home card component

- **FR-3**: A new home card component under `plugins/notifications/src/components/` must query unread notifications for the signed-in user by calling `notificationsApi.getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })` via `notificationsApiRef` (or `useNotificationsApi`), where `limit` defaults to a sensible bound (e.g., 5 or configurable via props).
- **FR-4**: The card component must render each unread notification's title (`notification.payload.title`) and relevant metadata (such as description, topic/origin, severity icon, or relative creation timestamp), an empty state message when no unread notifications exist, a loading indicator while initial data is being fetched, and an error state (`ResponseErrorPanel` or equivalent) when fetching fails.

### Module 3: `plugins/notifications` — Live refresh via signals and polling fallback

- **FR-5**: The home card component must subscribe to the `'notifications'` signal channel using `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react` and trigger a refresh of the unread notifications list when `lastSignal` arrives with action `'new_notification'`, `'notification_read'`, or `'notification_unread'`.
- **FR-6**: When `isSignalsAvailable` from `useSignal('notifications')` is `false`, the home card component must fall back to periodic polling (via a timer/interval) to refresh the unread notifications list, and must not poll when `isSignalsAvailable` is `true`.

### Module 4: `plugins/notifications` — Mark-as-read

- **FR-7**: Each notification item rendered in the home card must expose a mark-as-read action button/control. Activating mark-as-read for a notification with `id` must call `notificationsApi.updateNotifications({ ids: [notification.id], read: true })` and remove the notification from the displayed unread list (or refresh the unread list so the item is no longer shown).

### Module 5: `plugins/notifications` — Deep link `/notifications?id=<id>` and highlighting on `NotificationsPage` / `NotificationsTable`

- **FR-8**: Each notification item in the home card must link to `${notificationsRootRoute()}?id=${encodeURIComponent(notification.id)}` using `useRouteRef(rootRouteRef)` from `plugins/notifications/src/routes.ts` (never a hard-coded `/notifications` string).
- **FR-9**: `NotificationsPage` (`plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`) and `NotificationsTable` (`plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`) must support reading the `id` query parameter from the current URL (e.g., `/notifications?id=<id>`) and passing or applying it so that the matching notification row in `NotificationsTable` is visually highlighted (distinguishable via CSS class, style, or ARIA/data attribute).

### Module 6: `plugins/notifications` — Legacy `createCardExtension` export

- **FR-10**: `plugins/notifications/src/plugin.ts` must create and export the legacy home page unread notifications card extension using `notificationsPlugin.provide(createCardExtension({ ... }))` from `@backstage/plugin-home-react`, and `plugins/notifications/src/index.ts` (and `plugins/notifications/src/components/index.ts` if applicable) must export the card extension and its public props type.

### Module 7: `plugins/notifications` — New-frontend-system `HomePageWidgetBlueprint` widget in `src/alpha.tsx`

- **FR-11**: `plugins/notifications/src/alpha.tsx` must define a home page widget extension using `HomePageWidgetBlueprint.make({ ... })` imported from `@backstage/plugin-home-react/alpha` and register it in the `extensions` array of the default `createFrontendPlugin` export for `pluginId: 'notifications'`.

### Module 8: `plugins/notifications` — Translations

- **FR-12**: `notificationsTranslationRef` in `plugins/notifications/src/translation.ts` must include translation messages for all user-facing strings introduced by the unread notifications home card (such as card title, empty state message, and mark-as-read label/tooltip), and the home card component must consume them via `useTranslationRef(notificationsTranslationRef)`.

### Module 9: `plugins/notifications` — `package.json` dependency on `@backstage/plugin-home-react`

- **FR-13**: `plugins/notifications/package.json` must declare `"@backstage/plugin-home-react": "workspace:^"` in `dependencies`.

### Module 10: API reports, changesets, README, and documentation updates

- **FR-14**: Public and alpha API reports and knip reports (`plugins/notifications/report.api.md`, `plugins/notifications/report-alpha.api.md`, `plugins/notifications/knip-report.md`, `plugins/home-react/report.api.md`, `plugins/home-react/report-alpha.api.md`, `plugins/home-react/knip-report.md`) must be updated via `yarn build:api-reports` (and `yarn build:knip-reports` if needed) to match the exported TypeScript surface and dependencies.
- **FR-15**: One or more changeset files under `.changeset/*.md` must record `patch` version bumps for `@backstage/plugin-notifications` and `@backstage/plugin-home-react` with a concise summary of the changes.
- **FR-16**: `plugins/notifications/README.md`, `docs/notifications/usage.md` (new frontend system), and `docs/notifications/usage--old.md` (legacy frontend system) must be updated to document how to add and use the unread notifications home page card/widget.

## Non-functional requirements

- **NFR-1 (License header)**: Every newly created `.ts` or `.tsx` source file must begin with the standard Backstage Apache-2.0 license header dated `2026` (`Copyright 2026 The Backstage Authors`).
- **NFR-2 (Package style consistency)**: Code in `plugins/notifications` and `plugins/home-react` must match each package's existing styling, component conventions, hook usage (`useTranslationRef`, `useNotificationsApi` / `useApi`), and TypeScript annotations (`@public` / `@alpha` JSDoc tags).
- **NFR-3 (No backend changes)**: All functionality must use existing client methods (`getNotifications`, `updateNotifications`) and existing signal channels (`'notifications'`); no changes may be made to `plugins/notifications-backend`, `plugins/notifications-common`, `plugins/notifications-node`, or `plugins/signals*`.
- **NFR-4 (No test IDs)**: Component implementations and unit tests must not introduce `data-testid` attributes or query via `getByTestId` / `findByTestId` / `queryByTestId`.
- **NFR-5 (RTL query conventions)**: Unit tests must use React Testing Library's `screen` object and asynchronous `findBy*` queries (preferring `findByRole`, `findByText`, `findByLabelText` over `waitFor`), using `renderInTestApp` and `TestApiProvider` from `@backstage/test-utils`.
- **NFR-6 (Resource cleanup on unmount)**: All signal subscriptions, throttled callbacks, and polling intervals/timers created by the card or page components must be properly cleaned up (`clearInterval` / `.cancel()`) when the component unmounts to prevent memory leaks and state updates on unmounted components.

## PII inventory

| Field | Sensitivity | Protection |
| --- | --- | --- |
| `Notification.user` (user entity ref, e.g., `user:default/jane`) | Low (Internal identifier) | Scoped to the authenticated user by the notifications backend via `fetchApiRef` bearer token; never logged or persisted in browser storage by the card. |
| `Notification.payload.title` / `Notification.payload.description` | Low–Medium (May contain operational or entity context) | Rendered in-memory in React DOM only for the authenticated recipient; transmitted over authenticated `fetchApiRef` and `signalApiRef` channels. |
| `Notification.id` (UUID in `/notifications?id=<id>`) | Low (Opaque resource identifier) | Opaque UUID; access to the underlying notification record on `/notifications` requires user authentication enforced by the backend API. |

## Role matrix

| Role | Resource | Action | Permission / Access Rule |
| --- | --- | --- | --- |
| Signed-in Backstage User | Own unread notifications (`notificationsApi.getNotifications({ read: false })`) | Read / List in Home Card | Allowed (scoped to the authenticated user + broadcast notifications by the backend). |
| Signed-in Backstage User | Own unread notification (`notificationsApi.updateNotifications({ ids, read: true })`) | Mark as read from Home Card | Allowed for notifications belonging to the authenticated user. |
| Signed-in Backstage User | Notification deep link (`/notifications?id=<id>`) | Navigate & view highlighted item on `NotificationsPage` | Allowed for notifications visible to the authenticated user. |
| Unauthenticated / Guest User | Home Card (`notificationsApiRef`) | Read / Mark as read | Denied or renders error state via `ResponseErrorPanel` when backend rejects unauthenticated requests. |

## Acceptance criteria

- **AC-1**: `CardExtension` in `plugins/home-react/src/extensions.tsx` renders with a default progress fallback when outside a Backstage `AppContext` (without throwing from `useApp()`), and a unit test in `plugins/home-react` verifies this behavior.
- **AC-2**: Unit tests in `plugins/notifications` (using Jest, React Testing Library, `screen` / `findBy*`, and no test IDs) verify that the home card fetches unread notifications with `getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })` and renders the items as well as the empty state when no unread notifications exist.
- **AC-3**: Unit tests in `plugins/notifications` verify that clicking the mark-as-read action on a card item calls `updateNotifications({ ids: [id], read: true })` and removes the item from the rendered unread list.
- **AC-4**: Unit tests in `plugins/notifications` verify that emitting a signal on the `'notifications'` channel (`new_notification`, `notification_read`, or `notification_unread`) triggers a refresh of the card's unread notifications list.
- **AC-5**: Unit tests in `plugins/notifications` verify that when `isSignalsAvailable` is `false`, the card falls back to periodic polling to refresh unread notifications, and cleans up polling timers and signal/throttled subscriptions on unmount.
- **AC-6**: Each item in the home card links to `/notifications?id=<id>` resolved via `rootRouteRef`, and navigating to `/notifications?id=<id>` highlights the matching notification row in `NotificationsPage` / `NotificationsTable`, verified by unit tests.
- **AC-7**: The card is exported as a legacy card extension via `createCardExtension` from `@backstage/plugin-notifications` and registered as a `HomePageWidgetBlueprint` widget in `@backstage/plugin-notifications/alpha`.
- **AC-8**: All newly created source files carry the 2026 Apache-2.0 license header (`Copyright 2026 The Backstage Authors`).
- **AC-9**: API reports (`report.api.md`, `report-alpha.api.md`, `knip-report.md`), `.changeset/*.md` patch files for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`, `plugins/notifications/README.md`, `docs/notifications/usage.md`, and `docs/notifications/usage--old.md` are updated and consistent.
- **AC-10**: The run's test, typecheck, and lint command passes word for word with zero errors:
  `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`

## Open questions for HITL

None. All requirements, deep-link format (`/notifications?id=<id>`), live refresh and polling fallback behavior, frontend system registrations, and run constraints were confirmed in the intent brief and Gate 0.
