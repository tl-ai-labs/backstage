# Requirements — feature-new — Unread notifications card on the home page

Run: `20261030-142814-feature-new-home-unread-notifications` · Intent: feature-new · Policy: opus55-plus-flash38

## Summary

Add an "Unread notifications" home-page card to `@backstage/plugin-notifications` that lists the signed-in
user's latest unread notifications, lets them mark an item as read, refreshes live through the signals
plugin (polling when signals are unavailable), and deep-links each item to `/notifications?id=<id>`, where
the notifications page highlights it. Register the card as a new-frontend-system home widget. Make
`@backstage/plugin-home-react` card extensions render their loading fallback without app context.

## In scope

1. A new card component in `plugins/notifications` that shows the latest unread notifications of the
   signed-in user.
2. A per-item "mark as read" action in the card.
3. Live refresh of the card on notification signals, with a polling fallback when signals are unavailable.
4. Deep links from each card item to the notifications page, and `?id=<id>` highlight handling on the
   notifications page.
5. Registration of the card as a home-page widget in the new frontend system (`src/alpha.tsx`, through
   `HomePageWidgetBlueprint`), with the `@backstage/plugin-home-react` dependency added to
   `plugins/notifications/package.json` and the resulting `yarn.lock` change.
6. A change in `plugins/home-react` so the card extension's loading fallback does not need app context.
7. New UI strings in the notifications translation ref.
8. jsdom unit tests for all of the above.
9. Documentation: the notifications README and `docs/notifications/**`; one changeset per affected
   published package (`@backstage/plugin-notifications`, `@backstage/plugin-home-react`).

## Out of scope

1. Backend changes (`notifications-backend`, `signals-backend`, `notifications-common` types), new
   endpoints or storage.
2. Changes to the old-frontend-system home page or a legacy `createCardExtension` export of the card (see
   open question Q1).
3. Edits to generated API reports (`report*.api.md`), `CHANGELOG.md` files or `docs/releases/**`.
4. Marking a notification as read when it is opened through the deep link (the page's existing behaviour
   is unchanged).
5. Changes to `plugins/home`, `packages/app` or any package outside the frozen allowlist.

## Functional requirements

### Module: notifications card (`plugins/notifications`)

- **FR-1** The card fetches unread notifications only (`read: false`) for the signed-in user through the
  existing `notificationsApiRef`, sorted newest first, limited to a default of 5 items.
- **FR-2** Each listed item shows the notification title, its relative created time, and its severity when
  the severity is not `normal`.
- **FR-3** Each item's title is a link to the notifications page with the item's id as the `id` query
  parameter (`<notifications root route>?id=<notification id>`), resolved through the plugin's
  `rootRouteRef`, not a hard-coded path.
- **FR-4** Each item has a "mark as read" action that calls `updateNotifications({ ids: [id], read: true })`
  and then refreshes the list, so the item leaves the card.
- **FR-5** The card shows a loading indicator on first load, an empty-state message when there are no
  unread notifications, and an error message (without crashing the home page) when the fetch fails.
- **FR-6** The card subscribes to the `notifications` signal channel with `useSignal`; each new signal
  (`new_notification`, `notification_read`, `notification_unread`) triggers a refresh of the list.
- **FR-7** When `isSignalsAvailable` is false, the card refreshes the list on a fixed polling interval
  (default 60 seconds). When signals are available, it does not poll.
- **FR-8** The polling timer is cleared when the card unmounts or when signals become available, and no
  state update happens after unmount.
- **FR-9** All new user-visible strings (card title, empty state, mark-as-read label, error text) come from
  `notificationsTranslationRef` in `src/translation.ts`.

### Module: widget registration (`plugins/notifications`)

- **FR-10** `src/alpha.tsx` registers the card with `HomePageWidgetBlueprint` (from
  `@backstage/plugin-home-react/alpha`) and adds it to the plugin's `extensions`, lazily loading the card's
  content component, following the pattern of `plugins/home/src/alpha.tsx`.
- **FR-11** `plugins/notifications/package.json` declares `@backstage/plugin-home-react` as a
  `workspace:^` runtime dependency, and `yarn.lock` is updated by the install so the workspace resolves.

### Module: notifications page deep link (`plugins/notifications`)

- **FR-12** The notifications page reads the `id` query parameter. When the notification with that id is in
  the displayed list, its row is visually highlighted and scrolled into view.
- **FR-13** When `id` is absent, or matches no displayed notification, the page renders exactly as before,
  with no error.

### Module: card extension without app context (`plugins/home-react`)

- **FR-14** The card extension's `Suspense` loading fallback no longer calls `useApp()`; it renders a
  progress indicator that needs no app context (for example `Progress` from `@backstage/core-components`),
  so a card extension renders in a tree that has no old-system app context.
