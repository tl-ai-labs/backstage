# Security Review — pass2 (brownfield, bugfix, re-review after Gate 3 revise)

## Summary

This review covers only the 8 files in `provenance.json`, plus the regenerated `packages/frontend-plugin-api/report.api.md`, read as a diff against `2e8b88268c`. The change is a frontend routing fix. It adds optional `subscribe` and `isPending` methods to `RouteResolutionApi`, adds a listener set and a pending flag to `RouteResolutionApiProxy`, and makes both `useRouteRef` hooks re-resolve routes when those change. It does not touch authentication, authorization, PII, audit, secrets, HTTP surface or dependencies. No security findings. The pass1 correctness note is closed: `packages/core-plugin-api/src/routing/useRouteRef.tsx` now checks `isPending()` again after it subscribes (lines 109-123), in the same way as the frontend-plugin-api hook.

## Findings

| Severity | Category | Location | Issue        | Recommendation |
| -------- | -------- | -------- | ------------ | -------------- |
| —        | —        | —        | No findings. | —              |

## Pass1 note status

- **Confirmed fixed.** In packages/core-plugin-api/src/routing/useRouteRef.tsx:109-123, the hook captures `isPending` at render. After it subscribes, the effect bumps `revision` if `routeResolutionApi?.isPending?.()` differs, and `isPending` is in the effect deps. This matches packages/frontend-plugin-api/src/routing/useRouteRef.tsx:48-62. One gap remains and it is theoretical: the check compares only the pending flag, so an `initialize` call that does not change the flag would still be missed. The current code calls `initialize` once while pending at bootstrap and once not pending at finalization, so that case does not occur. Does not gate.

## Passing checks

- PII encryption, masking, audit-before-access: n/a, not in the touched set.
- Route guards, role and `reports_to` checks, JWT secret, password hashing: n/a, not in the touched set (client-side route resolution only).
- Audit log append-only, read access, entry fields: n/a, not in the touched set.
- Secrets in code: none in the diff. The test fixture uses a placeholder `token: 'token'` and the `user:default/test-user` identity, which are not real credentials.
- Docs (`03-built-in-extensions.md`) and both changesets: no secrets or credentials in examples.
- `.env.example` and `.env` gitignore: n/a, no config touched.
- Helmet, rate limiting, error filter: n/a, no server surface touched.
- Listener handling (`phaseApis.tsx`): a copy of the set is iterated, listener errors are caught and logged, and both hooks unsubscribe on cleanup. No leak or re-entrancy risk.
- Error suppression: `No path for` is suppressed only while `isPending()` is true. Finalization sets it back to false, so errors after the app has loaded still fire as before.
- Dependency risk: no manifest or lockfile in the touched set, so dependencies are unchanged and `npm audit` was not run.

## Required fixes before sign-off

- None.

Tool calls: 3
