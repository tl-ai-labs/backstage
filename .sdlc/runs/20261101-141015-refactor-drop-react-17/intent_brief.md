# Intent Brief — refactor — Require React 18 and drop React 17 compatibility code

## Context

Seed: Require React 18 across Backstage packages and remove the React 17 shims, legacy render paths and peer ranges.

What we're refactoring: React 17 is deprecated in Backstage, but packages still advertise it in peer dependency ranges and keep hook shims and legacy root-rendering paths for it. That code doubles test paths and blocks simplification of the frontend framework. Task breakdown in backstage/backstage#35718.

Where it lives: peer ranges across many package.json files, the repo-tools peer-deps check, shim and render code in core and test-utils packages, and tests.

Base commit: `f20fd9b59828`, plus `cb8b07905b` (study model setting). Branch: `BS-RF-10/opus55-plus-flash38`.

Sites confirmed at this commit (the issue's list is older, so this list governs):

- 56 manifests declare `react`, `react-dom` and `@types/react` as `^17.0.0 || ^18.0.0`; `@backstage/ui` is already `^18.0.0`.
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` enforces those ranges and carries a React-18-only exception set.
- `packages/cli-module-new/templates/*/package.json.hbs` still hand new plugins `^16.13.1 || ^17.0.0 || ^18.0.0` or `^17.0.0 || ^18.0.0`.
- `use-sync-external-store/shim` imports: `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, `packages/ui/src/hooks/useBreakpoint.ts`. `plugins/app` declares the package and imports React's native hook. `packages/frontend-internal/src/routing/useAppHistoryLocation.ts` and `createAppHistoryRouter.ts`, named in the issue, do not exist at this commit.
- `HAS_REACT_DOM_CLIENT` and `ReactDOM.render` fallbacks: `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx`, `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
- Bundler and test detection: `packages/cli-module-build/src/lib/bundler/{config,hasReactDomClient}.ts`, `packages/cli-module-test-jest/config/jest.js`.
- Diagnostics: `packages/cli-module-build/src/commands/package/start/startFrontend.ts`, `packages/cli-module-build/src/lib/bundler/server.ts`.
- `useId` from `react-aria`: `Popover`, `Tooltip`, `Table/components/Table`, `TablePagination` in `packages/ui/src/components/`.
- Public test option: `LegacyRootOption` and `legacyRoot` in `packages/test-utils/src/testUtils/{testingLibrary.ts,appWrappers.tsx}`.

## Goal

Backstage's published packages require React 18, use React 18's native hooks and root rendering APIs directly, and no longer carry code or peer ranges that exist only for React 17.

## Files in scope

- `packages/*/package.json`, `plugins/*/package.json`, `yarn.lock`
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`
- `packages/cli-module-new/templates/**/package.json.hbs`
- `packages/cli-module-build/src/lib/bundler/**`, `packages/cli-module-build/src/commands/package/start/startFrontend.ts`
- `packages/cli-module-test-jest/config/jest.js`
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, `packages/frontend-dev-utils/src/createDevApp.test.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`, and `Popover/Popover.tsx`, `Tooltip/Tooltip.tsx`, `Table/components/Table.tsx`, `TablePagination/TablePagination.tsx` in `packages/ui/src/components/`
- `packages/test-utils/src/testUtils/**`, `packages/test-utils/report.api.md`
- `plugins/techdocs/src/reader/transformers/**`
- Companion files: `packages/*/knip-report.md`, `plugins/*/knip-report.md`, `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md`, `packages/eslint-plugin/docs/rules/no-undeclared-imports.md`, `.changeset/*.md`

## Files off-limits

- `.env`, `.env.*`, `.env.local`, `.mcp.json`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `.git/**`, `.sdlc/**` (the run's own files excepted)
- AI setup: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`
- `.yarn/releases/**`, `**/.yarn/releases/**`, `**/generated/**`, `docs/releases/**`
- `.eslintrc.js`, `**/.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`
- `docs-ui/**`, `microsite/**`, `workspaces/**` (React 19 sites and separate lockfiles)

## Acceptance criteria

- `yarn tsc`, lint, the affected packages' test suites and the peer-deps check (`yarn lint:peer-deps`) pass.
- No React 17 range remains in published packages.

Behaviour that must stay identical: everything React 18 users see. No visible change by design; the proof is the diff and the same test suite passing before and after.

## Non-goals

- React 19 support.
- React 17 copies inside repository tooling and bundled executables (`.yarn/releases/**`, generated-app tooling); the issue allows those in a separate PR.
- Third-party packages that depend on `use-sync-external-store`; only direct declarations this run makes unused are removed.
- `useIsomorphicLayoutEffect` and other server-rendering helpers, old frontend system support and router-version compatibility.
- `react-dom/test-utils` imports in tests, which still work on React 18.
- `react-test-renderer` `^16.13.1` in `plugins/catalog-react` devDependencies: it is not a peer range.
- Compiler configuration changes.
- Historical release notes and lockfile parser fixtures.
