# Requirements — Unread Notifications Home Page Card

- **Run ID:** `20261104-093718-feature-new-home-unread-notifs`
- **Mode:** `brownfield`
- **Intent:** `feature-new`

---

## In scope

1. **Unread notifications card component (`plugins/notifications/src/components/UnreadNotificationsCard/**`)**: Build a new home page card component that fetches the signed-in user's latest unread notifications via `NotificationsApi` (`read: false`, sorted by newest with a bounded limit), renders each unread item with a deep link to `/notifications?id=<id>`, provides a per-item mark-as-read action via `updateNotifications({ ids: [id], read: true })`, refreshes live when a signal arrives on the `notifications` channel via `useSignal('notifications')`, falls back to periodic polling when `isSignalsAvailable` is `false`, and cleans up all subscriptions and timers on unmount.
2. **New frontend system home page widget registration (`plugins/notifications/src/alpha.tsx`, `plugins/notifications/package.json`)**: Add `@backstage/plugin-home-react` as a dependency of `@backstage/plugin-notifications` and register the unread notifications card as a `HomePageWidgetBlueprint` extension on the `notifications` frontend plugin in `plugins/notifications/src/alpha.tsx`.
3. **Internationalization strings (`plugins/notifications/src/translation.ts`)**: Add user-facing translation strings for the unread notifications card to `notificationsTranslationRef` in `plugins/notifications/src/translation.ts`.
4. **Notification deep-link handling and row highlighting (`plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`, `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`, `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css`)**: Read the `?id=<notificationId>` query parameter in `NotificationsPage.tsx`, ensure the targeted notification is visible and passed to `NotificationsTable.tsx`, and apply a distinct highlighted-row style from `NotificationsTable.module.css` to the matching notification row.
5. **App-context-independent card rendering (`plugins/home-react/src/extensions.tsx`, `plugins/home-react/package.json`)**: Update `CardExtension` in `plugins/home-react/src/extensions.tsx` so card extensions and widgets render their `Suspense` fallback without requiring a Backstage `AppContext` (i.e., without an unconditional `useApp()` call that throws when app context is absent), and add the test `devDependencies` needed to run jsdom unit tests in `plugins/home-react`.
6. **jsdom unit tests (`plugins/notifications/src/components/UnreadNotificationsCard/*.test.tsx`, `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx`, `plugins/home-react/src/extensions.test.tsx`)**: Add unit tests covering unread card rendering, mark-as-read action, signal-triggered refresh, polling fallback when signals are unavailable, subscription/timer cleanup on unmount, `?id=` row highlighting on `NotificationsPage`, and rendering a `home-react` card extension without an app context.
7. **Documentation, API reports, and changesets (`plugins/notifications/README.md`, `docs/notifications/usage.md`, `plugins/notifications/report*.api.md`, `plugins/home-react/report*.api.md`, `.changeset/notifications-unread-home-card.md`, `.changeset/home-react-card-without-app-context.md`, `yarn.lock`)**: Document the new home page widget and `?id=` deep link, regenerate API reports for changed packages, update `yarn.lock` for workspace dependency changes, and provide hand-written `patch` changesets for both packages.

---

## Out of scope

1. **No backend, storage, or REST endpoint changes**: Do not modify `plugins/notifications-backend/**`, `plugins/notifications-node/**`, or `plugins/notifications-common/**`, and do not introduce any new database migrations or HTTP endpoints.
2. **No card for the legacy frontend system**: Do not add a `createCardExtension` export for the old frontend system (`packages/app-legacy`, `plugins/notifications/src/plugin.ts`, or `plugins/notifications/src/index.ts`).
3. **No changes to the example app's home page layout**: Do not modify `app-config.yaml`, `packages/app/**`, or `packages/app-legacy/**`.
4. **No changes to sibling home or signals packages**: Do not modify `@backstage/plugin-home` (`plugins/home/**`), `@backstage/plugin-signals` (`plugins/signals/**`), `@backstage/plugin-signals-react` (`plugins/signals-react/**`), `@backstage/plugin-signals-node` (`plugins/signals-node/**`), or `@backstage/plugin-signals-backend` (`plugins/signals-backend/**`).
5. **No edits to off-limits repository paths**: Do not modify AI/agent configuration (`.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`), release notes (`docs/releases/**`), vendored Yarn files (`.yarn/releases/**`, `.yarn/patches/**`), or environment/credential files.

