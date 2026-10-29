# Security Review — pass1

Mode: brownfield, refactor (`react18-only`). Scope: the 80 paths in `provenance.json` (base `f20fd9b59828`): 57 `package.json`, 11 source files, 1 test, 1 doc, `.gitignore`, `yarn.lock`, 6 changesets, and the deleted `hasReactDomClient.ts`.

## Summary

I found nothing that blocks sign-off. The change narrows the peer dependency ranges for `react`, `react-dom` and `@types/react` to `^18.0.0`. It replaces the dynamic `react-dom` / `react-dom/client` choice with a static `createRoot` in dev-utils, frontend-dev-utils and techdocs, and swaps the `use-sync-external-store/shim` import for React's own `useSyncExternalStore`. It also removes a `require.resolve` probe. The diff adds no authn/authz, PII, audit, secret, header or error-handling code. The attack surface stays the same or gets smaller: one runtime dependency is gone, and there is one less filesystem module resolution at build and test time.

## Findings

| Severity | Category   | Location                                                                                                                | Issue                                                                                                                                                                                                | Recommendation |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Info     | Surface    | `plugins/techdocs/src/reader/transformers/renderReactElement.ts:21`                                                     | The render behaviour is the same as before (`createRoot(root).render(element)` on a host element). It renders a React element, not HTML strings, so no new injection path is added.                  | None.          |
| Info     | Config     | `packages/cli-module-build/src/lib/bundler/config.ts` (~L271, ~L279), `packages/cli-module-test-jest/config/jest.js:52` | `process.env.HAS_REACT_DOM_CLIENT` is now hard-coded to `true` through the bundler's DefinePlugin and the Jest env. It is a non-secret boolean, so nothing sensitive is inlined into bundles.        | None.          |
| Info     | Dependency | `yarn.lock`, `packages/ui/package.json`, `packages/frontend-plugin-api/package.json`, `plugins/app/package.json`        | The lockfile diff only removes entries (`use-sync-external-store`, `@types/use-sync-external-store`) and rewrites peer ranges. No package is added or re-resolved, so no new advisories can come in. | None.          |

## Passing checks

- PII encryption / masking / audit-before-access: n/a, not in the touched set.
- Route guards, role + `reports_to` checks, JWT secret, password hashing: n/a, not in the touched set.
- Audit log append-only / auditor-only / entry fields: n/a, not in the touched set.
- Secrets in code: pass. No added line in the diff (excluding `yarn.lock`) matches `api_key|secret|password|token` assignments.
- Secrets in doc examples (`docs/tutorials/react18-migration.md`, changesets): pass. They contain only version ranges and public URLs.
- Test fixture credentials (`packages/frontend-dev-utils/src/createDevApp.test.tsx`): pass. The change only deletes a test.
- `.env` handling: `.gitignore` only adds `.sdlc/`, and the existing ignores are unchanged.
- Helmet / rate limiting / error filter: n/a, not in the touched set (frontend, CLI and tooling only).
- `checkReactVersion` in `server.ts`: `parseInt` on the version from the local `react/package.json` sits inside the existing try/catch and only affects a console warning.
- Dependency audit: not run. The manifests and lockfile are touched, but only to remove entries and narrow peer ranges, so no package is added. The repo uses Yarn, so `npm audit --omit=dev` does not apply. The orchestrator can run `yarn npm audit --environment production` if it wants a formal record.

## Required fixes before sign-off

- None.

## Noted (pre-existing, out of scope)

- None observed in the touched files.

Tool calls: 5
