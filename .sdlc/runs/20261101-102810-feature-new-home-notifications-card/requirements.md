# Requirements: unread notifications home card

Run `20261101-102810-feature-new-home-notifications-card`, job `feature-new`, built at HEAD `fe6ace679f34`.
Source: `intent_brief.md` (Gate 0 approved). The branch is 952 commits behind `origin/master`, which has an
equivalent feature (`cd4a9c7ef56c`). It may be read for reference, but this work fits this HEAD and nothing is
merged or rebased.

## In scope

1. A home page card in `plugins/notifications` listing the signed-in user's latest unread notifications.
2. Mark-as-read on each card item.
3. A link from each card item to `/notifications?id=<id>`, and highlighting of that item on the notifications page.
4. Live refresh through the signals plugin, with a polling fallback when signals are unavailable.
5. Registration of the card as a new-frontend-system home page widget.
6. A small change in `plugins/home-react` so card extensions can render without app context.
7. Tests, `docs/notifications/usage.md`, changesets for both packages, and regenerated API reports.

## Out of scope

1. Integration or end-to-end tests. Tests are jsdom unit tests only.
2. Backend, API, storage or background job changes. No file under `plugins/notifications-backend`,
   `plugins/notifications-common`, `plugins/notifications-node` or `plugins/signals*` changes.
3. Adding the card to the example app's default home layout. Nothing under `packages/app`, `packages/app-legacy` or
   `app-config.yaml` changes.
4. A legacy frontend system export of the card: no `createCardExtension` entry and no card export from the
   package's main entry point for the old system.
5. Merging or rebasing onto `origin/master`.
6. New list features on the card beyond the above (filters, paging, a "view all" action).
7. `docs/notifications/usage--old.md`, since the card is new-frontend-system only.

## Functional requirements

### Card (`plugins/notifications`)

- **FR-1 Unread list.** The card loads the signed-in user's unread notifications through the existing notifications
  API with `read: false`, a `limit`, and newest-first ordering (`sort` and `sortOrder`), and shows the title, the
  severity, and the relative creation time of each item. The default limit is 5.
- **FR-2 Card states.** The card has a distinct loading state, an empty state when there is nothing unread, and an
  error state when loading fails. A failed background refresh does not replace a list that is already showing.
- **FR-3 Mark as read.** Each item has an accessible mark-as-read action that uses the existing update API. On
  success the item leaves the list. On failure the item stays and the failure is visible to the user.
- **FR-4 Deep link.** Each item links to the notifications page with `?id=<id>`, with the path resolved from the
  plugin's route reference so a non-default mount path still works. The id is URL-encoded. The link goes to the
  notifications page even when the notification has its own `payload.link`.
- **FR-5 Live refresh.** The card refreshes when a signal arrives on the `notifications` channel, throttled the same
  way as the notifications page (2000 ms).
- **FR-6 Polling fallback.** When `useSignal` reports `isSignalsAvailable: false`, the card refreshes on a timer. The
  default interval is 60 seconds. No timer runs while signals are available.
- **FR-7 Cleanup.** After unmount no timer, pending throttled call or signal subscription remains, and no state
  update happens.
- **FR-8 Translations.** Every user-visible string on the card and widget goes through
  `notificationsTranslationRef`.

### Deep link handling (`NotificationsPage`)

- **FR-9 Highlight by id.** When the page URL has `?id=<id>`, the page highlights that notification.
- **FR-10 Item not in the current view.** The highlight works when the item is outside the current filter or page,
  for example when it was already read. The page fetches the item by id and shows it alongside the current rows. The
  table stays within its page size.
- **FR-11 Bad or missing id.** An unknown or inaccessible id leaves the page working normally, with its usual list
  and no crash. A page with no `id` parameter behaves exactly as it does today.

### Widget registration (`plugins/notifications`)

- **FR-12 New-frontend widget.** The plugin's `./alpha` entry registers the card through `HomePageWidgetBlueprint`,
  with a title, a description and sensible layout hints, as an extension on the notifications frontend plugin.
  `@backstage/plugin-home-react` becomes a dependency of `@backstage/plugin-notifications`.

### Card extensions (`plugins/home-react`)

- **FR-13 Custom renderer.** `CardExtension` given a custom `Renderer` renders without app context: that path no
  longer requires `useApp`.
- **FR-14 Existing behaviour.** The default rendering path behaves as before: the same `InfoCard`, settings modal,
  actions, context provider, and the app's `Progress` component as the suspense fallback.

### Documentation and release

- **FR-15 Docs.** `docs/notifications/usage.md` documents the card and how to add the widget to a home page, including
  the polling behaviour and the deep link. Public API additions carry TSDoc. `plugins/notifications/README.md` changes
  only if it needs a pointer to the card.
