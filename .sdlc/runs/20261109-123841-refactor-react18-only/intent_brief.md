# Intent Brief — refactor — Require React 18 and remove React 17 compatibility

## Context

What we're refactoring: React 17 is deprecated in Backstage, but packages still advertise it in peer dependency ranges and keep hook shims and legacy root-rendering paths for it. That code doubles test paths and blocks simplification of the frontend framework. Task breakdown in backstage/backstage#35718.

Where it lives: peer ranges across many package.json files, the repo-tools peer-deps check, shim and render code in core and test-utils packages, and tests.

## Goal

Require React 18 across Backstage packages and remove the React 17 shims, legacy render paths and peer ranges.

Behaviour that must stay identical: everything React 18 users see. No visible change by design; the proof is the diff and the same test suite passing before and after.

## Files in scope

- `packages/*/package.json`, `plugins/*/package.json` (the 56 manifests discovery lists with React 17 peer ranges, plus `use-sync-external-store` declarations in frontend-plugin-api, ui and plugins/app)
- `yarn.lock`
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (+ its test if present)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (+ test)
- `packages/ui/src/hooks/useBreakpoint.ts`, `packages/ui/src/components/{Popover/Popover.tsx,Tooltip/Tooltip.tsx,Table/components/Table.tsx,TablePagination/TablePagination.tsx}`
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, `createDevApp.test.tsx`
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- `packages/cli-module-build/src/lib/bundler/{config.ts,hasReactDomClient.ts,server.ts}`, `src/commands/package/start/startFrontend.ts`
- `packages/cli-module-test-jest/config/jest.js`
- `packages/test-utils/src/testUtils/{testingLibrary.ts,appWrappers.tsx,index.ts}`, `packages/test-utils/report.api.md`, other `report.api.md` the API-report regeneration changes
- `packages/cli-module-new/templates/*/package.json.hbs`
- `packages/*/knip-report.md`, `plugins/*/knip-report.md`
- `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md`, `packages/eslint-plugin/docs/rules/no-undeclared-imports.md`
- `.changeset/*.md` (new files)

## Files off-limits

Project defaults (`.env*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`) plus: `.claude/**`, `AGENTS.md`, `.cursor/**`, `docs/releases/**`, `**/CHANGELOG.md`, `.yarn/releases/**`, `.yarn/patches/**`, `workspaces/*/yarn.lock`, ESLint/Prettier/TypeScript config files, `packages/cli-node/src/monorepo/Lockfile.test.ts` (fixture data), `docs-ui/**`, `microsite/**`, `workspaces/**` (React 19 sites with separate lockfiles; no peer range there changes).

## Acceptance criteria

yarn tsc, lint, the affected packages' test suites and the peer-deps check (yarn lint:peer-deps) pass; no React 17 range remains in published packages.

Test command (exactly): `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`

Release policy: breaking changesets, `major` for packages at 1.0.0 or above, `minor` for those below (per CLAUDE.md). Not minor everywhere.

## Non-goals

- React 17 copies inside repository tooling and bundled executables (`.yarn/releases/**`, generated-app tooling).
