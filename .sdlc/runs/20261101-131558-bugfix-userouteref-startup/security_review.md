# Security Review — pass2

Scope: brownfield, bugfix, run `20261101-131558-bugfix-userouteref-startup`. Baseline `2e8b88268c8a`. All 9 files in `provenance.json` were re-read from the diff (new files in full). The list matches `git status`.

Only the test file changed since pass 1. All 9 files match their `sha_after` in `provenance.json`. Only `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` has a modified time after pass 1 was written (08:55:59 UTC against 08:38:53 UTC). The other 8 were last written by 08:26:36 UTC.

## Summary

**The Low finding on the sign-in path from pass 1 is resolved.** There are no open security findings, and nothing here blocks Gate 3 on security grounds. The only change since pass 1 is test code, so the product posture is the same: client-side route-resolution timing with no new sinks, storage, network calls, credentials or dependencies. The sign-in path and the bootstrap-error path now both have passing runtime coverage.

## Pass 1 finding: resolved

| Pass 1 finding | Status | Evidence |
|---|---|---|
| Low, Authn (test coverage): the sign-in-gated case timed out, so "placeholder before sign-in, real route after" had no passing runtime evidence. | **Resolved** | `finalizeApp` (`createSpecializedApp.test.tsx:2022`) now fires the trigger in a synchronous `act`, so the `setIdentityApi` update flushes before the async `act` that awaits finalization starts. That removes the deadlock pass 1 identified. The case `tolerates an unresolved route behind a sign-in page` (now line 2084) asserts `Core route: #` before sign-in and `Core route: /target` after it, with no errors posted. The orchestrator reports it passing in the `during.app.bootstrap` run, 6 of 6 together. I read the test and did not re-run it, as instructed. |

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | | | No findings in this pass. | |

## Passing checks

- **Sign-in ordering:** unchanged. `finalizeFromSessionState` builds the final tree and then calls `markFinalized` (`prepareSpecializedApp.tsx:707`). The sign-in case now confirms at runtime that the route stays `#` before sign-in.
- **Bootstrap-error path:** a rejected loader goes to `finalizeFromBootstrapError` (`prepareSpecializedApp.tsx:874-882`) and never reaches line 707, so only `markFinalized` at line 777 can end the tolerance there. The new case `ends the tolerance when finalization fails` (line 2256) relies on exactly that, and it asserts the `No path for` error is posted and the placeholder is gone.
- **Both finalizers throw:** unchanged. The placeholder stays but is inert, and the rejection surfaces (`:885-888`). This remains a static trace, with no test.
- **Placeholder, error suppression, lifecycle exposure, listeners:** product code is unchanged since pass 1, and those results stand.
- **New test fixtures:** `authorize` is a mock that rejects with a synthetic error, and `test.gated` is a made-up permission. `localPermissionApiRef` is an existing export of the same package (`predicates.ts:68`).
- **Secrets:** the checklist regex plus `token` finds only `token: 'token'` in the test file (line 2092 is new, the rest are existing lines). That value is an obvious placeholder, and `user:default/test-user` is synthetic. No real credentials in fixtures.
- **Docs:** `docs/frontend-system/architecture/10-app.md` and `.changeset/quiet-routes-wait.md` are unchanged and contain no secrets.
- **Dependencies:** no manifest or lockfile in the touched set, so unchanged and `npm audit` not run. The new import is from within the same package.
- **PII handling:** n/a — not in the touched set.
- **Backend route guards, `reports_to`, JWT secret, password storage:** n/a — not in the touched set.
- **Audit log integrity:** n/a — not in the touched set.
- **`.env.example` / `.env`:** n/a — not in the touched set.
- **Helmet, rate limiting, global error filter:** n/a — not in the touched set.

## Noted (out of scope, does not gate)

- `.sdlc/` is untracked and not gitignored, so a broad `git add` would pick up the run records, including `evidence/mutate-markfinalized.js`. That script contains no credentials, and it patches `fs.readFileSync` only in a process that loads it through `NODE_OPTIONS`. Keep the run folder out of any commit. I did not read `evidence/preload.log` beyond its line count.
- `evidence/marker.txt` shows one process applied the mutation in memory. The result of that run was not in my inputs, so this review does not confirm R-7. The static trace above shows the case depends on line 777.

## Required fixes before sign-off

- None.

Tool calls: 7
