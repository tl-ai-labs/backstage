# Security Review — pass1

Mode: brownfield, intent: bugfix, run `20261031-120000-bugfix-approot-routeref`. Scope: the touched set in `provenance.json`, diffed against `git_head_before` `af1816e46e1b02e034b8bb5e3c75ba698cf7b6e0`. The provenance entry whose path is five file paths joined by spaces (packet `orchestrator_redcheck_restore`) is not a real file and was ignored. Its five paths are all listed on their own as well.

## Summary
The change is frontend-only. It adds an optional finalization signal to `RouteResolutionApi` (`isFinalized?`, `onFinalized?`) and implements it on the internal `RouteResolutionApiProxy`. `prepareSpecializedApp` calls `markFinalized()` on its two finalization paths. Both `useRouteRef` hooks subscribe to the signal and work out the route again once the app is finalized. Before then, the core hook returns `''` instead of throwing. The change has no auth, PII, audit, secret, config, header, or dependency surface. `RouteResolutionApiProxy` is not exported from the `frontend-app-api` entry point or its API report, so plugin code cannot call `markFinalized()`. Plugin code can only read the state and subscribe to it. No security findings were introduced by this run.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Info | Robustness | `packages/frontend-app-api/src/wiring/phaseApis.tsx` (`markFinalized`, listener loop) | If one listener throws, the listeners after it are not called, and the error goes up through `finalizeFromSessionState` / `finalizeFromBootstrapError`. Today the only listeners are React `setState` calls, which do not throw, so the risk is low. This is not a security issue. | Optional: wrap each listener call in try/catch so one bad listener cannot stop finalization. |
| Info | Behavior | `packages/core-plugin-api/src/routing/useRouteRef.tsx` (`bootstrapRouteFunc`) | During bootstrap the core hook returns `() => ''`, so `href=""` points at the current page. No open-redirect or injection risk, because the value is a constant empty string. | None needed. This is documented in TSDoc, the changeset and `docs/frontend-system/architecture/10-app.md`. |

## Passing checks
- Authz/guards: the new mutating method `markFinalized()` exists only on the internal proxy, which is not in the public exports or `report.api.md`. The public interface adds only read and subscribe methods.
- Listener lifecycle: `onFinalized` returns an unsubscribe that the hooks' `useEffect` cleanup calls. The listener set is cleared after it fires, and late subscribers get a no-op, so no listeners leak.
- Secrets in source and docs: none in the diff. The `10-app.md` example and the three new changesets contain no credentials.
- Test fixtures: the only credential-like value is the placeholder `getCredentials: async () => ({ token: 'token' })` in a touched test diff. It is not a real credential.
- PII encryption / response masking / audit log integrity: n/a — not in the touched set.
- JWT secret / password hashing / rate limiting on auth endpoints: n/a — not in the touched set.
- Helmet / global error filter: n/a — frontend-only change. No server middleware is touched.
- `.env.example` / `.gitignore`: n/a — not in the touched set.
- Dependency risk: unchanged. No manifest or lockfile is in the touched set, so `npm audit` was not run.

## Required fixes before sign-off
- None.

## Noted (pre-existing, out of scope)
- None observed in the touched files.

Tool calls: 5
