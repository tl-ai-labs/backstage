# Intent Brief — feature-new — Unread notifications card on the home page

## Context

Seed (verbatim): Add a home-page card listing the signed-in user's latest unread notifications, updating live and deep-linking to each notification.

Brief (verbatim, as supplied by the user):

> Problem: Backstage notifications are only visible on the notifications page or via a sidebar counter, so people who land on the home page every morning miss alerts that need action (a scaffolder task failed, an entity they own has an error, a broadcast from the platform team). There is no notifications widget for the home page.
>
> Before: the home page shows no notifications; unread items are only visible on the separate notifications page.
> After: the home page shows an "Unread notifications" card listing the latest unread items with mark-as-read, and each item links to the highlighted notification.
>
> Where the work lands: plugins/notifications (new card component; deep-link handling so /notifications?id= highlights the item; live refresh via the signals plugin with a polling fallback when signals are unavailable; new-frontend-system widget registration), plus a small change in plugins/home-react so card extensions can render without app context.
>
> Acceptance criteria: jsdom tests for rendering, mark-as-read, signal-triggered refresh and the polling fallback; subscriptions and timers are cleaned up; yarn tsc and lint pass.
>
> Tests: jsdom unit tests.

Discovery notes (see discovery.md): the notifications client already supports `read: false` with sort/limit; live updates come from `useSignal('notifications')` in `@backstage/plugin-signals-react` (already a dependency of plugins/notifications); card registration is `createCardExtension` (legacy) and `HomePageWidgetBlueprint` (new frontend system) from `@backstage/plugin-home-react`, which plugins/notifications does not depend on yet. No backend change is expected.

## Goal

Ship an "Unread notifications" home-page card from `@backstage/plugin-notifications` that lists the signed-in user's latest unread notifications, lets them mark each as read, refreshes live through signals (polling when signals are unavailable), and links each item to `/notifications?id=<id>`, where the notifications page highlights it. Register it for both the legacy and the new frontend system, and make the small `@backstage/plugin-home-react` change so card extensions render without app context.

## Files in scope

- `plugins/notifications/src/**` — new card component and its tests, hooks (signal + polling refresh), deep-link `?id=` highlight handling in the notifications page/table, legacy card export (`plugin.ts`, `index.ts`), new-system widget registration (`alpha.tsx`), translation keys (`translation.ts`).
- `plugins/notifications/package.json` — add `@backstage/plugin-home-react` dependency.
- `plugins/notifications/README.md`, `docs/notifications/usage.md` — document the card.
- `plugins/notifications/report.api.md`, `plugins/notifications/report-alpha.api.md` — regenerated API reports for new exports.
- `plugins/home-react/src/**` — small change so card extensions render without app context, plus tests.
- `plugins/home-react/report.api.md`, `plugins/home-react/report-alpha.api.md` — regenerated if its public API changes.
- `yarn.lock` — workspace dependency entry for the new dependency.
- `.changeset/*.md` — new changeset files for `@backstage/plugin-notifications` and `@backstage/plugin-home-react`.

## Files off-limits

Project defaults (`.env*`, `.mcp.json`, `node_modules/**`, `dist/**`, `build/**`, `.sdlc/**`, `.git/**`, `.cursor/rules/**`, `.claude/settings.local.json`), plus every detected AI config (`.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`), plus `.yarn/**`, `docs/releases/**`, ESLint/Prettier/TypeScript config files, and all backend packages (`plugins/notifications-backend*`, `plugins/notifications-node`, `plugins/notifications-common`, `plugins/signals-backend*`).

## Acceptance criteria

1. The home page can show an "Unread notifications" card listing the latest unread notifications of the signed-in user.
2. Each item can be marked as read from the card, and it leaves the list.
3. Each item links to `/notifications?id=<id>`, and the notifications page highlights that notification.
4. The card refreshes when a notifications signal arrives; when signals are unavailable it falls back to polling.
5. Signal subscriptions and polling timers are cleaned up on unmount.
6. The card is registered for both the legacy frontend system and the new frontend system (home page widget).
7. Card extensions from `@backstage/plugin-home-react` render without app context.
8. jsdom tests cover rendering, mark-as-read, signal-triggered refresh and the polling fallback.
9. `yarn tsc` and lint pass; changesets and docs are included.

## Non-goals

- Backend changes (notifications-backend, signals-backend, notifications-common).
- Changes to the sidebar counter or the notifications page beyond `?id=` highlight handling.
- Wiring the card into the example apps (`packages/app`, `packages/app-legacy`) — not named in the brief.
- Fixing the 2 known Postgres 9/11 test failures at base.
- Integration or end-to-end tests (jsdom unit tests only).

## Gate 0 decisions (approved 2026-11-04)

- Auth mode: vendor. Policy: argon4-plus-flash38. Intent: feature-new.
- Test command: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`
- Allowlist and off-limits frozen as proposed above; example apps (`packages/app/**`, `packages/app-legacy/**`) stay out of scope.
- `.gitignore`: no `.sdlc/` entry added (local `.git/info/exclude` covers it); report this in the final report.
