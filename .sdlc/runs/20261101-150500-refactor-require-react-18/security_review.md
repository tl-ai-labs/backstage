# Security Review — pass1

Run: `20261101-150500-refactor-require-react-18` (brownfield, refactor). Baseline: `f20fd9b59828`.

## Summary

This run introduces no security findings, and nothing in it blocks Gate 3. The change removes React 17 fallbacks and tightens peer ranges. It touches no auth, PII, audit-log or HTTP-surface code. The lockfile diff only removes packages: no resolution was added or changed. The dependency check does not come back clean, though: the repo has 41 high/critical advisories, including 1 critical. None of them can come from this run, so they are listed as pre-existing and out of scope.

Coverage: all 93 non-knip touched files were reviewed (83 edited files, `yarn.lock`, 8 new changesets, 1 deleted file). The 65 `knip-report.md` files were skipped as instructed and are not covered by this review.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| — | — | — | No findings introduced by this run. | — |

## Passing checks

- Secrets in committed code: no matches in added lines of the 83 edited files or in the new changesets. Used a broader pattern than the checklist (`api_key|secret|password|token` followed by `=` or `:`).
- Test files and fixtures: the only touched test, `packages/frontend-dev-utils/src/createDevApp.test.tsx`, has one case removed and nothing added.
- Docs: no secret-like terms in added lines of `docs/tutorials/*.md` or `.changeset/*.md`.
- `.gitignore`: one additive entry (`.sdlc/`). The `.env` rule is intact (line 103), no `.env` is tracked, and no tracked file sits under `.sdlc/`.
- Manifests: no dependency was added or moved to `dependencies`, and no scripts changed. The real changes are peer ranges plus the removal of `use-sync-external-store`, `@types/use-sync-external-store`, `react-test-renderer` and `@testing-library/react-hooks`. The other paired lines differ only by a trailing comma.
- `yarn.lock`: 4 resolutions removed, 0 added, 0 checksums added, and no non-registry sources.
- `packages/cli-module-build/src/lib/bundler/server.ts`: `checkReactVersion` now resolves `react/package.json` from `targetDir` rather than the repo root. That is the same developer-local trust boundary, and the value only reaches a console warning.
- `HAS_REACT_DOM_CLIENT`, `hasReactDomClient`, `legacyRoot`: no code references remain. The only tracked hits outside changelogs, release notes, knip reports and changesets are the migration guide's instructions.
- `renderReactElement`, `render.tsx`, `createDevApp.tsx`: the `ReactDOM` fallback removal changes no sanitization. Static `import('react-dom/client')` only.
- PII handling: n/a — not in the touched set.
- Authn and authz: n/a — not in the touched set.
- Audit log integrity: n/a — not in the touched set.
- `.env.example`: n/a — not in the touched set.
- Surface and headers: n/a — not in the touched set.

## Dependency check

Does not pass at repo level; not attributable to this run.

- `npm audit --omit=dev` cannot run here because this is a Yarn 4 repo with no `package-lock.json`. Ran `yarn npm audit --all --recursive --environment production --severity high` instead, which exited 1 with 41 records (40 high, 1 critical).
- Only the post-change lockfile was audited; there was no pre-change audit to compare with. Attribution rests on the lockfile diff: with no resolution added or changed and no package moved into `dependencies`, this run cannot have introduced an advisory.
- Advisories below high severity were filtered out, so they are not assessed.

## Noted (pre-existing, out of scope)

Advisory only; these do not gate this run.

| Severity | Package | Advisories |
|---|---|---|
| critical | `shell-quote` | 1 (1241332) |
| high | `undici` | 9 |
| high | `node-forge` | 6 |
| high | `adm-zip` | 4 |
| high | `brace-expansion` | 4 |
| high | `js-yaml` | 4 |
| high | `@graphql-tools/utils` | 2 |
| high | `minimatch` | 2 |
| high | `rollup` | 2 |
| high | `@azure/msal-node` | 1 |
| high | `@remix-run/router` | 1 (1112052) |
| high | `basic-ftp` | 1 |
| high | `body-parser` | 1 |
| high | `follow-redirects` | 1 |
| high | `lodash` | 1 |
| high | `systeminformation` | 1 |

`@remix-run/router` is the closest to this change: it is pulled in by `react-router-dom`, whose peer range this run left unchanged. Reachability of these advisories was not assessed.

## Required fixes before sign-off

- None for this run.
- The 41 pre-existing high/critical advisories need separate triage, starting with `shell-quote`.

Tool calls: 11
