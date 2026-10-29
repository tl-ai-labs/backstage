# Requirements: Unread notifications home-page card (feature-new)

Run: `20261029-120000-feature-new-notifications-home-card` · Intent: `feature-new` · Policy: `opus55-plus-sonnet55` (estimated)

Source: `intent_brief.md` (Gate 0 approved 2026-10-29) and `discovery.md`.

## In scope

1. A new "Unread notifications" home card component in `@backstage/plugin-notifications` (`plugins/notifications/src/components/UnreadNotificationsCard/`), with tests beside it.
2. Live refresh of the card through the `notifications` signal, with interval polling as the fallback when signals are unavailable.
3. Deep-link handling on the existing notifications page: `?id=<id>` highlights the matching notification and makes sure it is shown.
4. Registration of the card in the old frontend system (`createCardExtension`, exported from the package's public entry) and in the new frontend system (`HomePageWidgetBlueprint` widget in `src/alpha.tsx`).
5. A small robustness change in `@backstage/plugin-home-react`: `CardExtension` renders without app context and falls back to a default progress indicator.
6. Translation strings for every new user-visible string, in `plugins/notifications/src/translation.ts`.
7. The workspace dependency `@backstage/plugin-home-react: workspace:^` in `plugins/notifications/package.json` and the matching `yarn.lock` update.
8. Documentation: `plugins/notifications/README.md` and a home-card section in `docs/notifications/usage.md`.
9. Hand-written changesets (patch) for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`, and API reports regenerated with `yarn build:api-reports`.

## Out of scope

1. Any backend, database, REST API or common type change (`plugins/notifications-backend/**`, `plugins/notifications-common/**`, `plugins/notifications-node/**`, `plugins/signals*/**`). No new signal types.
2. Wiring the card into the example apps (`packages/app/**`, `packages/app-legacy/**`).
3. Integration or e2e tests. Tests are jsdom unit tests only.
4. Any redesign of the notifications page beyond `?id=` highlighting.
5. Hand edits to `report*.api.md` files, `.env*` files, ESLint, Prettier or TypeScript configuration, `docs/releases/**`, and `.gitignore` (declined at Gate 0).
6. Running `yarn build`, `yarn changesets version` or `yarn release`.

## Functional requirements

### Module: UnreadNotificationsCard (`plugins/notifications/src/components/UnreadNotificationsCard/`)

- **FR-1** The card fetches the signed-in user's unread notifications through `notificationsApiRef` with `getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })`, so the list is newest first and bounded. `limit` has a default (5) and can be overridden through a card prop.
- **FR-2** Each list item shows the notification's title, its severity or topic icon (reusing the existing `NotificationIcon` / `SeverityIcon` where they fit), and its relative creation time.
- **FR-3** Each item's title links to `/notifications?id=<id>`, built from the notifications plugin's route (`rootRouteRef` via `useRouteRef`) rather than a hard-coded root, with the id URL-encoded. When the route cannot be resolved (for example, in a test or an app without the page) the card still renders and falls back to `/notifications?id=<id>`.
- **FR-4** Each item has a mark-as-read action (an icon button with an accessible label) that calls `updateNotifications({ ids: [id], read: true })` and removes the item from the list. If the call fails, the item stays and an error is surfaced through the app's alert mechanism or inline.
- **FR-5** When there are no unread notifications, the card shows an empty-state message.
- **FR-6** When fetching fails, the card shows an error state (the existing `ResponseErrorPanel` or an equivalent inline message) and does not crash.
- **FR-7** While the first fetch is pending, the card shows a progress indicator.
- **FR-8** The card offers a link to the full notifications page (for example "View all").

### Module: live refresh (card hook or component logic, in `plugins/notifications/src/hooks/**` or the card folder)

- **FR-9** When `useSignal('notifications')` delivers a new `lastSignal`, the card refetches its list.
- **FR-10** When `isSignalsAvailable` is `false`, the card polls by refetching on a fixed interval (default 60 seconds, overridable through a card prop). When signals are available, no polling interval is set.
- **FR-11** On unmount, the polling interval is cleared and no refetch or state update happens after unmount.

### Module: notifications page deep link (`plugins/notifications/src/components/NotificationsPage/**`, `NotificationsTable/**`)

- **FR-12** The notifications page reads the `id` query parameter.
- **FR-13** When `id` is present, the notification with that id is visually highlighted in the table (a selected or highlighted row style, exposed to assistive technology, for example through `aria-selected` or `aria-current`).
- **FR-14** When the notification with `id` is not in the current filtered or paged result, the page fetches it with `getNotification(id)` and shows it (for example, pinned at the top of the list) so the deep link always lands on a visible item. A missing or inaccessible id leaves the page working as it does today.

### Module: registration (`plugins/notifications/src/plugin.ts`, `index.ts`, `components/index.ts`, `alpha.tsx`)

- **FR-15** Old frontend system: the package exports a home card created with `createCardExtension` (for example `NotificationsHomePageCard` or `UnreadNotificationsCard` provided by `notificationsPlugin.provide(...)`), with a title, description and layout, and its component parts loaded lazily.
- **FR-16** New frontend system: `src/alpha.tsx` registers a `HomePageWidgetBlueprint` widget (name `unread-notifications`) in the plugin's `extensions`, following `plugins/search/src/alpha.tsx`. The existing page and API extensions are unchanged.
- **FR-17** All new exports are named exports; no default exports (ADR003). No `React.FC` (ADR006).

### Module: home-react (`plugins/home-react/src/extensions.tsx`)

- **FR-18** `CardExtension` no longer hard-fails when no app context is available: it resolves app components defensively, and when `useApp()` or the app's components are unavailable it falls back to a default progress indicator. Existing behavior inside an app is unchanged. React's rules of hooks still hold (no conditional hook calls).

### Module: translations, docs, release notes

- **FR-19** Every new user-visible string is a key in `notificationsTranslationRef` in `plugins/notifications/src/translation.ts`.
- **FR-20** `plugins/notifications/README.md` and `docs/notifications/usage.md` document the card for both frontend systems: how to add it, its props (limit, polling interval) and its live-refresh behavior. The docs follow `docs/contribute/doc-style-guide.md`.
- **FR-21** One changeset per package (`@backstage/plugin-notifications`, `@backstage/plugin-home-react`), each `patch`, written for adopters, naming no internal symbols.

## Non-functional requirements

- **NFR-1** Every new `.ts`/`.tsx` source file starts with the Apache-2.0 header dated 2026. Existing files keep their original year.
- **NFR-2** Code matches the conventions of the package it lives in (`@backstage/ui` components and CSS modules where the package already uses them, `core-components` `Link`, `useTranslationRef`).
- **NFR-3** Tests use React Testing Library with `screen` and `findBy*` queries, avoid `waitFor` where possible, add no test IDs to the implementation, and prefer fewer thorough tests with several assertions. Polling tests use Jest fake timers.
- **NFR-4** The card makes at most one request per signal or interval tick (no request storm on a burst of signals: reuse the page's throttle approach or equivalent).
- **NFR-5** No new runtime dependency other than `@backstage/plugin-home-react` in `plugins/notifications/package.json`; dev dependencies already present are used for tests. The `home-react` test uses only that package's existing dependencies.
- **NFR-6** `yarn tsc` and `yarn lint` pass from the repo root; `CI=1 yarn test plugins/notifications` and `CI=1 yarn test plugins/home-react` pass.
- **NFR-7** API reports (`plugins/notifications/report.api.md`, `report-alpha.api.md`, `plugins/home-react/report.api.md`) are regenerated by `yarn build:api-reports`, never hand-edited. New public API carries TSDoc and a release tag (`@public` or `@alpha` as appropriate).

## PII inventory

| Field                                           | Sensitivity                                                   | Protection                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Notification title and description              | Low to medium (may mention entity names, people or incidents) | Rendered only to the signed-in recipient through the existing authenticated API; no new storage, logging or transport |
| Notification id (in the `?id=` query parameter) | Low (opaque identifier)                                       | URL-encoded; the page fetches it through the existing API, which enforces that the user may read it                   |
| `payload.link`                                  | Low                                                           | Not used for the card's own deep link; the existing table behavior is unchanged                                       |

## Role matrix

| Role                                            | Resource                           | Action                                                                                        |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| Signed-in user                                  | Own unread notifications           | List (card), mark as read (card), open on the notifications page                              |
| Signed-in user                                  | A notification id from a deep link | View only when the existing API returns it for that user; otherwise the page behaves as today |
| Anonymous or guest without notifications access | Card                               | Sees the error or empty state; no data                                                        |

No authorization logic is added on the frontend: the existing backend scopes every call to the caller.

## Acceptance criteria

- **AC-1** A jsdom test renders the card with a mocked `notificationsApiRef` and asserts the unread list (titles, newest first), that `getNotifications` was called with `read: false`, a bounded `limit` and newest-first sorting.
- **AC-2** A jsdom test asserts the empty state when the API returns no notifications, and the error state when it rejects.
- **AC-3** A jsdom test clicks mark-as-read on an item and asserts `updateNotifications` was called with `{ ids: [id], read: true }` and that the item disappears.
- **AC-4** A jsdom test changes the mocked `useSignal` `lastSignal` and asserts a refetch.
- **AC-5** A jsdom test with `isSignalsAvailable: false` and Jest fake timers advances time by the polling interval and asserts a refetch; with signals available, advancing time triggers no refetch.
- **AC-6** A jsdom test unmounts the card and asserts that advancing timers after unmount triggers no further `getNotifications` call.
- **AC-7** A jsdom test asserts each item's link `href` is `/notifications?id=<id>`.
- **AC-8** A jsdom test renders the notifications page (or the table) with `?id=<id>` and asserts the matching notification is highlighted, including when it is absent from the current page result and fetched by id.
- **AC-9** A jsdom test in `plugins/home-react/src/extensions.test.tsx` renders `CardExtension` without app context and asserts it renders its content (and a progress indicator while lazy content loads) instead of throwing.
- **AC-10** The old-system card is exported from `@backstage/plugin-notifications`, and `src/alpha.tsx` includes the `HomePageWidgetBlueprint` widget; `plugin.test.ts` (or an equivalent test) asserts both exist.
- **AC-11** `CI=1 yarn test plugins/notifications` and `CI=1 yarn test plugins/home-react` pass.
- **AC-12** `yarn tsc` and `yarn lint` pass from the repo root.
- **AC-13** Every new source file carries the Apache-2.0 header dated 2026; new code uses named exports only.
- **AC-14** `.changeset/` holds one new patch changeset for each of the two packages; the README and `docs/notifications/usage.md` describe the card; the API reports are regenerated by `yarn build:api-reports`.

## Open questions for HITL

1. **Placement of a missing deep-linked notification (FR-14).** Proposed: fetch it by id and pin it at the top of the current table page, highlighted. Alternative: switch the page's filters to "all" so it appears in place. The proposal keeps the person's filter choice. Reply with `revise:` to choose otherwise.
2. **Defaults (FR-1, FR-10).** Proposed: 5 items and a 60-second polling interval, both overridable through card props. Confirm or name other defaults.
3. **Example-app wiring.** Out of scope by the brief's non-goals; the docs show adopters how to add the card. No action unless you want it in a later run.
4. **`.gitignore`.** Declined at Gate 0: the run's `.sdlc/` folder stays untracked and visible to `git add -A`. The final report repeats this.
