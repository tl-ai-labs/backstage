# Intent Brief — feature-new — Unread notifications home-page card

## Context

Backstage notifications are only visible on the notifications page or through the sidebar counter.
People who land on the home page every morning miss alerts that need action, such as a failed
scaffolder task, an error on an entity they own, or a broadcast from the platform team. There is no
notifications widget for the home page.

- Before: the home page shows no notifications. Unread items are only visible on the separate
  notifications page.
- After: the home page shows an "Unread notifications" card listing the latest unread items with
  mark-as-read. Each item links to the notification, highlighted on the notifications page.

Relevant existing code (from discovery):

- `plugins/notifications/src/api/NotificationsApi.ts`: `getNotifications({ read: false, limit, sort, sortOrder })` and `updateNotifications({ ids, read })`.
- `plugins/notifications/src/hooks/useNotificationsApi.ts`: async hook with `retry()`.
- `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx`: `useSignal('notifications')` → `retry()` live-refresh pattern.
- `plugins/notifications/src/components/NotificationsSideBarItem/NotificationsSideBarItem.tsx`: signal handling and a TODO about polling when signals are unavailable.
- `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx`: link rendering, `NotificationIcon`, `SeverityIcon`.
- `plugins/signals-react/src/hooks/useSignal.ts`: returns `{ lastSignal, isSignalsAvailable }`.
- `plugins/home-react/src/extensions.tsx`: `createCardExtension` and `CardExtension`, which calls `useApp()` unconditionally for `Progress`.
- `plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx`: new frontend system widget blueprint. Reference usage: `plugins/search/src/alpha.tsx`.

## Goal

1. Add an "Unread notifications" home card in `@backstage/plugin-notifications`:
   - It lists the latest unread notifications for the signed-in user, newest first, with a bounded count.
   - Each item has a mark-as-read action that removes it from the list.
   - Each item deep-links to `/notifications?id=<id>` on the notifications page.
   - It shows an empty state and an error state.
2. Live refresh: refetch when a `notifications` signal arrives. When signals are unavailable
   (`isSignalsAvailable === false`), fall back to interval polling. Clean up subscriptions and timers on unmount.
3. Deep-link handling: the notifications page reads `?id=` and highlights the matching notification
   (and makes sure it is shown even if it is not in the current filter or page).
4. Registration:
   - Old frontend system: export a card through `createCardExtension`.
   - New frontend system: register a `HomePageWidgetBlueprint` widget in `src/alpha.tsx`.
5. `plugins/home-react`: a small change so card extensions render without app context. `CardExtension`
   must not hard-fail when `useApp()` / app components are unavailable, and falls back to a default progress indicator.

## Files in scope

- `plugins/notifications/src/**`: the new card component folder (e.g. `components/UnreadNotificationsCard/`) plus its tests, `components/index.ts`, `index.ts`, `plugin.ts`, `alpha.tsx`, `translation.ts`, `hooks/**`, `components/NotificationsPage/**`, `components/NotificationsTable/**`.
- `plugins/notifications/package.json`: add `@backstage/plugin-home-react: workspace:^`.
- `plugins/notifications/README.md`
- `plugins/notifications/report.api.md`, `plugins/notifications/report-alpha.api.md`: regenerated only, never hand-edited.
- `plugins/home-react/src/extensions.tsx`, plus a new or existing test beside it.
- `plugins/home-react/report.api.md`: regenerated only, if the public API changes.
- `docs/notifications/usage.md`: home card section.
- `.changeset/*.md`: new changeset files for `@backstage/plugin-notifications` and `@backstage/plugin-home-react` (patch).
- `yarn.lock`: workspace dependency addition.

Gate 0 (approved 2026-10-29): auth mode `estimated`, policy `opus55-plus-sonnet55`. `.gitignore` was
declined, so it stays off-limits and the final report notes the missing `.sdlc/` entry. The frozen
allowlist names `plugins/home-react/src/extensions.test.tsx` as the home-react test file.

## Files off-limits

- Project defaults: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`
- AI configs: `.claude/**`, `.cursor/rules/**`, `.github/copilot-instructions.md`
- `plugins/notifications-backend/**`, `plugins/notifications-common/**`, `plugins/notifications-node/**`, `plugins/signals*/**`: no backend or common type changes.
- `docs/releases/**`
- ESLint, Prettier and TypeScript config files anywhere.
- `packages/app/**`, `packages/app-legacy/**`: no example-app wiring (see Non-goals).

## Acceptance criteria

- jsdom (React Testing Library, `screen` + `findBy*`, no test IDs) tests cover:
  - rendering the unread list, the empty state and the error state;
  - mark-as-read calls `updateNotifications({ ids: [id], read: true })` and the item disappears;
  - a `notifications` signal triggers a refetch;
  - with signals unavailable, polling refetches on an interval (fake timers);
  - the deep-link `href` is `/notifications?id=<id>`, and the notifications page highlights `?id=`;
  - unmount clears timers and subscriptions, with no refetch after unmount;
  - `CardExtension` renders without app context.
- `CI=1 yarn test plugins/notifications` and `CI=1 yarn test plugins/home-react` pass.
- `yarn tsc` and `yarn lint` pass.
- New source files carry the Apache-2.0 header dated 2026. Named exports only.
- API reports regenerated with `yarn build:api-reports`, and changesets written by hand for adopters.

## Non-goals

- No backend, database or REST API changes. No new signal types.
- No wiring into the example apps (`packages/app`, `packages/app-legacy`).
- No integration or e2e tests; jsdom unit tests only.
- No redesign of the existing notifications page beyond `?id=` highlighting.
