# Security Review — pass1

## Summary
Scoped brownfield security review of `20261104-210402-refactor-require-react18` (79 touched files across package manifests, CLI templates, `yarn.lock`, React hook/component imports, dev-app/TechDocs root rendering, bundler/Jest config, `repo-tools` peer-dependency checks, tests, changesets, and migration docs). The change removes React 17 compatibility shims (`use-sync-external-store`, `hasReactDomClient`, `process.env.HAS_REACT_DOM_CLIENT`, `LegacyRootOption`) and narrows React peer dependency ranges to `^18.0.0`. No new runtime dependencies, attack surface, secrets, or trust-boundary changes are introduced.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security issues found in the touched set. | — |

## Passing checks
- **PII handling:** n/a — not in the touched set.
- **Authn & authz:** n/a — not in the touched set.
- **Audit log integrity:** n/a — not in the touched set.
- **Secrets & config:** No secrets, tokens, or credentials in touched source files, CLI templates (`packages/cli-module-new/templates/*/package.json.hbs`), test files (`packages/frontend-dev-utils/src/createDevApp.test.tsx`), changesets (`.changeset/*.md`), or docs (`docs/tutorials/*.md`); `DefinePlugin` in `packages/cli-module-build/src/lib/bundler/config.ts` only removes `process.env.HAS_REACT_DOM_CLIENT`.
- **Surface & headers:** Static `createRoot` rendering in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, and `plugins/techdocs/src/reader/transformers/renderReactElement.ts` and version logging in `packages/cli-module-build/src/lib/bundler/server.ts` do not alter DOM sanitization, HTTP headers, or error filtering.
- **Dependency risk:** 56 `package.json` manifests and `yarn.lock` narrow `react`, `react-dom`, and `@types/react` peer ranges to `^18.0.0` and remove `use-sync-external-store` / `@types/use-sync-external-store` with no new dependencies added (`npm audit` returned `ENOLOCK` as the repo uses Yarn Berry `yarn.lock`, verified immutable via `yarn install --immutable`).

## Required fixes before sign-off
- None.

Tool calls: 14
