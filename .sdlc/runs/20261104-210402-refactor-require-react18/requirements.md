# Requirements — Require React 18 and Remove React 17 Compatibility Code

- **Run ID:** `20261104-210402-refactor-require-react18`
- **Mode:** `brownfield`
- **Intent:** `refactor`
- **Source of truth:** `.sdlc/runs/20261104-210402-refactor-require-react18/intent_brief.md` (Gate 0 approved on 2026-11-04) and this branch's repository tree. `backstage/backstage#35718` was written against a later tree; the brief's file list wins.

---

## In scope

The write contract allowlist is frozen at Gate 0 to strictly the 91 file entries below (never widened):

1. **Workspace peer-dependency manifests in `packages/*` (18 manifests — 17 published, 1 private `packages/app-example-plugin`)** — Testable: `peerDependencies` for `react`, `react-dom`, and `@types/react` equal `"^18.0.0"`, and `peerDependenciesMeta["@types/react"].optional` remains `true`:
   - `packages/app-defaults/package.json`
   - `packages/app-example-plugin/package.json` (private)
   - `packages/core-app-api/package.json`
   - `packages/core-compat-api/package.json`
   - `packages/core-components/package.json`
   - `packages/core-plugin-api/package.json`
   - `packages/dev-utils/package.json`
   - `packages/frontend-app-api/package.json`
   - `packages/frontend-defaults/package.json`
   - `packages/frontend-dev-utils/package.json`
   - `packages/frontend-dynamic-feature-loader/package.json`
   - `packages/frontend-plugin-api/package.json` (also removes `use-sync-external-store` and `@types/use-sync-external-store`)
   - `packages/frontend-test-utils/package.json`
   - `packages/integration-react/package.json`
   - `packages/module-federation-common/package.json`
   - `packages/test-utils/package.json`
   - `packages/theme/package.json`
   - `packages/version-bridge/package.json`
2. **Workspace peer-dependency manifests in `plugins/*` (38 manifests — 37 published, 1 private `plugins/example-todo-list`)** — Testable: `peerDependencies` for `react`, `react-dom`, and `@types/react` equal `"^18.0.0"`, and `peerDependenciesMeta["@types/react"].optional` remains `true`:
   - `plugins/api-docs-module-protoc-gen-doc/package.json`
   - `plugins/api-docs/package.json`
   - `plugins/app-react/package.json`
   - `plugins/app-visualizer/package.json`
   - `plugins/app/package.json` (also removes `use-sync-external-store`)
   - `plugins/auth-react/package.json`
   - `plugins/auth/package.json`
   - `plugins/catalog-graph/package.json`
   - `plugins/catalog-import/package.json`
   - `plugins/catalog-react/package.json`
   - `plugins/catalog-unprocessed-entities/package.json`
   - `plugins/catalog/package.json`
   - `plugins/config-schema/package.json`
   - `plugins/devtools-react/package.json`
   - `plugins/devtools/package.json`
   - `plugins/example-todo-list/package.json` (private)
   - `plugins/home-react/package.json`
   - `plugins/home/package.json`
   - `plugins/kubernetes-cluster/package.json`
   - `plugins/kubernetes-react/package.json`
   - `plugins/kubernetes/package.json`
   - `plugins/mui-to-bui/package.json`
   - `plugins/notifications/package.json`
   - `plugins/org-react/package.json`
   - `plugins/org/package.json`
   - `plugins/permission-react/package.json`
   - `plugins/scaffolder-node-test-utils/package.json`
   - `plugins/scaffolder-react/package.json`
   - `plugins/scaffolder/package.json`
   - `plugins/search-react/package.json`
   - `plugins/search/package.json`
   - `plugins/signals-react/package.json`
   - `plugins/signals/package.json`
   - `plugins/techdocs-addons-test-utils/package.json`
   - `plugins/techdocs-module-addons-contrib/package.json`
   - `plugins/techdocs-react/package.json`
   - `plugins/techdocs/package.json`
   - `plugins/user-settings/package.json`
