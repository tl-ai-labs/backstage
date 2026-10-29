# Intent Brief — refactor — Require React 18, drop React 17 shims

## Context

Backstage frontend packages still declare `react`, `react-dom` and `@types/react` peer ranges of
`^17.0.0 || ^18.0.0` (56 package.json files). The CLI detects whether `react-dom/client` exists and injects
`process.env.HAS_REACT_DOM_CLIENT` at build and test time. Three runtime call sites use that flag to fall back to
the legacy `ReactDOM.render` path. `@backstage/ui` is already React 18 only. The repo's `peer-deps` lint
(`yarn lint:peer-deps`, run in CI) enforces the ranges and has a React 18-only special case.
`use-sync-external-store/shim` is used only to polyfill a hook that React 18 has built in. The CLI also prints a
React 17 deprecation warning and a stale React 16 warning.

## Goal

Make React 18 the minimum supported version across every Backstage package, and remove the code that exists only to
support React 17:

1. Narrow the peer ranges to `"@types/react": "^18.0.0"`, `"react": "^18.0.0"` and `"react-dom": "^18.0.0"` in
   every package that declares them. `react-router-dom` stays unchanged.
2. Update `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` so React 18 only is the one expected range, and
   remove its `react18OnlyPackages` special case.
3. Remove the legacy render fallbacks: each site imports `react-dom/client` directly and calls `createRoot`:
   - `packages/dev-utils/src/devApp/render.tsx`
   - `packages/frontend-dev-utils/src/createDevApp.tsx`
   - `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
4. Remove `react-dom/client` detection from the CLI:
   - Delete `cli-module-build/src/lib/bundler/hasReactDomClient.ts`.
   - In the bundler `DefinePlugin` (`config.ts`) and `cli-module-test-jest/config/jest.js`, define
     `process.env.HAS_REACT_DOM_CLIENT` unconditionally as `true`. Older published plugin builds still read this
     flag; with it always set they keep using `createRoot`, instead of silently falling back to legacy render.
5. Replace the CLI React warnings. Remove the `startFrontend.ts` React 17 deprecation warning. Change the
   `server.ts` React 16 check into one warning shown when the app's React major is below 18, linking to the
   React 18 migration guide.
6. Replace `use-sync-external-store/shim` with React's built-in `useSyncExternalStore` in
   `packages/frontend-plugin-api` and `packages/ui`. Remove the `use-sync-external-store` and
   `@types/use-sync-external-store` dependencies from those packages and from `plugins/app`, where it is declared
   but unused.
7. Keep the `legacyRoot` / `LegacyRootOption` test option in `@backstage/test-utils`. Fix only its doc comment,
   which still refers to React 17.
8. Update `docs/tutorials/react18-migration.md` to say that React 17 is no longer supported.
9. Add changesets per CLAUDE.md:
   - Packages at 1.x or above whose peer range narrows get a major bump.
   - Packages below 1.0 get a minor bump.
   - CLI and repo-tools changes are patch/minor, as appropriate.
   - Private packages (`app-example-plugin`, `@internal/plugin-todo-list`) get none.
   - Existing `.changeset/` entries are checked first.

## Files in scope

Peer ranges (56 package.json files):

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
- `packages/ui/package.json`: React 18-only range normalisation; removing the `use-sync-external-store` dependency

Shims and legacy render paths:

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` (delete)
- `packages/cli-module-build/src/lib/bundler/config.ts`
- `packages/cli-module-build/src/lib/bundler/server.ts`
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
- `packages/cli-module-build/knip-report.md` (generated; its `react-dom` entry points at the deleted file)
- `packages/cli-module-test-jest/config/jest.js`
- `packages/dev-utils/src/devApp/render.tsx`, `packages/dev-utils/src/devApp/render.test.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, `packages/frontend-dev-utils/src/createDevApp.test.tsx`
  (remove the legacy-fallback test)
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`
- `packages/test-utils/src/testUtils/testingLibrary.ts`

Companion files:

- `docs/tutorials/react18-migration.md`
- `.changeset/*.md` (new files only; existing ones are not edited unless they cover the same packages)
- `yarn.lock` (only as `yarn install` regenerates it after the dependency removals; never hand-edited)
- `packages/test-utils/report.api.md` (only if `yarn build:api-reports` changes it)

## Files off-limits

- Repo internals: `.git/**`, `.sdlc/**`
- Env and secret files: `.env`, `.env.*`, `.envrc`, `*-credentials.yaml`, `*.local.yaml`
- AI configs:
  - `.claude/**`
  - `AGENTS.md`
  - `plugins/catalog-backend/CLAUDE.md`
  - `.cursor/**`
  - `.github/copilot-instructions.md`
  - `.mcp.json`
- Dependencies and build output: `node_modules/**`, `**/dist/**`, `dist-types/**`, `build/**`
- Yarn: `.yarn/releases/**`, `.yarn/patches/**`, `.yarn/plugins/**`
- Generated OpenAPI code: `packages/*/src/schema/openapi/generated/**`, `plugins/*/src/schema/openapi/generated/**`,
  `plugins/events-node/src/generated/**`
- Release notes: `docs/releases/**`
- Lint and TypeScript configs: `.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`,
  `.eslintignore`
- Templates: `packages/create-app/templates/**` (already React 18)
- Example apps: `packages/app/**`, `packages/app-legacy/**` (already use `createRoot`)
- Every other source file

## Acceptance criteria

- No `package.json` under `packages/` or `plugins/` declares a React, React DOM or `@types/react` range that
  includes 17.
- `yarn lint:peer-deps` passes.
- `ReactDOM.render(` does not appear in any non-test source under `packages/` or `plugins/`.
- `hasReactDomClient` no longer exists. `HAS_REACT_DOM_CLIENT` is only ever defined as `true`, never detected.
- `use-sync-external-store` is not imported or declared anywhere in the workspace.
- React 18 apps behave the same: dev-utils, frontend-dev-utils and techdocs still render through `createRoot`.
- `yarn tsc` passes.
- `CI=1 yarn test` passes for each touched package:
  - `packages/dev-utils`, `packages/frontend-dev-utils`, `packages/frontend-plugin-api`, `packages/ui`
  - `packages/test-utils`, `packages/cli-module-build`, `packages/repo-tools`
  - `plugins/techdocs`, `plugins/app`
- Changesets cover every affected non-private package with the correct bump level.

## Non-goals

- Supporting React 19, or changing the `react-router-dom` range.
- Removing `legacyRoot` / `LegacyRootOption` from `@backstage/test-utils`.
- Touching `packages/create-app` templates or the example apps.
- Changing the old or new frontend-system APIs beyond what is listed above.

## Gate 0 decisions (approved 2026-10-29)

- Auth mode: `estimated`. Policy: `opus55-plus-sonnet55`.
- Test command: `CI=1 yarn test <package path>` for each touched package, plus `yarn tsc` and `yarn lint:peer-deps`.
- `.gitignore`: add `.sdlc/` (allowlisted).
- Write contract frozen: 77 allowlist entries and 37 off-limits patterns. The source of truth is
  `.sdlc/local/write-contract.json`.
