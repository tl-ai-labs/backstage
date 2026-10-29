# Intent Brief — refactor — Require React 18 and remove React 17 compatibility code

## Context

React 17 is already deprecated in Backstage, but packages still advertise it in peer
dependency ranges and still carry hook shims, legacy root-rendering paths and a legacy
test-rendering option kept for it. That compatibility code doubles test paths and blocks
simplification of the frontend framework.

Task breakdown: backstage/backstage#35718 ("Remove React 17 support and compatibility shims").
That issue tells implementers to re-run discovery rather than treat its counts as fixed, and
this working tree has drifted from its audit in three ways:

- The shim files it names under `packages/frontend-internal/src/routing/` do not exist; that
  code now lives in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`.
- It reports 58 affected manifests; this tree has 56 (54 published, 2 private).
- It lists 7 packages + 4 plugins declaring `use-sync-external-store`; only 3 do now.

The counts and paths in this brief were verified directly against the working tree at
`f20fd9b598285c88401406b3812fe00d7708136c`.

Scope was confirmed with the requester as "the brief as written": this run does the dependency
requirements, shims, rendering paths and test-utility surface. The React Aria `useId` swap and
the two documentation rewrites from the issue's task list are deliberately left for a separate
linked PR, as the issue itself allows.

## Goal

Backstage packages require React 18: no published package advertises a React-17-inclusive peer
range, the external-store shim and legacy root-rendering fallbacks are gone, and the legacy
test-root option is removed from the public test-utils API.

## Files in scope

Dependency requirements

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` — **the authoritative source.** The
  React peer ranges are constants here; make React 18 the default `peerDependencies` shape and
  fold away the `react18OnlyPackages = new Set(['@backstage/ui'])` /
  `peerDependenciesReact18Only` exception, which is then redundant.
- The 56 `package.json` files under `packages/` and `plugins/` are **generated output, not
  hand-edited.** `yarn lint:peer-deps` runs in CI (`.github/workflows/ci.yml:111`) and fails any
  manifest disagreeing with those constants. Propagate with
  `backstage-repo-tools peer-deps --fix`, which rewrites each manifest from the constants
  (`peer-deps.ts:259-262`). Hand-editing 56 files is the highest-risk path available and must not
  be used.
  - Do not conflate `peerDependencies` with `desiredLocalVersionsOfDependencies`, a separate
    table in the same file governing devDependencies — already React-18-only everywhere.
  - Two manifests are not the uniform 4-key block and will break any find/replace:
    `plugins/permission-react` has no `react-router-dom` at all, and
    `plugins/scaffolder-react` carries `react-router: ^6.30.3` beside
    `react-router-dom: ^6.30.2` (a pre-existing inconsistency — leave it alone).
  - `peerDependenciesMeta` is uniform (`@types/react: { optional: true }` only), so "preserve
    optional metadata" means leave those blocks byte-identical.
- `yarn.lock` — updated in place to match the narrowed ranges. Discovery warns this is Yarn 4
  with `.yarn/patches` (2 patches) and a repo-local Yarn plugin: the lockfile must be updated
  incrementally, never regenerated from scratch.

External-store shim