3. **`packages/ui/package.json` and `yarn.lock`** — Testable: `packages/ui/package.json` drops `use-sync-external-store` and `@types/use-sync-external-store` while keeping its existing `^18.0.0` peer ranges; `yarn.lock` is regenerated via `yarn install` (never hand-edited) and passes `yarn install --immutable`.
4. **Peer-deps check (`packages/repo-tools/src/commands/peer-deps/peer-deps.ts`)** — Testable: `yarn lint:peer-deps` exits 0 with `^18.0.0` as the default peer range for `@types/react`, `react`, and `react-dom`, and with the React-18-only exception set removed.
5. **External-store shims (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`, `packages/ui/src/hooks/useBreakpoint.ts`, plus manifest dependency removals in `packages/frontend-plugin-api/package.json`, `packages/ui/package.json`, and `plugins/app/package.json`)** — Testable: `useSyncExternalStore` is imported directly from `'react'`, no `use-sync-external-store` imports or declarations remain in those packages, and existing hook tests pass.
6. **Legacy render paths (`packages/dev-utils/src/devApp/render.tsx`, `packages/dev-utils/src/devApp/render.test.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, `packages/frontend-dev-utils/src/createDevApp.test.tsx`, `plugins/techdocs/src/reader/transformers/renderReactElement.ts`)** — Testable: all three render paths unconditionally use `createRoot` from `react-dom/client` without `HAS_REACT_DOM_CLIENT` branching or `ReactDOM.render` fallback; the legacy-render fallback test in `createDevApp.test.tsx` is removed while mounting, `bindRoutes`, and missing-root error tests pass.
7. **Bundler, CLI start-up diagnostics, and Jest detection (`packages/cli-module-build/src/lib/bundler/config.ts`, `packages/cli-module-build/src/lib/bundler/config.test.ts`, `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` [delete], `packages/cli-module-build/src/commands/package/start/startFrontend.ts`, `packages/cli-module-build/src/lib/bundler/server.ts`, `packages/cli-module-build/knip-report.md` [regenerated], `packages/cli-module-test-jest/config/jest.js`)** — Testable: `hasReactDomClient.ts` is deleted, `process.env.HAS_REACT_DOM_CLIENT` is no longer defined or referenced, `server.ts` names React 18 as the minimum version and warns on React 16 or 17, `knip-report.md` is regenerated, and `cli-module-build` tests pass.
8. **React `useId` migration in `@backstage/ui` (`packages/ui/src/components/Popover/Popover.tsx`, `packages/ui/src/components/Tooltip/Tooltip.tsx`, `packages/ui/src/components/Table/components/Table.tsx`, `packages/ui/src/components/Table/components/Table.test.tsx`, `packages/ui/src/components/TablePagination/TablePagination.tsx`, `packages/ui/src/components/TablePagination/TablePagination.test.tsx`)** — Testable: all four components import `useId` from `'react'` instead of `'react-aria'`, and component tests verify unique per-instance IDs, SVG `<use>` references, and `aria-describedby` relationships.
9. **Test utilities (`packages/test-utils/src/testUtils/testingLibrary.ts`, `packages/test-utils/src/testUtils/appWrappers.tsx`, `packages/test-utils/src/testUtils/appWrappers.test.tsx`, `packages/test-utils/report.api.md` [regenerated])** — Testable: `LegacyRootOption` and `legacyRoot` forwarding are removed, `report.api.md` is regenerated and verified with `--ci`, and `packages/test-utils` tests pass.
10. **CLI `new` plugin templates (`packages/cli-module-new/templates/{frontend-plugin,legacy-frontend-plugin,plugin-web-library,scaffolder-field-extension-module}/package.json.hbs`)** — Testable: no React 16 or React 17 version range remains in any of the four template manifests; all declare React 18 (`^18.0.0`).
11. **Documentation and Changesets (`docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `.changeset/*react-18*.md`)** — Testable: docs reflect the React 18 requirement and `legacyRoot` removal without changing compiler config, and `.changeset/*react-18*.md` covers every affected published package with valid changeset formatting and bump levels.

---

## Out of scope

1. **Adding React 19 support to published packages** — Published workspace packages must target `^18.0.0`, not React 19.
2. **Removing React 17 runtime copies from repository tooling** — Yarn dependencies of repo tools or bundled executables (`.yarn/**`, `packages/create-app/templates/**/.yarn/**`) are out of scope.
3. **Changing compiler, linter, formatter, or JSX configuration** — ESLint, Prettier, and TypeScript configuration files (including `tsconfig.json` and SWC/bundler JSX transform settings) are off-limits.
4. **Third-party shims, SSR helpers, and non-React-17 compatibility code** — Transitive third-party `use-sync-external-store` dependencies, server-rendering helpers such as `useIsomorphicLayoutEffect`, and old-frontend-system or router compatibility code that does not depend on removed React 17 APIs are out of scope.
5. **Historical release notes, changelogs, and lockfile parser test fixtures** — `**/CHANGELOG.md`, `docs/releases/**`, and `packages/cli-node/src/monorepo/Lockfile.test.ts` are off-limits.
6. **Separate documentation and workspace sub-projects** — `docs-ui/**`, `microsite/**`, and `workspaces/**` (where docs sites stay on React 19) are off-limits.
7. **Project defaults, AI configs, build outputs, and unlisted files** — `.env`, `.env.*`, `.mcp.json`, `.cursor/**`, `.claude/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `node_modules/**`, `**/dist/**`, `**/dist-types/**`, `build/**`, `.next/**`, `.git/**`, `.sdlc/**` (except this run's folder), and any file not in the 91-entry allowlist are strictly off-limits.

---

## Functional requirements per module / area

### Area 1: Peer Dependency Ranges (`packages/*/package.json`, `plugins/*/package.json`, `yarn.lock`)

- **FR-1 (Peer dependency ranges in 54 published + 2 private manifests):** In all 56 workspace `package.json` files listed under In Scope items 1 and 2 (54 published packages plus private `packages/app-example-plugin` and `plugins/example-todo-list`), update `peerDependencies["react"]`, `peerDependencies["react-dom"]`, and `peerDependencies["@types/react"]` from `"^17.0.0 || ^18.0.0"` to `"^18.0.0"`.
- **FR-2 (Preserve optional `@types/react` peer metadata):** In all 56 manifests, preserve `peerDependenciesMeta["@types/react"]: { "optional": true }` unchanged.
- **FR-3 (Regenerate `yarn.lock` via Yarn):** After updating all `package.json` files (including removing `use-sync-external-store` declarations in Area 3), run `yarn install` to regenerate `yarn.lock`. Never hand-edit `yarn.lock`.

### Area 2: Peer-Deps Check (`packages/repo-tools`)

- **FR-4 (Default React 18 peer range in `peer-deps.ts`):** In `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`, update `peerDependencies` so that `'@types/react'`, `'react'`, and `'react-dom'` default to `'^18.0.0'` (replacing `'^17.0.0 || ^18.0.0'`).
- **FR-5 (Remove React-18-only exception set):** In `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`, remove `peerDependenciesReact18Only`, `react18OnlyPackages` (`new Set(['@backstage/ui'])`), and `getExpectedPeerDependencies`, using `peerDependencies` directly for all checked packages.

### Area 3: External-Store Shims (`packages/frontend-plugin-api`, `packages/ui`, `plugins/app`)

- **FR-6 (`useRouteRef` native `useSyncExternalStore`):** In `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, import `useSyncExternalStore` from `'react'` instead of `'use-sync-external-store/shim'`. Keep `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` passing and aligned with React's built-in hook.
- **FR-7 (`useBreakpoint` native `useSyncExternalStore`):** In `packages/ui/src/hooks/useBreakpoint.ts`, import `useSyncExternalStore` from `'react'` instead of `'use-sync-external-store/shim'`.
- **FR-8 (Remove `use-sync-external-store` package declarations):**
  - In `packages/frontend-plugin-api/package.json`, remove `"use-sync-external-store"` from `dependencies` and `"@types/use-sync-external-store"` from `devDependencies`.
  - In `packages/ui/package.json`, remove `"use-sync-external-store"` from `dependencies` and `"@types/use-sync-external-store"` from `devDependencies`.
  - In `plugins/app/package.json`, remove `"use-sync-external-store"` from `dependencies`.

### Area 4: Legacy Render Paths (`packages/dev-utils`, `packages/frontend-dev-utils`, `plugins/techdocs`)

- **FR-9 (`packages/dev-utils` `createRoot` rendering):** In `packages/dev-utils/src/devApp/render.tsx`, remove `ReactDOMPromise`, the `process.env.HAS_REACT_DOM_CLIENT` check, the dynamic `import('react-dom')` / `import('react-dom/client')` branching, and the `ReactDOM.render` fallback; import `createRoot` from `'react-dom/client'` and render `<DevApp />` into `document.getElementById('root')!` via `createRoot(document.getElementById('root')!).render(<DevApp />)`. Keep `packages/dev-utils/src/devApp/render.test.tsx` passing.
- **FR-10 (`packages/frontend-dev-utils` `createRoot` rendering and test update):**
  - In `packages/frontend-dev-utils/src/createDevApp.tsx`, remove `ReactDOMPromise`, the `process.env.HAS_REACT_DOM_CLIENT` conditional import, and the `ReactDOM.render(rootNode, rootElement)` fallback; import `createRoot` from `'react-dom/client'` and render `rootNode` directly with `createRoot(rootElement).render(rootNode)`.
  - In `packages/frontend-dev-utils/src/createDevApp.test.tsx`, remove the legacy fallback test (`'should fall back to legacy react-dom rendering when createRoot is unavailable'`), while preserving the plugin mounting test, `bindRoutes` forwarding test, and missing `#root` element error test.
- **FR-11 (`plugins/techdocs` `renderReactElement`):** In `plugins/techdocs/src/reader/transformers/renderReactElement.ts`, remove `ReactDOMPromise`, the `process.env.HAS_REACT_DOM_CLIENT` check, and the `ReactDOM.render(element, root)` fallback; import `createRoot` from `'react-dom/client'` and render `element` into `root` using `createRoot(root).render(element)`.

### Area 5: Bundler, Test Detection, and CLI Diagnostics (`packages/cli-module-build`, `packages/cli-module-test-jest`)

- **FR-12 (Delete `hasReactDomClient.ts` and remove bundler `HAS_REACT_DOM_CLIENT` defines):**
  - Delete `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`.
  - In `packages/cli-module-build/src/lib/bundler/config.ts`, remove the `hasReactDomClient` import and remove `'process.env.HAS_REACT_DOM_CLIENT'` from both the `webpack.DefinePlugin` and `bundler.DefinePlugin` configurations. Keep `packages/cli-module-build/src/lib/bundler/config.test.ts` passing.
- **FR-13 (Remove Jest `HAS_REACT_DOM_CLIENT` detection):** In `packages/cli-module-test-jest/config/jest.js`, remove the `try { require.resolve('react-dom/client', ...); process.env.HAS_REACT_DOM_CLIENT = true; } catch {}` block (lines 52–59).
- **FR-14 (CLI start-up diagnostics in `startFrontend.ts` and `server.ts`):**
  - In `packages/cli-module-build/src/commands/package/start/startFrontend.ts`, remove the `hasReactDomClient` import and the `!hasReactDomClient()` React 17 deprecation warning block.
  - In `packages/cli-module-build/src/lib/bundler/server.ts`, update `checkReactVersion()` so that if the resolved `react` version is React 16 or React 17 (`reactPkg.version.startsWith('16.') || reactPkg.version.startsWith('17.')`), the CLI warning names React 18 as the required minimum and instructs the user to upgrade to React 18 (e.g., `You are using React version ${reactPkg.version}, which is deprecated for use in Backstage. Please upgrade to React 18 by updating your packages/app dependencies.`), never recommending React 17.
- **FR-15 (Regenerate `packages/cli-module-build/knip-report.md`):** Regenerate only `packages/cli-module-build/knip-report.md` so that the removed `src/lib/bundler/hasReactDomClient.ts` unlisted dependency entry for `react-dom` is no longer present and any line numbers in `server.ts` match the updated file.

### Area 6: React `useId` in `@backstage/ui` (`packages/ui`)

- **FR-16 (Migrate 4 `@backstage/ui` components from `react-aria`'s `useId` to `react`'s `useId`):**
  - `packages/ui/src/components/Popover/Popover.tsx`: import `useId` from `'react'` instead of `'react-aria'`.
  - `packages/ui/src/components/Tooltip/Tooltip.tsx`: import `useId` from `'react'` instead of `'react-aria'`.
  - `packages/ui/src/components/Table/components/Table.tsx`: import `useId` from `'react'` instead of `'react-aria'`.
  - `packages/ui/src/components/TablePagination/TablePagination.tsx`: import `useId` from `'react'` instead of `'react-aria'`.
  - Ensure `packages/ui/src/components/Table/components/Table.test.tsx` and `packages/ui/src/components/TablePagination/TablePagination.test.tsx` verify/preserve the accessibility relationships (`aria-describedby` referencing the generated live-region / pagination label `id`s) and pass.

### Area 7: Test Utilities (`packages/test-utils`)

- **FR-17 (Remove `LegacyRootOption` and `legacyRoot` from `@backstage/test-utils`):**
  - In `packages/test-utils/src/testUtils/testingLibrary.ts`, remove `export type LegacyRootOption = { legacyRoot?: boolean };` and change `renderWithEffects` `options` parameter type from `Pick<RenderOptions, 'wrapper'> & LegacyRootOption` to `Pick<RenderOptions, 'wrapper'>`.
  - In `packages/test-utils/src/testUtils/appWrappers.tsx`, remove the `LegacyRootOption` import, change `renderInTestApp` `options` parameter type from `TestAppOptions & LegacyRootOption = {}` to `TestAppOptions = {}`, and stop destructuring/forwarding `legacyRoot` to `renderWithEffects`.
  - Keep `packages/test-utils/src/testUtils/appWrappers.test.tsx` passing.
- **FR-18 (Regenerate `packages/test-utils/report.api.md`):**
  - Regenerate `packages/test-utils/report.api.md` by running `yarn tsc:full`, then `yarn build:api-reports:only packages/test-utils`, then `yarn build:api-reports:only packages/test-utils --ci` (which must exit 0). Never run `yarn build:api-reports <paths>`.

### Area 8: Plugin Templates (`packages/cli-module-new`)

- **FR-19 (Update React ranges in `cli-module-new` templates to `^18.0.0`):**
  - `packages/cli-module-new/templates/frontend-plugin/package.json.hbs`: change `peerDependencies.react` and `devDependencies.react` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"`.
  - `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs`: change `peerDependencies.react`, `peerDependencies["react-dom"]`, `devDependencies.react`, and `devDependencies["react-dom"]` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` / `"{{versionQuery 'react-dom' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"` and `"{{versionQuery 'react-dom' '^18.0.0'}}"`.
  - `packages/cli-module-new/templates/plugin-web-library/package.json.hbs`: change `peerDependencies.react` and `devDependencies.react` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"`.
  - `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs`: change `peerDependencies.react` from `"^17.0.0 || ^18.0.0"` to `"^18.0.0"`.

### Area 9: Documentation (`docs/tutorials/*`)

- **FR-20 (Update `docs/tutorials/react18-migration.md`):** Update the guide to state that Backstage now requires React 18 (React 17 support has been removed), update the frontend plugin `package.json` examples to show `"^18.0.0"` (instead of `"^17.0.0 || ^18.0.0"`), remove advice suggesting keeping plugins on React 17 as an ongoing supported state, keep the useful migration examples (root resolutions, `packages/app`, `createRoot`, TypeScript errors, `@testing-library/react` migration patterns), and document the removal of `LegacyRootOption` / `legacyRoot` from `@backstage/test-utils`.
- **FR-21 (Update `docs/tutorials/jsx-transform-migration.md`):** Reconcile the React 17 statements (update references that imply React 17 is still supported and reconcile line 61's `"once React 17 is fully deprecated"` statement) without changing any compiler or `tsconfig.json` configuration.

### Area 10: Changesets (`.changeset/*react-18*.md`)

- **FR-22 (Create changesets for all affected published packages):**
  - Create `.changeset/*react-18*.md` covering every affected published package (59 published packages total: the 54 published peer-range packages, `@backstage/ui` [`patch`], `@backstage/repo-tools` [`minor`], `@backstage/cli-module-build` [`minor`], `@backstage/cli-module-test-jest` [`minor`], and `@backstage/cli-module-new` [`patch`]). Exclude the 2 private packages (`app-example-plugin` and `@internal/plugin-todo-list`).
  - Give `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` their own separate changeset message (distinct from packages whose message does not mention `HAS_REACT_DOM_CLIENT`) that states plainly that `process.env.HAS_REACT_DOM_CLIENT` is no longer defined.
  - Follow all repository changeset rules detailed in the **Changeset rules** section below.

---

## Invariants to preserve

1. **Unchanged React 18 runtime behaviour:** Every code path executed by React 18 consumers must behave identically before and after the refactor. `createRoot` rendering, route resolution subscriptions in `useRouteRef`, media-query store subscriptions in `useBreakpoint`, and `renderInTestApp` / `renderWithEffects` in `@backstage/test-utils` must produce the exact same outputs and side effects under React 18.
2. **Unique per-instance IDs:** In `Popover`, `Tooltip`, `Table`, and `TablePagination` within `@backstage/ui`, calling `useId()` from `'react'` must generate a unique ID per mounted component instance without collisions when multiple instances render simultaneously.
3. **SVG and ARIA relationships:**
   - In `Popover` and `Tooltip`, the `<path id={svgPathId} ... />` inside `<defs>` and both `<use href={`#${svgPathId}`} />` elements must reference the exact same per-instance `svgPathId`.
   - In `Table`, `<VisuallyHidden aria-live="polite" id={liveRegionId}>` and `<TableRoot ... aria-describedby={liveRegionId}>` must share the exact same `liveRegionId`.
   - In `TablePagination`, `<Text as="p" variant="body-medium" id={labelId}>` and the previous/next `<ButtonIcon ... aria-describedby={showLabel ? labelId : undefined} />` buttons must share the exact same `labelId` when `showLabel` is true, and omit `aria-describedby` (`undefined`) when `showLabel` is false.
4. **Test suite parity:** All 86 test suites (550 tests) in the baseline test command must continue to pass; the only test removed across the in-scope files is the React 17 legacy `ReactDOM.render` fallback test in `packages/frontend-dev-utils/src/createDevApp.test.tsx`.

---

## Non-functional requirements

- **NFR-1 (Apache 2.0 license headers):** Include the standard Backstage Apache 2.0 license header on new source files only; preserve existing license headers on modified source files without altering their copyright years.
- **NFR-2 (Code style consistency):** Match the existing TypeScript/React formatting, import ordering, and naming conventions of each modified package (`STYLE.md`).
- **NFR-3 (No tooling configuration edits):** Do not modify any ESLint, Prettier, or TypeScript configuration files (`tsconfig.json`, `.eslintrc*`, `.prettierrc*`, etc.).
- **NFR-4 (Lockfile integrity):** `yarn.lock` must only be updated by running `yarn install` so that workspace constraints and transitive resolutions stay valid and `yarn install --immutable` succeeds.

---

## PII inventory

None. This refactoring only updates React peer dependency ranges, internal React hook imports (`useSyncExternalStore`, `useId`), DOM root mounting (`createRoot`), CLI version diagnostics, test utilities, templates, documentation, and changesets. No Personal Identifiable Information (PII) is collected, processed, stored, or exposed.

| Field | Sensitivity | Protection |
| :--- | :--- | :--- |
| _None_ | N/A | N/A |

---

## Role matrix

Not applicable. This refactoring does not introduce, modify, or remove any authentication, authorization, permission policies, roles, resources, or access-control actions.

| Role | Resource | Action | Permission / Rule |
| :--- | :--- | :--- | :--- |
| _Not applicable_ | _Not applicable_ | _Not applicable_ | _Not applicable_ |

---

## Changeset rules

1. **Check existing changesets first:** Before creating changesets, inspect `.changeset/` (which is currently in pre-release `next` mode per `.changeset/pre.json`). Existing changesets already touch `@backstage/frontend-plugin-api`, `@backstage/frontend-test-utils`, `@backstage/plugin-kubernetes-cluster`, `@backstage/plugin-scaffolder`, `@backstage/plugin-scaffolder-react`, and `@backstage/plugin-techdocs`, but none of them cover the React 18 requirement. New changeset file(s) must match `.changeset/*react-18*.md` per the write contract allowlist.
2. **Adopter-facing plain language:** Write changeset descriptions in plain, user-facing language explaining the impact on adopters (e.g., dropping React 17 support / requiring React 18, and for `@backstage/test-utils` removing `LegacyRootOption` and the `legacyRoot` option from `renderInTestApp` and `renderWithEffects`). Because `process.env.HAS_REACT_DOM_CLIENT` was announced to adopters, the `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` changesets must state plainly that `process.env.HAS_REACT_DOM_CLIENT` is no longer defined (in their own changeset message, separate from packages whose message does not mention it). Never mention internal symbol names (`hasReactDomClient`, `ReactDOMPromise`, `peerDependenciesReact18Only`, `react18OnlyPackages`, etc.).
3. **Bump levels per `REVIEWING.md`:**
   - **Breaking changes on packages at `>= 1.0.0` (`major`):**
     - `@backstage/app-defaults` (`1.7.14-next.0`)
     - `@backstage/core-app-api` (`1.20.7-next.0`)
     - `@backstage/core-plugin-api` (`1.12.12-next.0`)
     - `@backstage/dev-utils` (`1.1.29-next.0`)
     - `@backstage/integration-react` (`1.2.24-next.0`)
     - `@backstage/test-utils` (`1.7.24-next.0`)
     - `@backstage/version-bridge` (`1.0.12`)
     - `@backstage/plugin-catalog` (`2.0.11-next.0`)
     - `@backstage/plugin-catalog-react` (`4.0.0-next.0`)
     - `@backstage/plugin-scaffolder` (`1.41.0-next.0`)
     - `@backstage/plugin-scaffolder-react` (`3.0.0-next.0`)
     - `@backstage/plugin-search` (`1.7.10-next.0`)
     - `@backstage/plugin-search-react` (`1.11.10-next.0`)
     - `@backstage/plugin-techdocs` (`1.19.1-next.0`)
     - `@backstage/plugin-techdocs-addons-test-utils` (`2.0.11-next.0`)
     - `@backstage/plugin-techdocs-module-addons-contrib` (`1.1.42-next.0`)
     - `@backstage/plugin-techdocs-react` (`1.4.1-next.0`)
   - **Breaking changes on `0.x` packages (`minor`):**
     - `@backstage/core-compat-api`, `@backstage/core-components`, `@backstage/frontend-app-api`, `@backstage/frontend-defaults`, `@backstage/frontend-dev-utils`, `@backstage/frontend-dynamic-feature-loader`, `@backstage/frontend-plugin-api`, `@backstage/frontend-test-utils`, `@backstage/module-federation-common`, `@backstage/theme`
     - `@backstage/plugin-api-docs-module-protoc-gen-doc`, `@backstage/plugin-api-docs`, `@backstage/plugin-app-react`, `@backstage/plugin-app-visualizer`, `@backstage/plugin-app`, `@backstage/plugin-auth-react`, `@backstage/plugin-auth`, `@backstage/plugin-catalog-graph`, `@backstage/plugin-catalog-import`, `@backstage/plugin-catalog-unprocessed-entities`, `@backstage/plugin-config-schema`, `@backstage/plugin-devtools-react`, `@backstage/plugin-devtools`, `@backstage/plugin-home-react`, `@backstage/plugin-home`, `@backstage/plugin-kubernetes-cluster`, `@backstage/plugin-kubernetes-react`, `@backstage/plugin-kubernetes`, `@backstage/plugin-mui-to-bui`, `@backstage/plugin-notifications`, `@backstage/plugin-org-react`, `@backstage/plugin-org`, `@backstage/plugin-permission-react`, `@backstage/plugin-scaffolder-node-test-utils`, `@backstage/plugin-signals-react`, `@backstage/plugin-signals`, `@backstage/plugin-user-settings`
   - **CLI / repo-tools packages (`0.x`):**
     - `@backstage/cli-module-build` (`0.1.10-next.0`): `minor`, because builds stop defining `process.env.HAS_REACT_DOM_CLIENT`, which was announced for adopters.
     - `@backstage/cli-module-test-jest` (`0.1.8-next.0`): `minor`, because tests stop defining `process.env.HAS_REACT_DOM_CLIENT`, which was announced for adopters.
     - `@backstage/repo-tools` (`0.19.3-next.0`): `minor`, because its `peer-deps` check starts rejecting React 17 ranges.
     - `@backstage/cli-module-new` (`0.1.9-next.0`): `patch` (template contents only).
   - **`@backstage/ui` changeset format (`.changeset/README.md`):**
     - `@backstage/ui` (`0.19.0`, already on React 18 peer dependencies) must have its own separate changeset file matching `.changeset/*react-18*.md` with `'@backstage/ui': patch`, no markdown headings (`##`, `###`), and ending with `**Affected components:** Popover, Tooltip, Table, TablePagination`.

---

## API reports

- Never run `yarn build:api-reports <paths>`.
- To regenerate and verify `packages/test-utils/report.api.md`:
  1. Run `yarn tsc:full`
  2. Run `yarn build:api-reports:only packages/test-utils`
  3. Run `yarn build:api-reports:only packages/test-utils --ci` (must exit 0).

---

## Acceptance criteria

1. **AC-1 (No React 17 peer ranges remain):** All 54 published workspace packages and 2 private workspace packages (`packages/app-example-plugin`, `plugins/example-todo-list`) declare `"^18.0.0"` for `react`, `react-dom`, and `@types/react` in `peerDependencies`, while retaining `peerDependenciesMeta["@types/react"].optional = true`. All 4 `packages/cli-module-new/templates/*/package.json.hbs` templates declare `^18.0.0` with no React 16 or 17 ranges.
   - *Executable check:* Searching `packages/*/package.json`, `plugins/*/package.json`, and `packages/cli-module-new/templates/**/package.json.hbs` for `\^16|\^17` in `react`, `react-dom`, or `@types/react` returns 0 matches.
2. **AC-2 (Peer-deps lint check passes with React 18 default):** `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` uses `^18.0.0` as its sole expected React peer range (with `peerDependenciesReact18Only` and `react18OnlyPackages` removed), and `yarn lint:peer-deps` exits 0.
   - *Executable check:* `yarn lint:peer-deps` exits with code 0.
3. **AC-3 (No `use-sync-external-store`, `HAS_REACT_DOM_CLIENT`, or `ReactDOM.render` in workspace sources):** No source file in `packages/*` or `plugins/*` imports `use-sync-external-store`, reads `HAS_REACT_DOM_CLIENT`, or calls `ReactDOM.render`. `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` is deleted. `packages/frontend-plugin-api/package.json`, `packages/ui/package.json`, and `plugins/app/package.json` no longer declare `use-sync-external-store` or `@types/use-sync-external-store`.
   - *Executable check:* Regex search across `packages/*/src`, `packages/cli-module-test-jest/config`, and `plugins/*/src` for `use-sync-external-store|HAS_REACT_DOM_CLIENT|ReactDOM\.render` returns 0 matches.
4. **AC-4 (`@backstage/ui` components use React's `useId`):** `Popover.tsx`, `Tooltip.tsx`, `Table.tsx`, and `TablePagination.tsx` in `packages/ui` import `useId` from `'react'` (not `'react-aria'`). Generated IDs remain unique per component instance, and SVG `<use href="#...">` and `aria-describedby` relationships continue to work and are verified by tests.
   - *Executable check:* `CI=true yarn test packages/ui/src/components/Table/components/Table.test.tsx packages/ui/src/components/TablePagination/TablePagination.test.tsx` exits 0, and searching `packages/ui/src` for `import \{[^}]*useId[^}]*\} from 'react-aria'` returns 0 matches.
5. **AC-5 (`@backstage/test-utils` `LegacyRootOption` and `legacyRoot` removed and API report updated):** `@backstage/test-utils` no longer exports `LegacyRootOption` or accepts `legacyRoot` in `renderWithEffects` or `renderInTestApp`, and `packages/test-utils/report.api.md` is regenerated and matches the public API.
   - *Executable check:* `yarn tsc:full && yarn build:api-reports:only packages/test-utils && yarn build:api-reports:only packages/test-utils --ci` exits 0.
6. **AC-6 (CLI start-up diagnostics name React 18 as minimum):** `packages/cli-module-build/src/commands/package/start/startFrontend.ts` no longer warns on `!hasReactDomClient()`, `packages/cli-module-build/src/lib/bundler/server.ts` warns when React 16 or 17 is detected and names React 18 as the minimum version (never recommending React 17), and `packages/cli-module-build/knip-report.md` is regenerated to match.
   - *Executable check:* `CI=true yarn test packages/cli-module-build` exits 0 and `packages/cli-module-build/knip-report.md` has no reference to `hasReactDomClient.ts`.
7. **AC-7 (React 18 behaviour and test suites preserved):** React 18 runtime behaviour is unchanged; all affected packages' tests pass, and the only removed test is the React 17 legacy `ReactDOM.render` fallback test in `packages/frontend-dev-utils/src/createDevApp.test.tsx`.
   - *Executable check:* `CI=true yarn test packages/frontend-plugin-api packages/dev-utils packages/frontend-dev-utils packages/ui` exits 0.
8. **AC-8 (Fixed verification command and lockfile consistency):** The study's fixed verification command passes word for word, and `yarn.lock` is consistent with all workspace `package.json` manifests.
   - *Executable check:* `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils` exits 0 (baseline: 86 suites / 550 tests pass, `lint:peer-deps` exits 0) and `yarn install --immutable` exits 0.
9. **AC-9 (Changesets and documentation complete):** `.changeset/*react-18*.md` files cover every affected published package with the required bump levels (`major` for `>= 1.0.0`, `minor` for `0.x` peer-range packages, `minor` for `@backstage/cli-module-build`, `@backstage/cli-module-test-jest`, and `@backstage/repo-tools`, `patch` for `@backstage/cli-module-new`, and `patch` in `.changeset/README.md` format for `@backstage/ui`), plain adopter-facing wording with no internal symbol names, a separate changeset message for `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` stating plainly that `process.env.HAS_REACT_DOM_CLIENT` is no longer defined, and `docs/tutorials/react18-migration.md` and `docs/tutorials/jsx-transform-migration.md` are updated as specified.
   - *Executable check:* Every affected published package is listed in `.changeset/*react-18*.md` with its required bump level, no private package is listed, the `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` changeset message states plainly that `process.env.HAS_REACT_DOM_CLIENT` is no longer defined, and `@backstage/ui` changeset ends with `**Affected components:** Popover, Tooltip, Table, TablePagination`.

---

## Open questions for HITL

None. All scope boundaries, file paths, bump rules, and verification commands are fully specified and confirmed at Gate 0 and Gate 1.
