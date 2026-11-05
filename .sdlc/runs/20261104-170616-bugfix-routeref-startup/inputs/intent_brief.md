# Intent Brief — bugfix — App root elements crash on useRouteRef during startup

## Context
In the new frontend system, app root elements (components rendered around the whole app via
`AppRootElementBlueprint` / the `app/root` `elements` input, e.g. a global announcement banner) render
between sign-in and app finalization, before page routes are known. A root element that calls
`useRouteRef` for a page route throws `No path for routeRef`, and the app shows an extension error box in
place of the banner. Reported in backstage/backstage#35932.

Code findings so far:
- During bootstrap, `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`) is
  initialized from the bootstrap tree only, which has no page routes, so `RouteResolver`
  (`packages/frontend-app-api/src/routing/RouteResolver.ts:153`) throws `No path for ...`.
- Finalization re-initializes the proxy, but `useRouteRef`
  (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`) memoizes on
  `[routeResolutionApi, routeRef, pathname]`, none of which change, so a mounted element never re-resolves.

## Goal
App root elements that call `useRouteRef` render during startup without crashing, and `useRouteRef`
returns the correct link once the app is finalized, without render loops.

## Files in scope
- `packages/frontend-app-api/src/wiring/phaseApis.tsx`
- `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`
- `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`
- `packages/frontend-app-api/src/routing/RouteResolver.ts`
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (reproducing test — required: a bugfix run proves the fix with a test that fails on the bug first)
- `packages/frontend-app-api/src/routing/RouteResolver.test.ts`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`
- `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts` (if a change-notification / lifecycle signal is added)
- `packages/frontend-plugin-api/src/apis/definitions/index.ts`, `packages/frontend-plugin-api/src/apis/index.ts` (exports, if needed)
- `packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md` (API reports)
- `docs/frontend-system/architecture/36-routes.md`, `docs/frontend-system/building-apps/03-built-in-extensions.md` (docs)
- `.changeset/*.md` (new patch changesets for `@backstage/frontend-app-api`, `@backstage/frontend-plugin-api`; no existing ones cover these packages)

## Files off-limits
- Project defaults: `.env*`, `.mcp.json`, `node_modules/**`, `dist/**`, `.sdlc/**`, `.git/**`, `.yarn/releases/**`
- AI configs: `.claude/**`, `AGENTS.md`, `.cursor/**`
- Per CLAUDE.md: `docs/releases/**`, ESLint / Prettier / TypeScript config files
- Generated OpenAPI dirs

## Acceptance criteria
1. A `createSpecializedApp` test renders an app root element that calls `useRouteRef` for a page route,
   both before and after finalization, and asserts the link resolves to the correct path after finalization.
2. That test fails on the current code (reproduces "No path for routeRef") and passes after the fix.
3. No render loops (element renders a bounded number of times).
4. `yarn tsc`, `yarn lint`, and `yarn build:api-reports` pass; existing tests in the touched packages pass.
5. Patch changesets for the affected published packages; docs updated if behavior or API changes.

## Run settings (Gate 0)
- Test command (exact): `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports`
- Auth mode: vendor
- `.gitignore`: unchanged (`.sdlc/` is already ignored via `.git/info/exclude`)

## Non-goals
- Changing the old frontend system (`core-plugin-api`, `core-app-api`).
- Restructuring the bootstrap/finalize phase split.
- Making page routes known during bootstrap.

## Gate 0 outcome
Approved 2026-11-04. Auth mode: vendor (kept by user; ANTHROPIC_API_KEY unset in this session — user reports start check passed under vendor previously). Policy: argon4-plus-flash38. Write contract frozen: 17 allowlist, 38 off-limits patterns (incl. `.gitignore`).
