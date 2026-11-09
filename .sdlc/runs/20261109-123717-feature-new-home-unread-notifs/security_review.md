# Security Review — pass1

Mode: brownfield, intent feature-new, run 20261109-123717-feature-new-home-unread-notifs. Scope: the 22 files in `provenance.json` (base `fe6ace679f3439ba2c5abf188a97dc5641a946f8`). Edited files were read as diffs and new files in full, all loaded with Bash.

## Summary
This change is frontend only. It adds an Unread notifications home page widget to `@backstage/plugin-notifications`, an `?id=` highlight on the notifications page, and a fallback in `@backstage/plugin-home-react` `CardExtension` for when no app context exists. It adds no backend routes, no auth code, no PII or audit storage and no secrets. All data comes from the existing `notificationsApiRef` client, which calls the notifications backend with the signed-in user's credentials, so the backend still limits results to the current user. The new untrusted inputs are handled safely. The `id` URL parameter is only compared for equality and is never rendered. The notification id in links is passed through `encodeURIComponent`. Notification titles and descriptions are rendered as escaped React text. Polling has a 10-second minimum. I found nothing blocking and only one informational note.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Info | Surface / error disclosure | plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx:116 | `ErrorPanel` shows the raw fetch error (message and details) on the home page card. This is the standard Backstage pattern, and the error comes from the user's own request, so the exposure is low. Confidence: high that this is acceptable. | No change needed. Optionally use `ResponseErrorPanel` or a message-only display if a compact card is preferred. |

## Passing checks
- Authz: no new routes or guards. The card uses the existing user-scoped notifications client (`getNotifications({ read: false })` and `updateNotifications({ ids: [id], read: true })`), and the backend enforces ownership.
- XSS / injection: `?id=` is used only in `notification.id === highlightedNotificationId` (NotificationsTable.tsx:202-217). The deep link uses `encodeURIComponent(notification.id)` (UnreadNotificationsCard.tsx:137). Payload fields are rendered as escaped React text, and there is no `dangerouslySetInnerHTML`.
- Resource use: polling only runs when signals are unavailable, is clamped to at least 10 s, and its interval is cleared on unmount. The signal subscription is also cleaned up on unmount.
- Fail-safe: the `useProgressComponent` try/catch in home-react extensions.tsx:132 only picks a loading spinner. It does not affect auth.
- Secrets: the secret-pattern grep over all new or edited source, test, doc and changeset files found nothing. Test fixtures use only placeholder entity refs (`user:default/guest`, `user:default/john`).
- Docs and changesets: no credentials or tokens in examples. The only config example disables an extension.
- Dependencies: the new runtime dependency is the workspace package `@backstage/plugin-home-react`. The other additions are devDependencies (`@backstage/test-utils`, `@testing-library/*`, `@backstage/types`). The yarn.lock diff adds no new third-party package versions. `yarn npm audit --environment production --severity high` for `@backstage/plugin-notifications` returned "No audit suggestions".
- PII encryption / masking (`government_id`, `bank_account`, `salary_base`): n/a, not in the touched set.
- Audit log integrity: n/a, not in the touched set.
- JWT secret / password hashing: n/a, not in the touched set.
- Helmet / rate limiting / global error filter: n/a, not in the touched set (frontend only).
- `.env.example` / `.env` gitignore: n/a, not in the touched set.

## Required fixes before sign-off
- None.

## Noted (pre-existing, out of scope)
- None observed in the touched diffs.

Tool calls: 6
