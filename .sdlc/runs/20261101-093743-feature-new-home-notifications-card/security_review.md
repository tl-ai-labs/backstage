# Security Review — pass1

Mode: brownfield, intent `feature-new`, scoped to the 25 files in `provenance.json`, diffed against `0f2ce9c8dc91`.

## Summary

No security findings were introduced by this run, and nothing blocks Gate 3 on security grounds. The change is frontend only: a home page widget, a `?id=` lookup on the notifications page, and a home-react fallback for a missing app context. The one new untrusted input is the `?id=` query parameter. It is URL-encoded by the client and only drives an authenticated GET that is scoped to the caller. The value is compared with the response before anything is rendered, and it does not change any state. The strict dependency check does not pass: `npm audit` cannot run on this repo, and the Yarn equivalent reports 47 high or critical advisories. This run changes no external package or version, so those are recorded as pre-existing below, but they were not compared against a baseline audit.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No findings introduced by this run. | — |

## Passing checks

- **`?id=` to request path:** `plugins/notifications/src/components/NotificationsPage/NotificationsPage.tsx` passes the value to `getNotification`, and the existing client wraps it in `encodeURIComponent`, so a `/` cannot traverse to another backend path. `?id=..` can only normalise to the caller's own list route, and the `lookedUp?.id === highlightedId` check discards that response.
- **Ownership on lookup:** `GET /notifications/:id` requires user credentials and calls `getNotifications` with the caller's `user`. The query groups `user = caller OR user IS NULL` and ANDs it with `whereIn('id', ids)`, so another user's notification returns 404, matching `docs/notifications/usage.md`. Broadcasts are visible to everyone by design. This comes from reading the code; the run's own tests mock this API.
- **No state change from a crafted link:** opening `?id=` only reads. Mark-as-read needs an explicit click and goes through the user-scoped update route.
- **Link and content rendering:** the highlighted block reuses the existing table renderer. `payload.link` goes through the core `Link`, which rejects `javascript:` URLs, and the backend accepts only http and https links. The components use no `dangerouslySetInnerHTML` or markdown rendering, so title and description are escaped by React.
- **Widget link:** `plugins/notifications/src/components/UnreadNotificationsCard/UnreadNotificationsCard.tsx` builds an internal link with `encodeURIComponent` and never navigates to `payload.link`.
- **Error surface:** failed lookups are swallowed without display. The card uses the same `ResponseErrorPanel` as the existing page.
- **Secrets:** the regex (extended with `token` and `:`) found no hits in touched source, tests, docs, or changesets. The remaining touched files were read in the diff, with none found.
- **Fixtures:** test files use only placeholder values such as `user:default/john` and no real credentials.
- **Runtime dependency:** `react-router-dom` was already declared by `plugins/notifications/package.json`. It resolves to 6.30.3 with `@remix-run/router` 1.23.2, outside the advisory range (`<=1.23.1`), so the new `useSearchParams` call is unaffected.
- **Dependency diff:** `yarn.lock` changes workspace dependency lists only, with 0 `version`, `resolution`, or `checksum` lines changed. No new external package or version enters the tree.
- **`plugins/home-react/src/extensions.tsx`:** the fallback only swaps the progress component and has no security effect.
- **PII handling and masking:** n/a — not in the touched set.
- **Authn and authz, JWT, password storage:** n/a — no backend, guard, or auth code touched. The route the lookup relies on was traced above.
- **Audit log integrity:** n/a — not in the touched set.
- **`.env` handling and config:** n/a — not in the touched set.
- **Helmet, rate limiting, global error filter:** n/a — not in the touched set.

## Noted (pre-existing, out of scope)

- **Dependency audit does not meet the checklist bar.** `npm audit --omit=dev` fails with `ENOLOCK` because the repo has only `yarn.lock`. `yarn workspace <name> npm audit --environment production --severity high --recursive` exits 1 for both touched workspaces, with 42 high and 5 critical entries.
  - Critical: `handlebars`, `proxy-addr`, `shell-quote`, `storybook`.
  - High: `@azure/msal-node`, `@grpc/grpc-js`, `@remix-run/router` (1.3.2, via the `react-router-dom-stable` alias), `adm-zip`, `body-parser`, `brace-expansion`, `compression`, `follow-redirects`, `js-yaml`, `launch-editor`, `markdown-it`, `nanoid`, `node-forge`, `source-map-js`, `storybook`, `undici`, `webpack-dev-middleware`, `zod`.
  - Limits of this result: "pre-existing" rests on the lockfile diff, because no audit was run at the baseline. The two workspaces returned identical sets that include dev tooling, so the list is not a reachability statement for either package.
- **`plugins/notifications-backend/src/database/DatabaseNotificationsStore.ts`, `getNotification`:** it filters on `id` only. No route in `router.ts` calls it and the lookup in this run does not use it, but it would be an ownership gap if a route were wired to it.
- **`plugins/notifications-backend/migrations/20231215_init.js`:** `id` is a `uuid` column, so on Postgres a non-UUID `?id=` probably fails in the database instead of returning 404. Not executed; medium confidence. The new client code catches the failure, and the same request was already possible by calling the API directly.

## Required fixes before sign-off

- None from this run.

Tool calls: 9
