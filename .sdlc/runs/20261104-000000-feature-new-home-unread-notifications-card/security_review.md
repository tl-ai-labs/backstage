# Security Review — pass1

## Summary
Reviewed the 23 files touched in run `20261104-000000-feature-new-home-unread-notifications-card`, which adds the `HomePageUnreadNotifications` card extension and alpha widget to `@backstage/plugin-notifications`, adds deep-link row highlighting in `NotificationsPage`/`NotificationsTable`, and makes `AppContext` and `TranslationApi` optional in `@backstage/plugin-home-react` `CardExtension`. No security vulnerabilities were introduced. Deep-link query parameters (`?id=`) are URL-encoded with `encodeURIComponent` when constructed and used solely for strict ID equality checks and safe API lookups when read; all notification fields are rendered as escaped React text nodes; error handling avoids leaking sensitive details; and the manifest/lockfile diff adds only the internal workspace dependency `@backstage/plugin-home-react` (`workspace:^`).

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security findings introduced in the touched files. | None. |

## Passing checks
- **PII handling**: n/a — not in the touched set.
- **Authn & authz**: n/a — not in the touched set (frontend components consume the existing user-scoped `notificationsApiRef`).
- **Audit log integrity**: n/a — not in the touched set.
- **Secrets & config**: No hardcoded secrets, tokens, or credentials in touched source files, documentation examples (`docs/notifications/usage.md`, `plugins/notifications/README.md`, `.changeset/*.md`), or test fixtures (`HomePageUnreadNotifications.test.tsx`, `extensions.test.tsx`).
- **Surface & headers**: n/a — not in the touched set for backend HTTP headers/rate limiting; frontend deep-link parameters use `encodeURIComponent(notification.id)` and React text rendering, preventing DOM XSS, and failed mark-as-read actions display a generic translated toast message.
- **Dependency risk**: `plugins/notifications/package.json` and `yarn.lock` add only the internal monorepo workspace dependency `@backstage/plugin-home-react` (`workspace:^`), introducing no external packages (`npm audit` returned `ENOLOCK` as the repo uses Yarn `yarn.lock`).

## Required fixes before sign-off
- None.

Tool calls: 5
