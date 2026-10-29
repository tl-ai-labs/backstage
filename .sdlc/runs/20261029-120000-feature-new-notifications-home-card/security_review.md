# Security Review — pass1

Mode: brownfield, intent feature-new, scope: the 23 files in `provenance.json` (diff against `fe6ace679f34`).

## Summary

This change is frontend only. It adds an unread notifications home card, used by both frontend systems, and an `?id=` deep-link highlight on the notifications page. It also makes `CardExtension` in home-react fall back to the default `Progress` when there is no app context. No new routes, auth, secrets, PII fields or audit paths were added. All data access goes through the existing `NotificationsClient`, which URL-encodes the id. The backend `GET /notifications/:id` handler limits results to the calling user (`getUser(req)` passed to `store.getNotifications`), so an attacker-chosen `?id=` value cannot read another user's notification. The new UI shows notification content as escaped React text and never uses `payload.link`, so there is no `javascript:` URL or HTML injection path. The only dependency change is an internal workspace package. No blocking findings.

## Findings

| Severity | Category               | Location                                                                                     | Issue                                                                                                                                                                                                                                                                                                                                                  | Recommendation                                                            |
| -------- | ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Info     | Surface / availability | plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx:119 | `pollingIntervalMs` is passed to `setInterval` without a lower bound. A value of 0 or a very small one makes the card poll the backend as fast as each request completes (the `!loading` check stops requests from overlapping). Only the adopter's code or card config sets this value, never end users. Confidence: high that it is non-exploitable. | Optional: clamp to a minimum such as `Math.max(pollingIntervalMs, 5000)`. |
| Info     | Input handling         | plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx:145-162         | `?id=` from the URL is passed to `api.getNotification`. The client encodes it with `encodeURIComponent` (NotificationsClient.ts:76) and the backend scopes the lookup to the caller, so there is no IDOR or path injection. Errors are swallowed to `undefined`, so no backend error detail is shown.                                                  | None required.                                                            |

## Passing checks

- PII encryption / masking / PII audit ordering: n/a — not in the touched set (no PII fields, entities or serializers).
- Route guards / role + `reports_to` checks: n/a — no backend routes added. The card uses the existing user-scoped notifications API, and mark-as-read goes through the existing `POST /notifications/update`, which is scoped by `getUser(req)`.
- JWT secret / password hashing: n/a — not in the touched set.
- Audit log integrity: n/a — not in the touched set.
- Secrets in code: none in the changed source, tests, changesets or docs. The only credential-like string in `docs/notifications/usage.md` (`YOUR_BASE64_SHARED_KEY_TOKEN`, line 109) is an existing placeholder outside the diff.
- Test fixtures (`extensions.test.tsx`, `NotificationsPage.test.tsx`, `UnreadNotificationsCard.test.tsx`): no real credentials.
- Doc examples (README.md, usage.md, both changesets): only YAML/TSX config, no secrets.
- `.env.example` / `.env` gitignore: n/a — no config changes.
- Helmet / rate limiting / global error filter: n/a — no backend surface changed. On the frontend, errors render through `ResponseErrorPanel` (as before) and a generic translated toast.
- XSS: `payload.title` is rendered as a React text child. The link href is the route ref plus the `encodeURIComponent` id. `aria-current` and `className` are boolean-derived.
- home-react `useProgressComponent` try/catch: only falls back to a UI component, with no security effect.
- Dependency risk: `package.json` adds only `@backstage/plugin-home-react: workspace:^`, and `yarn.lock` changes only that workspace entry. No third-party packages were added or changed, so `npm audit` was not re-run (dependency posture unchanged).

## Required fixes before sign-off

- None.

## Noted (pre-existing, out of scope)

- None found in the code traced for this review.

Tool calls: 7
