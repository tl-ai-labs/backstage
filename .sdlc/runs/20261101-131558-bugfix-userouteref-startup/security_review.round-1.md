# Security Review — pass1

Scope: brownfield, bugfix, run `20261101-131558-bugfix-userouteref-startup`. Baseline `2e8b88268c8a`. All 9 files in `provenance.json` were reviewed from the diff (new files in full). The list matches `git status`.

## Summary

No security defect was found in the touched set, and nothing here blocks Gate 3 on security grounds. The change is client-side route-resolution timing: a finalization signal on the route resolution proxy, plus a change to how both `useRouteRef` hooks behave before finalization. It adds no new sinks, storage, network calls, credentials or dependencies. The `#` placeholder is inert, and no real route is exposed before sign-in, because finalization runs only after the identity target is set and the final tree is built. The one Low finding is a test coverage gap on the sign-in path. It is verified by static trace only, because the test that should cover it times out.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | Authn (test coverage) | `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx:2079`, case `tolerates an unresolved route behind a sign-in page` | The only test of this change on the sign-in-gated path times out, so "placeholder before sign-in, real route after" has no passing runtime evidence. Likely cause, high confidence from reading only (test not run): `finalizeApp` awaits finalization inside an async `act`, but `onSignInSuccess` is `setIdentityApi` (`plugins/app/src/extensions/AppRoot.tsx:163`) and `setTarget` runs in the following render (`:166`), so the update cannot flush until the `act` callback ends. This is a test deadlock, not a product hang. May overlap the senior review's blocker in the same file. | Trigger sign-in in a sync `act()` and await `waitForFinalizedApp` outside it, as the existing sign-in test does at lines 1486-1495. Do not sign off on this path until the case passes. |

## Passing checks

- **Sign-in ordering:** `finalizeFromSessionState` sets the identity target, builds the final tree, then calls `markFinalized` (`prepareSpecializedApp.tsx:707`). Bootstrap resolution can only see bootstrap routes, so no route behind `app/root.children` resolves before sign-in.
- **Finalization paths:** direct `finalize()`, `onFinalized()` and the bootstrap-error path all reach `markFinalized` (`:707`, `:777`). If both finalizers throw, the placeholder stays but is inert, and the rejection still surfaces.
- **Placeholder safety:** `bootstrapRouteFunc` returns the constant `#` and ignores params, so there is no open-redirect or injection path. No `dangerouslySetInnerHTML`, `window.location`, storage, `fetch` or `postMessage` in added product code.
- **Error suppression is bounded:** `No path for` is suppressed only while the lifecycle reports not finalized. An API without the lifecycle signal counts as finalized and throws as before, so mismatched package versions keep the old behaviour.
- **Lifecycle exposure:** the `Symbol.for` key and the public `markFinalized` are reachable by plugins, but plugins share the same JS realm, so neither crosses a trust boundary. The worst case is an earlier error. The new symbols are not exported from the checked index files.
- **Listeners:** cleared on finalization and removed on unmount, so there is no retained-subscriber leak.
- **Secrets:** the checklist regex plus `token` found only `token: 'token'` in the test file (line 2087 is new; the rest are existing lines). That value is an obvious placeholder, and `user:default/test-user` is synthetic. No real credentials in fixtures.
- **Docs:** `docs/frontend-system/architecture/10-app.md` and `.changeset/quiet-routes-wait.md` contain no secrets or credential examples.
- **Dependencies:** no manifest or lockfile in the touched set, so unchanged and `npm audit` not run. `react`, needed by the new shared file, is already declared by all three packages.
- **PII handling:** n/a — not in the touched set (no `government_id`, `bank_account`, `salary_base`, or serializers).
- **Backend route guards, `reports_to`, JWT secret, password storage:** n/a — not in the touched set (frontend code, no auth endpoints or credential handling).
- **Audit log integrity:** n/a — not in the touched set.
- **`.env.example` / `.env`:** n/a — not in the touched set.
- **Helmet, rate limiting, global error filter:** n/a — not in the touched set (no server surface).

## Required fixes before sign-off

- None for security in product code.
- Fix the test deadlock above so the sign-in-gated path has passing runtime coverage. The suite failures in `createSpecializedApp.test.tsx` already need fixing under the senior review.

Tool calls: 7
