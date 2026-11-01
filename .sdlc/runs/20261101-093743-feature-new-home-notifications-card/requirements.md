# Requirements — Unread notifications home page card

Run: `20261101-093743-feature-new-home-notifications-card` (brownfield, `feature-new`).
Source: `intent_brief.md`. Its "Brief" text and its "Gate 0 record" section are binding and win over
everything else here. Statements about the current code are leads for the architect to verify against
this branch, not facts. Run constraint for every phase and model: nothing may be taken from upstream
backstage/backstage#34869, its merge commit, or master.

## In scope

1. A new "Unread notifications" home page card in `plugins/notifications`, listing the signed-in user's
   latest unread notifications.
2. Mark-as-read on each item of the card.
3. Each item links to the notification on the notifications page, where it is highlighted.
4. Deep-link handling on the notifications page: `/notifications?id=<id>` highlights that notification.
5. Live refresh of the card through the signals plugin, with a polling fallback when signals are
   unavailable.
6. Registration of the card as a home page widget in the new frontend system.
7. A small change in `plugins/home-react` so card extensions can render without app context.
8. jsdom tests, documentation, changesets and regenerated API reports for the above.

## Out of scope

1. Backend, database or notification API changes.
2. A card for the old frontend system (`createCardExtension` in `plugins/notifications/src/plugin.ts`).
3. Changes to `plugins/home`.
4. Adding the card to a default layout. `app-config.yaml` stays as it is, so the card appears under
   Add Widget and not on the default layout of the example app.
5. Changes to the example apps (`packages/app`, `packages/app-legacy`).
6. Anything on the Gate 0 off-limits list, and changes to `.gitignore`.
7. Fixing the two failures that were there before this run (see AC-9).

## Functional requirements

### plugins/notifications — the card

- **FR-1.** The card renders with the title "Unread notifications" and lists the signed-in user's
  latest unread notifications, newest first. It shows only unread items.
- **FR-2.** The card has distinct states for loading, for no unread notifications, and for a failed
  fetch. A failed fetch stays inside the card and does not break the rest of the home page.
- **FR-3.** Each item has a mark-as-read action that marks that notification as read through the
  notifications API. After it succeeds, the item leaves the list. If it fails, the item stays and the
  failure is shown to the user rather than swallowed.
- **FR-4.** Each item links to the notifications page with its id as `?id=<id>`.
- **FR-5.** While signals are available, the card refreshes its list when the `notifications` signal
  channel reports a change that affects unread items (a new notification, one marked read, one marked
  unread). It does not poll in this state. In this requirement, "available" means the signal API is
  installed.
- **FR-6.** When the signal API is not installed in the app, the card refreshes on a timer instead.
- **FR-7.** On unmount, the signal subscription and every timer are released, and no refresh runs or
  updates state afterwards.
- **FR-8.** The card is registered as a home page widget in the new frontend system, so that an app
  discovering the plugin offers it in the Add Widget dialog.

### plugins/notifications — the deep link

- **FR-9.** When the notifications page opens with `?id=<id>`, it looks that notification up with
  `getNotification`, shows it, and highlights it, even when the page's current filters or pagination
  would otherwise hide it (for example when it is read, or past the first page).
- **FR-10.** A lookup that fails (the notification is deleted, belongs to someone else, or the request
  errors) is treated as nothing to highlight. The page renders as it does without `?id=`, with no page
  error.
- **FR-11.** Without `?id=`, the notifications page behaves exactly as it does today.

### plugins/home-react — card extensions

- **FR-12.** A card extension renders when there is no app context, instead of throwing.
- **FR-13.** `CardExtension` keeps using the app's own `Progress` when an app context exists, and falls
  back to `Progress` from `@backstage/core-components` when there is none.

## Non-functional requirements

- **NFR-1.** New source files carry the Apache 2.0 header with the year 2026. Existing headers are not
  changed.
- **NFR-2.** Each published package that changes gets its own hand-written changeset in `.changeset/`,
  `patch` for these 0.x packages unless a change is breaking, written for adopters and naming no
  internal symbols.
- **NFR-3.** The new behavior is documented, following `docs/contribute/doc-style-guide.md`, in the
  plugin README, `docs/notifications/usage.md` and `docs/getting-started/homepage.md` as fits. Nothing
  under `docs/releases` changes. `docs/notifications/usage.md` states that when signals are installed
  but the connection is down, the card gets no live updates and does not poll.
- **NFR-4.** API reports are regenerated with `yarn build:api-reports`, as a separate step from the
  checks.
- **NFR-5.** New code matches the style of the package and file it lands in. `yarn build`,
  `yarn changesets version` and `yarn release` are never run, and no ESLint, Prettier or TypeScript
  configuration changes.
- **NFR-6.** A new dependency of `plugins/notifications` on `@backstage/plugin-home-react`, if the
  design needs it, updates `package.json` and `yarn.lock`, adds only, and removes or downgrades nothing.
