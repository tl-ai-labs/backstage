# Security Review — pass1

Mode: brownfield, intent: bugfix, run `20261031-162121-bugfix-approot-routeref`, scoped to `provenance.json` touched set (base `554df45cad`).

## Summary

This change only affects how frontend routes are resolved in the browser. `RouteResolutionApi` gets two optional methods, `subscribe` and `isReady`. `RouteResolutionApiProxy` gets a listener set and a ready flag. Both `useRouteRef` hooks (frontend and core) now re-resolve once the app is finalized, and the core hook returns a placeholder link while the app is starting. The change adds no network calls, credentials, storage, auth logic, or dependencies. No security findings were introduced. The posture is unchanged.

## Findings

| Severity | Category | Location | Issue                        | Recommendation |
| -------- | -------- | -------- | ---------------------------- | -------------- |
| —        | —        | —        | None introduced by this run. | —              |

Advisory notes (not findings, they do not block):

- `packages/frontend-app-api/src/wiring/phaseApis.tsx` (`initialize`): a listener that throws stops the remaining listeners from running. This is a robustness issue, not a security issue. The listeners only run `setState`. Confidence that this has no security impact: high.
- `packages/core-plugin-api/src/routing/useRouteRef.tsx`: until the app is ready, the placeholder link resolves to the current `pathname`. That is same-origin and taken from the router location, so it adds no open-redirect or injection surface.

## Passing checks

- PII encryption / masking / audit-before-access: n/a, not in the touched set (no PII fields, serializers, or audit code).
- Route guards, role/`reports_to` checks: n/a, these are client-side routing hooks, not backend routes.
- JWT secret / password hashing: n/a, not in the touched set.
- Audit log integrity: n/a, not in the touched set.
- Hardcoded secrets: none in the touched source, test, `report.api.md`, or the two new `.changeset/*.md` files.
- Test fixtures (`createSpecializedApp.test.tsx`): no real credentials. It uses only route IDs and paths.
- Docs/changesets: no secrets in examples.
- `.env.example` / `.env` gitignore: n/a, not touched.
- Helmet / rate limiting / error filter: n/a, not in the touched set.
- Dependency risk: no manifest or lockfile touched. Dependencies are unchanged and `npm audit` was not run, as instructed.

## Required fixes before sign-off

- None.

Tool calls: 3 (including hand-back)
