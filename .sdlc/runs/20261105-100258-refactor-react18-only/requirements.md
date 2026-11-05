# Requirements — Require React 18 and Remove React 17 Compatibility

- **Run ID**: `20261105-100258-refactor-react18-only`
- **Mode / Intent**: `brownfield` / `refactor`
- **Delta Summary**:
  - **What changes**: Narrow React peer dependency ranges (`react`, `react-dom`, `@types/react`) from `^17.0.0 || ^18.0.0` to `^18.0.0` across 56 workspace manifests and the `repo-tools` peer-deps policy; replace `use-sync-external-store/shim` and `react-aria` `useId` imports with native React 18 APIs; replace `HAS_REACT_DOM_CLIENT` conditional imports and `ReactDOM.render` fallbacks with `react-dom/client` `createRoot`; remove `HAS_REACT_DOM_CLIENT` bundler/Jest definitions and `hasReactDomClient.ts`; update CLI React version diagnostics to require React 18; remove `LegacyRootOption` and `legacyRoot` from `@backstage/test-utils` and regenerate its API report; update `yarn new` templates and tutorial docs to specify React 18; and record breaking-change changesets for all affected published packages.
  - **What is preserved**: Runtime, rendering, hook, and build behaviour visible to React 18 users is completely unchanged. All existing test suites pass before and after the refactor, except for the removed legacy `ReactDOM.render` fallback expectation in `packages/frontend-dev-utils/src/createDevApp.test.tsx`.

---

## In scope

1. Narrow `react`, `react-dom`, and `@types/react` peer dependency ranges to `^18.0.0` in the 56 `package.json` manifests listed in `discovery.md` (preserving `peerDependenciesMeta` optional flags), update `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (and its tests if present) to enforce `^18.0.0` by default without `react18OnlyPackages`, and refresh `yarn.lock` (and `workspaces/ui/yarn.lock` if affected) via `yarn install`.
2. Replace `use-sync-external-store/shim` with native `useSyncExternalStore` from `react` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`, and remove `use-sync-external-store` / `@types/use-sync-external-store` declarations from `packages/frontend-plugin-api/package.json`, `packages/ui/package.json`, and `plugins/app/package.json`.
3. Replace `HAS_REACT_DOM_CLIENT` conditional imports and `ReactDOM.render` fallbacks with `react-dom/client` (`createRoot`) in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`, and update `packages/frontend-dev-utils/src/createDevApp.test.tsx` to drop legacy-render expectations while keeping mounting and error coverage.
4. Remove `HAS_REACT_DOM_CLIENT` from both bundler branches in `packages/cli-module-build/src/lib/bundler/config.ts` and from `packages/cli-module-test-jest/config/jest.js`, delete `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`, and update React version diagnostics in `packages/cli-module-build/src/commands/package/start/startFrontend.ts` and `packages/cli-module-build/src/lib/bundler/server.ts` to state React 18 as the minimum.
5. Replace React Aria `useId` imports with `react` `useId` in `packages/ui/src/components/Popover/Popover.tsx`, `packages/ui/src/components/Tooltip/Tooltip.tsx`, `packages/ui/src/components/Table/components/Table.tsx`, and `packages/ui/src/components/TablePagination/TablePagination.tsx`.
6. Remove `LegacyRootOption` and `legacyRoot` forwarding from `packages/test-utils/src/testUtils/testingLibrary.ts` and `packages/test-utils/src/testUtils/appWrappers.tsx`, and regenerate `packages/test-utils/report.api.md` via `yarn build:api-reports`.
7. Update `yarn new` templates in `packages/cli-module-new/templates/{frontend-plugin,plugin-web-library,legacy-frontend-plugin,scaffolder-field-extension-module}/package.json.hbs` (and any affected template tests in `packages/cli-module-new`) to declare React 18 (`^18.0.0`) only.
8. Update `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, and `docs/tutorials/migrate-to-mui5.md` to state the React 18 requirement while preserving useful migration examples and making no compiler-config changes.
9. Create or update `.changeset/*.md` files for every affected published package (minor below `1.0.0`, major at `1.0.0+`), including migration guidance for `@backstage/test-utils`.

---

## Out of scope