- **NFR-7.** Tests prefer fewer thorough cases, use `screen` and `findBy*` queries over `waitFor`, and
  add no test ids to the implementation.
- **NFR-8.** Polling stays light: one fetch per interval, no overlap between fetches, and no fetch after
  unmount.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Notification title and description | May hold personal or work details; the user's own | Rendered only to the signed-in user, fetched through the existing API. No new storage or logging |
| Notification id in `?id=` | Low; opaque identifier, visible in the URL and browser history | The lookup goes through the existing API, which decides access. A failed lookup reveals nothing (FR-10) |
| Signed-in user identity | Low | Taken from the existing session. The card holds no user identifier of its own |

No new PII is collected, stored or sent.

## Role matrix

| Role | Resource | Action |
|---|---|---|
| Signed-in user | Own notifications | List unread, open by deep link, mark as read |
| Signed-in user | Another user's notification | None: a `?id=` lookup fails and is treated as nothing to highlight (FR-10) |
| Adopter or app integrator | The card | Add it under Add Widget. No configuration change is required for it to be offered |

No role or permission is added. Access stays with the existing notifications API.

## Acceptance criteria

- **AC-1.** A jsdom test renders the card with unread notifications and asserts the title, the items
  and the loading, empty and error states (FR-1, FR-2).
- **AC-2.** A jsdom test marks an item as read, and asserts the API call and that the item leaves the
  list, and that a failed call keeps the item and shows the failure (FR-3).
- **AC-3.** A jsdom test asserts that each item's link carries `?id=<id>` to the notifications page
  (FR-4).
- **AC-4.** A jsdom test publishes a change on the `notifications` signal channel and asserts that the
  card refetches, and that it sets no polling timer while signals are available (FR-5).
- **AC-5.** A jsdom test with signals unavailable asserts that the card refetches on its timer (FR-6).
- **AC-6.** A jsdom test unmounts the card and asserts that the subscription is released, its timers are
  cleared and no fetch happens afterwards (FR-7).
- **AC-7.** A jsdom test covers `?id=`: a notification the filters would hide is shown and highlighted,
  and a failed lookup leaves the page rendering with no error (FR-9, FR-10, FR-11).
- **AC-8.** A jsdom test renders a card extension with no app context and asserts that it does not
  throw and that it falls back to `Progress` from `@backstage/core-components`, and that with an app
  context it uses the app's `Progress` (FR-12, FR-13). A test asserts that the card is exported as a
  home page widget for the new frontend system (FR-8).
- **AC-9.** `CI=true yarn test plugins/notifications plugins/home-react` shows every new and existing
  test passing, except the two failures that were there before this run:
  "DatabaseNotificationsStore (POSTGRES_9) settings should save and load notification settings" and
  "DatabaseNotificationsStore (POSTGRES_11) settings should save and load notification settings", in
  `plugins/notifications-backend`. They are neither fixed nor counted against this run. The measured
  baseline is 914 passed, 2 failed, 916 total.
- **AC-10.** `yarn tsc` exits 0.
- **AC-11.** `yarn lint:all` exits 0.
- **AC-12.** The three commands of AC-9, AC-10 and AC-11 run separately, so `tsc` and lint still run
  when the tests fail.
- **AC-13.** `yarn build:api-reports` has been run as a separate step, and the reports of each changed
  package are up to date (NFR-4).
- **AC-14.** Each changed published package has its changeset, new source files carry the 2026 header,
  and the docs cover the card and the deep link (NFR-1, NFR-2, NFR-3).

## Open questions for HITL

None. The person left these two numbers to the architect at Gate 1 and reviews both at Gate 2, so the
change plan must state each one plainly:

1. How many items the card lists.
2. The polling interval when the signal API is not installed.

## Run notes

Both differences below were accepted by the person at Gate 1.

1. These requirements were written by Claude, in the orchestrator's session, and not by Flash, although
   the policy routes `requirements_analysis` to Flash. The server refused the Flash dispatch, because
   while a brownfield write contract is active it sends no free-standing packet to an agent that edits
   the project folder itself. Nothing was sent or billed. The refusal came back to the orchestrator as a
   tool error, so it appears in neither `telemetry.jsonl` nor `orchestrator.log`; the rule itself is in
   the server code.
2. The run continued without `ANTHROPIC_API_KEY`, with auth still `vendor`. The start check passed
   without it, and this policy has no Claude model that would use it.

Recorded at Gate 4, accepted by the person:

3. The fix for the duplicate row on a fresh load of `/notifications?id=<id>` (Gate 3, item 1) was
   confirmed by the person in the running app, not by a test. The jsdom test does not reproduce the
   timing. The person's words: "6 fresh loads with no duplicate row, where every fresh load tried
   before the fix showed one. With one unread notification, the page shows the block and no 'No records
   to display'."
4. Limits, kept at the person's request: neither reviewer saw round 7, all automated tests use mocked
   APIs in jsdom, and polling and the failed mark-as-read toast were not run in the real app.
