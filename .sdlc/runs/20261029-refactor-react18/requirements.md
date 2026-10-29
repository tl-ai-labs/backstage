# Requirements — refactor: require React 18, remove React 17 compatibility code

Run: `20261029-refactor-react18` · intent: `refactor` · mode: brownfield
Source: `.sdlc/runs/20261029-refactor-react18/intent_brief.md` (read in full), verified against
the working tree at `f20fd9b598285c88401406b3812fe00d7708136c`.
Task breakdown: backstage/backstage#35718.

This is a **delta** requirements document, as the intent matrix prescribes for `refactor`: it
states what changes, and — more importantly for a refactor — **what must be preserved**.

## In scope

1. Narrow React peer-dependency requirements to React 18 for every affected workspace package,
   by editing the authoritative constants and regenerating the manifests.
2. Remove the `use-sync-external-store` shim in favour of React's native `useSyncExternalStore`,
   and drop the now-unused direct dependency declarations.
3. Replace the legacy `ReactDOM.render` fallback paths with `react-dom/client` + `createRoot` at
   all three render sites, preserving the existing async boundary.
4. Remove the `HAS_REACT_DOM_CLIENT` build flag and its detection at all **three** removal sites
   plus the module that implements the detection.
5. Point the CLI's React-version diagnostics and its legacy-React warning at React 18 as the
   minimum.
6. Remove the `@public` `LegacyRootOption` type and the `legacyRoot` forwarding from
   `@backstage/test-utils`, and regenerate the affected API report.
7. Provide changeset coverage for every affected **published** package, bumped per the repo's
   rules.

## Out of scope

