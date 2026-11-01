# Intent Brief — bugfix — App root elements crash on useRouteRef during startup

## Context

Reported: in the new frontend system, app root elements that call `useRouteRef` during startup crash with "No path for routeRef".

Findings from reading the code (not yet reproduced by a test):

- `createApp` renders the bootstrap app first. The bootstrap tree stops at `app/root.children`, so the route info built for it has no plugin page routes (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`, `phaseApis.tsx`).
- `app/root.elements` are rendered during bootstrap, and they keep their bootstrap instances through finalization (`clearFinalizationBoundaryInstances`).
- For a route behind that boundary, `RouteResolver.resolve` returns `undefined`.
- The `@backstage/core-plugin-api` `useRouteRef` turns `undefined` into `No path for ...` for any non-optional ref (`packages/core-plugin-api/src/routing/useRouteRef.tsx:131`). This is the likely crash site. Legacy plugins and legacy components hosted in the new system use this hook.
- The `@backstage/frontend-plugin-api` `useRouteRef` returns `undefined` instead of throwing, but memoizes on a proxy whose identity never changes, so the value stays `undefined` after finalization until the pathname changes.
- `RouteResolver.ts:153` throws the same message in a separate parent-path case, not on this path.

Upstream state: `upstream/master` already has `AppLifecycleApi` (a650c4f97d12, 0caa8966ca0f), which fixes the stale `undefined` in the `frontend-plugin-api` hook. The `core-plugin-api` hook there is unchanged, so the crash path is still present upstream.

Gate 0 decisions: base B, stay on the current base with no fast-forward. `AppLifecycleApi` does not exist here, and the upstream code must not be cherry-picked, so the fix uses its own signal and will need reconciling with upstream later. `.gitignore` stays unchanged, so `.sdlc/` is not ignored; the final report must note this. Only `report.api.md` is allowlisted in the four packages; `report-alpha.api.md` is not.

## Goal

An app root element can call `useRouteRef` during startup without crashing, whichever hook it uses, and gets a working route function once the app is finalized.

## Files in scope

Implementation:
- `packages/core-plugin-api/src/routing/useRouteRef.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/frontend-plugin-api/src/apis/definitions/**` (only if the lifecycle signal needs defining here)
- `packages/frontend-app-api/src/wiring/phaseApis.tsx`, `prepareSpecializedApp.tsx`, `treeLifecycle.tsx`
- `packages/core-compat-api/src/compatWrapper/**` (only if the compat route bridge needs changing)

Tests (the reproducing test must fail on the bug first):
- `packages/core-plugin-api/src/routing/useRouteRef.test.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`

Companions:
- `.changeset/*.md` (new or updated)
- `docs/frontend-system/architecture/10-app.md`
- `packages/core-plugin-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-app-api/report.api.md`, `packages/core-compat-api/report.api.md` (regenerated only, via `yarn build:api-reports`)

## Files off-limits

- Project defaults from `.sdlc/project.json`
- AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`
- `docs/releases/**`, `**/CHANGELOG.md`, `.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`
- Generated: `dist-types/**`, `packages/*/dist/**`, `plugins/*/dist/**`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`

## Acceptance criteria

1. A test with an `AppRootElementBlueprint` element calling the `core-plugin-api` `useRouteRef` with a non-optional ref to a page behind `app/root.children` fails with "No path for" before the fix.
2. After the fix, that element renders during bootstrap without an error, with and without a sign-in page.
3. After finalization, without a pathname change, that element holds a route function that returns the correct path, for both the `core-plugin-api` and `frontend-plugin-api` hooks.
4. A non-optional ref that is still unresolved after finalization keeps throwing `No path for ...`, so real wiring errors stay visible, including the `extensions.tsx` mount point check in `core-plugin-api`.
5. `useRouteRef` behaviour in legacy apps (`packages/app-legacy` style, routing context only) is unchanged.
6. `CI=1 yarn test` passes on the touched paths, and `yarn tsc` passes.

## Non-goals

- Instantiating routes behind `app/root.children` during bootstrap.
- Changing which extensions are deferred at bootstrap.
- Changes to `RouteResolver` parent-path handling.
- Migrating callers away from the `core-plugin-api` hook.
