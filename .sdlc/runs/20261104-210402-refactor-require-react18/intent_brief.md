# Intent Brief — refactor — Require React 18 and remove React 17 compatibility code

## Context

User's seed (verbatim): Require React 18 across Backstage packages and remove the React 17 shims, legacy render paths and peer ranges.

User's brief (verbatim):

> What we're refactoring: React 17 is deprecated in Backstage, but packages still advertise it in peer dependency ranges and keep hook shims and legacy root-rendering paths for it. That code doubles test paths and blocks simplification of the frontend framework. Task breakdown in backstage/backstage#35718.
>
> Where it lives: peer ranges across many package.json files, the repo-tools peer-deps check, shim and render code in core and test-utils packages, and tests.
>
> Behaviour that must stay identical: everything React 18 users see. No visible change by design; the proof is the diff and the same test suite passing before and after.
>
> Acceptance criteria: yarn tsc, lint, the affected packages' test suites and the peer-deps check (yarn lint:peer-deps) pass; no React 17 range remains in published packages.

The task breakdown in backstage/backstage#35718 was written against a later tree. This branch differs as follows:

- `packages/frontend-internal` has no `use-sync-external-store` usage. The routing shim is in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`.
- `plugins/app-react-router-v6`, `app-react-router-v7` and `app-tanstack-router` do not exist.
- Only `frontend-plugin-api`, `ui` and `plugins/app` declare `use-sync-external-store`. `plugins/app` declares it without importing it.

The scope below comes from this branch's tree, not from the issue's file list.

Found on this branch:

- **Peer ranges.** 56 workspace manifests declare `"^17.0.0 || ^18.0.0"` for `react`, `react-dom` and `@types/react`. 54 are published and 2 are private (`packages/app-example-plugin`, `plugins/example-todo-list`). All 56 already mark `@types/react` as an optional peer. `packages/ui` is already React-18-only. The root `yarn.lock` repeats these ranges in 186 workspace-entry lines.
- **Peer-deps check.** `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` encodes the React 17 range as the default and has a React-18-only exception set (`@backstage/ui`).
- **External-store shims.** `use-sync-external-store/shim` is imported in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`.
- **Legacy render paths.** These files choose between `react-dom/client` and `react-dom` with a `ReactDOM.render` fallback:
  - `packages/dev-utils/src/devApp/render.tsx`
  - `packages/frontend-dev-utils/src/createDevApp.tsx`, whose `createDevApp.test.tsx` has a legacy-render test
  - `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- **Bundler and test detection.** `packages/cli-module-build` defines `process.env.HAS_REACT_DOM_CLIENT` in both bundler branches of `src/lib/bundler/config.ts`, through `src/lib/bundler/hasReactDomClient.ts`. `packages/cli-module-test-jest/config/jest.js` sets the same variable.
- **CLI messages.** `startFrontend.ts` warns that React 17 is deprecated. `server.ts` tells React 16 users to upgrade to React 17.
- **IDs.** Four `packages/ui` components import `useId` from `react-aria` because React 17 lacked it: Popover, Tooltip, Table, TablePagination.
- **Test utilities.** `packages/test-utils` exports `LegacyRootOption` and forwards `legacyRoot` from `renderInTestApp` and `renderWithEffects`. Both are in `report.api.md`.
- **Plugin templates.** `packages/cli-module-new` (published) has four plugin templates whose `package.json.hbs` carry React 16/17 peer ranges.
- **Docs.** `docs/tutorials/react18-migration.md` describes React 17 as still supported. `docs/tutorials/jsx-transform-migration.md` says a setting changes "once React 17 is fully deprecated".

Gate 0 approved on 2026-11-04. The write contract is frozen with the "Files in scope" below as its allowlist (91 entries) and "Files off-limits" as its off-limits list (35 patterns). Run settings confirmed at Gate 0: auth mode `vendor`, policy `argon4-agsdk-only`, no `.gitignore` change. The test command is the study's fixed command for BS-RF-10, used word for word:

`yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`

Baseline before the run: the command's test suites pass (86 suites, 550 tests) and `yarn lint:peer-deps` exits 0.

## Goal

Backstage packages require React 18. They use React's own `useSyncExternalStore`, `useId` and `react-dom/client` `createRoot`. They no longer advertise or branch on React 17. React 18 users see no change in behaviour.

## Files in scope

Peer ranges (change `react`, `react-dom` and `@types/react` from `^17.0.0 || ^18.0.0` to `^18.0.0`, keeping `peerDependenciesMeta`):

- `packages/{app-defaults,app-example-plugin,core-app-api,core-compat-api,core-components,core-plugin-api,dev-utils,frontend-app-api,frontend-defaults,frontend-dev-utils,frontend-dynamic-feature-loader,frontend-plugin-api,frontend-test-utils,integration-react,module-federation-common,test-utils,theme,version-bridge}/package.json`
- `plugins/{api-docs-module-protoc-gen-doc,api-docs,app-react,app-visualizer,app,auth-react,auth,catalog-graph,catalog-import,catalog-react,catalog-unprocessed-entities,catalog,config-schema,devtools-react,devtools,example-todo-list,home-react,home,kubernetes-cluster,kubernetes-react,kubernetes,mui-to-bui,notifications,org-react,org,permission-react,scaffolder-node-test-utils,scaffolder-react,scaffolder,search-react,search,signals-react,signals,techdocs-addons-test-utils,techdocs-module-addons-contrib,techdocs-react,techdocs,user-settings}/package.json`
- `packages/ui/package.json` (drops `use-sync-external-store` and its types only)
- `yarn.lock` (regenerated by `yarn install`, not hand-edited)

Peer-deps check:

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`: React 18 becomes the default; the React-18-only exception set is removed.

