# Requirements: require React 18 and drop React 17 compatibility code

Run `20261101-141015-refactor-drop-react-17`, job `refactor`, on branch `BS-RF-10/opus55-plus-flash38` (issue backstage/backstage#35718).

This is a delta: it names what changes and what must be preserved. Sites were re-checked at this commit (`cb8b07905b`); this document and the intent brief govern, not the issue's older list.

## In scope

1. Peer dependency ranges for `react`, `react-dom` and `@types/react` in workspace manifests under `packages/*` and `plugins/*`.
2. The `backstage-repo-tools peer-deps` check, so it enforces the new ranges.
3. `packages/cli-module-new` templates that give new plugins React peer ranges.
4. The `use-sync-external-store` shim, its direct declarations and its type declarations.
5. `HAS_REACT_DOM_CLIENT` detection and every `ReactDOM.render` fallback behind it.
6. React 17 and React 16 diagnostics printed by the CLI.
7. `useId` imported from `react-aria` in four `packages/ui` components.
8. The `legacyRoot` option and `LegacyRootOption` type in `@backstage/test-utils`.
9. Companion files: `yarn.lock`, `packages/test-utils/report.api.md`, knip reports, the listed tutorials and rule docs, and changesets.

## Out of scope

1. React 19 support.
2. React 17 copies inside repository tooling and bundled executables (`.yarn/releases/**`, generated-app tooling).
3. Third-party packages that depend on `use-sync-external-store`.
4. `useIsomorphicLayoutEffect`, other server-rendering helpers, old frontend system support and router-version compatibility.
5. `react-dom/test-utils` imports in tests.
6. `react-test-renderer` `^16.13.1` in `plugins/catalog-react` devDependencies.
7. Compiler configuration.
8. Historical release notes (`docs/releases/**`) and lockfile parser fixtures.
9. `docs-ui/**`, `microsite/**` and `workspaces/**`.

## Functional requirements

### Manifests

- **FR-1.** Every workspace manifest under `packages/*` and `plugins/*` that declares `^17.0.0 || ^18.0.0` for `react`, `react-dom` or `@types/react` declares `^18.0.0` instead, in `peerDependencies` and anywhere else the same range appears. 56 manifests are expected. Optional-peer metadata stays as it is.
- **FR-2.** `yarn.lock` is regenerated with `yarn install` so that it matches the changed manifests, as a shell step of the plan. It is never typed by hand.

### Peer-deps check

- **FR-3.** `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` enforces `^18.0.0` for `react`, `react-dom` and `@types/react` on every package. The React-18-only exception (`peerDependenciesReact18Only`, `react18OnlyPackages` and its comment) is removed, because it no longer differs from the rule.

### CLI templates

- **FR-4.** Every `packages/cli-module-new/templates/*/package.json.hbs` that lists a React 16 or 17 range lists `^18.0.0`, so a new plugin never starts on a dropped range. Today these are `frontend-plugin`, `legacy-frontend-plugin`, `plugin-web-library` and `scaffolder-field-extension-module`. A template's dev dependency on a specific React version is changed only when it allows React 17.

### Native hooks

- **FR-5.** `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts` import `useSyncExternalStore` from `react`.
- **FR-6.** `use-sync-external-store` and `@types/use-sync-external-store` are removed from `packages/frontend-plugin-api/package.json` and `packages/ui/package.json`. `use-sync-external-store` is removed from `plugins/app/package.json`, where it is already unused, with its line in `plugins/app/knip-report.md` (see Open question 3).
- **FR-7.** `Popover`, `Tooltip`, `Table/components/Table` and `TablePagination` in `packages/ui/src/components/` take `useId` from `react`. Other imports from `react-aria` in those files stay.

### Root rendering

- **FR-8.** `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` and `plugins/techdocs/src/reader/transformers/renderReactElement.ts` use `react-dom/client` directly, with no `HAS_REACT_DOM_CLIENT` branch and no `ReactDOM.render` fallback.
- **FR-9.** `packages/frontend-dev-utils/src/createDevApp.test.tsx` no longer sets or deletes `HAS_REACT_DOM_CLIENT` and still proves the same root rendering behaviour.
- **FR-10.** The bundler no longer defines `process.env.HAS_REACT_DOM_CLIENT`, `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` is gone, and no import of it remains.
- **FR-11.** `packages/cli-module-test-jest/config/jest.js` no longer sets `HAS_REACT_DOM_CLIENT`. Any logic there that existed only to detect React 18 for that flag goes with it.

### Diagnostics

- **FR-12.** `startFrontend.ts` no longer prints the React 17 deprecation warning. `packages/cli-module-build/src/lib/bundler/server.ts` no longer tells users to upgrade to React 17: the advice either names React 18 or, if that check can no longer fire on a supported setup, is removed.

### Test utilities

- **FR-13.** `LegacyRootOption` and `legacyRoot` are removed from `packages/test-utils/src/testUtils/testingLibrary.ts` and `appWrappers.tsx`, including the comment describing work against React 17, and `packages/test-utils/report.api.md` is updated to match. No caller outside `packages/test-utils` passes `legacyRoot` at this commit.

### Documentation and release notes

- **FR-14.** `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md` and `packages/eslint-plugin/docs/rules/no-undeclared-imports.md` no longer present React 17 as a supported option. They are edited in place, following `docs/contribute/doc-style-guide.md`. A historical account of a past migration stays accurate.
- **FR-15.** Knip reports are updated where a removed import or declaration changes them. `packages/cli-module-build/knip-report.md:15` (the `hasReactDomClient.ts` line) is known.
- **FR-16.** Changesets under `.changeset/` cover every published package whose release changes, per `.claude/CLAUDE.md`, in plain adopter-facing language with no internal symbols. Existing changesets are inspected first and reused when they already describe the behaviour. Private packages get none.

## Non-functional requirements

- **NFR-1 Behaviour preserved.** Everything a React 18 user sees stays identical. The proof is the diff and the same tests passing before and after.
- **NFR-2 Repository rules.** New source files carry the Apache 2.0 header, existing years stay as they are, and each package's own style holds. `yarn build`, `yarn changesets version` and `yarn release` are never run, and the changeset CLI is never used.
- **NFR-3 Write contract.** Every write stays within the frozen allowlist. A site found outside it goes to the person, not around the contract.
- **NFR-4 Reversibility.** Every written file is in `provenance.json`, including what the install step writes.

## PII inventory

None. No field in the change holds personal data.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| none  | n/a         | n/a        |

## Role matrix

No roles, permissions or resources change. The check that matters here is that no authentication or permission code path is touched.

| Role | Resource | Action |
| ---- | -------- | ------ |
| n/a  | n/a      | n/a    |

## Acceptance criteria

- **AC-1.** `yarn tsc` exits 0.
- **AC-2.** `yarn lint:all` exits 0.
- **AC-3.** `yarn lint:peer-deps` exits 0.
- **AC-4.** `CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils` passes.
- **AC-5.** The test suites of the other packages this run changes source in pass, as a refactor's invariant: `packages/repo-tools`, `packages/cli-module-build`, `packages/dev-utils`, `packages/frontend-dev-utils`, `packages/frontend-plugin-api`, `packages/ui` and `plugins/techdocs`.
- **AC-6.** `git grep -nE '\^17\.0\.0|\^16\.13\.1' -- 'packages/*/package.json' 'plugins/*/package.json' 'packages/cli-module-new/templates'` returns only the `react-test-renderer` line in `plugins/catalog-react/package.json`.
- **AC-7.** `git grep -nE 'HAS_REACT_DOM_CLIENT|hasReactDomClient|use-sync-external-store/shim|LegacyRootOption|legacyRoot' -- packages plugins ':!**/CHANGELOG.md'` returns nothing.
- **AC-8.** `git grep -n "useId.*react-aria" -- packages/ui/src` returns nothing, and no `peerDependenciesReact18Only` or `react18OnlyPackages` remains in `packages/repo-tools`.
- **AC-9.** `yarn install --immutable` exits 0 after the change, so `yarn.lock` agrees with the manifests.
- **AC-10.** Each changed published package is covered by a changeset, and no file outside the allowlist changed.

A failure that exists before the run (the project checks' first run) is not this run's to fix. It is reported with its command and error.

## Open questions for HITL

Each has a default this document already assumes. A reply of `approved` accepts all of them.

1. **`legacyRoot` removal is a breaking public API change.** `@backstage/test-utils` is at `1.7.24-next.0`, so the repo rule asks for a `major` bump. On React 18 the option still selects legacy root mode, so removal is also the one place where a React 18 user could see a change, which sits against NFR-1. Default: remove it as the brief lists, and mark the changeset `major`. The alternative is to keep the type deprecated and ignore it for one release, as a `patch`.
2. **Peer range bump level.** Dropping a supported peer range is breaking for an adopter still on React 17, and React 17 has been deprecated in Backstage for a while. The repo rule read literally gives `minor` for packages below 1.0.0 and `major` for those at 1.0.0 or above, across about 56 packages. Default: follow the rule literally. The alternative is a single `minor`/`patch` changeset treating this as the end of an announced deprecation.
3. **`plugins/app` declaration.** The brief's non-goal limits removal to declarations "this run makes unused", but `plugins/app` already does not use `use-sync-external-store` (its knip report flags it), and the brief lists it under the confirmed sites. Default: remove it.
4. **Baseline state is unknown.** Nothing has been run yet. The project checks run once before the first batch, and any failure found there is reported, not fixed.
