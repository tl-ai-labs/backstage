# Intent Brief — feature-new — Unread notifications home page card

Seed description (the user's words at the command): Add a home-page card listing the signed-in user's latest unread notifications, updating live and deep-linking to each notification.

The sections marked "Brief" below are the user's text, word for word. Where the brief differs from anything proposed earlier, the brief wins. Everything else is labelled as a proposal or a finding from the code, and does not override the brief.

## Context

Brief:

Problem: Backstage notifications are only visible on the notifications page or via a sidebar counter, so people who land on the home page every morning miss alerts that need action (a scaffolder task failed, an entity they own has an error, a broadcast from the platform team). There is no notifications widget for the home page.

Before: the home page shows no notifications; unread items are only visible on the separate notifications page.

Findings from the code at `fe6ace679f34` (not part of the brief):

- Every API the card needs exists: `getNotifications`, `getNotification`, `updateNotifications` and `getStatus` on `notificationsApiRef`. The `notifications` signal channel carries `new_notification`, `notification_read` and `notification_unread`. No backend change is needed.
- `useSignal` reports `isSignalsAvailable`, which is the switch for the polling fallback.
- `NotificationsPage` starts with `unreadOnly: true`, page 0 and page size 5, and it replaces the whole page with `ResponseErrorPanel` on any fetch error. A `?id=` that is read, past the first page, deleted or belongs to someone else is therefore not in the table. Recommendation: look it up with `getNotification`, show it even when the filters would hide it, and treat a failed lookup as "nothing to highlight" rather than a page error.
- `CardExtension` in `plugins/home-react/src/extensions.tsx` calls `useApp()` only to get `Progress`, and `useApp()` throws "App context is not available" when there is no app context. `useTranslationRef` still needs the error and translation APIs, so the card renders without app context but not without an API context.
- `Progress` from `@backstage/frontend-plugin-api` renders an empty placeholder when the swappable components API is missing, so swapping it in directly could lose the spinner in old frontend system apps. Recommendation: keep the app's own `Progress` when an app context exists, and fall back to `Progress` from `@backstage/core-components`, which is already a dependency.
- `plugins/notifications` does not depend on `@backstage/plugin-home-react` yet. Adding it changes `package.json` and `yarn.lock`.
- `plugins/home-react` has no tests, no `setupTests.ts` and no testing dev dependencies.
- `packages/app` sets `packages: all`, so the widget is discovered. `app-config.yaml` sets `page:home.defaultConfig`, and the grid then shows only configured widgets, so the card appears in the Add Widget dialog but not on the default layout.

## Goal

Brief:

After: the home page shows an "Unread notifications" card listing the latest unread items with mark-as-read, and each item links to the highlighted notification.

## Files in scope

Brief:

Where the work lands: plugins/notifications (new card component; deep-link handling so /notifications?id= highlights the item; live refresh via the signals plugin with a polling fallback when signals are unavailable; new-frontend-system widget registration), plus a small change in plugins/home-react so card extensions can render without app context.

Proposed allowlist, including companion files:

- `plugins/notifications/src/**`
- `plugins/notifications/package.json`
- `plugins/notifications/README.md`
- `plugins/notifications/report.api.md`
- `plugins/notifications/report-alpha.api.md`
- `plugins/home-react/src/**`
- `plugins/home-react/package.json`
- `plugins/home-react/report.api.md`
- `plugins/home-react/report-alpha.api.md`
- `.changeset/*.md`
- `yarn.lock`
- `docs/notifications/usage.md`
- `docs/getting-started/homepage.md`

## Files off-limits

Project defaults from `.sdlc/project.json`: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`

Detected AI setup: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`

Proposed from discovery: `**/node_modules/**`, `**/dist/**`, `dist-types/**`, `packages/*/src/schema/openapi/generated/**`, `plugins/*/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `docs-ui/src/utils/theme-switcher.ts`

Proposed for this job: `plugins/notifications-backend/**`, `plugins/notifications-common/**`, `plugins/notifications-node/**`, `plugins/signals/**`, `plugins/signals-react/**`, `plugins/home/**`, `packages/app/**`, `packages/app-legacy/**`, `app-config.yaml`, `docs/releases/**`, `docs/notifications/usage--old.md`, `**/CHANGELOG.md`

## Acceptance criteria

Brief:

Acceptance criteria: jsdom tests for rendering, mark-as-read, signal-triggered refresh and the polling fallback; subscriptions and timers are cleaned up; yarn tsc and lint pass.

Tests: jsdom unit tests.

Repository rules that also apply (from `AGENTS.md`, not part of the brief):

- New source files carry the Apache 2.0 header with the current year.
- Each published package that changes gets its own changeset, written for adopters.
- Documentation covers the new behavior, and API reports are regenerated with `yarn build:api-reports`.

## Non-goals

Proposed, inferred from where the brief says the work lands:

- Backend, database or notification API changes.
- A card for the old frontend system (`createCardExtension` in `plugins/notifications/src/plugin.ts`). The brief names new-frontend-system widget registration only.
- Changes to `plugins/home`.
- Adding the card to the example apps' default layout in `app-config.yaml`. Confirmed at Gate 0: the card appears under Add Widget.

## Gate 0 record

Gate 0 was answered on 2026-11-01: approved, with changes. The user's reply, word for word:

> Relay this as written and do not ask me to choose a scope. Gate 0: approved, with these changes. Record them in intent_brief.md.
>
> 1. Check command. Use this exact line for the baseline and the end-of-run checks:
> CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all
> Run its three parts separately, so tsc and lint still run when the tests fail. At this base the test command gives 912 passed, 2 failed. Both failures are "should save and load notification settings" in plugins/notifications-backend, on POSTGRES_9 and POSTGRES_11. They were there before this run, so do not fix them and do not count them as this run's failures. Docker is running. Regenerate API reports with yarn build:api-reports as a separate step.
>
> 2. Google project. Use temp-genmedia-study. This session was restarted with that project, so run the free pre-flight again and confirm it reports temp-genmedia-study before any dispatch.
>
> 3. Auth is vendor, policy is flash-agsdk-only-v38, intent is feature-new. Accept the stack and the off-limits list. The regulated-repo warning is fine, because the only signal is SECURITY.md. Answer no to the .gitignore question.
>
> 4. Accept your allowlist. Accept your deep-link recommendation and your useApp recommendation. Keep app-config.yaml out of scope, so the card appears under Add Widget.
>
> 5. Run constraint: do not look at upstream backstage/backstage#34869, its merge commit, or master, and do not base anything on that PR. Work only from this branch's code and the brief. This binds every phase and every model, the Gemini worker included.

The two recommendations accepted in item 4, as they stand in Context above, are now requirements of this run:

- Deep link: the page looks up a `?id=` with `getNotification`, shows it even when the filters would hide it, and treats a failed lookup as nothing to highlight rather than a page error.
- `useApp`: `CardExtension` keeps the app's own `Progress` when an app context exists, and falls back to `Progress` from `@backstage/core-components`.

Pre-flight after the restart (free, no model call): `ok: true`, `vendor`, `flash-agsdk-only-v38`, project `temp-genmedia-study`, location `global`.

Write contract: frozen with the allowlist and off-limits lists above, 13 and 34 patterns.