- `packages/ui/src/hooks/useBreakpoint.ts` — `use-sync-external-store/shim` to React's
  `useSyncExternalStore`.
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` — same.
- `packages/ui/package.json`, `packages/frontend-plugin-api/package.json`,
  `plugins/app/package.json` — drop the direct `use-sync-external-store` and
  `@types/use-sync-external-store` declarations.

Rendering and CLI compatibility

- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
  — replace the conditional import and `ReactDOM.render` fallback with `react-dom/client` +
  `createRoot`. **Note the real shape:** all three assign `import('react-dom/client')` to a
  `ReactDOMPromise` and render inside `.then()` — a lazy Promise, not a static import.
  Collapsing to a static `import { createRoot }` makes rendering synchronous and changes
  observable timing that existing `waitFor` assertions depend on. Preserve the async boundary or
  update the assertions deliberately, not by accident.
- `packages/frontend-dev-utils/src/createDevApp.test.tsx` — drop legacy-rendering expectations,
  keep mounting and error coverage. This file is an outlier: it uses `jest.isolateModules` +
  `require` behind a `loadCreateDevAppIsolated()` helper, `process.env` save/restore and
  `jest.setTimeout(15000)`, because the module reads the env flag at load time. The surviving
  `bindRoutes` test likely still needs that isolation — do not delete the helper reflexively.
- `packages/cli-module-build/src/lib/bundler/config.ts` — remove `HAS_REACT_DOM_CLIENT` from both
  DefinePlugin branches. The flag has **three** removal sites in total, not one: `config.ts`
  (twice), `startFrontend.ts`, and an independent `require.resolve` probe in
  `packages/cli-module-test-jest/config/jest.js:51-58`.
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` and
  `packages/cli-module-test-jest/config/jest.js` — remove the obsolete detection.
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` — diagnostics state
  React 18 as the minimum.
- `packages/cli-module-build/src/lib/bundler/server.ts` — the React 16 warning currently tells
  users to upgrade to React 17; it must point at React 18.

Test utilities and public API

- `packages/test-utils/src/testUtils/testingLibrary.ts` — remove the `@public`
  `LegacyRootOption` type and its use in `renderWithEffects`.
- `packages/test-utils/src/testUtils/appWrappers.tsx` — remove `legacyRoot` forwarding from
  `renderInTestApp`.
- `packages/test-utils/report.api.md` — **generated; never hand-edited.** Its own header says
  "Do not edit this file", and it is in `.prettierignore`. Regenerate via
  `yarn build:api-reports`, with `LANG=en_US.UTF-8` set — locale affects sort order and a
  different locale produces spurious diffs.

Changesets

- `.changeset/` — new changesets for the affected published packages. Removing `@public`
  `LegacyRootOption` is a breaking change to `@backstage/test-utils`; narrowing a peer range is a
  breaking change for React 17 adopters. Existing pending changesets must be inspected first and
  reused where they already cover a package, per the repo's contribution rules.
  - **The repo is in changeset prerelease mode** (`.changeset/pre.json`: `mode: "pre"`,
    `tag: "next"`). Across the 38 pending changesets the bump distribution is 44 patch / 9 minor /
    **0 major**. `@backstage/test-utils` is at `1.7.24-next.0`, so by the repo's own rule the
    `LegacyRootOption` removal is a `major` — which would be the only major in the release train.
    **That is a human release-management decision, not a mechanical one.** Decided at Gate 0:
    the run writes the `major` changeset per the repo's rule, **and** the final report must flag
    explicitly that it is the train's only major so the release owner can confirm the sequencing
    before merge. The run does not silently force a release decision.
  - Breaking changes are additionally marked in prose with a leading `**BREAKING**`.
  - `@backstage/ui` has a mandated changeset format (`.changeset/README.md`): must end with
    `**Affected components:**` + comma-separated names, needs a `**Migration:**` section for
    breaking changes, and no markdown headings inside — use bold markers.

## Files off-limits

- All AI assistant configuration discovery detected: `.claude/`, `.claude/settings.local.json`,
  `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `.claude/skills/**`, `AGENTS.md`,
  `.cursor/rules/**`, `.github/copilot-instructions.md`. `AGENTS.md` is both the Claude Code
  project instructions and an always-on Cursor rule; a refactor must not land there.
- `.env`, `.env.*`, `.mcp.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`,
  `.sdlc/**`, `.git/**` (the project defaults).
- `docs/releases/**` — past release notes; the repo forbids editing them for newer changes.
- `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md` — in the
  issue's task list but deliberately out of this run's scope.
- `packages/ui/src/components/{Popover/Popover,Tooltip/Tooltip,Table/components/Table,TablePagination/TablePagination}.tsx`
  — the React Aria `useId` swap, deferred to the follow-up PR.
- `microsite/`, `docs-ui/`, `workspaces/` — independent nested workspaces, each with its own
  `yarn.lock` and outside the root workspace globs, so a root `yarn test` would never verify a
  change made in them. Discovery notes the documentation sites already run React 19 and keep
  their own supported versions; the issue says to retain that.
- `.yarn/patches/**`, `.yarn/plugins/**`, `.yarnrc.yml` — Yarn 4 internals; not part of this
  change.
- `.husky/**`, and the `lint-staged` block of the root `package.json` — the commit hooks
  themselves are not in scope (see the repo-state note below).
- The 2 private manifests (`packages/app-example-plugin/package.json`,
  `plugins/example-todo-list/package.json`) may be updated for consistency but need no changeset.

## Acceptance criteria

1. The run's check command, exactly as confirmed at Gate 0:

   ```
   yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils
   ```

   All four commands and all three paths were verified to exist. `lint:all` is
   `backstage-cli repo lint` (whole repo), unlike bare `lint` which is `--since origin/master`.
   Notes carried into the run:

   - CI itself runs `yarn tsc:full` (`--skipLibCheck false --incremental false`, after a clean),
     which is stricter than `yarn tsc` — a green `yarn tsc` is necessary but not sufficient.
   - `yarn lint:peer-deps` must pass with no React-17-inclusive range left in any published
     package; it is the same check CI runs at `.github/workflows/ci.yml:111`.
   - The three test paths are all in scope, but **12 allowlisted source files fall outside
     them** — `packages/cli-module-build/**` (4 files), `packages/cli-module-test-jest/config/jest.js`,
     `packages/dev-utils/src/devApp/render.tsx`,
     `packages/frontend-dev-utils/{createDevApp.tsx,createDevApp.test.tsx}`,
     `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`,
     `packages/ui/src/hooks/useBreakpoint.ts`,
     `plugins/techdocs/src/reader/transformers/renderReactElement.ts`, and
     `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`. `yarn tsc` and `yarn lint:all`
     cover them for type and lint regressions; **runtime test regression in those packages is
     not covered by this check command.** Accepted deliberately at Gate 0.
   - A scoped pre-change baseline must be captured on the same three paths before the change,
     since repo-wide test health is not known (discovery could not measure it cheaply); a red
     test is only evidence if it was green beforehand.