---

## Functional requirements per module

### Module 1: `plugins/notifications` (`@backstage/plugin-notifications`)

- **FR-1 (Unread Notifications Fetching & Card Rendering)**:
  - Create `plugins/notifications/src/components/UnreadNotificationsCard/` containing the card component and its barrel `index.ts`.
  - Fetch unread notifications for the signed-in user via `NotificationsApi.getNotifications` with `read: false`, ordered newest first, and a bounded item limit (configurable via component/widget props with a sensible default).
  - Render loading and error states using Backstage's standard feedback components (`Progress` / `ResponseErrorPanel` or `@backstage/ui` equivalents) and an empty state message when there are no unread notifications.
  - For each unread notification displayed in the card, render its title (and relevant metadata such as severity, origin/topic, or relative timestamp), linking the item to the notifications page with the query parameter `?id=<notification.id>` resolved via `useRouteRef(rootRouteRef)`.

- **FR-2 (Mark-as-Read Action)**:
  - Each unread notification item rendered in `UnreadNotificationsCard` must provide an accessible mark-as-read control.
  - Invoking mark-as-read for an item must call `notificationsApi.updateNotifications({ ids: [notification.id], read: true })` and refresh/update the displayed unread notifications list so the item is removed or reflected as read.
  - If marking a notification as read fails, report the error to the user via `toastApiRef` (matching the pattern in `NotificationsSidebarItem` and `NotificationsTable`).

- **FR-3 (Live Refresh via Signals and Polling Fallback)**:
  - `UnreadNotificationsCard` must subscribe to the `'notifications'` channel using `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react`.
  - When `lastSignal` emits a notification event (e.g., `new_notification`, `notification_read`, `notification_unread`), the card must re-fetch the unread notifications list.
  - When `isSignalsAvailable` returned by `useSignal` is `false`, `UnreadNotificationsCard` must start a periodic polling timer (`setInterval`) to re-fetch unread notifications at a regular interval.
  - When `isSignalsAvailable` is `true`, the polling timer must not run.
  - On component unmount (or when dependencies change), any active polling timer (`clearInterval`) and throttled/pending callbacks or signal subscriptions must be cleaned up so no timers or state updates fire after unmount.

- **FR-4 (New Frontend System Home Page Widget Registration)**:
  - Add `"@backstage/plugin-home-react": "workspace:^"` to `dependencies` in `plugins/notifications/package.json`.
  - In `plugins/notifications/src/alpha.tsx`, register the unread notifications card using `HomePageWidgetBlueprint.make` (from `@backstage/plugin-home-react/alpha`) and include the resulting widget extension in the `extensions` array of the `notifications` `createFrontendPlugin` definition.

- **FR-5 (Translation Keys)**:
  - Add all user-facing strings introduced for `UnreadNotificationsCard` (such as card title, empty state text, mark-as-read button label/tooltip, view-all link, and error messages) to `notificationsTranslationRef` in `plugins/notifications/src/translation.ts`.

- **FR-6 (`?id=` Deep-Link Handling on `NotificationsPage` and Row Highlighting in `NotificationsTable`)**:
  - In `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`, read the `id` query parameter from the current URL (`useSearchParams` from `react-router-dom`) and pass the highlighted notification ID (and ensure the notification is loaded/visible if needed) down to `NotificationsTable`.
  - In `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`, accept the highlighted notification ID prop (optional, backward-compatible in `NotificationsTableProps`) and mark/style the matching row when rendering.
  - In `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css`, define the CSS rule for the highlighted notification row using Backstage theme/UI tokens so the deep-linked notification stands out visually.

### Module 2: `plugins/home-react` (`@backstage/plugin-home-react`)

- **FR-7 (Render Card Extensions Without App Context)**:
  - Update `CardExtension` in `plugins/home-react/src/extensions.tsx` so that its `Suspense` fallback does not unconditionally call `useApp()` from `@backstage/core-plugin-api` and throw when no Backstage `AppContext` is present (for example, by using `Progress` from `@backstage/core-components` directly or falling back gracefully when app context is absent).
  - Add required test `devDependencies` (such as `@backstage/test-utils`, `@testing-library/react`, `@testing-library/jest-dom`) to `plugins/home-react/package.json` and add `plugins/home-react/src/extensions.test.tsx` verifying that a card extension renders without an `AppContext`.

