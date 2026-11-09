# Requirements: Require React 18 and remove React 17 compatibility (refactor)

Run: `20261109-123841-refactor-react18-only` · Job: refactor · Upstream breakdown: backstage/backstage#35718

## What must be preserved (refactor invariants)

- Everything a React 18 user sees and does stays identical: rendering, routing, route refs, breakpoints,
  dev apps (`createDevApp`, `@backstage/dev-utils`), TechDocs rendering, test helpers that render with
  the React 18 root, and the CLI's build, start and test commands.
- The same test suite passes before and after. The gate command is exactly:
  `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`.
- Only React 17 support goes away. Tests that exist only to exercise the React 17 path are removed, and
  nothing else in the suite is weakened.

## In scope

1. Narrow the React peer ranges of the 56 workspace manifests discovery lists
   (`"react"`, `"react-dom"`, `"@types/react"` from `^17.0.0 || ^18.0.0` to `^18.0.0`), leaving every other
   peer entry and `peerDependenciesMeta` untouched.
2. Make the peer-deps check (`packages/repo-tools/src/commands/peer-deps/`) enforce one React 18 only range for
   every package, dropping its separate React 18 only list.
3. Replace the `use-sync-external-store` shim with React's built-in `useSyncExternalStore` in
   `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`,
   and drop `use-sync-external-store` and `@types/use-sync-external-store` from
   `packages/frontend-plugin-api`, `packages/ui` and `plugins/app` manifests, with the `yarn.lock` update that
   follows (one `yarn install`).
4. Replace react-aria's `useId` (a pre-React-18 polyfill) with React's built-in `useId` in the four
   `packages/ui` components the brief names (Popover, Tooltip, Table, TablePagination), where the ids are only
   used to link elements inside the component.