1. Adding React 19 support to published Backstage packages.
2. The React Aria `useId` migration in `packages/ui/src/components/**` (separate linked PR; those
   four files are off-limits in this run's write contract).
3. The documentation rewrites `docs/tutorials/react18-migration.md` and
   `docs/tutorials/jsx-transform-migration.md` (separate linked PR; both off-limits).
4. Removing third-party `use-sync-external-store` usage that already relies on React's native
   hook or exists for selector functionality — its presence alone is not a React 17 runtime.
5. Removing server-rendering helpers such as `useIsomorphicLayoutEffect`.
6. Removing old-frontend-system or router-version compatibility that does not depend on a removed
   React API.
7. React 17 copies inside repository tooling / bundled executables (the issue's separate tooling
   track).
8. Reconciling all 38 pending changesets wholesale; only those naming packages this run touches.
9. The nested workspaces `microsite/`, `docs-ui/`, `workspaces/` — each has its own lockfile, is
   outside the root workspace globs, and already runs a newer React deliberately.
10. `.yarn/patches/**`, `.yarn/plugins/**`, `.yarnrc.yml`, `.husky/**` and the root
    `lint-staged` block.

## Functional requirements per module

### Module: dependency requirements (`repo-tools`, manifests, lockfile)

- **FR-1** — `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`: make React 18 the default
  `peerDependencies` shape (`react`, `react-dom`, `@types/react` no longer accepting `^17.0.0`),
  and fold away the now-redundant `react18OnlyPackages = new Set(['@backstage/ui'])` /
  `peerDependenciesReact18Only` exception so a single constant governs every package. This file is
  **the authoritative source**; the manifests are its output.
- **FR-2** — Propagate FR-1 to the 56 `package.json` files under `packages/` and `plugins/` by
  running the repo's own fixer (`backstage-repo-tools peer-deps --fix`), never by hand-editing
  manifests. The fixer rewrites each manifest from the constants
  (`peer-deps.ts:259-262`). Hand-editing 56 generated files is prohibited by this requirement.
- **FR-3** — Update `yarn.lock` in place to match the narrowed ranges. The lockfile must be
  updated **incrementally** (Yarn 4, with 2 `.yarn/patches` entries and a repo-local Yarn
  plugin); it must never be regenerated from scratch.

### Module: external-store shim

- **FR-4** — `packages/ui/src/hooks/useBreakpoint.ts`: replace
  `use-sync-external-store/shim` with React's `useSyncExternalStore`.
- **FR-5** — `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: same replacement.
- **FR-6** — Drop the direct `use-sync-external-store` and `@types/use-sync-external-store`
  declarations from `packages/ui/package.json`,
  `packages/frontend-plugin-api/package.json` and `plugins/app/package.json`.

### Module: rendering paths

- **FR-7** — `packages/dev-utils/src/devApp/render.tsx`: remove the React-17 `ReactDOM.render`
  fallback, rendering via `react-dom/client` + `createRoot`.
- **FR-8** — `packages/frontend-dev-utils/src/createDevApp.tsx`: same.
- **FR-9** — `plugins/techdocs/src/reader/transformers/renderReactElement.ts`: same.
- **FR-10** — `packages/frontend-dev-utils/src/createDevApp.test.tsx`: drop the
  legacy-rendering expectations while keeping mounting and error coverage.

### Module: CLI build and test configuration

- **FR-11** — `packages/cli-module-build/src/lib/bundler/config.ts`: remove
  `HAS_REACT_DOM_CLIENT` from **both** `DefinePlugin` branches.
- **FR-12** — `packages/cli-module-build/src/commands/package/start/startFrontend.ts`: remove the
  flag's second use site, and state React 18 as the minimum in the diagnostics.
- **FR-13** — `packages/cli-module-test-jest/config/jest.js`: remove the independent
  `require.resolve` probe for `react-dom/client` (lines 51-58) — a third, separate removal site.
- **FR-14** — `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`: remove the
  obsolete detection module, and every import of it.
- **FR-15** — `packages/cli-module-build/src/lib/bundler/server.ts`: the legacy-React warning
  currently directs users to React 17; it must direct them to React 18.

### Module: test utilities and public API

- **FR-16** — `packages/test-utils/src/testUtils/testingLibrary.ts`: remove the `@public`
  `LegacyRootOption` type and its use in `renderWithEffects`.
- **FR-17** — `packages/test-utils/src/testUtils/appWrappers.tsx`: remove `legacyRoot`
  forwarding from `renderInTestApp`.
- **FR-18** — `packages/test-utils/report.api.md`: regenerate via `yarn build:api-reports` with
  `LANG=en_US.UTF-8` set. The file is **generated** — its own header forbids editing it and it is
  listed in `.prettierignore`. No unit may hand-write it.

### Module: release metadata

- **FR-19** — `.changeset/`: inspect the 38 pending changesets first and reuse an existing one
  wherever it already covers an affected package, per the repo's contribution rules. Add
  changesets only for coverage that does not yet exist.
- **FR-20** — The removal of the `@public` `LegacyRootOption` is a breaking change to
  `@backstage/test-utils`, which is at `1.7.24-next.0` (≥ 1.0.0), so by the repo's own rule it
  takes a **`major`** bump. Narrowing a peer range is likewise breaking for React 17 adopters.
  Breaking-change prose carries a leading `**BREAKING**` marker.
- **FR-21** — Any changeset naming `@backstage/ui` must follow the mandated format in
  `.changeset/README.md`: no markdown headings (bold markers only), a `**Migration:**` section for
  a breaking change, and a closing `**Affected components:**` line with comma-separated names.

## Non-functional requirements

- **NFR-1 — No visible change for React 18 users.** This is the refactor's central invariant. The
  proof is the diff plus the same scoped suites passing before and after.
- **NFR-2 — Preserve the lazy-Promise async boundary at the three render sites.** All three assign
  `import('react-dom/client')` to a `ReactDOMPromise` and render inside `.then()`. Collapsing to a
  static `import { createRoot }` makes rendering synchronous and changes observable timing that
  existing `waitFor` assertions depend on. Either preserve the async boundary or update the
  assertions deliberately — never incidentally.
- **NFR-3 — Preserve generated-file provenance.** The 56 manifests (FR-2) and
  `report.api.md` (FR-18) are generated. They are produced by running the repo's own tools, not by
  a typist writing their content.
- **NFR-4 — Preserve copyright headers verbatim.** Headers are eslint-enforced
  (`notice/notice`, `onNonMatchingHeader: 'replace'`) and observed years span 2020–2026 among this
  run's own files. Existing years must not be "tidied" or advanced.
- **NFR-5 — `import React from 'react'` is a lint error.** `no-restricted-syntax` bans both
  default and namespace imports from `'react'`. The rule targets `'react'` only, not
  `'react-dom'`, so `ReactDOM` namespace imports remain legal where they survive.
- **NFR-6 — Match each file's local test idiom.** `packages/test-utils` destructures
  `rendered.getByText` and does not use `screen`, and has a local `withLogCollector` helper;
  `packages/ui` uses `screen` and `renderHook`. Match the file being edited, not a repo-wide
  house style.
- **NFR-7 — Preserve peer-block outliers.** `plugins/permission-react` has no `react-router-dom`
  at all, and `plugins/scaffolder-react` carries `react-router: ^6.30.3` beside
  `react-router-dom: ^6.30.2` (pre-existing; leave it). `peerDependenciesMeta` blocks stay
  byte-identical (`@types/react: { optional: true }` only). Extra peers on
  `module-federation-common`, `theme`, the three test-utils packages, `catalog-react` and
  `scaffolder-react` are preserved. Satisfying FR-2 through the fixer is what guarantees this.
- **NFR-8 — Do not decide package.json key order.** A pre-commit hook re-sorts every staged
  manifest via `scripts/sort-package-json.mjs`.
- **NFR-9 — Peer-range-only manifest edits must produce no `catalog-info.yaml` diff.**
  `generate-catalog-info` derives only name/title/description from manifests. A catalog-info diff
  is a signal that something else changed, not noise.
- **NFR-10 — A file deletion is not a typist's write.** FR-14 removes a file; the apply form
  writes content and cannot express a deletion, so the removal must be planned as a `tooling`
  step under provenance, with the importing files edited by typed units.
- **NFR-11 — PII and authorization: not applicable.** This refactor touches dependency metadata,
  render bootstrapping, build flags and a test-utility type. It introduces no data field, no
  request path, no identity check and no new configuration key, so there is no PII inventory and
  no role matrix delta to state. The security review (Phase 8) reviews the diff by file kind
  regardless.

## Acceptance criteria

- **AC-1** — The run's check command, exactly as confirmed at Gate 0, passes:

  ```
  yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils
  ```

  Judged against the pre-change baseline captured on the same three test paths: a failure counts
  against this run only if it was green before the change. Two carried notes: CI runs the stricter
  `yarn tsc:full` (`--skipLibCheck false --incremental false`, after a clean), so a green
  `yarn tsc` is necessary but not sufficient; and `lint:all` is `backstage-cli repo lint` over the
  whole repo, unlike bare `lint` which is `--since origin/master`.

- **AC-2** — `yarn lint:peer-deps` reports no React-17-inclusive range in any published package.
  This is the same check CI runs at `.github/workflows/ci.yml:111`, and it is what proves FR-1 and
  FR-2 agree.
- **AC-3** — `yarn build:api-reports` has been run with `LANG=en_US.UTF-8`, and the regenerated
  `packages/test-utils/report.api.md` is part of the change with `LegacyRootOption` gone.
- **AC-4** — No `use-sync-external-store` import remains in `packages/ui/src/hooks/useBreakpoint.ts`
  or `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, and no direct
  `use-sync-external-store` / `@types/use-sync-external-store` declaration remains in the three
  manifests of FR-6.
- **AC-5** — `HAS_REACT_DOM_CLIENT` and `hasReactDomClient` appear nowhere in the tree
  (all three removal sites of FR-11, FR-12, FR-13 plus the module of FR-14), and no file imports
  the removed module.
- **AC-6** — `LegacyRootOption` and `legacyRoot` appear nowhere in `packages/test-utils/src/`.
- **AC-7** — Changeset coverage exists for every affected published package, with the
  `@backstage/test-utils` breaking change bumped `major` and marked `**BREAKING**` in prose, and
  any `@backstage/ui` changeset in the mandated format.
- **AC-8** — The three render sites still render through a Promise-returning
  `import('react-dom/client')` boundary (NFR-2), or their `waitFor` assertions were updated in the
  same change with the reason stated.
- **AC-9** — The 12 allowlisted source files outside the three test paths are covered for type and
  lint regression by `yarn tsc` and `yarn lint:all`; **runtime test regression in those packages is
  not covered by this run's check command.** Accepted deliberately at Gate 0 and restated here so
  the gap is visible in the final report rather than implied.

## Open questions for HITL

1. **Release sequencing (decided at Gate 0, restated for visibility).** The repo is in changeset
   prerelease mode (`.changeset/pre.json`: `mode: "pre"`, `tag: "next"`) and the 38 pending
   changesets are 44 patch / 9 minor / **0 major**. FR-20's `major` for
   `@backstage/test-utils` would therefore be the release train's **only** major. The run writes
   it per the repo's rule and the final report flags it explicitly, so the release owner confirms
   the sequencing before merge. The run does not silently force a release decision. **No action
   needed at Gate 1** unless you want the bump revisited.
2. **Runtime coverage gap (AC-9).** If runtime verification of
   `packages/cli-module-build`, `packages/cli-module-test-jest`, `packages/dev-utils`,
   `packages/frontend-dev-utils`, `packages/frontend-plugin-api`, `packages/ui` or
   `plugins/techdocs` matters more than the check command's runtime, say so at Gate 1 and the
   check command can be widened before any code is written. Widening it after the fact costs a
   re-run.
