# Stack profile - learned from repo scan

Built 2026-11-09 (run 20261109-123841-refactor-react18-only). Scope: the frontend/CLI/tooling surface relevant to React-version work. Backend conventions were not sampled in depth.

## Language & runtime

TypeScript ~5.7 (root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json`, `"jsx": "react-jsx"`, `useUnknownInCatchVariables: false`), Node 22 || 24, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`). Source is ESM-style TS compiled by `backstage-cli`. CLI config files such as `packages/cli-module-test-jest/config/jest.js` are CommonJS (`require`). Installed React 18.3.1, `@types/react` 18.3.23 (root `resolutions` pin `@types/react` and `@types/react-dom` to `^18.0.0`).

## Framework

React 18 + react-router-dom 6 on the Backstage frontend system (new: `@backstage/frontend-*`; old: `@backstage/core-*`), and the Backstage backend system. Tests run on Jest 30 + `@testing-library/react` ^16 via `backstage-cli package test`.

## Conventions detected

### File naming

- camelCase for modules and functions: `createDevApp.tsx`, `renderReactElement.ts`, `hasReactDomClient.ts`, `testingLibrary.ts`.
- PascalCase for components and classes: `DefaultPluginWrapperApi.tsx`, `TestApiProvider.tsx`.
- Colocated tests: `<name>.test.ts(x)` next to the source.
- Every source file starts with the Apache 2.0 header `Copyright <year> The Backstage Authors`. New files use the current year, and existing years are never changed.

### Package manifest shape (peer React block, identical in 56 packages)

```json
  "peerDependencies": {
    "@types/react": "^17.0.0 || ^18.0.0",
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0",
    "react-router-dom": "^6.30.2"
  },
  "peerDependenciesMeta": {
    "@types/react": {
      "optional": true
    }
  }
```

React-18-only reference: `packages/ui/package.json` (`"^18.0.0"` for all three). `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` enforces this block, and `scripts/sort-package-json.mjs` runs from lint-staged.

### Legacy render fallback shape (the pattern being removed)

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

(`plugins/techdocs/src/reader/transformers/renderReactElement.ts`. Same in `packages/dev-utils/src/devApp/render.tsx` and `packages/frontend-dev-utils/src/createDevApp.tsx`.) The React-18 target shape, already used in apps and templates:

```tsx
import ReactDOM from 'react-dom/client';
ReactDOM.createRoot(document.getElementById('root')!).render(app);
```

(`packages/app/src/index.tsx:18-22`.) Removing the async promise changes timing. Callers and tests that await rendering (`createDevApp.test.tsx` uses `findByText` / `waitFor`) should keep working, but check the tests that `jest.doMock('react-dom/client')`.

### Hook shape

```ts
import { useMemo } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
...
  const isFinalized = useSyncExternalStore(
    appLifecycleApi.subscribe,
    appLifecycleApi.isFinalized,
  );
```

(`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`.) The React 18 form imports `useSyncExternalStore` from `'react'`, as `plugins/app/src/apis/PluginWrapperApi/DefaultPluginWrapperApi.tsx:21-30` already does with named imports from `react`. Code uses named React imports (`import { useMemo } from 'react'`), not `React.*`.

### Test shape

```tsx
describe('wrapInTestApp', () => {
  it('should provide routing and warn about missing act()', async () => {
    const { error } = await withLogCollector(['error'], async () => {
      const rendered = render(
        wrapInTestApp(
```

(`packages/test-utils/src/testUtils/appWrappers.test.tsx`.) Jest `describe/it`. Module-isolation tests use `jest.resetModules()`, `jest.doMock(...)`, `jest.isolateModules` and `process.env` mutation (`packages/frontend-dev-utils/src/createDevApp.test.tsx`). CLAUDE.md asks for fewer, thorough tests, `screen` / `findBy*` over `waitFor`, and no test IDs.

### Config

Build-time env injection through webpack/rspack `DefinePlugin` in `packages/cli-module-build/src/lib/bundler/config.ts` (`process.env.BUILD_INFO`, `APP_CONFIG`, `HAS_REACT_DOM_CLIENT`). The Jest side is set in `packages/cli-module-test-jest/config/jest.js`. App config is YAML (`app-config.yaml`) with `config.d.ts` schemas.

### Data layer

Not relevant to this intent. Backend plugins use Knex (`knexfile.js`, `plugins/*/migrations`).

### Framework-owned wiring

New-frontend-system apps: `createApp({ features })` then `app.createRoot()`, rendered with `ReactDOM.createRoot(...).render(...)`. Dev apps: `createDevApp` (`@backstage/frontend-dev-utils`) / `createDevApp().render()` (`@backstage/dev-utils`, old system). CLI scaffolding templates live in `packages/cli-module-new/templates/*/package.json.hbs` and use `{{versionQuery 'react' '<fallback range>'}}`.

### Release hygiene

Each published-package change needs a `.changeset/<slug>.md` written by hand:

```md
---
'@backstage/plugin-scaffolder': minor
'@backstage/plugin-scaffolder-react': minor
---

Added a `ScaffolderTemplateFilterBlueprint` that lets apps ...
```

Breaking changes start with `**BREAKING**:`. A breaking change is a minor bump below 1.0 and a major bump at 1.0 or above. Write changesets in plain adopter-facing language, with no internal symbol names.

## Sample files inspected

- plugins/techdocs/src/reader/transformers/renderReactElement.ts (kind: legacy render shim)
- packages/frontend-dev-utils/src/createDevApp.tsx (kind: entry/dev wiring)
- packages/frontend-dev-utils/src/createDevApp.test.tsx (kind: test)
- packages/dev-utils/src/devApp/render.tsx (kind: entry/dev wiring)
- packages/frontend-plugin-api/src/routing/useRouteRef.tsx (kind: hook)
- packages/test-utils/src/testUtils/testingLibrary.ts, appWrappers.tsx, appWrappers.test.tsx (kind: test utils / test)
- packages/cli-module-build/src/lib/bundler/{config.ts,hasReactDomClient.ts,server.ts}, commands/package/start/startFrontend.ts (kind: CLI build config)
- packages/cli-module-test-jest/config/jest.js (kind: config)
- packages/repo-tools/src/commands/peer-deps/peer-deps.ts (kind: lint enforcer)
- packages/core-plugin-api/package.json, packages/ui/package.json (kind: manifest)
- .changeset/four-dingos-filter.md, .changeset/fix-gcp-workspace-snapshot-rate-limit.md (kind: changeset)

## Notes for downstream codegen

- Manifest edits are mechanical string replacements of `"^17.0.0 || ^18.0.0"` with `"^18.0.0"`. Keep key order and 2-space JSON formatting, and leave `peerDependenciesMeta` alone.
- When dropping the dual-import pattern, use a static `import { createRoot } from 'react-dom/client'` (or the default `ReactDOM` import, matching the file). Drop the leftover `import 'react-dom';` side-effect line in `createDevApp.tsx` only if nothing relies on it.
- If the `HAS_REACT_DOM_CLIENT` DefinePlugin entry is removed, remove every reader in the same change (4 source files + 1 test). Third-party plugins might read the flag, so keeping it defined as `true` is the safer, non-breaking option.
- `LegacyRootOption` is public API of `@backstage/test-utils` (1.x). Remove it only with a major changeset. Otherwise mark it `@deprecated` in TSDoc.
- Do not touch `yarn.lock`, CHANGELOGs, `docs/releases/**`, or ESLint/Prettier/TS configs unless scope explicitly allows it.
