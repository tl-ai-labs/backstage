# Security Review — pass1

Mode: brownfield · intent: refactor · run `20261109-123841-refactor-react18-only` · base `f20fd9b598`
Scope: the 94 files in `provenance.json` (21 source/config files, 1 deleted, 56 `package.json`, 4 `.hbs` templates, 7 new changesets, docs and API/knip reports, `yarn.lock`).

## Summary

This change removes React 17 support and does not touch security-relevant code. The source edits do three things. They replace the dynamic `react-dom` / `react-dom/client` pick with a static `createRoot` (in dev-utils, frontend-dev-utils and the techdocs `renderReactElement`). They swap the `use-sync-external-store/shim` and `react-aria` `useId` for React's built-in hooks. They also remove the `HAS_REACT_DOM_CLIENT` define/env flag, the `legacyRoot` test option and the React-17 branch in `repo-tools peer-deps`. No touched file handles authentication, authorization, PII, audit logs, secrets, HTTP headers or error responses. Nothing in the change introduces a new attack surface. In `yarn.lock` the only removals are `@types/use-sync-external-store@1.7.0` and three `use-sync-external-store` dependency edges, and the rest of the diff narrows peer ranges. No package was added or re-resolved. **No blocking findings.**

## Findings

| Severity | Category | Location                                                            | Issue                                                                                                                                                                                                                                                                                                                   | Recommendation |
| -------- | -------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Info     | Surface  | `plugins/techdocs/src/reader/transformers/renderReactElement.ts:21` | The function now calls `createRoot(root).render(element)` synchronously, where it used to do this after a promise. It still renders a React element, not raw HTML, so techdocs sanitization does not change. A new root is created on every call, and the old code did the same. Not a security issue. Confidence high. | None.          |
| Info     | Surface  | `packages/cli-module-build/src/lib/bundler/server.ts:276`           | The `react` version string from the local `node_modules/react/package.json` is put into a console warning. The input is local and trusted, and it only goes to the developer's terminal. Confidence high.                                                                                                               | None.          |

## Passing checks

- PII handling (encryption at rest, response masking, audit-before-read): n/a, not in the touched set.
- Authn/authz (route guards, role + `reports_to`, JWT secret source, password hashing): n/a, no routes, guards or auth code touched.
- Audit log integrity: n/a, not in the touched set.
- Secrets: a grep of all touched non-lock files for `api_key|secret|password|token = '...'` returned no matches. The new changesets and the edited docs (`react18-migration.md`, `migrate-to-mui5.md`, `jsx-transform-migration.md`, `no-undeclared-imports.md`) contain only version ranges and public backstage.io links.
- `.env.example` / `.env` gitignore: n/a, no config or env files touched.
- Helmet, rate limiting, global error filter: n/a, no backend/HTTP surface touched. The changes are frontend, CLI bundler and test-utils only.
- Test fixtures: `packages/frontend-dev-utils/src/createDevApp.test.tsx` only has a test removed. No credentials.
- Dependency risk: `yarn.lock` only removes an entry, drops dependency edges and narrows peer ranges (168 lines of `^17 || ^18` changed to `^18`). It adds or re-resolves no versions, resolutions or checksums, so it cannot introduce a new advisory. `npm audit` was not re-run. Removals only, and the repo uses Yarn Berry, where `npm audit` does not read `yarn.lock`.
- Templates (`cli-module-new/templates/*.hbs`): only `versionQuery` default ranges changed. No injection surface.

## Required fixes before sign-off

- None.

## Noted (pre-existing, out of scope)

- None observed in the touched diff.

Tool calls: 6