- **FR-15** The public API of `@backstage/plugin-home-react` is unchanged (no export added, removed or
  re-typed).

### Module: documentation

- **FR-16** `plugins/notifications/README.md` and `docs/notifications/usage.md` document the home-page
  card (how to enable it in the new frontend system, the signals refresh and polling fallback) and the
  `/notifications?id=` deep link, following `docs/contribute/doc-style-guide.md`.
- **FR-17** Two new changesets in `.changeset/`: a `patch` for `@backstage/plugin-notifications` (new card,
  deep-link highlight) and a `patch` for `@backstage/plugin-home-react` (card loading fallback no longer
  needs app context), each written for adopters with no internal symbol names.

## Non-functional requirements

- **NFR-1** New `.ts`/`.tsx` files carry the Apache 2.0 header with year 2026; existing files keep their
  year.
- **NFR-2** Code matches each package's existing style (Material UI v4 / `@backstage/core-components` as
  the notifications plugin already uses, `react-use` hooks, existing file layout under
  `src/components/<Name>/`).
- **NFR-3** No extra network load when signals are available (no polling), and at most one request per
  polling interval when they are not.
- **NFR-4** No ESLint, Prettier or TypeScript configuration changes; no edits to off-limits files.
- **NFR-5** Tests follow the project guidance: fewer, thorough tests; RTL `screen` and `findBy*` over
  `waitFor`; no test ids added to the implementation.

## PII inventory

| Field                            | Sensitivity                                                | Protection                                                                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification title / description | Low–medium (may name entities, people, or failure details) | Rendered only to the signed-in user who owns them, fetched through the existing authenticated `notificationsApiRef`; not logged, not stored client-side beyond React state |
| Notification id                  | Low                                                        | Placed in the deep-link query string only; no new storage                                                                                                                  |
| User identity                    | Low                                                        | Not read by the card; the backend scopes notifications to the caller                                                                                                       |

## Role matrix

| Role                    | Resource                 | Action                                                    |
| ----------------------- | ------------------------ | --------------------------------------------------------- |
| Signed-in user          | Own unread notifications | Read (list in card), mark as read                         |
| Signed-in user          | Notifications page       | Open with `?id=` to highlight own notification            |
| Guest / unauthenticated | Notifications            | No change: the backend already refuses or scopes as today |

No new permission is introduced; authorization stays in the existing notifications backend.

## Acceptance criteria

- **AC-1** A jsdom test renders the card with a mocked notifications API returning unread items and finds
  each title, each link pointing at `…/notifications?id=<id>`, and the API called with `read: false`.
- **AC-2** A jsdom test clicks "mark as read" on an item and asserts `updateNotifications` was called with
  `{ ids: [<id>], read: true }` and that the list was fetched again.
- **AC-3** A jsdom test with a mocked signal API emits a notifications signal and asserts the list is
  fetched again.
- **AC-4** A jsdom test with signals unavailable and fake timers advances past the polling interval and
  asserts a re-fetch; after unmount, advancing timers causes no further fetch (timer cleaned up).
- **AC-5** A jsdom test renders the card with no unread notifications and finds the empty-state text.
- **AC-6** A jsdom test renders the notifications page with `?id=<id>` and finds that notification's row
  highlighted; without `id` the page renders as before.
- **AC-7** A jsdom test renders a card extension from `@backstage/plugin-home-react` without the
  old-system app context and it renders without throwing.
- **AC-8** `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`
  passes (or fails only on failures already present before the run).
- **AC-9** `plugins/notifications/package.json` lists `@backstage/plugin-home-react` and `yarn.lock` has
  the matching workspace entry.
- **AC-10** The README, `docs/notifications/usage.md` and two changesets exist with the content of FR-16
  and FR-17.

## Open questions for HITL

**Resolved at Gate 1 (approved): all three take the stated defaults** — Q1 no legacy export, Q2 fixed
constants (5 items, 60 s), Q3 API reports are not regenerated by this run; the user runs
`yarn build:api-reports` before a PR.

- **Q1** Should the card also be exported for the old frontend system (a `createCardExtension` export
  from the package root)? Default in this plan: **no** — new frontend system only, per the brief's
  non-goals. A root export would also change `report.api.md`, which is off-limits for this run.
- **Q2** Default item limit (5) and polling interval (60 s): accept, or should either be configurable
  through the widget's card settings? Default: fixed constants, not configurable.
- **Q3** API reports: adding a widget to `src/alpha.tsx` may change `report-alpha.api.md`, which is
  off-limits. The run will not regenerate it; you run `yarn build:api-reports` before opening a PR.
