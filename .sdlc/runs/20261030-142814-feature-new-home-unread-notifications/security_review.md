# Security Review — pass1

Mode: brownfield · intent: feature-new · base `8b5ba7f431` · scope: the 19 files in `provenance.json`

## Summary

This change only touches the frontend. It adds a home-page widget that lists the signed-in user's unread notifications and has a per-item "mark as read" action. It also adds a `?id=` deep-link highlight to the notifications page and swaps the `CardExtension` loading indicator from `useApp().getComponents().Progress` to the `Progress` component from `@backstage/core-components`. All data access goes through the existing `notificationsApiRef` client (`getNotifications`, `updateNotifications`), so the backend notifications service keeps handling identity and per-user scoping as before. No route, guard, backend handler, auth flow, secret or config changed. The untrusted `id` query parameter is only compared for equality with notification IDs and never reaches the DOM. Notification IDs in the card's links go through `encodeURIComponent`. Titles are rendered as React text, so they are escaped. Error states show fixed translated strings, not raw error messages. The lockfile diff adds no new third-party resolutions: it only adds a workspace runtime dependency and test-only devDependencies. I found no blocking issues.

## Findings

| Severity | Category                | Location                                                                                         | Issue                                                                                                                                                                                                                                                                                                             | Recommendation                                                                                                                         |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Info     | Surface / data exposure | `plugins/notifications/src/alpha.tsx:50-69`                                                      | The widget is enabled by default when the plugin is installed. Users can add it from the Add Widget dialog, and it shows notification titles on the home page, which may be a more visible screen than `/notifications`. It shows only the user's own data, so there is no cross-user exposure. Confidence: high. | No code change needed. The README already documents how to turn it off (`home-page-widget:notifications/unread-notifications: false`). |
| Info     | Availability            | `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx:79-88` | Without signals, the card requests `getNotifications` every 60 seconds per open tab, including hidden tabs. Each request is bounded (`limit: 5`), so this is not a DoS risk.                                                                                                                                      | Optional: skip polling while `document.hidden`.                                                                                        |

## Passing checks

- PII encryption / masking / audit-before-access: n/a. There are no PII fields, serializers or audit tables in the touched set, and backend packages are untouched.
- Every route guarded / role + `reports_to`: n/a. No backend routes were added. The frontend calls the existing `notificationsApiRef` client, and the backend applies the per-user filter.
- Input handling: `searchParams.get('id')` (`NotificationsPage.tsx:84-85`) is only used in `notification.id === highlightedNotificationId` and is never inserted into the DOM. The card's links use `encodeURIComponent(notification.id)` (`UnreadNotificationsCard.tsx:145`), and titles are rendered as escaped JSX text. I found no `dangerouslySetInnerHTML`.
- Error sanitization: the card's error state and failure toast use fixed translation keys (`unreadNotificationsCard.errorMessage` / `markAsReadFailed`). No raw error text is shown.
- JWT / password storage / Helmet / rate limiting / audit log append-only: n/a. Not in the touched set.
- Secrets in source: none. The new source and test files contain no `api_key|secret|password = '...'` style literals (I checked the full content of each new file).
- Test fixtures (`extensions.test.tsx`, `alpha.test.ts`, `NotificationsPage.test.tsx`, `UnreadNotificationsCard.test.tsx`): only synthetic IDs and entity refs (`user:default/john`), no real credentials.
- Docs and changesets (`docs/notifications/usage.md`, `plugins/notifications/README.md`, two `.changeset/*.md`): the YAML examples contain only layout config, with no secrets or tokens.
- `.env.example` / `.env` gitignore: n/a. Not in the touched set.
- Dependencies: the manifests and `yarn.lock` were touched, so this check applies. The lockfile diff only adds dependency edges to resolutions that already exist: the runtime `@backstage/plugin-home-react@workspace:^` in plugin-notifications, plus devDependencies `@backstage/test-utils`, `@testing-library/{dom,jest-dom,react}` in plugin-home-react. It adds no new npm resolution blocks, so no new third-party code enters the production tree. I did not run `npm audit --omit=dev`: this is a Yarn Berry workspace, and with no new resolutions in the diff the result would match the base commit. The `npm audit` checklist item is therefore unverified for this pass and should be recorded as "unchanged from base", not as "clean".

## Required fixes before sign-off

- None.

Tool calls: 5
