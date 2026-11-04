# Requirements — Require React 18, Drop React 17 Support (`20261104-refactor-react18-only`)

## Overview (Refactor Delta & Behaviour Invariants)

This brownfield refactor narrows Backstage's supported React peer dependency range across workspace packages and CLI templates to `^18.0.0`, removes React 16/17 compatibility shims (`HAS_REACT_DOM_CLIENT`, `ReactDOM.render` fallbacks, `use-sync-external-store/shim`, React 16/17 CLI warnings, and `legacyRoot` in `@backstage/test-utils`), and updates documentation, API/knip reports, and changesets accordingly.

### Preserved Behaviour Invariants under React 18
1. **Dev Apps (`@backstage/dev-utils` & `@backstage/frontend-dev-utils`)**:
   - `DevAppBuilder.build()` and `DevAppBuilder.render()` in `packages/dev-utils/src/devApp/render.tsx` continue to construct the legacy-frontend dev app (with `BuiCss`, `AlertDisplay`, `OAuthRequestDialog`, `AppRouter`, `SidebarPage`, registered plugins, APIs, themes, sign-in providers, and translation resources), redirect `/` to `defaultPage` when configured, and mount into `#root` using `react-dom/client`'s `createRoot`.
   - `createDevApp()` in `packages/frontend-dev-utils/src/createDevApp.tsx` continues to validate the presence of `#root` (throwing `"Could not find the dev app root element '#root'; make sure your dev entry HTML contains a root element with that id."` when absent), apply `appPluginOverride` (disabling `sign-in-page:app`), forward `bindRoutes` and `features` to `createApp`, wrap `<BuiCss />` in `<Suspense fallback={null}>` alongside `{AppRoot}`, and mount via `createRoot(rootElement).render(rootNode)`.
2. **TechDocs Rendering (`@backstage/plugin-techdocs`)**:
   - `renderReactElement(element, root)` in `plugins/techdocs/src/reader/transformers/renderReactElement.ts` continues to asynchronously import `react-dom/client` and render `element` into `root` via `createRoot(root).render(element)`.