External-store shims:

- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `useRouteRef.test.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`
- Direct `use-sync-external-store` and `@types/use-sync-external-store` declarations are removed from `packages/frontend-plugin-api/package.json`, `packages/ui/package.json` and `plugins/app/package.json`.

Render paths:

- `packages/dev-utils/src/devApp/render.tsx` and `render.test.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx` and `createDevApp.test.tsx`; the legacy-render test is removed, keeping the mounting and error coverage
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`

Bundler and test detection:

- `packages/cli-module-build/src/lib/bundler/config.ts` and `config.test.ts`
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` (delete)
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
- `packages/cli-module-build/src/lib/bundler/server.ts`, so that diagnostics name React 18 as the minimum
- `packages/cli-module-build/knip-report.md` (regenerated)
- `packages/cli-module-test-jest/config/jest.js`

IDs:

- `packages/ui/src/components/Popover/Popover.tsx`
- `packages/ui/src/components/Tooltip/Tooltip.tsx`
- `packages/ui/src/components/Table/components/Table.tsx` and `Table.test.tsx`
- `packages/ui/src/components/TablePagination/TablePagination.tsx` and `TablePagination.test.tsx`

Test utilities:

- `packages/test-utils/src/testUtils/testingLibrary.ts`
- `packages/test-utils/src/testUtils/appWrappers.tsx` and `appWrappers.test.tsx`
- `packages/test-utils/report.api.md` (regenerated)

Plugin templates (derived from the acceptance criterion "no React 17 range remains in published packages"):

- `packages/cli-module-new/templates/{frontend-plugin,legacy-frontend-plugin,plugin-web-library,scaffolder-field-extension-module}/package.json.hbs`

Companion files required by repo rules:

- `docs/tutorials/react18-migration.md`: states the React 18 requirement, keeps the useful migration examples and covers removal of the legacy test-root option
- `docs/tutorials/jsx-transform-migration.md`: reconciles the React 17 statement only; no compiler configuration change
- `.changeset/*react-18*.md`: new changesets for every affected published package

## Files off-limits

- Project defaults: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**` (except this run's folder), `.git/**`
- Detected AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`
- `**/CHANGELOG.md`, `docs/releases/**`
- `docs-ui/**`, `microsite/**`, `workspaces/**` (separate projects; docs sites stay on React 19)
- `.yarn/**`, `packages/create-app/templates/**/.yarn/**` (bundled Yarn executables)
- `packages/cli-node/src/monorepo/Lockfile.test.ts` (lockfile parser fixtures)
- ESLint, Prettier and TypeScript configuration files, including `tsconfig.json`
- `**/dist/**`, `**/dist-types/**`
- Everything not on the allowlist

## Acceptance criteria

1. No published workspace package declares a React 17 range for `react`, `react-dom` or `@types/react`. Optional `@types/react` peer metadata is kept. Neither do the private `app-example-plugin` and `example-todo-list`, nor the `cli-module-new` plugin templates.
2. `yarn lint:peer-deps` passes with React 18 as its only expected peer range.
3. No source file in `packages/*` or `plugins/*` imports `use-sync-external-store`, reads `HAS_REACT_DOM_CLIENT`, or calls `ReactDOM.render`. `frontend-plugin-api`, `ui` and `plugins/app` no longer declare `use-sync-external-store` or its types.
4. The four `packages/ui` components use React's `useId`. Generated IDs stay unique per instance. SVG references and accessibility relationships keep working.
5. `@backstage/test-utils` no longer exports `LegacyRootOption` or accepts `legacyRoot`. `report.api.md` is regenerated to match.
6. CLI start-up diagnostics name React 18 as the minimum and no longer recommend React 17.
7. React 18 behaviour is unchanged. The same test suites pass before and after; the only tests removed or changed are those that exercised React 17 paths.
8. The test command passes: `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`. `yarn.lock` is consistent (`yarn install --immutable` would succeed).
9. Changesets cover every affected published package, with the bump level REVIEWING.md requires for a breaking change. Docs are updated as listed.

## Non-goals

- Adding React 19 support to published packages.
- Removing React 17 runtime copies from repository tooling, such as Yarn dependencies of tools or bundled executables. The issue says this can be a separate PR.
- Changing compiler or JSX configuration.
- Third-party `use-sync-external-store` dependencies, server-rendering helpers such as `useIsomorphicLayoutEffect`, and old-frontend-system or router compatibility that does not depend on removed React APIs.
- Historical release notes, CHANGELOGs and lockfile parser fixtures.