---

## Non-functional requirements

- **NFR-1 (License Headers)**: Every new source file (`.ts`, `.tsx`, `.css`) must begin with the standard Backstage Apache 2.0 license header with copyright year `2026`. Existing files must keep their original copyright year unchanged.
- **NFR-2 (Code & Package Style Consistency)**: Match each package's existing conventions:
  - In `plugins/notifications`, use `@backstage/ui` / `@backstage/core-components`, `@remixicon/react`, CSS Modules (`*.module.css`), and `useTranslationRef(notificationsTranslationRef)`.
  - In `plugins/home-react`, preserve existing public type signatures and component behavior while removing the hard requirement on `AppContext`.
- **NFR-3 (Testing Conventions)**:
  - Write focused, thorough jsdom unit tests.
  - Use `screen` and `findBy*` queries from `@testing-library/react` for asynchronous assertions instead of `waitFor` where possible.
  - Do **not** add `data-testid` attributes to implementation code; query elements by accessible roles, labels, text, or semantic selectors.
- **NFR-4 (Changesets)**:
  - Create two hand-written changeset files in `.changeset/`:
    - `.changeset/notifications-unread-home-card.md` for `@backstage/plugin-notifications: patch`
    - `.changeset/home-react-card-without-app-context.md` for `@backstage/plugin-home-react: patch`
  - Write changeset descriptions for Backstage adopters in clear English with **no internal symbol names** (no unexported function/variable/file names).
- **NFR-5 (Documentation)**:
  - Update `plugins/notifications/README.md` to document the unread notifications home page card and `?id=` deep-link behavior.
  - Update `docs/notifications/usage.md` to document adding the unread notifications widget to the home page in the new frontend system.
  - Follow `docs/contribute/doc-style-guide.md` (U.S. English, sentence-case headings, active voice, present tense, code formatting for package names/files/config keys, no Latin abbreviations like "e.g."/"i.e.", and avoiding words like "new", "currently", "just", "simply", or "easily").
- **NFR-6 (API Report Regeneration)**:
  - Regenerate API reports using the exact repository procedure:
    1. Run `yarn tsc:full`
    2. Run `yarn build:api-reports:only plugins/notifications plugins/home-react`
    3. Verify with `yarn build:api-reports:only --ci plugins/notifications plugins/home-react` (must exit `0`).
  - Do **not** pass `--tsc` together with package paths to `build:api-reports:only`, as doing so reorders translation keys and fails CI.
- **NFR-7 (Forbidden Commands)**:
  - Never run `yarn build`, `yarn changesets version`, or `yarn release`.

---

## PII inventory

This feature operates entirely on existing notification payloads returned by `NotificationsApi` in the browser and introduces no new persistence or PII fields.

| Field | Sensitivity | Protection |
|---|---|---|
| `notification.user` (recipient user entity ref, e.g. `user:default/jane`) | Low (Internal user identifier) | Scoped to the authenticated user session by the backend via `FetchApi` bearer token; never logged or persisted in browser storage by the card. |
| `notification.payload.title` / `notification.payload.description` | Low–Medium (May contain operational context, entity names, or user references) | Rendered as React text nodes (escaped against XSS by React) only to the authenticated recipient; fetched over authenticated `FetchApi`. |
| `notification.id` (UUID in `/notifications?id=<id>`) | Low (Opaque resource identifier) | Validated and authorized by `notifications-backend` per signed-in user; query parameter is only used to match and highlight the user's own notification row. |

---

## Role matrix

All authorization is enforced by `@backstage/plugin-notifications-backend` via Backstage's `FetchApi` and `SignalApi` authentication contexts.

| Role | Resource | Action | Permission / Behavior |
|---|---|---|---|
| **Authenticated User** | Own unread notifications (`UnreadNotificationsCard`) | Read (`getNotifications({ read: false })`) | Allowed — displays only unread notifications addressed to the user or broadcast notifications. |
| **Authenticated User** | Own unread notification (`UnreadNotificationsCard`) | Mark as read (`updateNotifications({ ids, read: true })`) | Allowed — updates read status for the user's own notification(s). |
| **Authenticated User** | Notification signal channel (`notifications`) | Subscribe (`useSignal('notifications')`) | Allowed — receives real-time signal events scoped to the user or broadcast; falls back to authenticated polling when signals are unavailable. |
| **Authenticated User** | Deep-linked notification (`/notifications?id=<id>`) | View & highlight row (`NotificationsPage` / `NotificationsTable`) | Allowed — highlights the row if it belongs to the signed-in user; cannot access another user's private notification. |
| **Unauthenticated User** | `UnreadNotificationsCard` / `NotificationsPage` | Read / Update | Denied by `NotificationsApi` / backend authentication; UI renders standard error state without leaking data. |

