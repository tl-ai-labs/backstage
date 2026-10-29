# Security Review — pass1

Mode: brownfield · intent: refactor · run 20261029-refactor-react18 · base f20fd9b598
Scope: the 23 files in `provenance.json` (plus `yarn.lock` and the 53 further peer-range manifests
the run's `peer-deps --fix` / `yarn install` tooling steps rewrote, reviewed as part of the same
dependency surface).

## Summary

No security-relevant defect found. The change is a subtractive React 17 compatibility removal: it
deletes a build-time feature probe, replaces a vendored hook shim with React's built-in, collapses two
peer-dependency constants into one, and narrows 56 published peer ranges. Every manifest edit narrows
or removes; none widens, and no peer was dropped into an undeclared implicit dependency. The lockfile
delta contains exactly one removed resolution (`@types/use-sync-external-store@npm:1.7.0`) and peer-range
string updates for workspace entries — no version added, upgraded, downgraded or re-resolved, no checksum
weakened, no patch or plugin entry touched. No secret, token or internal URL appears in any touched file.
The three render-site rewrites change only how the DOM root is created and introduce no new path for
untrusted content.

## Findings

| Severity            | Category                 | Location                                                                                                                                                                  | Issue                                                                                                                                                                                                                                                                                                | Recommendation                                                                                                                                                                                    |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Info (non-security) | Stale generated artifact | `plugins/app/knip-report.md:8`                                                                                                                                            | Still lists `use-sync-external-store                                                                                                                                                                                                                                                                 | package.json:78:6`as an unused dependency, but the dependency was removed from`plugins/app/package.json`in this run. The report was not regenerated alongside`packages/test-utils/report.api.md`. | Regenerate the knip report for `plugins/app` so the committed report matches the manifest. No security impact. |
| Low                 | Error handling           | `packages/dev-utils/src/devApp/render.tsx:58`, `packages/frontend-dev-utils/src/createDevApp.tsx:43`, `plugins/techdocs/src/reader/transformers/renderReactElement.ts:17` | The dynamic `import('react-dom/client')` promise has no `.catch`; a resolution failure now surfaces as an unhandled rejection with no diagnostic instead of the previous fall-back branch. Pre-existing pattern (the old code also had no `.catch`), narrowed rather than introduced by this change. | Optional: attach a `.catch` that logs. Does not gate — dev/test-only for two of the three sites, and confidence is high that React 18 is now a hard peer requirement.                             |

## Passing checks

- Peer narrowing, 56 manifests: every diff line is `^17.0.0 || ^18.0.0` → `^18.0.0` (56 react, 56 @types/react, 56 react-dom). No range widened, no peer entry deleted, `peerDependenciesMeta` blocks unchanged — nothing became an undeclared implicit dependency. Zero `^17.0.0 || ^18.0.0` ranges remain in any workspace manifest.
- Non-react manifest edits: only four comma/trailing-key lines (`@standard-schema/spec`, `react-stately`) from removing the shim entry. No other dependency added or changed.
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`: the collapse removes `peerDependenciesReact18Only`, `react18OnlyPackages` and `getExpectedPeerDependencies`; all four write sites and `matchesPeerDependency` now index the single `peerDependencies` literal. The removed React-18-only map was byte-identical to the new default, so `@backstage/ui` is unaffected, and `--fix` writes only exact-string literal values — no path can emit a broader or computed range.
- Lockfile (`yarn.lock`, updated in place): removed entry header `"@types/use-sync-external-store@npm:^1.0.0"` with its `version: 1.7.0` / `resolution:` / `checksum:` triple — the only resolution removed, and no resolution added. The transitive `use-sync-external-store@npm:^1.4.0, ^1.5.0, ^1.6.0 → 1.6.0` entry and `@types/use-sync-external-store@npm:^0.0.6` are correctly retained (still required by `react-redux@9.3.0` and others), so nothing resolves a dangling spec at runtime.
- `.yarn/patches` (both `@material-ui-pickers` and `@yarnpkg-plugin-npm` patches), `.yarnrc.yml` and the repo-local Yarn plugin: no diff vs base; `git diff --stat` over `.yarn/` is empty.
- Render sites: `createRoot(...).render(element)` replaces the `ReactDOM.render` branch with no change to markup handling. All `renderReactElement` callers (`addGitFeedbackLink`, `addSidebarToggle`, `copyToClipboard`, `handleMetaRedirects`) pass statically `createElement`-constructed components, never fetched documentation markup; no `dangerouslySetInnerHTML` exists anywhere in `plugins/techdocs/src`. Escaping and sanitization assumptions are unchanged — React 18's `createRoot` escapes identically.
- Removal of the `HAS_REACT_DOM_CLIENT` define and `hasReactDomClient.ts`: eliminates a build-time `require.resolve` probe; strictly reduces build-time filesystem introspection. No residual reference anywhere in `packages/`, `plugins/` or config (only historical changelogs and this run's own docs).
- `LegacyRootOption` / `legacyRoot` removal is complete across `testingLibrary.ts`, `appWrappers.tsx` and the regenerated `packages/test-utils/report.api.md`; the API report contains no credential or internal path.
- Secrets: no match for api key / secret / token / password / bearer / internal-host patterns in any touched source, in the 6 new changesets, or in the regenerated API report. `.env`, `.env.test`, `.envrc` are gitignored (`.gitignore:103-105`).
- Test-file content: the only test change (`packages/frontend-dev-utils/src/createDevApp.test.tsx`) deletes the legacy-fallback case. No fixture credentials added or present.
- Doc content: the 6 changesets describe adopter-facing behavior only; the two `**BREAKING**` markers correctly accompany the `major`/`minor` bumps for the removed `legacyRoot` option and the removed build flag.
- Dependency risk: no `npm|yarn audit` re-run. Justification recorded rather than assumed — the lockfile delta adds zero resolutions and upgrades nothing, so the advisory surface is identical to the pre-change baseline by construction; the one removed package (`@types/use-sync-external-store`, a types-only dev entry) can only shrink it.

## Not applicable (confirmed, not assumed)

- PII handling — n/a: no `government_id` / `bank_account` / `salary_base` or any other data field, entity, DTO, serializer or interceptor is in the touched set. Verified the diff adds no field and no persistence or transform code.
- Authn/authz guard coverage — n/a: no controller, route, guard, JWT handling or password storage in the touched set. No request path and no identity check added or altered.
- Audit-log integrity — n/a: no audit table, writer or read path touched; no mutation of append-only semantics possible from these files.
- Helmet / rate limiting / global error filter — n/a: no server middleware or HTTP surface in the touched set. (`packages/cli-module-build/src/lib/bundler/server.ts` is the local dev-server bundler config; the edit is one line of console banner text, React 17 → React 18.)
- `.env.example` — n/a: the change adds no configuration key, so no example-env update is owed.

## Noted (pre-existing, out of scope)

- `plugins/app/knip-report.md` lists six further unused dependencies predating this run (`@backstage/filter-predicates`, `@backstage/config`, `@material-ui/lab`, `prop-types`, `i18next`, `lodash`). Unused declared deps enlarge the install surface without benefit; worth a separate cleanup, not a gate on this run.

## Required fixes before sign-off

- None blocking. Recommended before merge (hygiene, not security): regenerate `plugins/app/knip-report.md` so the committed report no longer references the removed `use-sync-external-store` dependency.

Tool calls: 5
