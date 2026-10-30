# Intent Brief — feature-new — Unread notifications card on the home page

## Context

Problem: Backstage notifications are only visible on the notifications page or via a sidebar counter, so people who land on the home page every morning miss alerts that need action (a scaffolder task failed, an entity they own has an error, a broadcast from the platform team). There is no notifications widget for the home page.

Before: the home page shows no notifications; unread items are only visible on the separate notifications page.
After: the home page shows an "Unread notifications" card listing the latest unread items with mark-as-read, and each item links to the highlighted notification.

Seed (command text): Add a home-page card listing the signed-in user's latest unread notifications, updating live and deep-linking to each notification.

Discovery notes (see discovery.md): `plugins/home-react/src/extensions.tsx` `CardExtension` uses `useApp()` for its Progress fallback (the app-context dependency to remove); `plugins/notifications/src/alpha.tsx` registers no home widget and the package does not yet depend on `@backstage/plugin-home-react` (so `yarn.lock` changes); `NotificationsPage` does not handle `?id=` today; `useSignal('notifications')` exposes `isSignalsAvailable` for the polling fallback.

## Goal

Where the work lands: plugins/notifications (new card component; deep-link handling so /notifications?id= highlights the item; live refresh via the signals plugin with a polling fallback when signals are unavailable; new-frontend-system widget registration), plus a small change in plugins/home-react so card extensions can render without app context.

## Files in scope

- `plugins/notifications/**` — new card component, `?id=` deep-link highlight in the page, signals refresh with polling fallback, `HomePageWidgetBlueprint` registration in `src/alpha.tsx`, translations, `package.json` dependency on `@backstage/plugin-home-react`, README
- `plugins/home-react/**` — card extension renders without app context (loading fallback no longer requires `useApp`), README if behaviour is documented there
- `yarn.lock` — workspace dependency entry for the new `@backstage/plugin-home-react` dependency
- `docs/notifications/**` — document the home-page card and deep link
- `.changeset/*.md` — new changesets, one per affected published package

## Files off-limits

Project defaults from `.sdlc/project.json` plus discovery's proposal: `.git/**`, `.claude/**`, `.cursor/**`, `AGENTS.md`, `.env*`, `.mcp.json`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.next/**`, `.yarn/**`, `.sdlc/**`, `docs/releases/**`, `**/CHANGELOG.md`, `**/report*.api.md`, `**/knip-report.md`, ESLint/Prettier/TS config files.

## Acceptance criteria

Acceptance criteria: jsdom tests for rendering, mark-as-read, signal-triggered refresh and the polling fallback; subscriptions and timers are cleaned up; yarn tsc and lint pass.

Tests: jsdom unit tests.

Check commands: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`

## Non-goals

- No backend changes (notifications-backend, signals-backend) and no new endpoint or storage.
- No changes to the old-frontend-system home page beyond what the card component naturally supports.
- No edits to generated API reports, CHANGELOGs or release notes.

## Gate 0 decisions (approved)

- Stack: node-typescript / Backstage monorepo (as detected)
- Test command: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`
- Auth mode: estimated
- Policy: opus55-plus-flash38
- Existing AI setup: all off-limits
- Allowlist (frozen): `plugins/notifications/**`, `plugins/home-react/**`, `yarn.lock`, `docs/notifications/**`, `.changeset/*.md`
- `.gitignore` `.sdlc/` entry: no (already excluded via `.git/info/exclude`)