5. Remove the legacy `ReactDOM.render` fallbacks: always render through `react-dom/client` `createRoot` in
   `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` and
   `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
6. Remove the build-time `HAS_REACT_DOM_CLIENT` flag: the probe in
   `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`, its injection in `bundler/config.ts`
   (webpack and rspack branches) and in `packages/cli-module-test-jest/config/jest.js`.
7. Replace the stale CLI React version warnings: the "React 17 is now deprecated" warning in
   `startFrontend.ts` and `checkReactVersion()` in `bundler/server.ts` (which still recommends upgrading to
   React 17) become one check that tells a user on React older than 18 that Backstage requires React 18 and
   links the migration guide.
8. Remove the `legacyRoot` option from `@backstage/test-utils` (`LegacyRootOption` type, its use in
   `renderWithEffects` and `renderInTestApp`, and its export), and regenerate the affected API reports.
9. Update the `yarn new` templates (`packages/cli-module-new/templates/*/package.json.hbs`) so new plugins get a
   React 18 only peer range.
10. Update the docs that recommend or describe React 17 support: `docs/tutorials/react18-migration.md`,
    `docs/tutorials/migrate-to-mui5.md`, `docs/tutorials/jsx-transform-migration.md`, and the example in
    `packages/eslint-plugin/docs/rules/no-undeclared-imports.md`.
11. Update the `knip-report.md` files whose content changes because of removed dependencies.
12. Add changesets in `.changeset/` for every published package whose release changes.

## Out of scope

1. React 17 copies inside repository tooling and bundled executables (`.yarn/releases/**`, generated-app
   tooling), per Gate 0.
2. `docs-ui/**`, `microsite/**`, `workspaces/**` (React 19 sites with their own lockfiles).
3. `packages/cli-node/src/monorepo/Lockfile.test.ts` (lockfile fixture data, not a React 17 dependency).
4. `docs/releases/**` and every `CHANGELOG.md`.
5. Deprecated `act` imports from `react-dom/test-utils` in individual plugin tests and the unused
   `react-test-renderer` devDependency of `plugins/catalog-react`: not React 17 compatibility code, and not in
   the allowlist.
6. Moving any package to React 19, or changing any non-React peer range.
7. ESLint, Prettier and TypeScript configuration files; `.gitignore`.

## Functional requirements

### Peer ranges and their enforcement (module `peer-deps`)

- **FR-1** Each of the 56 manifests discovery lists declares `react`, `react-dom` and `@types/react` peers as
  exactly `^18.0.0`. `@types/react` stays optional through `peerDependenciesMeta`. No other field of these
  manifests changes, except as FR-6 states for three of them.
- **FR-2** The peer-deps check holds one expected React peer range, `^18.0.0`, for every package with React
  peers, and no per-package React 18 only exception list. `yarn lint:peer-deps` passes on the changed tree
  and fails on a manifest that still allows React 17.
- **FR-3** The peer-deps check's tests (if present in its folder) cover the single React 18 range and are
  updated to match.
- **FR-4** Every `package.json.hbs` template under `packages/cli-module-new/templates/` that declares a React
  peer range (`react`, `react-dom`) declares it React 18 only (`^18.0.0`), keeping the template's
  `versionQuery` helper form where it uses one. `packages/cli-module-new/src/lib/version.test.ts` still passes.

### Hooks (module `hooks`)

- **FR-5** `useRouteRef` (`packages/frontend-plugin-api`) and `useBreakpoint` (`packages/ui`) import
  `useSyncExternalStore` from `react`. Their behaviour, signatures and exports are unchanged.
- **FR-6** `use-sync-external-store` and `@types/use-sync-external-store` are removed from the
  `packages/frontend-plugin-api`, `packages/ui` and `plugins/app` manifests, and `yarn.lock` is updated by a
  single `yarn install` from the repository root. No other lockfile entry is added or upgraded on purpose.
- **FR-7** Popover, Tooltip, Table and TablePagination in `packages/ui` take `useId` from `react`, not from
  `react-aria`. Each id stays unique per component instance and keeps linking the same elements
  (`aria-labelledby`, SVG path references, live regions) as before. If a component's id is passed into a
  react-aria API that requires react-aria's own id, that component keeps react-aria's `useId`, and the
  change plan says why.

### Rendering (module `render`)

- **FR-8** `@backstage/dev-utils` dev app rendering always uses `createRoot` from `react-dom/client`; the
  `HAS_REACT_DOM_CLIENT` branch and the `ReactDOM.render` fallback are removed.
- **FR-9** `@backstage/frontend-dev-utils` `createDevApp` always uses `createRoot` from `react-dom/client`;
  the fallback is removed, and the test that exercises the legacy fallback ("should fall back to legacy
  react-dom rendering when createRoot is unavailable") is removed. The remaining tests of
  `createDevApp.test.tsx` still pass.
- **FR-10** The TechDocs reader's `renderReactElement` always renders through `createRoot`; its legacy
  `ReactDOM.render` branch is removed. Its exported signature is unchanged.

### CLI (module `cli`)

- **FR-11** `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` is deleted, and no file imports
  it. The webpack and rspack `DefinePlugin` settings no longer define `process.env.HAS_REACT_DOM_CLIENT`;
  every other define stays.
- **FR-12** `packages/cli-module-test-jest/config/jest.js` no longer sets `HAS_REACT_DOM_CLIENT`; all other
  Jest configuration is unchanged.
- **FR-13** When the app being started resolves a `react` older than 18, the CLI prints a single warning that
  Backstage requires React 18 and links `https://backstage.io/docs/tutorials/react18-migration`. The
  "React 17 is now deprecated" warning in `startFrontend.ts` and the React 16 to 17 advice in `server.ts`
  are gone. A React 18 app sees no warning, as today.

### Test utilities (module `test-utils`)

- **FR-14** `@backstage/test-utils` no longer exports `LegacyRootOption`, and `renderWithEffects` and
  `renderInTestApp` no longer accept `legacyRoot`; they render with the React 18 root as they do today when
  `legacyRoot` is unset.
- **FR-15** `packages/test-utils/report.api.md` (and any other API report whose public surface changes) is
  regenerated by the repository's API report tooling, not by hand.

### Docs and release notes (module `docs`)

- **FR-16** `docs/tutorials/react18-migration.md` states that Backstage packages now require React 18, and its
  recommended peer range becomes `^18.0.0`. `docs/tutorials/migrate-to-mui5.md` recommends React 18 only peer
  ranges. `docs/tutorials/jsx-transform-migration.md` no longer speaks of React 17 being deprecated in the
  future tense. `packages/eslint-plugin/docs/rules/no-undeclared-imports.md` uses a React 18 range in its
  example. Docs follow `docs/contribute/doc-style-guide.md`.
- **FR-17** Every `knip-report.md` whose content changes because of FR-6 is updated to match.
- **FR-18** New changesets in `.changeset/` cover every published package changed by this run: `major` for a
  package at version 1.0.0 or above, `minor` for one below 1.0.0, private packages excluded. The text is
  written for adopters ("now requires React 18", "the `legacyRoot` option of the test render helpers is
  removed"), names no internal symbol that is not public API, and packages that need a different message get
  separate changesets. No existing changeset is edited unless it already covers the same change.

## Non-functional requirements

- **NFR-1** Every new source file carries the Apache 2.0 header with year 2026; no existing header year changes.
- **NFR-2** Changed files keep each package's own code style; `yarn prettier --write` runs only on changed files.
- **NFR-3** No `yarn build`, `yarn changesets version`, `yarn release`, or changeset CLI use. ESLint, Prettier and
  TypeScript configs are not changed.
- **NFR-4** No write outside the frozen allowlist; `docs-ui/`, `microsite/`, `workspaces/**` untouched.
- **NFR-5** Never bare `git stash` (shared worktree stash).
- **NFR-6** The lockfile change is the minimum the removed dependencies require.

## PII inventory

| Field | Sensitivity | Protection                                                                                                      |
| ----- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| None  | n/a         | The change touches build tooling, render paths, hooks, manifests and docs; it reads or stores no personal data. |

## Role matrix

| Role                    | Resource                               | Action                                                         |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Plugin author / adopter | Backstage package peer ranges          | Must install React 18 (React 17 no longer satisfies the peers) |
| Plugin author           | `@backstage/test-utils` render helpers | Can no longer pass `legacyRoot`                                |
| CLI user                | `backstage-cli package start`          | Sees the React 18 requirement warning on React < 18            |
| Maintainer              | `yarn lint:peer-deps`                  | Enforces the single React 18 range                             |

## Acceptance criteria

- **AC-1** `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`
  exits 0 (a failure that is also present before the run is reported, not fixed).
- **AC-2** `git grep -nE '\^17\.0\.0 \|\| \^18\.0\.0' -- 'packages/*/package.json' 'plugins/*/package.json' 'packages/cli-module-new/templates'`
  prints nothing.
- **AC-3** `git grep -n 'use-sync-external-store' -- packages plugins ':!**/CHANGELOG.md'` prints nothing,
  and `yarn.lock` no longer lists `use-sync-external-store` unless another dependency still requires it.
