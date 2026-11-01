# Intent Brief — refactor — Require React 18 and remove React 17 compatibility code

## Context

React 17 is deprecated in Backstage, but packages still advertise it in peer dependency ranges and keep hook
shims and legacy root-rendering paths for it. That code doubles test paths and blocks simplification of the
frontend framework. Task breakdown: backstage/backstage#35718.

The issue's file lists were checked against this HEAD (f20fd9b59828). Where they differ, this brief follows the
tree, as the issue itself asks:

- 56 manifests carry `^17.0.0 || ^18.0.0` (54 public, 2 private), not the 58 the issue's audit counted.
- `use-sync-external-store/shim` is imported in two files, not the issue's three:
  `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`.
  `packages/frontend-internal` has no such import. `upstream/master` matches this.
- Direct `use-sync-external-store` declarations exist in three manifests: `packages/frontend-plugin-api`,
  `packages/ui`, `plugins/app`.

## Goal

Backstage packages require React 18, use React's native hooks and root rendering APIs, and no longer advertise
React 17 support.

1. Peer ranges: move `react`, `react-dom` and `@types/react` to `^18.0.0` in all 56 manifests, preserving
   optional peer metadata.
2. `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`: require React 18 by default and remove the
   React-18-only exception list.
3. Shims: import `useSyncExternalStore` from `react` in the two files above and remove the direct
   `use-sync-external-store` and `@types/use-sync-external-store` declarations.
4. Render paths: replace the conditional imports and `ReactDOM.render` fallbacks with `react-dom/client` and
   `createRoot` in `packages/dev-utils/src/devApp/render.tsx`,
   `packages/frontend-dev-utils/src/createDevApp.tsx` and
   `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
5. CLI: remove `HAS_REACT_DOM_CLIENT` from both bundler branches and from `cli-module-test-jest`, delete
   `hasReactDomClient.ts`, and update the diagnostics in `startFrontend.ts` and `server.ts` to name React 18 as
   the minimum.
6. IDs: replace the `react-aria` `useId` import with React's in `Popover`, `Tooltip`, `Table` and
   `TablePagination` under `packages/ui/src/components/`.
7. Test utilities: remove `LegacyRootOption` and `legacyRoot` forwarding from `packages/test-utils`, with
   migration guidance for external consumers.
8. Test dependencies: remove the unused `@testing-library/react-hooks` (`packages/core-app-api`) and
   `react-test-renderer` (`plugins/catalog-react`).
9. Templates: move the four `packages/cli-module-new/templates/*/package.json.hbs` files that allow React 16 or
   17 to the React 18 range.
10. Docs: update `docs/tutorials/react18-migration.md` and `docs/tutorials/migrate-to-mui5.md`, and reconcile the
    React 17 future-configuration statement in `docs/tutorials/jsx-transform-migration.md` (wording only).
11. Release: add changesets and regenerate API and knip reports.

## Files in scope

- `packages/*/package.json`, `plugins/*/package.json`
- `yarn.lock`
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`
- `packages/ui/src/components/Popover/**`, `packages/ui/src/components/Tooltip/**`,
  `packages/ui/src/components/Table/components/Table.tsx`, `packages/ui/src/components/TablePagination/**`
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, `packages/frontend-dev-utils/src/createDevApp.test.tsx`
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- `packages/cli-module-build/src/lib/bundler/config.ts`, `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`,
  `packages/cli-module-build/src/lib/bundler/server.ts`,
  `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
- `packages/cli-module-test-jest/config/jest.js`
- `packages/test-utils/src/testUtils/testingLibrary.ts`, `packages/test-utils/src/testUtils/appWrappers.tsx`,
  `packages/test-utils/src/testUtils/appWrappers.test.tsx`, `packages/test-utils/src/testUtils/index.ts`
- `packages/cli-module-new/templates/frontend-plugin/package.json.hbs`,
  `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs`,
  `packages/cli-module-new/templates/plugin-web-library/package.json.hbs`,
  `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs`
- `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md`
- `.changeset/*.md`
- `**/report*.api.md`, `**/knip-report.md`
- `.gitignore` (add a `.sdlc/` entry, approved at Gate 0)

## Files off-limits

- Project defaults from `.sdlc/project.json`: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`,
  `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`
- AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`
- Generated or bundled: `.yarn/releases/**`, `packages/create-app/templates/*/.yarn/releases/**`
- History: `docs/releases/**`, `**/CHANGELOG.md`, `docs-ui/src/utils/changelogs/**`
- Lint and compiler config: `.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`
- Separate roots: `microsite/**`, `docs-ui/**`, `workspaces/**`

## Acceptance criteria

- `yarn tsc`, lint, the affected packages' test suites and `yarn lint:peer-deps` pass.
- No React 17 range remains in published packages.
- Everything React 18 users see stays identical. The proof is the diff and the same test suite passing before
  and after, with a pre-change run of the affected packages as the comparison baseline. A test changes only
  where it asserted the React 17 path, such as the legacy rendering case in `createDevApp.test.tsx`.
- Accepted exceptions to "identical", each required by the job:
  - Narrowed peer ranges and the removed `LegacyRootOption`, both breaking for their consumers.
  - `@backstage/ui` generated IDs change format with React's `useId`. SVG `<use href>` references, accessibility
    relationships and ID uniqueness must still hold.
- Changesets follow the repo rule: breaking is `minor` below 1.0.0 and `major` at 1.0.0 or above.

## Non-goals

- Removing React 17 from repository tooling: `react@17.0.2` stays in `yarn.lock` through `@yarnpkg/libui`, and
  Yarn's bundled executables stay as they are. The issue allows this to be a separate PR.
- Adding React 19 support, or changing the documentation sites that already use it.
- Changing the JSX compiler configuration.
- Replacing `act` imports from `react-dom/test-utils`.
- Removing third-party transitive `use-sync-external-store`, server-rendering helpers, or old frontend system
  and router compatibility that does not depend on removed React APIs.
- Editing release notes, or opening a pull request.
