# Security Review — pass1

## Summary
This brownfield refactor removes React 16/17 compatibility shims and enforces React `^18.0.0` across 86 touched files (56 workspace `package.json` manifests, 4 CLI templates, 17 TypeScript/JavaScript source and API report files, 1 test file, 5 documentation/changeset files, 1 deleted bundler helper, and `yarn.lock`). No security vulnerabilities, secrets, unsafe DOM manipulations, or risky third-party dependencies were introduced. Reducing legacy code paths and dropping `use-sync-external-store` / `@types/use-sync-external-store` dependencies slightly reduces the dependency and runtime surface area.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No blocking or advisory security issues found in the touched set. | — |

## Passing checks
- **PII handling**: n/a — not in the touched set (no PII fields, serializers, or storage layers modified).
- **Authn & authz**: n/a — not in the touched set (no backend controllers, route guards, JWT handling, or password storage modified).
- **Audit log integrity**: n/a — not in the touched set (no audit log tables or handlers modified).
- **Secrets & config**: No hardcoded secrets, API keys, or credentials introduced across touched source files, CLI `.hbs` templates, `createDevApp.test.tsx` fixtures, or tutorial/changeset markdown examples; `process.env.HAS_REACT_DOM_CLIENT` build-time flag cleanly removed.
- **Surface & headers**: Direct `createRoot` rendering in `dev-utils`, `frontend-dev-utils`, and `techdocs` (`renderReactElement.ts`) preserves existing React element rendering semantics without introducing XSS or unsafe HTML injection vectors.
- **Dependency risk**: `use-sync-external-store` (`^1.4.0`) and `@types/use-sync-external-store` (`^1.0.0`) removed where superseded by React 18 built-ins (`packages/frontend-plugin-api`, `packages/ui`, `plugins/app-react`), `@types/use-sync-external-store@1.7.0` pruned from `yarn.lock`, peer dependency ranges narrowed to `^18.0.0`, and no new third-party packages added.

## Required fixes before sign-off
- None.

Tool calls: 8
