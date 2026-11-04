# Security Review — pass2

## Summary
Scoped brownfield security re-review after Gate 3 fix round 4 for run `20261104-005757-feature-new-home-unread-notifications-card`. Fix round 4 updated `plugins/notifications/src/components/NotificationsTable/NotificationsTable.tsx` (removed `.highlighted` className on the first cell so only `rowStyle` highlights the row, plus Prettier formatting), restored `plugins/notifications/src/components/NotificationsTable/NotificationsTable.module.css` to its pre-run state (empty diff), and applied Prettier formatting to `plugins/notifications/src/components/HomePageUnreadNotifications/HomePageUnreadNotifications.tsx`. No security vulnerabilities or hardcoded secrets are present in the final touched set.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security issues found in the touched set. | — |

## Passing checks
- PII handling: n/a — not in the touched set.
- Authn & authz: n/a — not in the touched set (frontend components use authenticated `notificationsApiRef`).
- Audit log integrity: n/a — not in the touched set.
- Secrets & config: No secrets or credentials in touched source files, test fixtures (`HomePageUnreadNotifications.test.tsx`, `extensions.test.tsx`), or documentation/changesets (`docs/notifications/usage.md`, `docs/notifications/usage--old.md`, `plugins/notifications/README.md`, `.changeset/*.md`).
- Surface & headers: n/a for backend middleware — in touched frontend components, `notification.id` is URL-encoded with `encodeURIComponent` (`HomePageUnreadNotifications.tsx:147`), row highlighting uses a static CSS variable in `rowStyle` (`NotificationsTable.tsx:312-318`), and notification fields are rendered as React text nodes.
- Dependency risk: `plugins/notifications/package.json` and `yarn.lock` only add `"@backstage/plugin-home-react": "workspace:^"` (internal workspace package; no new external dependencies).

## Required fixes before sign-off
- None

Tool calls: 14
