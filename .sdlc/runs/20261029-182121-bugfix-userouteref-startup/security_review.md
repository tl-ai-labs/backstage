# Security Review — pass1

Mode: brownfield, intent: bugfix, base `2e8b88268c8a`. Scope: the 4 files in `provenance.json`.

## Summary

The change is in the frontend routing and wiring layer: it adds a fallback map of route data during bootstrap, adds a re-resolving wrapper in `RouteResolutionApiProxy`, adds `collectDeferredRouteInstances`, a regression test and a changeset. It adds no new routes, auth logic, PII handling, secrets or dependencies. The only new security-relevant behavior is that during bootstrap, factories of extensions mounted behind the sign-in boundary now run before sign-in, to read their route path and route ref. They run with an empty API holder and their output is used only for route data. Predicate-gated (`if`) and disabled nodes are skipped, along with their subtrees. Frontend routes are not an authorization boundary, and they already ship in the public bundle. Nothing blocks the release. There are two Low/Info advisories.

## Findings

| Severity | Category               | Location                                                                                                   | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Recommendation                                                                                                                                                                                                                  |
| -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low      | Surface / side effects | `packages/frontend-app-api/src/wiring/phaseApis.tsx` ~L362-375 (`collectDeferredRouteInstances`)           | Before sign-in, the factories of deferred extensions that output route data now run, and so does any `extensionFactoryMiddleware`. They may run twice (first `skipChild`, then the full subtree). Each run gets a fresh `createErrorCollector()` that is thrown away. The empty `ApiHolder` blocks identity-bearing API calls, but a factory or middleware with module-level side effects (telemetry, fetches) now fires before authentication, and its errors are silently dropped. Confidence: medium that this is benign in practice. | Document in the TSDoc comment that route-bearing extension factories may run before sign-in and must be side-effect free. Consider sending detached-instantiation errors to a debug-level collector instead of discarding them. |
| Info     | Authz consistency      | `packages/frontend-app-api/src/wiring/phaseApis.tsx` ~L166-170 (`RouteResolutionApiProxy.resolve` wrapper) | If the finalized resolver cannot resolve a ref, the wrapper deliberately keeps the bootstrap route function. A page that exists at bootstrap but is absent after finalization (for example, removed by a post-sign-in predicate on an ancestor not covered by the skip) would still produce a link. Navigating to it yields not-found, not an access bypass, because the client router is not a security boundary.                                                                                                                       | Acceptable as is. Optionally return `undefined` after finalization when the finalized resolver has no path, to avoid stale links.                                                                                               |

## Passing checks

- Relative cross-package import of `toInternalExtension` follows existing precedent (`src/tree/resolveAppTree.ts`, `instantiateAppNodeTree.ts`, `prepareSpecializedApp.tsx`).
- Predicate-gated and disabled deferred nodes are skipped before any instantiation or recursion, so flag- or permission-gated pages are not pre-resolved.
- Detached instantiation uses `writeNodeInstances: false` and `reuseExistingInstances: false`, so the real app tree is not mutated before finalization.
- Test file `createSpecializedApp.test.tsx`: no credentials or real data in fixtures.
- Changeset `.changeset/frontend-app-api-bootstrap-route-refs.md`: no secrets, and no internal symbols exposed.
- Secrets grep over the touched files: none.
- PII encryption, role masking, audit log integrity and audit write ordering: n/a, not in the touched set.
- Route guards, `reports_to` checks, JWT secret, password hashing: n/a, not in the touched set (frontend wiring only).
- Helmet, rate limiting, global error filter: n/a, not in the touched set.
- `.env.example` / `.env` gitignore: n/a, not in the touched set.
- Dependency check: no manifest or lockfile touched; unchanged; `npm audit` not run.

## Required fixes before sign-off

- None. The Low and Info items are advisory.

## Noted (pre-existing, out of scope)

- None observed in the lines read.

Tool calls: 5
