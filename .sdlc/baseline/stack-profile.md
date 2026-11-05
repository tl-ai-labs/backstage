# Stack profile — learned from repo scan

Built 2026-11-05 for run 20261105-100258-refactor-react18-only (trigger: primary stack TypeScript/React monorepo; no matching shipped adapter — only generic/nest/python exist). Sampling was focused on the frontend/tooling packages this intent touches.

## Language & runtime
TypeScript ~5.7 (root `tsconfig.json`, single root `yarn tsc` type-check), Node 22 || 24, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`, 235 packages). ESM-style `import` syntax in source, compiled by `@backstage/cli`; CLI config files under `packages/cli-module-*/config/*.js` are CommonJS (`require`). New JSX transform (no `import React` needed; files import named hooks from `'react'`). Installed React 18.3.1; root `resolutions` forces `@types/react`/`@types/react-dom` to `^18.0.0`.

## Framework
Backstage itself: old frontend system (`core-*` packages, `createApp` from `@backstage/core-app-api`, `app.createRoot(<element>)`), new frontend system (`frontend-*` packages, `createApp` from `@backstage/frontend-defaults`, `app.createRoot()` returning a JSX element), backend system (`backend-*`). React 18 + react-router-dom 6, MUI v4 and `@backstage/ui`. Bundling via `@backstage/cli` (webpack or rspack, chosen in `packages/cli-module-build/src/lib/bundler/config.ts`).

## Conventions detected

### File naming
- camelCase for modules exporting functions: `createDevApp.tsx`, `renderReactElement.ts`, `hasReactDomClient.ts`, `testingLibrary.ts`, `appWrappers.tsx`.
- PascalCase for components/classes: `AppManager.tsx`, `FeatureCalloutCircular.tsx`, `BuiCss.tsx`.
- Tests colocated as `<name>.test.ts(x)` next to the source.
- Commands under `src/commands/<name>/<name>.ts` (e.g. `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`), wired via commander in `src/commands/index.ts` with `lazy(() => import(...), 'default')`.

### File header (mandatory on new .ts/.tsx/.js)
```ts
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 * limitations under the License.
 */
```
Never bump the year on existing files.

### Current React-17 render shim shape (the thing being removed)
From `plugins/techdocs/src/reader/transformers/renderReactElement.ts:17-35`:
```ts
let ReactDOMPromise: Promise<
  typeof import('react-dom') | typeof import('react-dom/client')
>;
if (process.env.HAS_REACT_DOM_CLIENT) {
  ReactDOMPromise = import('react-dom/client');
} else {
  ReactDOMPromise = import('react-dom');
}

/** @internal */
export function renderReactElement(element: JSX.Element, root: HTMLElement) {
  ReactDOMPromise.then(ReactDOM => {
    if ('createRoot' in ReactDOM) {
      ReactDOM.createRoot(root).render(element);
    } else {
      ReactDOM.render(element, root);
    }
  });
}
```
The same pattern appears verbatim in `packages/frontend-dev-utils/src/createDevApp.tsx:43-50,119-123` and `packages/dev-utils/src/devApp/render.tsx:58-65,320-327` (both also have a bare `import 'react-dom';` side-effect import).

### React-18-native target shape (already used in the repo)
From `packages/app/src/index.tsx:18-22` and the create-app templates:
```tsx
import ReactDOM from 'react-dom/client';
...
ReactDOM.createRoot(document.getElementById('root')!).render(app);
```
and `plugins/auth/dev/index.tsx:18,27-28`:
```tsx
import { createRoot } from 'react-dom/client';
const root = createRoot(container!);
root.render(app.createRoot());
```
Note: replacing the async `ReactDOMPromise.then(...)` with a static import changes timing from async to sync. Existing tests (`createDevApp.test.tsx`) use `jest.doMock('react-dom/client', ...)` + `jest.isolateModules` + `waitFor`, so they tolerate either.

### Test shape
Jest 30 via `backstage-cli repo test`, `@testing-library/react` 16, `describe/it`, colocated tests. Module-level mocking with `jest.resetModules()` / `jest.doMock()` / `jest.isolateModules()`. From `packages/frontend-dev-utils/src/createDevApp.test.tsx`:
```ts
function loadCreateDevAppIsolated(): typeof import('./createDevApp').createDevApp {
  let isolatedCreateDevApp: typeof import('./createDevApp').createDevApp | undefined;
  jest.isolateModules(() => {
    ({ createDevApp: isolatedCreateDevApp } = require('./createDevApp'));
  });
  ...
}
...
    jest.doMock('react-dom/client', () => ({ __esModule: true, createRoot }));
