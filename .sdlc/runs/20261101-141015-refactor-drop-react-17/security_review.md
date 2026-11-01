# Security Review — pass1

Run: `20261101-141015-refactor-drop-react-17` (brownfield, refactor). Scope: the 95 files in `provenance.json` (86 edited, 8 new, 1 deleted), diffed against `cb8b07905b` in the working tree, because the run has no commits yet.

## Summary

Nothing in this run blocks Gate 3. The change narrows React peer ranges to `^18.0.0`, removes React 17 fallbacks and detection, and swaps the shimmed hooks for React's own. It touches no route, guard, serializer, PII field, audit table, auth flow or secret handling. The lockfile only loses one types package, so the run adds no dependency risk. The 27 high advisories from the audit were all there before this run and are listed as advisory below.

## Findings

| Severity | Category | Location | Issue | Recommendation |
| -------- | -------- | -------- | ----- | -------------- |

No findings introduced by this run.

## Passing checks

- Secrets in committed code: the secret regex, widened to include `token` and `:` assignments, has no hits on added lines or new files.
- Docs (`docs/tutorials/*`, `no-undeclared-imports.md`, `.changeset/*`, `knip-report.md`, `report.api.md`): version-range text only, no secrets in examples.
- Test files: `createDevApp.test.tsx` only deletes the legacy-render test, no credentials or fixtures added.
- Dependency diff (`yarn.lock`, manifests): no package added and no resolved version changed. The only resolution delta is the removal of `@types/use-sync-external-store@1.7.0`. The manifests otherwise change only React peer ranges and drop `use-sync-external-store` from three packages.
- Dependency audit: 0 critical. No advisory touches `react`, `react-dom` or `use-sync-external-store`.
- Scaffolding templates (`packages/cli-module-new/templates/*`): range changes only, no new dependency or script.
- Build-time define removal (`packages/cli-module-build/src/lib/bundler/config.ts`): `process.env.HAS_REACT_DOM_CLIENT` removed with no consumers left in `packages`, `plugins` or `docs/tutorials`, and no new value reaches the browser bundle.
- TechDocs render path (`plugins/techdocs/src/reader/transformers/renderReactElement.ts`): `handleMetaRedirects` computes its target and external-host guard before rendering, so moving to `createRoot` does not change that guard.
- Run integrity: all 95 `git status` entries are in provenance, and every recorded `sha_after` matches the file on disk.
- PII handling: n/a — not in the touched set.
- Authn and authz: n/a — not in the touched set. `plugins/auth` and `plugins/auth-react` change only peer ranges in `package.json`.
- Audit log integrity: n/a — not in the touched set.
- `.env` handling: n/a — not in the touched set. `.env` remains gitignored.
- Helmet, rate limiting, global error filter: n/a — not in the touched set. The changed `server.ts` is the local dev server, and only a version warning was removed from it.

## Noted (pre-existing, out of scope)

`npm audit --omit=dev` cannot run here because the repo has no `package-lock.json` (ENOLOCK). `yarn npm audit --environment production --recursive --severity high` was used instead and reports 27 high advisories, none critical. The resolved versions are unchanged by this run, so none of them comes from it, and they do not gate this run. The literal checklist item (no high or critical) still fails for the repo as a whole.

| Package             | Tree version           | Advisories                                                                                 |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `undici`            | 6.28.1, 7.29.0, 7.29.1 | 9, including TLS certificate validation bypass and cache poisoning                         |
| `node-forge`        | 1.4.0                  | 6, including signature verification, PKCS#12 MAC forgery and X.509 basicConstraints bypass |
| `adm-zip`           | 0.6.0                  | 4, including decompression-bomb bypass and SUID/SGID preservation                          |
| `brace-expansion`   | 2.1.4, 5.0.9           | 4, denial of service                                                                       |
| `@azure/msal-node`  | 6.0.1                  | 1, GHSA-xcx6-jx8p-x3h5                                                                     |
| `@remix-run/router` | 1.3.2                  | 1, GHSA-2w69-qvjg-hvjx                                                                     |
| `follow-redirects`  | 1.16.1                 | 1, GHSA-mrwp-f3q8-3g9p                                                                     |
| `js-yaml`           | 3.15.1                 | 1, GHSA-2883-xcg3-v3hh                                                                     |

## Required fixes before sign-off

None.

Tool calls: 6