2. `yarn build:api-reports` is run (with `LANG=en_US.UTF-8`) and the regenerated
   `packages/test-utils/report.api.md` is committed with the change. The file is never
   hand-edited.
3. Changeset coverage exists for every affected published package, with breaking changes bumped
   per the repo's rules (`minor` below 1.0.0, `major` at or above it).
4. No visible change for React 18 users. This is the design constraint: the proof is the diff
   plus the same scoped test suites passing before and after.

## Non-goals

- Adding React 19 support to published Backstage packages.
- The React Aria `useId` migration (separate linked PR).
- The two documentation rewrites: `react18-migration.md`, `jsx-transform-migration.md`
  (separate linked PR).
- Removing third-party `use-sync-external-store` dependencies that already use React's native
  hook or provide selector functionality — their presence alone is not a React 17 runtime.
- Removing server-rendering helpers such as `useIsomorphicLayoutEffect`.
- Removing old-frontend-system or router-version compatibility that does not depend on removed
  React APIs.
- React 17 copies inside repository tooling / bundled executables (the issue's separate tooling
  track).
- Reconciling all 38 pending changesets wholesale; only those naming packages this run touches.

## Repo-state notes carried into the run

These come from Tier 1 discovery and were re-verified against the working tree.

- **Commit hooks will rewrite files after the plugin writes them.** husky + lint-staged are
  active (`.husky/pre-commit`). On commit, `*.{ts,tsx,js,...}` get `eslint --fix` and
  `prettier --write`; `*.json` get `prettier --write`; and a staged `package.json` triggers
  `backstage-repo-tools generate-catalog-info` plus `git add */catalog-info.yaml`. This run edits
  56 `package.json` files, so expect catalog-info regeneration on commit. Treat post-commit file
  content as authoritative over what the run wrote.
- **`.sdlc/` is ignored only locally.** It is excluded via `.git/info/exclude` line 7, which is
  never committed — not via `.gitignore`. Safe in this clone; unprotected in any fresh clone or
  in CI, where `.sdlc/` artifacts would be untracked-but-addable. The `.gitignore` already
  ignores `.claude/settings.local.json`, so there is precedent for adding `.sdlc/` to it.
- **Scale.** 235 workspace packages, 12,364 tracked files. Discovery truncated its file-level
  read groups to manifest/glob level and recorded that truncation. Orchestration is
  `@backstage/cli`'s own `repo` subcommands — no Nx/Turbo/Lerna.
- **Pre-existing test health is unknown** and was not measured; see acceptance criterion 4.
- **No pre-authored stack adapter matches** this repo (shipped set is generic / nest / python).
  `adaptive_profile_required: true`, and no `stack-profile.md` was built because this run passed
  `adaptive_profile: false`. Discovery recommends building the Tier 2b profile before the
  architect writes the change spec, noting `AGENTS.md` makes conventions deliberately
  package-local ("consistency within a package is more important than consistency across the
  repo").
- **Regulated-repo flag is a probable false positive.** `regulated_repo_warning_required: true`
  fired on a single weak signal — a root `SECURITY.md` that only links the upstream versioning
  policy. No compliance paths and no security/privacy/legal owners in `.github/CODEOWNERS`.
- **No env files exist.** Configuration is YAML (`app-config.yaml`, `app-config.docker.yaml`).

## Conventions the typists must respect (Tier 2b stack profile)

From `.sdlc/baseline/stack-profile.md`. These were verified against the working tree; a generic
stack adapter would get each of them wrong.

- **Copyright headers are eslint-enforced** via `notice/notice` with
  `onNonMatchingHeader: 'replace'`. Observed years span 2020–2026 among this run's own files
  (`useRouteRef.tsx` is 2020, `testingLibrary.ts` is 2026). Do not "tidy" or update years on
  existing files — the tool will fight it and AGENTS.md forbids it.
- **`import React from 'react'` is a lint error.** `no-restricted-syntax` bans both default and
  namespace imports from `'react'` (the JSX runtime is automatic). The rule targets `'react'`
  only, not `'react-dom'`.
- **Test idioms are package-local**, exactly as AGENTS.md warns. `packages/test-utils` uses
  destructured `rendered.getByText` and does _not_ use `screen`, plus a local `withLogCollector`
  helper; `packages/ui` uses `screen` across 24 files and `renderHook`. Match the file being
  edited, not a repo-wide house style.
- **A pre-commit hook re-sorts every staged `package.json`** via `scripts/sort-package-json.mjs`,
  so key order is not the typist's to decide.
- **`generate-catalog-info` derives only name/title/description from manifests**, so
  peer-range-only edits should produce _no_ `catalog-info.yaml` diff. If one appears, something
  else changed — treat it as a signal, not noise. (This corrects the broader warning in the
  repo-state notes above.)
- Tier 2b sampling was scope-limited to this brief's file set plus 2–3 tests per affected
  package; the other ~179 workspace packages were not sampled. Recorded as truncation in the
  profile.