- **FR-16 Changesets.** One new changeset per package under `.changeset/`, each a `patch` (both packages are below
  1.0.0 and nothing is breaking), adopter-facing, naming no internal symbols.
- **FR-17 API reports.** `report.api.md` and `report-alpha.api.md` of both packages are regenerated with
  `yarn build:api-reports`, and only where the public surface actually changed.

## Non-functional requirements

- **NFR-1 Package style.** `plugins/notifications` uses `@backstage/ui`, CSS modules and Remixicon. The card adds no
  Material UI dependency. Each file matches its package's existing conventions.
- **NFR-2 Reuse.** The card reuses `useNotificationsApi`, the existing severity display and the existing translation
  ref rather than duplicating them. A shared refresh hook is fine when it keeps the card and page consistent.
- **NFR-3 Request volume.** A burst of signals produces at most one refresh per throttle window, and no refresh
  starts while one is already running.
- **NFR-4 Rendering safety.** Notification text renders as React text. There is no `dangerouslySetInnerHTML`, and the
  card never builds a link from `payload.link`.
- **NFR-5 Headers.** New `.ts` and `.tsx` files carry the Apache 2.0 header with year 2026. Existing files keep their
  year.
- **NFR-6 Compatibility.** No existing export changes shape, and nothing existing is removed.
- **NFR-7 Repo commands.** `yarn build`, `yarn changesets version` and `yarn release` are never run, and no ESLint,
  Prettier or TypeScript configuration changes.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Notification title and description | Low to moderate. Free text from other plugins, which may name users or entities | Fetched only through the existing authenticated API for the signed-in user. Not logged or persisted by the card |
| Notification id in the URL (`?id=`) | Low. Opaque id | The backend's existing per-user check applies. An id the user cannot read yields no item (FR-11) |

No new PII is collected or stored.

## Role matrix

| Role | Resource | Action |
|---|---|---|
| Signed-in user | Their own unread notifications | List, mark as read, open on the notifications page |
| Signed-in user | Another user's notification by id | No access. The existing backend scoping applies and the page shows no highlight |
| Backstage integrator | The home widget extension | Add it to a home page, or disable it by extension config |

## Acceptance criteria

- **AC-1** Jsdom tests cover card rendering with items and in the loading, empty and error states.
- **AC-2** A test covers mark-as-read: the update API is called with the item's id and the item leaves the list.
- **AC-3** A test shows that a `notifications` signal triggers a refresh, with the throttle respected.
- **AC-4** A test with signals unavailable shows that the card refreshes on the timer, and a test with signals
  available shows that no timer refresh happens.
- **AC-5** Tests show that after unmount no further refresh happens: timers and throttled calls are cleared and the
  subscription is released.
- **AC-6** A test shows that each card item links to `/notifications?id=<id>`.
- **AC-7** Tests show that the notifications page highlights the item for `?id=<id>`, including an item outside the
  current list, and stays usable for an unknown id.
- **AC-8** A test shows that the widget is registered as a home page widget extension of the notifications plugin.
- **AC-9** `plugins/home-react/src/extensions.test.tsx` shows `CardExtension` rendering with a custom `Renderer` and
  no app context, and shows default rendering unchanged.
- **AC-10** `CI=1 yarn test plugins/notifications` and `CI=1 yarn test plugins/home-react` pass, and `yarn tsc` passes.
- **AC-11** Lint passes for the changed files. Failures unrelated to this change are reported apart from any it
  causes, since `yarn lint` runs since `origin/master` and its base is very wide here.
- **AC-12** A changeset exists for each published package and the API reports match the code
  (`yarn build:api-reports` leaves no further change).
- **AC-13** `docs/notifications/usage.md` documents the card.

## Open questions for HITL

Each has a default that this file already uses. Reply with a change at Gate 1 only if you want something else.

1. **What "without app context" covers (FR-13, FR-14).** The default is the custom-`Renderer` path only, which matches
   upstream. The default card path keeps the app's `Progress`, because replacing it would change behaviour for apps
   that override that component, and the brief says existing behaviour must not change. Default-path cards therefore
   still need app context.
2. **What "signals unavailable" means (FR-6).** The default is what `useSignal` reports: no signals API in the app.
   A signals API that is present but has lost its connection is not detectable through the hook, and `signals-react`
   is off-limits, so the card does not poll in that case.
3. **Changeset bump (FR-16).** Both are `patch` per the repo rule for new features below 1.0.0. Upstream used `minor`
   for the notifications package. This run follows the repo rule.
