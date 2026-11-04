# Security Review — pass2

## Summary
This brownfield refactor drops legacy React 16/17 compatibility across Backstage packages, plugins, CLI templates, bundler/test configurations, and documentation, standardizing on React 18 (`^18.0.0`), `react-dom/client` (`createRoot`), and native `React.useSyncExternalStore`. Following Gate 3 round-1 edits, `.changeset/test-utils-remove-legacy-root.md`, `.changeset/cli-drop-react-17.md`, and `.changeset/repo-tools-peer-deps-react-18.md` were re-checked in full after adding the `**BREAKING**:` summary prefix. No new runtime dependencies, authentication/authorization changes, PII handling paths, or secrets were introduced. The security posture remains clean with no blocking findings.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security issues introduced in the touched files (including Gate 3 round-1 changeset updates). | None |

## Passing checks
- **PII handling**: n/a — not in the touched set.
- **Authn & authz**: n/a — not in the touched set.
- **Audit log integrity**: n/a — not in the touched set.
- **Secrets & config**: Passed — no hardcoded secrets, API keys, or credentials in touched source files, CLI templates (`*.hbs`), test files (`createDevApp.test.tsx`), documentation (`docs/tutorials/*.md`), or changesets (`.changeset/*.md`, re-checked `.changeset/test-utils-remove-legacy-root.md`, `.changeset/cli-drop-react-17.md`, and `.changeset/repo-tools-peer-deps-react-18.md` after adding `**BREAKING**:` prefix); removed `process.env.HAS_REACT_DOM_CLIENT` build-time flag cleanly.
- **Surface & headers**: Passed — rendering updates in `dev-utils`, `frontend-dev-utils`, and `techdocs` (`renderReactElement.ts`) replace legacy `ReactDOM.render` fallback with React 18 `createRoot` without introducing DOM XSS sinks or unsafe HTML injection.
- **Dependency risk**: Passed — `package.json` manifests and `yarn.lock` only narrow React peer dependency ranges to `^18.0.0` and remove unused `use-sync-external-store` / `@types/use-sync-external-store` shims, with no new dependencies or resolved version changes.

## Required fixes before sign-off
- None

Tool calls: 14