```
Project guidance: fewer thorough tests with multiple assertions; prefer `screen` + `findBy*` over `waitFor`; no test IDs.

### Config
Build-time constants via bundler `DefinePlugin` (`process.env.BUILD_INFO`, `process.env.APP_CONFIG`, `process.env.HAS_REACT_DOM_CLIENT`) in `packages/cli-module-build/src/lib/bundler/config.ts`; Jest mirrors `HAS_REACT_DOM_CLIENT` in `packages/cli-module-test-jest/config/jest.js:52-59`. Runtime app config is `app-config.yaml`.

### Data layer
Not relevant to this intent (backend uses Knex; not sampled).

### Framework-owned wiring
- Peer-dependency policy is code, not docs: `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` holds `desiredLocalVersionsOfDependencies`, `peerDependencies` (`^17.0.0 || ^18.0.0`), `peerDependenciesReact18Only` (`^18.0.0`) and `react18OnlyPackages = new Set(['@backstage/ui'])`; `getExpectedPeerDependencies()` selects between them. `yarn backstage-repo-tools peer-deps --fix` rewrites package.json files to match; CI runs `yarn lint:peer-deps`. Changing this constant and running `--fix` is the idiomatic way to update all 56 manifests consistently (it is a repo-tools command, not a build/release, so it is allowed — Gate 0 should still confirm).
- `yarn new` templates: Handlebars `package.json.hbs` using `{{versionQuery '<pkg>' '<fallback range>'}}` in `packages/cli-module-new/templates/*`.
- Public API surface is tracked in generated `report*.api.md` (regenerate with `yarn build:api-reports`; don't hand-edit).
- Changesets: `.changeset/<slug>.md` with YAML front-matter `'<pkg>': patch|minor|major` and an adopter-facing paragraph; config has `onlyUpdatePeerDependentsWhenOutOfRange: true`.

## Sample files inspected
- plugins/techdocs/src/reader/transformers/renderReactElement.ts (kind: render shim)
- packages/frontend-dev-utils/src/createDevApp.tsx (kind: entry/dev wiring)
- packages/frontend-dev-utils/src/createDevApp.test.tsx (kind: test)
- packages/dev-utils/src/devApp/render.tsx (kind: entry/dev wiring)
- packages/test-utils/src/testUtils/testingLibrary.ts, appWrappers.tsx (kind: test utility / public API)
- packages/cli-module-build/src/lib/bundler/config.ts, hasReactDomClient.ts, server.ts, commands/package/start/startFrontend.ts (kind: config/tooling)
- packages/cli-module-test-jest/config/jest.js (kind: config)
- packages/repo-tools/src/commands/peer-deps/peer-deps.ts, src/commands/index.ts (kind: tooling/command wiring)
- packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs, scaffolder-field-extension-module/package.json.hbs (kind: template)
- packages/app/src/index.tsx, plugins/auth/dev/index.tsx (kind: entry point, React-18 target shape)
- .changeset/brave-subjects-canonical.md, .changeset/config.json (kind: release metadata)

## Notes for downstream codegen
- Match each package's local style; don't reformat surrounding code. Run `yarn prettier --write <changed files>` only on changed files.
- Prefer named imports from `react-dom/client` (`import { createRoot } from 'react-dom/client'`) or the default `ReactDOM` import, whichever the touched file/package already uses.
- Remove the bare `import 'react-dom';` side-effect lines together with the shim (they existed to keep `react-dom` in the bundle for the dynamic-import fallback).
- When `HAS_REACT_DOM_CLIENT` is removed from DefinePlugin and jest.js, also remove all readers (3 runtime files + 1 test) in the same change, and delete `hasReactDomClient.ts` only after `startFrontend.ts` stops importing it.
- `LegacyRootOption` is exported public API of `@backstage/test-utils` (>=1.0) — removal is a major; deprecating with `@deprecated` TSDoc is the non-breaking alternative.
- Do not edit `docs/releases/**`, `**/CHANGELOG.md`, generated api/knip reports, lockfiles by hand, or ESLint/Prettier/TS configs.