---

## Acceptance criteria

- **AC-1 (Card Rendering & Deep Links)**: A jsdom unit test in `plugins/notifications/src/components/UnreadNotificationsCard/` verifies that `UnreadNotificationsCard` fetches unread notifications (`read: false`), renders the unread notification titles, and renders each item with a link pointing to `/notifications?id=<notification.id>` (and renders the empty state when no unread notifications exist).
- **AC-2 (Mark-as-Read Interaction)**: A jsdom unit test in `plugins/notifications/src/components/UnreadNotificationsCard/` verifies that activating the mark-as-read button on an unread notification calls `notificationsApi.updateNotifications({ ids: [id], read: true })` and updates the rendered card list.
- **AC-3 (Signal-Triggered Live Refresh)**: A jsdom unit test in `plugins/notifications/src/components/UnreadNotificationsCard/` verifies that when `useSignal('notifications')` reports `isSignalsAvailable: true` and emits a new `lastSignal`, the card re-fetches unread notifications and renders the updated items without starting a polling interval.
- **AC-4 (Polling Fallback When Signals Are Unavailable)**: A jsdom unit test in `plugins/notifications/src/components/UnreadNotificationsCard/` using fake timers verifies that when `useSignal('notifications')` reports `isSignalsAvailable: false`, the card polls `getNotifications` on the configured timer interval and updates the rendered items.
- **AC-5 (Subscription and Timer Cleanup on Unmount)**: A jsdom unit test verifies that unmounting `UnreadNotificationsCard` cleans up the polling interval timer (no further `getNotifications` calls when advancing timers after unmount) and that signal subscription cleanup runs on unmount.
- **AC-6 (`?id=` Deep-Link Row Highlighting on `NotificationsPage`)**: A jsdom unit test in `plugins/notifications/src/components/NotificationsPage/NotificationsPage.test.tsx` renders `NotificationsPage` at `/notifications?id=<id>` and verifies that the row corresponding to `<id>` in `NotificationsTable` receives the highlighted row styling.
- **AC-7 (`home-react` Card Extension Renders Without App Context)**: A jsdom unit test in `plugins/home-react/src/extensions.test.tsx` renders a card extension created with `createCardExtension` / `CardExtension` using `@testing-library/react` `render` without a Backstage `AppContext` wrapper and verifies that the card title and content render without throwing an app-context error.
- **AC-8 (API Reports Up to Date)**: Running `yarn tsc:full && yarn build:api-reports:only plugins/notifications plugins/home-react && yarn build:api-reports:only --ci plugins/notifications plugins/home-react` exits `0` with no API report drift or translation key reordering.
- **AC-9 (Gate 0 Verification Command Passes)**: Running `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all` exits `0` with all unit tests, TypeScript type checks, and lint checks passing.

---

## Open questions for HITL

1. **Default maximum number of unread items in the card**: Should `UnreadNotificationsCard` default to showing up to **5** unread notifications (matching `NotificationsPage`'s default `pageSize = 5`) or another default limit (e.g., 10), and should this limit be configurable via widget/component props?
2. **Polling fallback interval duration**: When `isSignalsAvailable` is `false`, what default polling interval should `UnreadNotificationsCard` use (for example, `30_000` ms / 30 seconds or `60_000` ms / 60 seconds)?
3. **Empty state presentation**: When the user has zero unread notifications, what exact message should the card display (for example, `"No unread notifications"`), and should it still show a link to `/notifications` to view read/saved notifications?
4. **Deep-link target not on initial page/filter**: When navigating to `/notifications?id=<id>`, if the notification has already been marked as read or does not appear in the first page of default filters, should `NotificationsPage` only highlight the row when present in the loaded table or also fetch the targeted notification via `getNotification(id)` / relax the `unreadOnly` filter so the deep-linked item is guaranteed to be visible?
