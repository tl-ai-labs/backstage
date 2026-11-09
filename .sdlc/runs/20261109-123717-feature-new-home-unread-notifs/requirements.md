# Requirements — feature-new — Unread notifications home page card

Run: `20261109-123717-feature-new-home-unread-notifs` · Policy: `opus55-plus-flash38-agsdk` · Auth: `estimated`
Source: `intent_brief.md` (this run's folder). Scope is the brief's "Files in scope"; nothing outside it is written.

## In scope

1. A new "Unread notifications" card component in `@backstage/plugin-notifications`
   (`plugins/notifications/src/components/UnreadNotificationsCard/`), listing the signed-in user's latest unread
   notifications, with a mark-as-read action per item.
2. Each listed item links to the notifications page with that notification highlighted: `/notifications?id=<id>`
   (the path resolved from the plugin's `rootRouteRef`, not hard-coded).
3. Live refresh through the `notifications` signal channel (`useSignal` from `@backstage/plugin-signals-react`),
   with a polling fallback when signals are unavailable.
4. Registration of the card as a new frontend system home page widget (`HomePageWidgetBlueprint` from
   `@backstage/plugin-home-react/alpha`) in `plugins/notifications/src/alpha.tsx`.
5. Deep-link handling on the notifications page: `NotificationsPage` reads `?id=` and `NotificationsTable`
   highlights the matching row (CSS module class).
6. `@backstage/plugin-home-react`: `CardExtension` renders without an app context (its loading fallback no longer
   requires `useApp()` to succeed).
7. jsdom tests: the card, the page deep link, and a home-react card extension rendered without an app context.
8. Docs (README, `docs/notifications/usage.md`), translation strings, `package.json` dependency changes and the
   `yarn.lock` entries that follow, regenerated API reports, and one changeset per package.

## Out of scope

1. Backend, storage, endpoint or signal-publishing changes (`notifications-backend`, `-node`, `-common`).
2. A card for the old frontend system (`createCardExtension` in `packages/app-legacy`).
3. Changes to the example app's home page layout or `app-config.yaml`.
4. Changes to the home, signals or notifications-common/backend/node packages.
5. Changing the notifications page's filters, paging or table columns beyond the highlighted row.

## Functional requirements

### Module: notifications — UnreadNotificationsCard

- **FR-1** The card fetches the user's notifications with `read: false` and a bounded `limit` (default 5,
  overridable by a card prop), newest first, through `notificationsApiRef`.
- **FR-2** The card renders each unread item's title (and description when present, truncated by layout, not by
  code) and its relative creation time, with the card title "Unread notifications" from the translation ref.
- **FR-3** Each item's title links to `<notifications root route>?id=<notification id>`, resolved with
  `useRouteRef(rootRouteRef)`.
- **FR-4** Each item has a mark-as-read control (accessible label from the translation ref) that calls
  `updateNotifications({ ids: [id], read: true })` and then refreshes the list; the item disappears from the list.
- **FR-5** When there are no unread notifications the card shows an empty state message from the translation ref;
  while loading it shows a progress indicator; on a fetch error it shows an error panel/message and does not throw.
- **FR-6** The card refetches when a message arrives on the `notifications` signal channel (`useSignal`'s
  `lastSignal` changes).
- **FR-7** When `useSignal` reports `isSignalsAvailable: false`, the card polls by refetching on an interval
  (default 60 s, overridable by a card prop). When signals are available no polling timer is started.
- **FR-8** On unmount the card leaves no timer running and no subscription open: the polling interval is cleared,
  and the signal subscription is released by `useSignal`'s own cleanup.
- **FR-9** The card links to the full notifications page ("View all") from the card's footer or action area.

### Module: notifications — new frontend system registration

- **FR-10** `plugins/notifications/src/alpha.tsx` adds a home page widget made with `HomePageWidgetBlueprint`,
  named for the card, lazy-loading the card component, with the title "Unread notifications"; it is added to the
  plugin's `extensions` list. `@backstage/plugin-home-react` becomes a dependency of `@backstage/plugin-notifications`.

### Module: notifications — deep link on the notifications page

- **FR-11** `NotificationsPage` reads the `id` search parameter from the current location and passes it to
  `NotificationsTable` as the highlighted notification id.
- **FR-12** `NotificationsTable` marks the row whose notification id equals the highlighted id with a CSS module
  class defined in `NotificationsTable.module.css` (a visible background/outline using theme-neutral CSS variables),
  and with `aria-current` or an equivalent accessible marker. Rows other than the highlighted one are unchanged.
  Without `?id=`, the page behaves exactly as before.

### Module: home-react

