# Security Review — pass1

## Summary
Reviewed all touched files in run `20261104-093718-feature-new-home-unread-notifs` (including `plugins/notifications/report.api.md`). The change is pure frontend UI, tests, API reports, documentation, and workspace manifest updates for the `UnreadNotificationsCard` home widget and `?id=` notification row highlighting. All user-controlled and notification data values are rendered safely via React text nodes, query parameter construction uses `encodeURIComponent(notification.id)` and strict equality (`===`) for row matching, and error handling uses a static translated toast message without leaking internal details. No security vulnerabilities or regressions were introduced.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security findings introduced by this run. | — |

## Passing checks
- **PII handling**: n/a — not in the touched set (frontend notification widget and table highlighting do not handle `government_id`, `bank_account`, or `salary_base` storage/encryption).
- **Authn & authz**: n/a — not in the touched set (no backend controller routes, guards, JWT secrets, or password hashing touched; frontend widget uses the existing authenticated `notificationsApiRef`).
- **Audit log integrity**: n/a — not in the touched set (no audit log tables or backend mutation handlers touched).
- **Secrets & config**: Passed — no hardcoded secrets, API keys, or credentials in touched source files (`UnreadNotificationsCard.tsx`, `NotificationsPage.tsx`, `NotificationsTable.tsx`, `alpha.tsx`, `translation.ts`, `extensions.tsx`), test fixtures (`UnreadNotificationsCard.test.tsx`, `NotificationsPage.test.tsx`, `extensions.test.tsx`), or documentation/API reports (`README.md`, `usage.md`, `report.api.md`, `report-alpha.api.md`, `.changeset/*.md`).
- **Surface & headers (XSS / URL injection / error sanitization)**: Passed — notification titles and descriptions are rendered as React text children without `dangerouslySetInnerHTML`; `notification.id` is URL-encoded with `encodeURIComponent` when building `/notifications?id=<id>` links and compared with `===` when highlighting rows; mark-as-read errors surface a sanitized translated toast message.
- **Dependency risk**: Passed — `plugins/notifications/package.json`, `plugins/home-react/package.json`, and `yarn.lock` only link existing internal `workspace:^` packages (`@backstage/plugin-home-react`, `@backstage/frontend-test-utils`) and existing repo-wide `@testing-library/*` devDependencies with no new external dependencies added (`npm audit` returned `ENOLOCK` as the repo uses Yarn Berry `yarn.lock`).

## Required fixes before sign-off
- None.

Tool calls: 5
