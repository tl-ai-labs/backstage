# Intent Brief — feature-new — Home-page unread notifications card

## Context
Backstage notifications only show up on the notifications page or as a sidebar counter. People who land on
the home page every morning miss alerts that need action, such as a failed scaffolder task, an error on an
entity they own, or a broadcast from the platform team. There is no notifications widget for the home page,
and the notifications plugin contributes no home card in either frontend system.

Before: the home page shows no notifications. Unread items appear only on the separate notifications page.
After: the home page shows an "Unread notifications" card. The card lists the latest unread items, each with
mark-as-read, and each item links to its notification, highlighted on the notifications page.

Seed (user's words): "Add a home-page card listing the signed-in user's latest unread notifications,
updating live and deep-linking to each notification."

The user confirmed in the interview: deep links go to `/notifications?id=<id>`, and the notifications page
highlights that item. The card includes mark-as-read, live refresh through signals with a polling fallback,
and new-frontend-system widget registration. The card is tested with jsdom unit tests only.

## Goal
- A new home-page card component in `plugins/notifications`:
  - It lists the signed-in user's latest unread notifications, using the existing
    `getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })` call.
  - Each item has a mark-as-read action, which goes through `updateNotifications`.
- Deep-link handling: the card links each item to `/notifications?id=<id>`, and the notifications page
  highlights the matching item. This comes from the plugin's own route ref, not a hard-coded path.
- Live refresh:
  - The card refreshes through `useSignal('notifications')` from the signals plugin, reacting to
    `new_notification`, `notification_read` and `notification_unread`.
  - When signals are unavailable (`isSignalsAvailable === false`), it falls back to polling.
- Registration in both frontend systems:
  - Legacy: export the card through `createCardExtension`.
  - New frontend system: a `HomePageWidgetBlueprint` widget added to the notifications plugin in
    `src/alpha.tsx`.
- A small change in `plugins/home-react` so that card extensions can render without app context, for
  example in isolation or in tests. Today `CardExtension` (`src/extensions.tsx`) calls `useApp()` only to
  get the `Progress` component for its `Suspense` fallback, and that call throws outside an app. It should
  fall back to a default progress indicator when no app context is present. The existing behavior inside
  an app stays the same.

## Files in scope
- `plugins/notifications/src/**` — this covers:
  - the new card component directory, with its `*.test.tsx`
  - the `NotificationsPage` and `NotificationsTable` changes for `?id=` highlighting
  - `src/alpha.tsx`, `src/index.ts` and `src/plugin.ts`
  - translation strings
- `plugins/notifications/package.json` — adds the `@backstage/plugin-home-react` dependency.
- `plugins/notifications/README.md`
- `plugins/notifications/report.api.md`, `plugins/notifications/report-alpha.api.md` and
  `plugins/notifications/knip-report.md` — generated API reports.
- `plugins/home-react/src/**`
- `plugins/home-react/report.api.md`, `plugins/home-react/report-alpha.api.md` and
  `plugins/home-react/knip-report.md` — generated API reports.
- `docs/notifications/usage.md` and `docs/notifications/usage--old.md` — usage docs for the new card.
- `.changeset/*.md` — new changesets for `@backstage/plugin-notifications` and
  `@backstage/plugin-home-react`. Both are patch bumps, since both packages are below 1.0.
- `yarn.lock` — changes because of the new workspace dependency.

## Files off-limits
- Project defaults: `.env*`, `.mcp.json`, `node_modules/**`, `.cursor/rules/**`,
  `.claude/settings.local.json`, `dist/**`, `.sdlc/**` (except the run's own outputs) and `.git/**`.
- AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md` and `AGENTS.md`.
- Other packages and plugins:
  - `plugins/notifications-backend/**`, `plugins/notifications-common/**` and
    `plugins/notifications-node/**` (no backend change).
  - `plugins/signals*/**` and `plugins/home/**`.
  - `packages/app/**` and `packages/app-legacy/**`.
- Docs and config:
  - `docs/releases/**`.
  - ESLint, Prettier and TypeScript config files.

## Acceptance criteria
- jsdom unit tests (Jest and React Testing Library, using `screen`/`findBy*` and no test IDs) cover:
  - rendering the latest unread items, including the empty state
  - mark-as-read calling `updateNotifications` and removing the item
  - a refresh triggered by a `notifications` signal
  - the polling fallback when signals are unavailable
  - cleanup of signal subscriptions and timers on unmount
- `/notifications?id=<id>` highlights the matching notification, and that behavior is covered by a test.
- The card is registered as a legacy card extension and as a new-frontend-system home widget.
- New source files carry the Apache-2.0 header (2026).
- The run's test command, used word for word for the whole run, passes:
  `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`
- The API reports are regenerated, and there are changesets and docs updates for each touched package.

## Non-goals
- No backend, storage or endpoint changes, and no new signal types.
- No wiring of the card into the example apps (`packages/app`, `packages/app-legacy`).
- No change to the sidebar counter or the notifications page beyond `?id=` highlighting.
- No end-to-end or browser tests.

## Run constraints (Gate 0)
- Auth mode: `vendor`.
- Test command, word for word: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`.
- Never run lint with `--fix`.
- Continue despite any open upstream PRs, and do not read them.
- The 2 `DatabaseNotificationsStore` tests that fail on Postgres 9 and 11 already fail at base. They are a
  known failure, not this run's to fix.
- The policy's endpoints are acceptable: Vertex AI in project `temp-genmedia-study`, and Anthropic. This
  answers the regulated-repo warning.
- `.gitignore` stays unchanged. `.sdlc/` is already covered by `.git/info/exclude`.
