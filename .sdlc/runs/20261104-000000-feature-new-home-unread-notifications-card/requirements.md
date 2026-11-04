# Requirements — Unread Notifications Card on the Home Page

- **Run ID:** `20261104-000000-feature-new-home-unread-notifications-card`
- **Mode:** Brownfield
- **Intent:** `feature-new`
- **Target Packages:** `@backstage/plugin-notifications`, `@backstage/plugin-home-react`

---

## In scope

1. **Unread notifications home-page card component (`plugins/notifications`):** Build a new home-page card component in `@backstage/plugin-notifications` that fetches and displays the signed-in user's latest unread notifications (`read: false`, sorted by `created` descending) via `notificationsApiRef`.
2. **Per-item mark-as-read action (`plugins/notifications`):** Provide a control on each notification in the card to mark that notification as read via `notificationsApi.updateNotifications({ ids: [id], read: true })`, removing the item from the unread list upon completion.
3. **Deep-linking and highlight (`plugins/notifications`):** Link each notification item in the card to `/notifications?id=<id>` (via `rootRouteRef`), and update the notifications page/table (`NotificationsPage` / `NotificationsTable`) to read the `id` query parameter and visually highlight the targeted notification.
4. **Live refresh via signals with polling fallback (`plugins/notifications`):** Subscribe to the `'notifications'` channel via `useSignal<NotificationSignal>('notifications')` to refresh the card when a notification signal arrives, and automatically fall back to periodic timer polling when `isSignalsAvailable` is `false`.
5. **Resource cleanup on unmount (`plugins/notifications`):** Clean up signal subscriptions and polling timers (`clearInterval` / `clearTimeout`) when the card component or hook unmounts.
6. **Legacy and New Frontend System widget registration (`plugins/notifications`):** Add `@backstage/plugin-home-react` to `plugins/notifications/package.json` (and `yarn.lock`), export the legacy card extension via `createCardExtension` from `plugins/notifications` (`src/plugin.ts`, `src/index.ts`), register the widget via `HomePageWidgetBlueprint.make` in `plugins/notifications/src/alpha.tsx`, and regenerate `report.api.md` and `report-alpha.api.md`.
7. **Render card extensions without legacy app context (`plugins/home-react`):** Update `CardExtension` in `plugins/home-react/src/extensions.tsx` so card extensions render without requiring a legacy `useApp()` context, and add unit test coverage in `plugins/home-react`.
8. **Unit test suite (`plugins/notifications`, `plugins/home-react`):** Add jsdom unit tests covering card rendering (loading, empty, error, populated states), mark-as-read interaction, deep-link URL and highlight handling, signal-triggered refresh, polling fallback when signals are unavailable, timer/subscription cleanup on unmount, and `CardExtension` rendering without app context.
9. **Documentation, API reports, and changesets:** Update `plugins/notifications/README.md` and `docs/notifications/usage.md`, regenerate API report files (`report.api.md`, `report-alpha.api.md`), and add `.changeset/*.md` files (`patch`) for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`.

---

## Out of scope

1. **Backend changes:** Any modifications to `plugins/notifications-backend`, `plugins/notifications-node`, `plugins/notifications-common`, or `plugins/signals-backend` (no backend changes are permitted).
2. **Unrelated notifications UI changes:** Any changes to `NotificationsSidebarItem` counter behavior or to `NotificationsPage` / `NotificationsTable` beyond `?id=<id>` deep-link highlight handling.
3. **Example application wiring:** Wiring the card into `packages/app` or `packages/app-legacy` (`packages/app/**` and `packages/app-legacy/**` are off-limits).
4. **Pre-existing database test failures:** Fixing the 2 known Postgres 9 and Postgres 11 test failures present at base.
5. **End-to-end or browser integration tests:** Playwright e2e or non-jsdom integration test suites (testing is strictly jsdom unit tests).
6. **Repo configuration and release files:** Modifying ESLint, Prettier, TypeScript configs, `.yarn/**`, `docs/releases/**`, or `.gitignore`.

---

## Functional requirements per module

### Module 1: Notifications home card (`plugins/notifications`)

- **FR-1:** The card component SHALL fetch the signed-in user's unread notifications using `notificationsApiRef.getNotifications` with `{ read: false, sort: 'created', sortOrder: 'desc', limit }` (defaulting to a bounded limit such as `5` or configurable via props).
- **FR-2:** The card component SHALL render appropriate UI states for loading (progress indicator), error (`ResponseErrorPanel`), empty list (localized empty state message when no unread notifications exist), and populated unread notifications list.
- **FR-3:** For each unread notification, the card SHALL display the notification's `payload.title`, severity indicator (`SeverityIcon` / `NotificationIcon`), optional metadata (`payload.description`, `origin`, `payload.topic`, relative `created` timestamp), a deep link to `/notifications?id=<id>`, and a "Mark as read" action button.
- **FR-4:** Activating "Mark as read" on a notification item in the card SHALL invoke `notificationsApi.updateNotifications({ ids: [notification.id], read: true })` and remove that notification from the displayed unread list (or refresh the unread list so it is no longer shown). If the API call fails, the card SHALL report the failure via `toastApiRef`.
- **FR-5:** All user-facing text in the card (title, empty message, action labels/tooltips, error messages) SHALL be defined in `notificationsTranslationRef` (`plugins/notifications/src/translation.ts`) and accessed via `useTranslationRef`.

### Module 2: Notifications page deep-link highlight (`plugins/notifications`)

- **FR-6:** Each notification item rendered in the home card SHALL link to the notifications route (`useRouteRef(rootRouteRef)()`) with query string `?id=<encodeURIComponent(notification.id)>` (i.e., `/notifications?id=<id>`).
- **FR-7:** `NotificationsPage` and `NotificationsTable` SHALL inspect the URL search parameters for `id` (`?id=<id>`). When present, the matching notification row SHALL be visually highlighted (e.g., via a dedicated highlight CSS class / style and/or ensuring the referenced notification is visible in the table).
- **FR-8:** When `/notifications` is rendered without an `id` query parameter, or when `id` does not match other rows, non-matching rows SHALL render without the highlight state.

### Module 3: Live refresh (signals + polling fallback) (`plugins/notifications`)

- **FR-9:** The card (via a dedicated hook or internal effect) SHALL subscribe to `'notifications'` signals using `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react`.
- **FR-10:** When `isSignalsAvailable` is `true` and a new signal (`lastSignal`) is received on the `'notifications'` channel, the card SHALL re-fetch the unread notifications list.
- **FR-11:** When `isSignalsAvailable` is `false`, the card SHALL automatically fall back to periodic polling (using a timer interval, configurable via props/options with a sensible default) to re-fetch unread notifications.
- **FR-12:** When the card component unmounts (or when polling is disabled/superseded by signals), all active polling intervals/timers and signal subscriptions SHALL be cleaned up without memory leaks or state updates on unmounted components.

### Module 4: Widget registration — legacy + new frontend system (`plugins/notifications`)

- **FR-13:** `plugins/notifications/package.json` SHALL declare `@backstage/plugin-home-react` (`workspace:^`) as a dependency, with `yarn.lock` updated accordingly.
- **FR-14:** For the legacy frontend system, `plugins/notifications/src/plugin.ts` SHALL register and export a card extension created with `notificationsPlugin.provide(createCardExtension(...))` (and re-export it and its props type from `plugins/notifications/src/index.ts`).
- **FR-15:** For the new frontend system (NFS), `plugins/notifications/src/alpha.tsx` SHALL define a home-page widget using `HomePageWidgetBlueprint.make(...)` from `@backstage/plugin-home-react/alpha` and include it in the `extensions` array of the default exported `createFrontendPlugin`.

### Module 5: `home-react` card extensions without app context (`plugins/home-react`)

- **FR-16:** `CardExtension` in `plugins/home-react/src/extensions.tsx` SHALL NOT require `useApp()` from `@backstage/core-plugin-api` to obtain `Progress` (or SHALL safely fall back to `Progress` from `@backstage/core-components` when legacy app context is absent), allowing card extensions and `HomePageWidgetBlueprint` widgets to render in environments without a legacy `AppContext`.
- **FR-17:** `plugins/home-react` SHALL include jsdom unit tests verifying that `CardExtension` / `createCardExtension` renders its `Content` (and optional `Actions`/`Settings`/`ContextProvider`/`Renderer`) without a legacy `AppContext` provider.

### Module 6: Docs and changesets (`plugins/notifications`, `docs/notifications`, `.changeset`)

- **FR-18:** `plugins/notifications/README.md` and `docs/notifications/usage.md` SHALL be updated to document how to install and use the unread notifications home-page card in both the new frontend system and the legacy frontend system.
- **FR-19:** `plugins/notifications/report.api.md` and `plugins/notifications/report-alpha.api.md` (and `plugins/home-react/report*.api.md` if public types change) SHALL be updated to match `yarn build:api-reports`.
- **FR-20:** Changeset files (`.changeset/*.md`) with `patch` level bumps SHALL be added for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`.

---

## Non-functional requirements

- **NFR-1 (Type Safety & Compilation):** All new and modified TypeScript code MUST pass `yarn tsc` from the repository root with zero type errors.
- **NFR-2 (Linting & Formatting):** All touched files MUST pass `yarn lint:all` and adhere to Backstage code style and formatting conventions.
- **NFR-3 (License Headers):** Every new source file MUST begin with the standard Backstage Apache 2.0 license header dated `2026`; existing license headers in modified files MUST retain their original copyright year.
- **NFR-4 (Testing Standards):** Unit tests MUST run in Jest (`jsdom`), use React Testing Library `screen` queries and `findBy*` async queries, avoid `data-testid` attributes, make no real network calls (`rejectFrontendNetworkRequests: true`), and clean up fake/real timers properly.
- **NFR-5 (Graceful Degradation):** The unread notifications card MUST function when `@backstage/plugin-signals-react` has no registered `signalApiRef` in the `ApiHolder` by seamlessly switching to polling without throwing an error.
- **NFR-6 (Accessibility & Internationalization):** Interactive controls (such as the mark-as-read button and notification links) MUST have accessible labels/text sourced through `notificationsTranslationRef`.

---

## PII inventory

This feature is frontend-only and introduces no new backend storage, database tables, or external telemetry. It reads existing `Notification` objects returned by `NotificationsApi` for the currently authenticated Backstage user.

| Field | Sensitivity | Protection |
| --- | --- | --- |
| `notification.user` (user entity ref, e.g. `user:default/jane`) | Low (Internal identifier) | Scoped to the signed-in user by `notifications-backend` via Backstage `fetchApi` bearer token; never logged or persisted in browser storage by the card. |
| `notification.id` (UUID) | Low (Opaque identifier) | Passed in URL query parameter (`/notifications?id=<id>`) with `encodeURIComponent`; access-controlled by backend user ownership checks. |
| `notification.payload.title` / `notification.payload.description` | Medium (May contain operational or user-authored alert text) | Rendered via React JSX (automatic HTML escaping against XSS); transmitted only over authenticated `fetchApi` requests; not cached in `localStorage`/`sessionStorage`. |
| `notification.payload.link` | Low (Internal or external URL) | Rendered through Backstage `<Link>` component with standard link handling; card item deep-link always routes to internal `/notifications?id=<id>`. |

---

## Role matrix

All authorization is enforced by the existing `@backstage/plugin-notifications-backend` service using the caller's Backstage identity token injected by `fetchApiRef`.

| Role | Resource | Action | Permission / Behavior |
| --- | --- | --- | --- |
| **Signed-in User** | Own Unread Notifications (`NotificationsApi.getNotifications({ read: false })`) | Read / List in Home Card | Allowed — displays only notifications targeted to the signed-in user or broadcast notifications. |
| **Signed-in User** | Own Unread Notification (`NotificationsApi.updateNotifications({ ids, read: true })`) | Mark as Read from Home Card | Allowed — marks the user's notification as read and removes it from the card's unread list. |
| **Signed-in User** | Highlighted Notification (`/notifications?id=<id>`) | View & Highlight on Notifications Page | Allowed — navigates to `/notifications?id=<id>` and highlights the notification if visible to the user. |
| **Signed-in User** | `'notifications'` Signal Channel (`signalApiRef`) | Subscribe to live events | Allowed when signals plugin is available; falls back to authenticated HTTP polling when unavailable. |
| **Unauthenticated / Guest without identity** | `NotificationsApi` endpoints | Read / Update | Denied by backend (401/403); card renders `ResponseErrorPanel` with the error state. |

---

## Acceptance criteria

- **AC-1:** The home page can render an "Unread notifications" card from `@backstage/plugin-notifications` listing the latest unread notifications (`read: false`) of the signed-in user.
  - *Executable check:* `CI=true yarn test plugins/notifications` verifies the card calls `getNotifications` with `read: false` and renders notification titles and metadata.
- **AC-2:** Each notification item in the card can be marked as read directly from the card, calling `updateNotifications({ ids: [id], read: true })`, and the item leaves the displayed unread list.
  - *Executable check:* `CI=true yarn test plugins/notifications` simulates clicking the mark-as-read action on an item and asserts `updateNotifications` is called with `{ ids: [id], read: true }` and the item is removed from the DOM.
- **AC-3:** Each item in the card links to `/notifications?id=<id>`, and navigating to `/notifications?id=<id>` highlights that notification on the notifications page.
  - *Executable check:* `CI=true yarn test plugins/notifications` asserts card links have `href="/notifications?id=<id>"` and rendering `NotificationsPage` / `NotificationsTable` at `/notifications?id=<id>` applies the highlight state to the matching notification.
- **AC-4:** The card refreshes its unread notification list when a `'notifications'` signal arrives via `useSignal`, and when signals are unavailable (`isSignalsAvailable === false`), it falls back to periodic polling.
  - *Executable check:* `CI=true yarn test plugins/notifications` verifies that emitting a signal on `signalApiRef` triggers a refetch, and rendering without `signalApiRef` triggers periodic refetches when advancing timers.
- **AC-5:** Signal subscriptions and polling timers are cleaned up when the card unmounts.
  - *Executable check:* `CI=true yarn test plugins/notifications` verifies that unmounting the card unsubscribes from `signalApiRef` and clears active polling intervals so no further API calls occur after unmount.
- **AC-6:** The card is registered and exported for both the legacy frontend system (`createCardExtension` via `notificationsPlugin.provide` in `src/plugin.ts` and `src/index.ts`) and the new frontend system (`HomePageWidgetBlueprint.make` in `src/alpha.tsx`).
  - *Executable check:* `CI=true yarn test plugins/notifications` and `yarn build:api-reports` / `yarn tsc` verify both legacy and alpha exports exist and render properly.
- **AC-7:** Card extensions from `@backstage/plugin-home-react` render without requiring a legacy Backstage `AppContext` (`useApp()`).
  - *Executable check:* `CI=true yarn test plugins/home-react` renders a card extension without a legacy `AppContext` wrapper and asserts the card title and content render without error.
- **AC-8:** jsdom unit tests in `plugins/notifications` and `plugins/home-react` cover card rendering, mark-as-read, deep-link highlighting, signal-triggered refresh, polling fallback, unmount cleanup, and app-context-free card rendering.
  - *Executable check:* `CI=true yarn test plugins/notifications plugins/home-react` passes all test suites.
- **AC-9:** TypeScript type-checking (`yarn tsc`) and linting (`yarn lint:all`) pass, API reports (`report.api.md`, `report-alpha.api.md`) are up to date, and changesets (`.changeset/*.md`) and documentation (`plugins/notifications/README.md`, `docs/notifications/usage.md`) are included.
  - *Executable check:* `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all` exits with code 0.

---

## Open questions for HITL

None. All scope boundaries, package placement (`@backstage/plugin-notifications` depending on `@backstage/plugin-home-react`), test commands, and off-limits rules were confirmed at Gate 0.
