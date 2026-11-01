# Security Review — pass1

Mode: brownfield, intent feature-new. Scope: the touched set in `provenance.json`, diffed against `fe6ace679f3439ba2c5abf188a97dc5641a946f8`.

## Summary

No findings introduced by this run, and nothing blocks Gate 3. The change is frontend only: a home page widget, a `?id=` highlight on the notifications page, and a `CardExtension` refactor. No backend file changed. The one new input, the `?id=` query parameter, is URL-encoded by the client, goes to a user-scoped backend route, and its response is discarded unless the ids match. Notification content renders as React text, and the card never uses `payload.link`. The dependency checklist item does not pass as written: the audit reports 47 high/critical advisories. This run did not introduce them, because `yarn.lock` gained no third-party resolutions, so they are recorded under Noted. No baseline audit was run; that attribution rests on the lockfile diff.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| — | — | — | No findings introduced by this run. | — |

## Passing checks

- `?id=` path handling: `plugins/notifications/src/api/NotificationsClient.ts:76` applies `encodeURIComponent`, so `/` cannot leave the path segment. The exact values `.` and `..` are not encoded and normalize to the notifications list route, which is also user-scoped. That response has no matching `id` and is dropped by the check in `NotificationsPage.tsx`.
- Object-level authorization on the new read: `getNotificationHandler` in `plugins/notifications-backend/src/service/router.ts` uses `httpAuth` with `allow: ['user']`, and the store limits rows to `user = <caller>` or broadcast. A foreign id returns 404.
- Authorization on mark as read: `markReadSaved` filters `notification` rows by `user`, and broadcast read state is stored per user.
- No state change from a crafted link: `?id=` only triggers a GET, and marking as read needs an explicit click.
- XSS: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `window.open` or `window.location` in touched source. The card's only link target is the mounted route plus an encoded id.
- Signals: payloads are not rendered or trusted. A signal only triggers a refetch, as does the 60-second poll.
- Refresh rate: `useNotificationsRefresh` caps refreshes at one per 2 seconds and never overlaps them, even with a small `pollIntervalMs`.
- Error handling: the card and toast show fixed translated strings, and a failed highlight fetch is not displayed, so no server error text reaches the UI.
- `CardExtension` refactor: no auth or data-access logic involved; props passed to `Renderer` are unchanged.
- Secrets: the checklist grep, widened to `token`, had no matches in 18 scanned touched files. Test fixtures, docs and changesets hold no credentials.
- Routing dependency: the new `useSearchParams` call resolves to `react-router-dom` 6.30.3 and `@remix-run/router` 1.23.2, outside that advisory's `<=1.23.1` range. `react-router-dom` was already declared in the plugin's manifest.
- Manifest and lockfile: `yarn.lock` changed by 5 added lines, 0 removed, all inside two workspace blocks, with no `resolution:` or `checksum:` changes. `plugins/home-react/package.json` adds dev dependencies only. `plugins/notifications/package.json` adds one workspace dependency.
- PII handling: n/a — not in the touched set (no matches for the three field names).
- Audit log integrity: n/a — not in the touched set.
- JWT, password storage, guards on server routes: n/a — not in the touched set; no route added or changed.
- Helmet, rate limiting, global error filter: n/a — not in the touched set; no backend file changed.
- `.env.example` and `.env` handling: n/a — not in the touched set.

## Required fixes before sign-off

- None.

## Noted (pre-existing, out of scope)

- Dependency audit: `npm audit --omit=dev` cannot run here (`ENOLOCK`, this is a Yarn repo), so `yarn npm audit --environment production --severity high --recursive` was used. It reported 47 advisories: 42 high and 5 critical.
  - Critical: `handlebars` 4.7.9 (2), `proxy-addr` 2.0.7, `shell-quote` 1.10.0, `storybook` 10.4.1.
  - Treat these as repo-level counts. Both workspaces returned the same 47 and they include backend-only packages, so the numbers do not show what either plugin ships.
  - Not verified: which advisories are reachable at runtime. The audit needed several retries after socket errors; only the complete JSON runs were counted.
- `@remix-run/router` 1.3.2 remains in `yarn.lock` for another consumer. The notifications plugin does not resolve to it.

Tool calls: 7