- **AC-4** `git grep -n 'HAS_REACT_DOM_CLIENT' -- packages plugins ':!**/CHANGELOG.md'` prints nothing, and
  `hasReactDomClient.ts` no longer exists.
- **AC-5** `git grep -nE 'ReactDOM\.render\(|legacyRoot|LegacyRootOption' -- packages plugins ':!**/CHANGELOG.md'`
  prints nothing.
- **AC-6** `CI=true yarn test packages/frontend-dev-utils packages/frontend-plugin-api/src/routing packages/repo-tools/src/commands/peer-deps packages/cli-module-new/src/lib packages/ui/src/hooks`
  exits 0 (a suite failing before the run is reported, not fixed).
- **AC-7** Every published package changed by this run is named in a new changeset under `.changeset/` with
  `major` (version >= 1.0.0) or `minor` (version < 1.0.0).
- **AC-8** `packages/test-utils/report.api.md` no longer mentions `LegacyRootOption` or `legacyRoot`.

## Assumptions

- The 54 published manifests narrow their React peers, so each gets a breaking changeset, per Gate 0's release
  policy; packages at `-next` majors already (`plugin-catalog-react 4.0.0-next.0`, `plugin-scaffolder-react
3.0.0-next.0`) are still named with `major`.
- `@backstage/ui` already requires React 18; it gets a changeset only for its dependency and `useId` changes
  (`minor`, since it is below 1.0.0, only if its published behaviour changes; otherwise `patch`).
- `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` drop a build-time flag that no adopter
  code should read; their changesets describe the React 18 requirement of the CLI.

## Gate 1 resolution

Approved. Both defaults hold: FR-7 stays in scope (React's `useId`), and FR-13 warns rather than fails. All
three assumptions are confirmed as stated.

## Open questions for HITL (resolved at Gate 1)

1. FR-7 (`useId` swap in four `@backstage/ui` components) changes the format of generated element ids in the
   DOM (`react-aria-123` style to `:r0:` style). No behaviour depends on it, but snapshot tests or adopters'
   CSS selectors could. Keep it in scope (default), or drop it?
2. FR-13 keeps a warning for React < 18 rather than making it a hard error. Keep the warning (default), or fail
   the start command?