1. Any runtime, rendering, or build behaviour change for React 18 users.
2. React 19 support for published packages (docs sites already on React 19 keep their versions).
3. Removing React 17 copies from repository tooling or bundled executables (covered by a separate linked tooling PR).
4. Optional cleanups not in the issue: `act` imports from `react-dom/test-utils` in 4 test files (`packages/core-components/src/components/AutoLogout/disconnectedUsers.test.ts`, `plugins/scaffolder-react/src/next/components/TemplateOutputs/DefaultTemplateOutputs.test.tsx`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/BitbucketRepoPicker.test.tsx`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/RepoUrlPickerRepoName.test.tsx`) and the example in `packages/eslint-plugin/docs/rules/no-undeclared-imports.md`.
5. Release notes and changelogs: `docs/releases/**`, every `CHANGELOG.md`, and `docs-ui` changelog data (`docs-ui/src/utils/changelogs/*.ts`).
6. Lockfile parser test fixture: `packages/cli-node/src/monorepo/Lockfile.test.ts`.
7. ESLint, Prettier, and TypeScript configuration files (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`).
8. AI/agent configuration files (`.claude/**`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `AGENTS.md`) and GitHub workflows (`.github/workflows/**`).
9. Third-party `use-sync-external-store` usage, `useIsomorphicLayoutEffect`-style SSR helpers, legacy frontend system and router-version compatibility not tied to removed React APIs, and shared-module isolation mocks in `packages/ui/src/**/*.test.tsx`.

---

## Functional requirements per module

- **FR-1 (Peer dependency ranges, peer-deps rule & lockfiles — 56 workspace manifests, `packages/repo-tools`)**:
  - **Change**: Narrow `react`, `react-dom`, and `@types/react` in `peerDependencies` from `^17.0.0 || ^18.0.0` to `^18.0.0` across all 56 `package.json` files listed in `discovery.md` (18 in `packages/`, 38 in `plugins/`). Update `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (and its tests if present) to require `^18.0.0` by default and remove `peerDependenciesReact18Only` / `react18OnlyPackages`. Refresh `yarn.lock` (and `workspaces/ui/yarn.lock` if affected) via `yarn install`.
  - **Preserved**: `peerDependenciesMeta` optional flags on `@types/react` and all other manifest fields remain unchanged.

- **FR-2 (External-store shims — `packages/frontend-plugin-api`, `packages/ui`, `plugins/app`)**:
  - **Change**: Import `useSyncExternalStore` directly from `react` instead of `use-sync-external-store/shim` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`. Remove `use-sync-external-store` and `@types/use-sync-external-store` dependencies from `packages/frontend-plugin-api/package.json`, `packages/ui/package.json`, and `plugins/app/package.json`.
  - **Preserved**: Hook behaviour, store subscription lifecycle, and return types of `useRouteRef` and `useBreakpoint` remain unchanged.

- **FR-3 (Root render paths — `packages/dev-utils`, `packages/frontend-dev-utils`, `plugins/techdocs`)**:
  - **Change**: Replace `HAS_REACT_DOM_CLIENT` conditional imports and `ReactDOM.render` fallbacks with direct `react-dom/client` `createRoot` calls in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`. Remove the legacy-render fallback test in `packages/frontend-dev-utils/src/createDevApp.test.tsx`.
  - **Preserved**: React 18 root mounting, tree rendering, and error-handling behaviour (and corresponding test coverage in `createDevApp.test.tsx`) remain unchanged.

- **FR-4 (CLI bundler flag & React version diagnostics — `packages/cli-module-build`, `packages/cli-module-test-jest`)**:
  - **Change**: Remove `process.env.HAS_REACT_DOM_CLIENT` from both webpack and rspack bundler branches in `packages/cli-module-build/src/lib/bundler/config.ts` and from `packages/cli-module-test-jest/config/jest.js`. Delete `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`. Update diagnostics in `packages/cli-module-build/src/commands/package/start/startFrontend.ts` and `packages/cli-module-build/src/lib/bundler/server.ts` (`checkReactVersion`) to state React 18 as the minimum version.
  - **Preserved**: Bundler compilation, dev server startup, and Jest execution for React 18 workspaces remain unchanged.

- **FR-5 (Native `useId` hook — `packages/ui`)**:
  - **Change**: Replace `useId` imports from `react-aria` with `useId` from `react` in `packages/ui/src/components/Popover/Popover.tsx`, `packages/ui/src/components/Tooltip/Tooltip.tsx`, `packages/ui/src/components/Table/components/Table.tsx`, and `packages/ui/src/components/TablePagination/TablePagination.tsx`.
  - **Preserved**: Component rendering, explicit `id` prop precedence, and ARIA/DOM attribute wiring remain unchanged.

- **FR-6 (Test utilities legacyRoot removal — `packages/test-utils`)**:
  - **Change**: Remove `LegacyRootOption` and `legacyRoot` forwarding from `packages/test-utils/src/testUtils/testingLibrary.ts` and `packages/test-utils/src/testUtils/appWrappers.tsx`. Regenerate `packages/test-utils/report.api.md` via `yarn build:api-reports` and document migration guidance in the `@backstage/test-utils` changeset.
  - **Preserved**: All remaining `renderWithEffects` and `renderInTestApp` options and test wrapper behaviors remain unchanged.

- **FR-7 (`yarn new` package templates — `packages/cli-module-new`)**:
  - **Change**: Update `packages/cli-module-new/templates/{frontend-plugin,plugin-web-library,legacy-frontend-plugin,scaffolder-field-extension-module}/package.json.hbs` (and any corresponding template tests in `packages/cli-module-new`) to declare `^18.0.0` for `react` and `react-dom` without `^16.13.1` or `^17.0.0`.
  - **Preserved**: Template layout, templating variables, and non-React dependencies remain unchanged.

- **FR-8 (Documentation updates — `docs/tutorials`)**:
  - **Change**: Update `docs/tutorials/react18-migration.md` to state the React 18 requirement and `^18.0.0` peer ranges, and reconcile React 17 statements in `docs/tutorials/jsx-transform-migration.md` and `docs/tutorials/migrate-to-mui5.md`.
  - **Preserved**: Useful React 18 migration examples in `docs/tutorials/react18-migration.md` are kept, and no compiler configurations are modified.

- **FR-9 (Changesets — `.changeset/*.md`)**:
  - **Change**: Add or update `.changeset/*.md` files covering every affected published package (reusing/updating existing pending changesets where they already cover the same packages). Apply `minor` for packages `<1.0.0` and `major` for packages `>=1.0.0`, excluding private packages (`@backstage/app-example-plugin`, `@backstage/plugin-example-todo-list`, `@backstage/repo-tools`).
  - **Preserved**: Existing pending changeset content for unrelated changes is preserved.

---

## Non-functional requirements

- **NFR-1 (React 18 behaviour & test invariance)**: Behaviour observed by React 18 consumers must remain identical; all pre-existing test suites in affected packages must continue to pass (except the removed legacy-render fallback test case in `packages/frontend-dev-utils/src/createDevApp.test.tsx`).
- **NFR-2 (No build/release commands)**: Never run `yarn build`, `yarn changesets version`, `yarn release`, or unscoped `yarn test`.
- **NFR-3 (Changesets as files, no internal symbols)**: Create/edit `.changeset/*.md` files directly (never via interactive CLI). Changeset text must be user-facing and must not mention internal/unexported symbols (e.g., `HAS_REACT_DOM_CLIENT`, `hasReactDomClient`, `checkReactVersion`).
- **NFR-4 (Semver policy)**: Breaking changes (peer-range narrowing to `^18.0.0` and removal of `LegacyRootOption`/`legacyRoot`) must use `minor` below `1.0.0` and `major` at `1.0.0+`.
- **NFR-5 (License headers)**: Include the Apache 2.0 header with year `2026` only on newly created source files; never update copyright years on existing files.
- **NFR-6 (Targeted formatting)**: Run Prettier only on changed files; never modify ESLint, Prettier, or TypeScript config files.
- **NFR-7 (Lockfiles via Yarn only)**: Update `yarn.lock` and `workspaces/ui/yarn.lock` exclusively via `yarn install`, never by manual edits.
- **NFR-8 (Generated API reports)**: Update `packages/test-utils/report.api.md` exclusively via `yarn build:api-reports`, never by manual edits.

---

## PII inventory

None. This refactor modifies package dependency manifests, React rendering/hook imports, CLI bundler configuration, templates, and documentation with no PII handling.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| None  | N/A         | N/A — no personal or sensitive data is processed or stored |

---

## Role matrix

Not applicable. This refactor does not introduce, modify, or interact with authentication, authorization, or access-control roles.

| Role | Resource | Action |
| ---- | -------- | ------ |
| N/A  | N/A      | Not applicable — build/runtime React 18 refactor only |

---

## Acceptance criteria

1. **AC-1 (TypeScript check)**: `yarn tsc` at the repository root succeeds with exit code 0.
2. **AC-2 (Linting)**: `yarn lint:all` at the repository root succeeds with exit code 0.
3. **AC-3 (Peer dependency policy check)**: `yarn lint:peer-deps` succeeds with exit code 0 against the updated `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` rule.
4. **AC-4 (Gate 0 test command)**: The approved Gate 0 verification command succeeds verbatim:
   `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`
5. **AC-5 (Per-package test suites)**: All affected package test suites pass when executed via `CI=1 yarn test <path>`:
   - `CI=1 yarn test packages/frontend-dev-utils`
   - `CI=1 yarn test packages/dev-utils`
   - `CI=1 yarn test plugins/techdocs/src/reader/transformers`
   - `CI=1 yarn test packages/test-utils`
   - `CI=1 yarn test packages/cli-module-build`
   - `CI=1 yarn test packages/cli-module-new`
   - `CI=1 yarn test packages/repo-tools/src/commands/peer-deps`
   - `CI=1 yarn test packages/frontend-plugin-api`
   - `CI=1 yarn test packages/ui`
6. **AC-6 (No React 17 peer ranges remaining)**: A regex search (`grep` / `rg`) for `\^17` or `\^16` on `react`, `react-dom`, or `@types/react` across `packages/*/package.json`, `plugins/*/package.json`, and `packages/cli-module-new/templates/**/package.json.hbs` returns zero matches.
7. **AC-7 (API report consistency)**: `yarn build:api-reports` exits with code 0 and produces a clean git diff for `packages/test-utils/report.api.md`.
8. **AC-8 (Changeset coverage)**: Every affected non-private package has a valid `.changeset/*.md` entry with `minor` (`<1.0.0`) or `major` (`>=1.0.0`), including migration guidance for `@backstage/test-utils`, and no private packages or internal symbol names are included.

---

## Open questions for HITL

None. All scope boundaries, breaking-change bump rules (`minor` `<1.0.0`, `major` `>=1.0.0`), `legacyRoot`/`LegacyRootOption` removal in `@backstage/test-utils`, and the verification test command were confirmed and approved at Gate 0.
