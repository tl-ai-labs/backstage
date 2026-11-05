# Intent Brief — refactor — Require React 18 and remove React 17 compatibility

## Context

React 17 is deprecated in Backstage, but packages still advertise it in peer dependency ranges and keep
hook shims and legacy root-rendering paths for it. That code doubles test paths and blocks simplification
of the frontend framework. Task breakdown: backstage/backstage#35718 ("Remove React 17 support and
compatibility shims"). This run covers the issue's Backstage-migration tasks; the issue's separate tooling
work (React 17 copies inside repository tooling / bundled executables) is a later linked PR.

Discovery (run 20261105-100258-refactor-react18-only, HEAD f20fd9b598) re-audited the tree, as the issue
asks; counts below are from this tree, not the issue's audit.

## Goal

Backstage packages require React 18, use React 18's native hooks and root-rendering APIs, and no longer
advertise or carry code for React 17.

1. **Peer ranges** — narrow `react`, `react-dom`, `@types/react` from `^17.0.0 || ^18.0.0` to `^18.0.0` in
   the 56 manifests discovery listed, preserving `peerDependenciesMeta` (optional flags). Change the rule in
   `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` to require React 18 by default and drop the
   `react18OnlyPackages` exception. Refresh `yarn.lock` (and `workspaces/ui/yarn.lock` if affected) with
   `yarn install`, never by hand.
2. **External-store shims** — import `useSyncExternalStore` from `react` in
   `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`;
   remove the `use-sync-external-store` / `@types/use-sync-external-store` declarations from
   `packages/frontend-plugin-api`, `packages/ui` and `plugins/app` package.json.
3. **Render paths** — replace the `HAS_REACT_DOM_CLIENT` conditional imports and `ReactDOM.render` fallbacks
   with `react-dom/client` + `createRoot` in `packages/dev-utils/src/devApp/render.tsx`,
   `packages/frontend-dev-utils/src/createDevApp.tsx`,
   `plugins/techdocs/src/reader/transformers/renderReactElement.ts`; update `createDevApp.test.tsx` to drop
   legacy-render expectations while keeping mounting and error coverage.
4. **CLI** — remove `HAS_REACT_DOM_CLIENT` from both bundler branches in
   `packages/cli-module-build/src/lib/bundler/config.ts`, delete `hasReactDomClient.ts`, remove the flag from
   `packages/cli-module-test-jest/config/jest.js`; make the diagnostics in `startFrontend.ts` and
   `bundler/server.ts` state React 18 as the minimum.
5. **IDs** — replace React Aria `useId` imports with React's in `packages/ui/src/components/`
   `Popover/Popover.tsx`, `Tooltip/Tooltip.tsx`, `Table/components/Table.tsx`,
   `TablePagination/TablePagination.tsx`.
6. **Test utilities** — remove `LegacyRootOption` and `legacyRoot` forwarding from
   `packages/test-utils/src/testUtils/testingLibrary.ts` and `appWrappers.tsx`, regenerate
   `packages/test-utils/report.api.md`, with migration guidance in its changeset.
7. **Templates** — `yarn new` templates in `packages/cli-module-new/templates/` (`frontend-plugin`,
   `plugin-web-library`, `legacy-frontend-plugin`, `scaffolder-field-extension-module`) declare React 18 only.
8. **Docs** — `docs/tutorials/react18-migration.md` states the React 18 requirement (keeping useful migration
   examples); reconcile the React 17 statements in `docs/tutorials/jsx-transform-migration.md` and
   `docs/tutorials/migrate-to-mui5.md` (no compiler-config changes).
9. **Changesets** — breaking-change changesets for every affected published package (minor below 1.0.0,
   major at 1.0.0+), per CLAUDE.md; reuse/update existing pending changesets for the same packages where they
   already cover them.

## Files in scope

- The 56 `package.json` files under `packages/` and `plugins/` with React 17 peer ranges (listed in
  `.sdlc/runs/20261105-100258-refactor-react18-only/discovery.md`), plus `plugins/app/package.json`
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (and its test if present)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`
- `packages/ui/src/components/{Popover/Popover.tsx,Tooltip/Tooltip.tsx,Table/components/Table.tsx,TablePagination/TablePagination.tsx}`
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, `createDevApp.test.tsx`
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- `packages/cli-module-build/src/lib/bundler/{config.ts,hasReactDomClient.ts,server.ts}`,
  `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
- `packages/cli-module-test-jest/config/jest.js`
- `packages/test-utils/src/testUtils/{testingLibrary.ts,appWrappers.tsx}`, `packages/test-utils/report.api.md`
- `packages/cli-module-new/templates/{frontend-plugin,plugin-web-library,legacy-frontend-plugin,scaffolder-field-extension-module}/package.json.hbs`
- `docs/tutorials/{react18-migration.md,jsx-transform-migration.md,migrate-to-mui5.md}`
- `.changeset/*.md` (new and updated)
- `yarn.lock`, `workspaces/ui/yarn.lock` (via `yarn install` only)

## Files off-limits

- `docs/releases/**`, every `CHANGELOG.md`, `docs-ui` changelog data
- `packages/cli-node/src/monorepo/Lockfile.test.ts` (lockfile parser fixture)
- ESLint, Prettier and TypeScript configuration files
- AI configs: `.claude/`, `.cursor/rules/`, `.github/copilot-instructions.md`, `AGENTS.md`
- `.github/workflows/**`
- Third-party `use-sync-external-store` usage, `useIsomorphicLayoutEffect`-style SSR helpers, old frontend
  system and router-version compatibility not tied to removed React APIs

## Acceptance criteria

- `yarn tsc` passes (repo root).
- `yarn lint` passes.
- `yarn lint:peer-deps` passes.
- The affected packages' test suites pass (`CI=1 yarn test <path>`) — same suites as before, except removed
  legacy-render expectations: `packages/frontend-dev-utils`, `packages/dev-utils`,
  `plugins/techdocs/src/reader/transformers`, `packages/test-utils`, `packages/cli-module-build`,
  `packages/cli-module-new`, `packages/repo-tools/src/commands/peer-deps`, `packages/frontend-plugin-api`,
  `packages/ui`.
- No React 17 range remains in published packages' manifests or in `yarn new` templates.
- `yarn build:api-reports` leaves the API reports consistent (test-utils report regenerated).
- Behaviour React 18 users see is unchanged; the proof is the diff and the same test suite passing before
  and after.

## Non-goals

- React 19 support for published packages; docs sites already on React 19 keep their versions.
- Removing React 17 copies from repository tooling / bundled executables (the issue's separate tooling PR).
- Optional cleanups not in the issue: `act` imports from `react-dom/test-utils` in 4 tests, the eslint-plugin
  docs example.
- Any behaviour change for React 18 users.

## Gate 0 — approved

- Auth mode: `vendor`
- Policy: `argon4-plus-flash38`
- Test command (verbatim, as confirmed at Gate 0):
  `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`
- Note: this command does not run the own test suites of frontend-dev-utils, dev-utils, ui, frontend-plugin-api,
  techdocs transformers, cli-module-build or repo-tools; tsc and lint:all still cover them. The person approved it.
- Breaking-change decisions: `legacyRoot`/`LegacyRootOption` removed (test-utils major, with migration guidance);
  peer-range narrowing is minor below 1.0.0, major at 1.0.0+.
- `.gitignore` left as is (`.sdlc/` ignored via `.git/info/exclude`).
- Frozen write contract: `.sdlc/local/write-contract.json` (86 allowlist entries, 25 off-limits patterns).