3. **Route-Ref Hooks (`@backstage/frontend-plugin-api`)**:
   - `useRouteRef(routeRef)` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` continues to subscribe to `appLifecycleApi.subscribe` and read `appLifecycleApi.isFinalized` via `useSyncExternalStore` (now imported directly from `'react'`), resolving routes via `routeResolutionApi.resolve(routeRef, { sourcePath: pathname })` before and after app finalization and re-evaluating only when `routeResolutionApi`, `routeRef`, `pathname`, or `isFinalized` changes.
4. **Breakpoint Hook (`@backstage/ui`)**:
   - `useBreakpoint()` in `packages/ui/src/hooks/useBreakpoint.ts` continues to subscribe to its module-scoped `matchMedia` store using `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` (now imported directly from `'react'`) and memoize `{ breakpoint, up, down }` with identical breakpoint thresholds (`initial`, `xs`, `sm`, `md`, `lg`, `xl`) and SSR fallback (`'initial'`).
5. **Test-Utils Render Helpers (`@backstage/test-utils`)**:
   - `renderWithEffects(nodes, options?)` in `packages/test-utils/src/testUtils/testingLibrary.ts` continues to wrap `@testing-library/react`'s `render(nodes, options)` inside `await act(async () => { ... })` and accept `Pick<RenderOptions, 'wrapper'>`.
   - `createTestAppWrapper(options?)`, `wrapInTestApp(Component, options?)`, `renderInTestApp(Component, options?)`, and `textContentMatcher(text)` in `packages/test-utils/src/testUtils/appWrappers.tsx` preserve all existing routing (`routeEntries`, `mountedRoutes` for both `RouteRef` and `ExternalRouteRef`), mock APIs, theme provider, and async effect flushing behaviour. Only the `LegacyRootOption` (`legacyRoot?: boolean`) type and property are removed from the public API.

---

## In scope

1. **IS-1**: Narrow `peerDependencies` for `react`, `react-dom`, and `@types/react` from `^17.0.0 || ^18.0.0` to `^18.0.0` across all 56 workspace `package.json` files that currently admit React 17, and update `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` so `yarn lint:peer-deps` enforces `^18.0.0` for all packages without the redundant `peerDependenciesReact18Only` / `react18OnlyPackages` special case.
2. **IS-2**: Update `@backstage/cli-module-new` package templates (`frontend-plugin`, `legacy-frontend-plugin`, `plugin-web-library`, and `scaffolder-field-extension-module`) so generated `peerDependencies` and `devDependencies` specify `^18.0.0` for `react` and `react-dom` (instead of `^16.13.1 || ^17.0.0 || ^18.0.0` or `^17.0.0 || ^18.0.0`).
3. **IS-3**: Remove `hasReactDomClient.ts`, the `process.env.HAS_REACT_DOM_CLIENT` bundler `DefinePlugin` entries in `packages/cli-module-build/src/lib/bundler/config.ts`, the React 17 deprecation warning in `packages/cli-module-build/src/commands/package/start/startFrontend.ts`, the `checkReactVersion()` React 16 warning in `packages/cli-module-build/src/lib/bundler/server.ts`, and the `process.env.HAS_REACT_DOM_CLIENT` detection block in `packages/cli-module-test-jest/config/jest.js`.
4. **IS-4**: Replace the `HAS_REACT_DOM_CLIENT` / `'createRoot' in ReactDOM` / `ReactDOM.render` dual render paths with unconditional `import('react-dom/client')` and `createRoot` rendering in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`, and remove the legacy `ReactDOM.render` fallback test in `packages/frontend-dev-utils/src/createDevApp.test.tsx`.
5. **IS-5**: Replace `import { useSyncExternalStore } from 'use-sync-external-store/shim'` with `import { useSyncExternalStore } from 'react'` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`, and remove `use-sync-external-store` and `@types/use-sync-external-store` from `packages/frontend-plugin-api/package.json`, `packages/ui/package.json`, and `plugins/app/package.json` (plus `yarn.lock` if updated).
6. **IS-6**: Remove the exported `LegacyRootOption` type and `legacyRoot` option handling from `packages/test-utils/src/testUtils/testingLibrary.ts` and `packages/test-utils/src/testUtils/appWrappers.tsx`, and update `packages/test-utils/report.api.md`.
7. **IS-7**: Update the three tutorials (`docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md`) to reflect React 18-only support, regenerate affected API and knip reports (`packages/test-utils/report.api.md`, `packages/cli-module-build/knip-report.md`, `plugins/app/knip-report.md`), and add changeset files under `.changeset/*.md` covering all affected published packages.

---

## Out of scope

1. **OOS-1**: Upgrading to React 19 or widening any dependency or peer dependency range to include React 19.
2. **OOS-2**: Removing `@testing-library/react-hooks` (e.g., in `packages/core-app-api/package.json`) or `react-test-renderer` (e.g., in `plugins/catalog-react/package.json`) devDependencies, or migrating `react-dom/test-utils` `act` imports in existing tests.
3. **OOS-3**: Modifying `microsite/`, `docs-ui/`, `workspaces/`, `docs/releases/**`, or any `**/CHANGELOG.md` files.
4. **OOS-4**: Changing `@backstage/create-app` templates (which already specify `^18.0.2`) or test fixture lockfile strings in `packages/cli-node/src/monorepo/Lockfile.test.ts`.
5. **OOS-5**: Consulting or checking open upstream pull requests.

---

## Functional requirements per module

### FR-1 — Workspace Peer Dependency Narrowing & `repo-tools` Peer-Deps Linter Enforcement
- **Modules**: `@backstage/repo-tools` and 56 workspace packages (`packages/*` and `plugins/*`).
- **Delta (What Changes)**:
  - In all 56 workspace `package.json` files listed below, change every `"^17.0.0 || ^18.0.0"` peer range for `"@types/react"`, `"react"`, and `"react-dom"` under `peerDependencies` to `"^18.0.0"`.
  - In `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`:
    - Update the `peerDependencies` constant so `'@types/react'`, `react`, and `'react-dom'` are set to `'^18.0.0'`.
    - Remove `peerDependenciesReact18Only`, `react18OnlyPackages`, and `getExpectedPeerDependencies`, using `peerDependencies` directly in `matchesPeerDependency` and the package validation loop.
- **Preserved Behaviour**:
  - `yarn lint:peer-deps` continues to validate `peerDependencies`, `devDependencies` (`desiredLocalVersionsOfDependencies`), `peerDependenciesMeta` (`@types/react` optionality), and `groupsOfPeerDependencies` across all non-standalone workspace packages, failing with exit code 1 if any package deviates from `^18.0.0` (including if `^17.0.0` is reintroduced).
- **Allowlist Files Touched**:
  - `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`
  - `packages/app-defaults/package.json`
  - `packages/app-example-plugin/package.json`
  - `packages/core-app-api/package.json`
  - `packages/core-compat-api/package.json`
  - `packages/core-components/package.json`
  - `packages/core-plugin-api/package.json`
  - `packages/dev-utils/package.json`
  - `packages/frontend-app-api/package.json`
  - `packages/frontend-defaults/package.json`
  - `packages/frontend-dev-utils/package.json`
  - `packages/frontend-dynamic-feature-loader/package.json`
  - `packages/frontend-plugin-api/package.json`
  - `packages/frontend-test-utils/package.json`
  - `packages/integration-react/package.json`
  - `packages/module-federation-common/package.json`
  - `packages/test-utils/package.json`
  - `packages/theme/package.json`
  - `packages/version-bridge/package.json`
  - `plugins/api-docs-module-protoc-gen-doc/package.json`
  - `plugins/api-docs/package.json`
  - `plugins/app-react/package.json`
  - `plugins/app-visualizer/package.json`
  - `plugins/app/package.json`
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
  - `plugins/example-todo-list/package.json`
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

### FR-2 — `@backstage/cli-module-new` Package Template Updates
- **Module**: `@backstage/cli-module-new`
- **Delta (What Changes)**:
  - In `packages/cli-module-new/templates/frontend-plugin/package.json.hbs`: change `peerDependencies.react` and `devDependencies.react` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"`.
  - In `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs`: change `peerDependencies.react`, `peerDependencies.react-dom`, `devDependencies.react`, and `devDependencies.react-dom` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` / `"{{versionQuery 'react-dom' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"` / `"{{versionQuery 'react-dom' '^18.0.0'}}"`.
  - In `packages/cli-module-new/templates/plugin-web-library/package.json.hbs`: change `peerDependencies.react` and `devDependencies.react` from `"{{versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'}}"` to `"{{versionQuery 'react' '^18.0.0'}}"`.
  - In `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs`: change `peerDependencies.react` from `"^17.0.0 || ^18.0.0"` to `"^18.0.0"` (and keep `devDependencies.react` aligned at `18.0.0` / `^18.0.0`).
- **Preserved Behaviour**:
  - `backstage-cli new` template rendering and `versionQuery` interpolation work identically for all generated package roles.
- **Allowlist Files Touched**:
  - `packages/cli-module-new/templates/frontend-plugin/package.json.hbs`
  - `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs`
  - `packages/cli-module-new/templates/plugin-web-library/package.json.hbs`
  - `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs`

### FR-3 — Removal of `HAS_REACT_DOM_CLIENT` Flag & React 16/17 Version Warnings in CLI Build & Jest Config
- **Modules**: `@backstage/cli-module-build`, `@backstage/cli-module-test-jest`
- **Delta (What Changes)**:
  - Delete `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`.
  - In `packages/cli-module-build/src/lib/bundler/config.ts`: remove `import { hasReactDomClient } from './hasReactDomClient';` and remove the `'process.env.HAS_REACT_DOM_CLIENT': JSON.stringify(hasReactDomClient())` entries from both the `webpack.DefinePlugin` and `bundler.DefinePlugin` configurations.
  - In `packages/cli-module-build/src/commands/package/start/startFrontend.ts`: remove `import { hasReactDomClient } from '../../../lib/bundler/hasReactDomClient';` and remove the `if (!hasReactDomClient()) { console.warn('React 17 is now deprecated! ...'); }` block.
  - In `packages/cli-module-build/src/lib/bundler/server.ts`: remove the `checkReactVersion()` call and the `function checkReactVersion()` definition (which checked for React `16.` and logged an upgrade-to-React-17 warning).
  - In `packages/cli-module-test-jest/config/jest.js`: remove the `try { require.resolve('react-dom/client', ...); process.env.HAS_REACT_DOM_CLIENT = true; } catch {}` block (lines 52–59).
  - Regenerate `packages/cli-module-build/knip-report.md` using `yarn build:knip-reports` (never hand-edited) after the source edits so the unlisted `react-dom` (`src/lib/bundler/hasReactDomClient.ts`) and `react` (`src/lib/bundler/server.ts`) entries are removed.
- **Preserved Behaviour**:
  - Bundler configuration (`BUILD_INFO`, `APP_CONFIG`, module federation, workspace linking, rspack/webpack dev server) and Jest configuration (`getRoleConfig`, `getProjectConfig`, `getRootConfig`) operate identically under React 18.
- **Allowlist Files Touched**:
  - `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`
  - `packages/cli-module-build/src/lib/bundler/config.ts`
  - `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
  - `packages/cli-module-build/src/lib/bundler/server.ts`
  - `packages/cli-module-build/knip-report.md`
  - `packages/cli-module-test-jest/config/jest.js`

### FR-4 — `createRoot`-Only Rendering in `dev-utils`, `frontend-dev-utils`, and `plugins/techdocs`
- **Modules**: `@backstage/dev-utils`, `@backstage/frontend-dev-utils`, `@backstage/plugin-techdocs`
- **Delta (What Changes)**:
  - In `packages/dev-utils/src/devApp/render.tsx`:
    - Replace the conditional `ReactDOMPromise` (`process.env.HAS_REACT_DOM_CLIENT ? import('react-dom/client') : import('react-dom')`) and `'createRoot' in ReactDOM` / `ReactDOM.render` branch with `react-dom/client` (`createRoot(document.getElementById('root')!).render(<DevApp />)`).
  - In `packages/frontend-dev-utils/src/createDevApp.tsx`:
    - Replace the conditional `ReactDOMPromise` and `'createRoot' in ReactDOM` / `ReactDOM.render` fallback with `react-dom/client` (`createRoot(rootElement).render(rootNode)`).
  - In `packages/frontend-dev-utils/src/createDevApp.test.tsx`:
    - Remove the `'should fall back to legacy react-dom rendering when createRoot is unavailable'` test case (and any `HAS_REACT_DOM_CLIENT` manipulation), while keeping the existing tests for rendering a dev app with a plugin, forwarding `bindRoutes` to `createApp` and calling `createRoot(root)`, and throwing a clear error when `#root` is missing.
  - In `plugins/techdocs/src/reader/transformers/renderReactElement.ts`:
    - Replace the conditional `ReactDOMPromise` and `'createRoot' in ReactDOM` / `ReactDOM.render` fallback with `react-dom/client` (`createRoot(root).render(element)`).
- **Preserved Behaviour**:
  - Under React 18, `DevAppBuilder.render()`, `createDevApp()`, and `renderReactElement()` render identical component trees into the target DOM root element using `react-dom/client`'s `createRoot`.
- **Allowlist Files Touched**:
  - `packages/dev-utils/src/devApp/render.tsx`
  - `packages/frontend-dev-utils/src/createDevApp.tsx`
  - `packages/frontend-dev-utils/src/createDevApp.test.tsx`
  - `plugins/techdocs/src/reader/transformers/renderReactElement.ts`

### FR-5 — Native `useSyncExternalStore` in `frontend-plugin-api` and `ui` & Removal of `use-sync-external-store` Dependency
- **Modules**: `@backstage/frontend-plugin-api`, `@backstage/ui`, `@backstage/plugin-app`
- **Delta (What Changes)**:
  - In `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: import `useSyncExternalStore` from `'react'` (combined with the existing `'react'` import) and remove `import { useSyncExternalStore } from 'use-sync-external-store/shim';`.
  - In `packages/ui/src/hooks/useBreakpoint.ts`: import `useSyncExternalStore` from `'react'` (combined with the existing `'react'` import) and remove `import { useSyncExternalStore } from 'use-sync-external-store/shim';`.
  - In `packages/frontend-plugin-api/package.json`: remove `"use-sync-external-store"` from `dependencies` and `"@types/use-sync-external-store"` from `devDependencies`.
  - In `packages/ui/package.json`: remove `"use-sync-external-store"` from `dependencies` and `"@types/use-sync-external-store"` from `devDependencies`.
  - In `plugins/app/package.json`: remove `"use-sync-external-store"` from `dependencies`.
  - Regenerate `plugins/app/knip-report.md` using `yarn build:knip-reports` (never hand-edited) after the manifest edits so `use-sync-external-store` is no longer listed.
- **Preserved Behaviour**:
  - `useRouteRef` and `useBreakpoint` retain identical subscription, snapshot, and memoization behaviour under React 18.
- **Allowlist Files Touched**:
  - `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
  - `packages/frontend-plugin-api/package.json`
  - `packages/ui/src/hooks/useBreakpoint.ts`
  - `packages/ui/package.json`
  - `plugins/app/package.json`
  - `plugins/app/knip-report.md`
  - `yarn.lock` (if lockfile entries change)

### FR-6 — Removal of `legacyRoot` (`LegacyRootOption`) from `@backstage/test-utils`
- **Module**: `@backstage/test-utils`
- **Delta (What Changes)**:
  - In `packages/test-utils/src/testUtils/testingLibrary.ts`:
    - Remove `export type LegacyRootOption = { legacyRoot?: boolean };`.
    - Change `renderWithEffects` signature from `options?: Pick<RenderOptions, 'wrapper'> & LegacyRootOption` to `options?: Pick<RenderOptions, 'wrapper'>`.
  - In `packages/test-utils/src/testUtils/appWrappers.tsx`:
    - Remove `LegacyRootOption` from the `./testingLibrary` import.
    - Change `renderInTestApp` parameter type from `options: TestAppOptions & LegacyRootOption = {}` to `options: TestAppOptions = {}`.
    - Remove `const { legacyRoot } = options;` and the `legacyRoot` property passed to `renderWithEffects`.
  - Regenerate `packages/test-utils/report.api.md` using `yarn build:api-reports` (never hand-edited) after the source edits to remove `export type LegacyRootOption` and remove `& LegacyRootOption` from `renderInTestApp` and `renderWithEffects`.
- **Preserved Behaviour**:
  - `renderWithEffects`, `renderInTestApp`, `wrapInTestApp`, `createTestAppWrapper`, and `textContentMatcher` behave identically for all supported options (`wrapper`, `routeEntries`, `mountedRoutes`, `components`, `icons`).
- **Allowlist Files Touched**:
  - `packages/test-utils/src/testUtils/testingLibrary.ts`
  - `packages/test-utils/src/testUtils/appWrappers.tsx`
  - `packages/test-utils/report.api.md`

### FR-7 — Documentation Updates, API/Knip Report Regeneration, and Changesets
- **Modules**: Documentation (`docs/tutorials/*`), API/knip reports, and `.changeset/*.md`.
- **Delta (What Changes)**:
  - Update `docs/tutorials/react18-migration.md`:
    - Update the intro and plugin `package.json` examples so they state Backstage requires React 18 (no longer supporting React 17) and show `"^18.0.0"` in `peerDependencies` (and `"^18.0.0"` / `"^18.0.2"` in `devDependencies`) instead of `"^17.0.0 || ^18.0.0"`.
  - Update `docs/tutorials/jsx-transform-migration.md`:
    - Update references to React 17 support (including line 11/12 and line 61 `"once React 17 is fully deprecated"`) to reflect that React 17 support has been removed and React 18 is required.
  - Update `docs/tutorials/migrate-to-mui5.md`:
    - Update the `peerDependencies` snippet (lines 47–51) and step 5 (line 69) from `"^17.0.0 || ^18.0.0"` / `"^17.0.0"` to `"^18.0.0"`.
  - Regenerate `packages/test-utils/report.api.md` via `yarn build:api-reports` and regenerate `packages/cli-module-build/knip-report.md` and `plugins/app/knip-report.md` via `yarn build:knip-reports` (never hand-edit API or knip report files, and write only report files inside the allowlist `**/report.api.md` and `**/knip-report.md`).
  - Author changeset files in `.changeset/*.md` directly (without running the changeset CLI), with **one changeset file per distinct adopter-facing message**, where each message is true for every package it names and written in plain adopter language with **no internal code symbols** (no `HAS_REACT_DOM_CLIENT`, `ReactDOM.render`, `use-sync-external-store`, or internal function/variable names; the public option `legacyRoot` of `@backstage/test-utils` may be named). A package named in multiple changesets takes the highest bump. The required 6-changeset split and bump levels (per `AGENTS.md`: breaking changes get `major` for `>= 1.0.0` and `minor` for `< 1.0.0`) are:
    1. **(a) React peer dependencies now require React 18**: Covers the **54 published packages** whose React peer dependency ranges narrow from `^17.0.0 || ^18.0.0` to `^18.0.0` (does not include `@backstage/ui`, and excludes private packages `packages/app-example-plugin` and `plugins/example-todo-list`). Breaking change: the **17 packages at `>= 1.0.0`** receive a `major` bump, and the **37 published packages below `1.0.0`** receive a `minor` bump.
    2. **(b) `@backstage/test-utils` removes the `legacyRoot` render option**: Covers `@backstage/test-utils` (`1.7.24-next.0`, `>= 1.0.0`) with a `major` bump (named in both (a) and (b), taking `major`).
    3. **(c) `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` drop React 17 support in the build and test tooling**: Covers `@backstage/cli-module-build` (`0.1.10-next.0`, `< 1.0.0`) and `@backstage/cli-module-test-jest` (`0.1.8-next.0`, `< 1.0.0`), each with a breaking `minor` bump because the build and Jest tooling drop React 17 support.
    4. **(d) `@backstage/cli-module-new` templates generate packages that require React 18**: Covers `@backstage/cli-module-new` (`0.1.9-next.0`, `< 1.0.0`) with a `patch` bump because its template change does not break existing adopters (it only changes what newly scaffolded packages declare).
    5. **(e) `@backstage/repo-tools` peer-deps check now requires `^18.0.0` ranges**: Covers `@backstage/repo-tools` (`0.19.3-next.0`, `< 1.0.0`) with a breaking `minor` bump because the peer-deps check stops accepting ranges that allow React 17.
    6. **(f) `@backstage/ui` internal dependency cleanup**: Covers `@backstage/ui` (`0.19.0`, `< 1.0.0`) with a `patch` bump because `@backstage/ui` already required React 18 in `peerDependencies` and only cleans up an internal dependency without breaking any adopter.
- **Preserved Behaviour**:
  - Tutorial migration steps for React 18, JSX transform, and MUI v5 remain accurate and actionable.
- **Allowlist Files Touched**:
  - `docs/tutorials/react18-migration.md`
  - `docs/tutorials/jsx-transform-migration.md`
  - `docs/tutorials/migrate-to-mui5.md`
  - `packages/test-utils/report.api.md`
  - `packages/cli-module-build/knip-report.md`
  - `plugins/app/knip-report.md`
  - `.changeset/*.md`

---

## Non-functional requirements

- **NFR-1 (React 18 Behaviour Invariants)**: Runtime behaviour under React 18.3.1 must remain unchanged across dev apps (`@backstage/dev-utils`, `@backstage/frontend-dev-utils`), TechDocs React element rendering (`@backstage/plugin-techdocs`), routing hooks (`useRouteRef` in `@backstage/frontend-plugin-api`), breakpoint hooks (`useBreakpoint` in `@backstage/ui`), and test-utils render helpers (`renderWithEffects`, `renderInTestApp`, `wrapInTestApp`, `createTestAppWrapper`). The sole public TypeScript API signature change is the removal of `LegacyRootOption` / `legacyRoot` from `@backstage/test-utils`.
- **NFR-2 (Apache 2.0 License Headers)**: Any new source file created during the run must include the standard Backstage Apache 2.0 copyright header (`Copyright 2026 The Backstage Authors`).
- **NFR-3 (Changesets Versioning & Split Policy)**: Every affected published package under `packages/` and `plugins/` must be covered by `.changeset/*.md` authored directly (never via the `changeset` CLI, and never running `changesets version` or `release`). Changesets must be split into 6 files — one per distinct adopter-facing message: (a) 54 published packages narrowing React peer dependencies to React 18, (b) `@backstage/test-utils` removing the `legacyRoot` render option, (c) `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` dropping React 17 support in build and test tooling, (d) `@backstage/cli-module-new` templates generating packages that require React 18, (e) `@backstage/repo-tools` peer-deps check requiring `^18.0.0` ranges, and (f) `@backstage/ui` internal dependency cleanup. Each message must be true for every package it names and written in plain adopter language with no internal code symbols (`HAS_REACT_DOM_CLIENT`, `ReactDOM.render`, `use-sync-external-store`, or internal function/variable names; the public `legacyRoot` option of `@backstage/test-utils` may be named). A package named in multiple changesets takes the highest bump. Across the 59 affected published packages:
  - **`major` bump (17 packages at `>= 1.0.0`)**: `@backstage/app-defaults` (`1.7.14-next.0`), `@backstage/core-app-api` (`1.20.7-next.0`), `@backstage/core-plugin-api` (`1.12.12-next.0`), `@backstage/dev-utils` (`1.1.29-next.0`), `@backstage/integration-react` (`1.2.24-next.0`), `@backstage/test-utils` (`1.7.24-next.0`, in both (a) and (b)), `@backstage/version-bridge` (`1.0.12`), `@backstage/plugin-catalog` (`2.0.11-next.0`), `@backstage/plugin-catalog-react` (`4.0.0-next.0`), `@backstage/plugin-scaffolder` (`1.41.0-next.0`), `@backstage/plugin-scaffolder-react` (`3.0.0-next.0`), `@backstage/plugin-search` (`1.7.10-next.0`), `@backstage/plugin-search-react` (`1.11.10-next.0`), `@backstage/plugin-techdocs` (`1.19.1-next.0`), `@backstage/plugin-techdocs-addons-test-utils` (`2.0.11-next.0`), `@backstage/plugin-techdocs-module-addons-contrib` (`1.1.42-next.0`), and `@backstage/plugin-techdocs-react` (`1.4.1-next.0`).
  - **`minor` bump (40 packages below `1.0.0` with breaking changes)**:
    - The remaining 37 published packages whose `react` / `react-dom` / `@types/react` peer ranges narrow from `^17.0.0 || ^18.0.0` to `^18.0.0`.
    - `@backstage/cli-module-build` (`0.1.10-next.0`) and `@backstage/cli-module-test-jest` (`0.1.8-next.0`), because the build and Jest tooling drop React 17 support.
    - `@backstage/repo-tools` (`0.19.3-next.0`), because the `peer-deps` check no longer accepts React 17 peer dependency ranges.
  - **`patch` bump (2 packages below `1.0.0` with non-breaking changes)**:
    - `@backstage/cli-module-new` (`0.1.9-next.0`), because its template change does not break existing adopters (it only changes what newly scaffolded packages declare).
    - `@backstage/ui` (`0.19.0`), because it already required React `^18.0.0` in `peerDependencies` prior to this change, and its internal dependency cleanup does not break any supported adopter.
  - Private packages (`packages/app-example-plugin`, `plugins/example-todo-list`) must not be listed in changesets.
- **NFR-4 (API & Knip Reports Regenerated via Repo Scripts, Never Hand-Edited)**: Public API reports (`packages/test-utils/report.api.md`) and knip dependency reports (`packages/cli-module-build/knip-report.md`, `plugins/app/knip-report.md`) must never be hand-edited; they must be regenerated after the source and manifest edits using the repository's own scripts (`yarn build:api-reports` for `report.api.md` and `yarn build:knip-reports` for `knip-report.md`), writing only report files inside the allowlist (`**/report.api.md`, `**/knip-report.md`).
- **NFR-5 (Off-Limits & Release Artifacts Untouched)**: `docs/releases/**` and `**/CHANGELOG.md` must never be edited. All file writes must stay strictly within `allowlist.json`.
- **NFR-6 (Forbidden Commands)**: Never run lint with `--fix` (e.g., never `yarn lint --fix` or `yarn lint:all --fix`), and never run `yarn build`, `changesets version`, or `release`.

---

## PII inventory

None expected. This refactor only touches build/test tooling, React peer dependency declarations, DOM root mounting helpers, hooks, and documentation; no personal data or PII fields are processed, stored, or transmitted.

| Field | Sensitivity | Protection |
| :--- | :--- | :--- |
| None (N/A) | N/A | N/A |

---

## Role matrix

N/A. This refactor does not introduce, modify, or interact with authentication, authorization, or RBAC/permission policies.

| Role | Resource | Action |
| :--- | :--- | :--- |
| N/A | N/A | N/A |

---

## Acceptance criteria

1. **AC-1 (Mandatory Verification Suite)**: The run's verbatim test and lint command exits with status code `0`:
   ```bash
   yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils
   ```
2. **AC-2 (Touched Package Unit Tests)**: Unit tests for all touched source packages pass under React 18:
   ```bash
   CI=true yarn test packages/frontend-dev-utils packages/dev-utils packages/frontend-plugin-api packages/ui plugins/techdocs packages/cli-module-build packages/cli-module-new
   ```
3. **AC-3 (No Legacy React Symbols in Source)**: Grep checks across workspace source files (`packages/*/src`, `packages/*/config`, `plugins/*/src`) return zero matches for `HAS_REACT_DOM_CLIENT`, `hasReactDomClient`, `ReactDOM.render`, `use-sync-external-store`, `legacyRoot`, or `LegacyRootOption`:
   ```bash
   ! git grep -E 'HAS_REACT_DOM_CLIENT|hasReactDomClient|ReactDOM\.render|use-sync-external-store|legacyRoot|LegacyRootOption' -- 'packages/*/src/**' 'packages/*/config/**' 'plugins/*/src/**' 'packages/test-utils/report.api.md'
   ```
4. **AC-4 (No React 16/17 Peer Ranges in Workspace `package.json` or CLI Templates)**: Grep checks across all workspace `package.json` files and `@backstage/cli-module-new` templates confirm no React peer range admits React 16 or 17:
   ```bash
   ! git grep -E '"\^16\.13\.1|\^17\.0\.0 \|\| \^18\.0\.0' -- 'packages/*/package.json' 'plugins/*/package.json' 'packages/cli-module-new/templates/*/package.json.hbs' 'packages/repo-tools/src/commands/peer-deps/peer-deps.ts'
   ```
5. **AC-5 (Peer Dependency Linter Enforcement)**: `yarn lint:peer-deps` exits with `0` on the updated workspace and is configured with `'@types/react': '^18.0.0'`, `react: '^18.0.0'`, and `'react-dom': '^18.0.0'` in `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` so any reintroduced `^17` range fails validation.
6. **AC-6 (Changesets Split, Plain Language & Regenerated Reports Verification)**:
   - The 6 changeset files in `.changeset/*.md` match the required split ((a) 54 published packages narrowing React peer ranges, (b) `@backstage/test-utils` `legacyRoot` removal, (c) `@backstage/cli-module-build` and `@backstage/cli-module-test-jest` dropping React 17 support, (d) `@backstage/cli-module-new` templates requiring React 18, (e) `@backstage/repo-tools` peer-deps requiring `^18.0.0`, (f) `@backstage/ui` internal dependency cleanup), declare `major` for the 17 affected published packages at `>= 1.0.0`, `minor` for the 40 affected published packages below `1.0.0` with breaking changes (`37` peer-range packages plus `@backstage/cli-module-build`, `@backstage/cli-module-test-jest`, and `@backstage/repo-tools`), and `patch` for the 2 non-breaking packages (`@backstage/cli-module-new` and `@backstage/ui`), and contain zero internal code symbols:
     ```bash
     ! git grep -E 'HAS_REACT_DOM_CLIENT|hasReactDomClient|ReactDOM\.render|use-sync-external-store|useSyncExternalStore|checkReactVersion|peerDependenciesReact18Only|react18OnlyPackages' -- '.changeset/*.md'
     ```
   - `packages/test-utils/report.api.md`, `packages/cli-module-build/knip-report.md`, and `plugins/app/knip-report.md` are regenerated via `yarn build:api-reports` and `yarn build:knip-reports` and pass the executable CI report check:
     ```bash
     yarn build:api-reports:only --ci packages/test-utils && yarn build:knip-reports --ci packages/cli-module-build plugins/app
     ```

---

## Open questions for HITL

None. Every file required to satisfy FR-1 through FR-7 is included in the frozen `allowlist.json`, and all versioning, testing, and scope constraints were resolved at Gate 0.