- **FR-13** `CardExtension` in `plugins/home-react/src/extensions.tsx` renders when no app context is present:
  it obtains the `Progress` fallback without throwing (falling back to a minimal built-in progress indicator when
  `useApp()` is unavailable). Behavior with an app context is unchanged. No public API signature changes.

### Docs and release

- **FR-14** `plugins/notifications/README.md` documents the card (new frontend system widget) and the
  `/notifications?id=<id>` deep link; `docs/notifications/usage.md` documents adding the card to the home page.
  Both follow `docs/contribute/doc-style-guide.md`.
- **FR-15** Two hand-written changesets: `.changeset/notifications-unread-home-card.md` (`@backstage/plugin-notifications`:
  patch) and `.changeset/home-react-card-without-app-context.md` (`@backstage/plugin-home-react`: patch), each
  adopter-facing, with no internal symbol names.
- **FR-16** API reports for both packages are regenerated (`yarn tsc:full`, then
  `yarn build:api-reports:only plugins/notifications plugins/home-react`, then the same with `--ci`, exit 0).
  Any new exported symbol carries TSDoc and a release tag.

## Non-functional requirements

- **NFR-1** New source files carry the Apache 2.0 header with year 2026; existing headers are not changed.
- **NFR-2** Match each package's existing style. The notifications plugin does not use MUI v4 or `makeStyles`
  (it has no `@material-ui/*` dependency and no file uses them). It uses `@backstage/ui` components and CSS
  modules (`*.module.css`), with `InfoCard`, `Progress`, `ErrorPanel`, `Link` and `Table` from
  `@backstage/core-components`. The change follows that and adds no MUI dependency.
- **NFR-3** The polling interval is never shorter than 10 s; requests are bounded by `limit`.
- **NFR-4** No test IDs in implementation; tests use `screen` and `findBy*` rather than `waitFor`; fewer, thorough tests.
- **NFR-5** User-facing strings go through `notificationsTranslationRef`.
- **NFR-6** No `yarn build`, `yarn changesets version` or `yarn release`.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Notification title / description | Low–medium (may name entities, people, tasks) | Shown only to the signed-in recipient via the existing authenticated `NotificationsApi`; not logged, not stored client-side beyond component state |
| Notification id in `?id=` URL | Low (opaque UUID) | Used only to highlight a row already returned by the user's own query; never used to fetch another user's data |

## Role matrix

| Role | Resource | Action |
|---|---|---|
| Signed-in user | Own notifications (via `NotificationsApi`) | Read unread list, mark as read |
| Signed-in user | Notifications page `?id=` | Highlight a row of their own list |
| Anonymous / other user | Another user's notifications | None (enforced by the existing backend; unchanged) |

## Acceptance criteria

- **AC-1** A jsdom test renders the card with a mocked `notificationsApiRef` and asserts the title, each unread
  item's title, and each item's link `href` ending in `?id=<id>`; the empty state shows when the API returns none.
- **AC-2** A jsdom test clicks an item's mark-as-read control and asserts `updateNotifications` was called with
  `{ ids: [id], read: true }` and that the list refetched (the item is gone).
- **AC-3** A jsdom test with a mocked signals API delivering a `notifications` channel message asserts the card
  refetches (`getNotifications` called again and the new item shown).
- **AC-4** A jsdom test without a signals API (fake timers) asserts the card refetches after the polling interval,
  and asserts that after unmount advancing timers triggers no further fetch (timer cleared).
- **AC-5** A jsdom test renders `NotificationsPage` at `/notifications?id=<id>` and asserts the matching row is
  marked highlighted and other rows are not.
- **AC-6** A jsdom test renders a card extension from `@backstage/plugin-home-react` with no app context and asserts
  its content renders without throwing.
- **AC-7** The full command runs as written:
  `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`, with Docker running
  and every suite the path matches included (`notifications-backend`'s database suites among them). Only two
  test failures are allowed, both recorded in `baseline-run/` (this run's folder) at base `fe6ace679f34`:
  "DatabaseNotificationsStore (POSTGRES_9) › settings › should save and load notification settings" and the
  same test on POSTGRES_11. They fail because the backend settings query has no ORDER BY, and
  `notifications-backend` is off-limits. The run fails on any other test failure, or on a non-zero exit from
  `yarn tsc` or `yarn lint:all`.
- **AC-8** `yarn build:api-reports:only plugins/notifications plugins/home-react --ci` exits 0 after regeneration,
  and both changesets exist with `patch` bumps.

## Open questions for HITL

None blocking. Assumptions taken (say `revise` to change any):

1. Default list size 5 and default polling interval 60 s, both overridable by card props.
2. The highlighted row is visual plus `aria-current`; the page does not auto-scroll or change filters to find an id
   that is not in the current page of results.
3. The home-react fix falls back to a minimal progress indicator only when the app context is missing; adopters with
   an app context still get their app's `Progress` component.
