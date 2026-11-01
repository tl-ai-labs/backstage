# Intent Brief — feature-new — Unread notifications home card

## Context

Backstage notifications are only visible on the notifications page or via a sidebar counter, so people who land on the home page every morning miss alerts that need action (a scaffolder task failed, an entity they own has an error, a broadcast from the platform team). There is no notifications widget for the home page.

Before: the home page shows no notifications; unread items are only visible on the separate notifications page.

Original request: Add a home-page card listing the signed-in user's latest unread notifications, updating live and deep-linking to each notification.

Branch context: this branch (`BS-NF-09/opus55-only`, HEAD `fe6ace679f34`) is 952 commits behind `origin/master`, which already contains an equivalent feature (`cd4a9c7ef56c`, upstream PR #34869). The work is built fresh at this HEAD. It is not a backport.

## Goal

The home page can show an "Unread notifications" card listing the latest unread items with mark-as-read, and each item links to the highlighted notification.

- `plugins/notifications`: new card component; deep-link handling so `/notifications?id=` highlights the item; live refresh via the signals plugin with a polling fallback when signals are unavailable; new-frontend-system widget registration.
- `plugins/home-react`: a small change so card extensions can render without app context.

No new storage, endpoint or background job: the existing notifications API already supports the `read`, `limit`, `sort` and `sortOrder` filters.

## Files in scope

- `plugins/notifications/src/**`
- `plugins/notifications/package.json`
- `plugins/notifications/report.api.md`
- `plugins/notifications/report-alpha.api.md`
- `plugins/notifications/README.md`
- `plugins/home-react/src/extensions.tsx`
- `plugins/home-react/src/extensions.test.tsx` (new)
- `plugins/home-react/src/setupTests.ts` (new, if the package needs it for the test)
- `plugins/home-react/package.json`
- `plugins/home-react/report.api.md`
- `plugins/home-react/report-alpha.api.md`
- `docs/notifications/usage.md`
- `.changeset/*.md` (new files only: one per package)
- `yarn.lock` (workspace dependency additions only)

## Files off-limits

- Project defaults from `.sdlc/project.json` `off_limits_default`
- Every AI config in `baseline.ai_configs_detected`
- `docs/releases/**`
- ESLint, Prettier and TypeScript configuration files
- `plugins/home/**`, `plugins/signals*/**`, `plugins/notifications-backend/**`, `plugins/notifications-common/**`, `plugins/notifications-node/**`
- `app-config.yaml`, `packages/app/**`, `packages/app-legacy/**`

## Acceptance criteria

- jsdom tests cover rendering, mark-as-read, signal-triggered refresh and the polling fallback.
- Subscriptions and timers are cleaned up on unmount.
- Each card item links to `/notifications?id=<id>`, and that page highlights the item.
- The card keeps refreshing by polling when signals are unavailable.
- Card extensions in `plugins/home-react` render without app context, and existing card behaviour is unchanged.
- `yarn tsc` and lint pass.
- Changesets exist for both published packages, API reports are regenerated, and `docs/notifications/usage.md` documents the card.

## Non-goals

- Integration or end-to-end tests: jsdom unit tests only.
- Backend, API or storage changes.
- Adding the card to the example app's default home layout: it stays available as a widget.
- A legacy frontend system export of the card: the requested registration is new-frontend-system only.
- Merging or rebasing onto `origin/master`.

## Gate 0 outcome

Approved as proposed. Auth mode `estimated`, policy `opus55-only`. `.sdlc/` is not added to `.gitignore` in this run; note this in the final report.
