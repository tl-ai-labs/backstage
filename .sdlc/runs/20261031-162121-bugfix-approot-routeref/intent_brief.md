# Intent Brief — bugfix — App root elements crash on useRouteRef during startup

## Context

In the new frontend system, app root elements are components attached to the `elements` input of `app/root`, such as a global announcement banner. They render between sign-in and app finalization, before page routes are known. A root element that calls `useRouteRef` for a page route throws `No path for routeRef`, and the app shows an extension error box in place of the banner. Reported in backstage/backstage#35932.

Diagnosis from reading the code at HEAD `554df45cad`:

- `createBootstrapApp` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`) instantiates the tree only up to the session boundary (`app/root` → `children`). It then initializes `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`) with route info pulled from that partial tree, so page route refs under `app/root` children have no path.
- `clearFinalizationBoundaryInstances` deliberately keeps the bootstrap instances of `app/root` → `elements`. The rendered root elements therefore survive into the finalized app.
- The new `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`) memoizes on `[routeResolutionApi, routeRef, pathname]`. The proxy object never changes identity when it is re-initialized at finalization, so a result computed during bootstrap is never recomputed.
- Plugins on the old frontend system go through the `core-plugin-api` `useRouteRef` bridge, which throws `No path for ${routeRef}` when a required ref resolves to `undefined`. That is the reported crash.

## Goal

Root elements that call `useRouteRef` for a page route render without crashing during startup. Once the app is finalized, `useRouteRef` returns the correct link, with no render loops.

## Files in scope

- `packages/frontend-app-api/src/wiring/phaseApis.tsx`: route resolution proxy; may notify subscribers when it re-initializes.
- `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`
- `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`
- `packages/frontend-app-api/src/routing/**`: resolver and route info, if needed.
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`: the reproducing test (required for a bugfix run).
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `useRouteRef.test.tsx`: re-resolve when the app's route info changes.
- `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts`: a possible lifecycle or subscription addition to the API.
- `packages/core-plugin-api/src/routing/useRouteRef.tsx`: the bridge that throws; it may need to re-resolve the same way.
- `docs/frontend-system/building-apps/03-built-in-extensions.md`: the app root elements section, and the routing docs if the behavior is documented there.
- `.changeset/<new>.md`: patch changesets for the affected published packages.
- API reports (`packages/*/report*.api.md`): regenerated with `yarn build:api-reports` only, never hand-edited.

## Files off-limits

- AI and agent config: `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`
- Env files: `.env`, `.env.*`
- Dependencies, build output and tooling: `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `.git/**`
- Protected docs and config: `docs/releases/**`, ESLint, Prettier and TS config files
- Other: `**/__fixtures__/**`, `**/knip-report.md`, `**/catalog-info.yaml`
- Everything else not listed in scope.

## Acceptance criteria

1. A new `createSpecializedApp` test renders a root element attached to `app/root` → `elements`. The element calls `useRouteRef` for a page route both before and after finalization, and the test asserts that the link resolves to the correct path. The test fails at HEAD and passes with the fix.
2. During startup, the root element renders without an extension error box.
3. After finalization, `useRouteRef` returns the correct link without render loops.
4. `CI=1 yarn test packages/frontend-app-api packages/frontend-plugin-api packages/core-plugin-api` passes.
5. `yarn tsc` passes, `yarn lint` passes, and the API reports are regenerated and consistent.
6. A changeset covers each changed published package.

## Non-goals

- Changing which parts of the tree are instantiated at bootstrap, or moving `app/root` elements behind the session boundary.
- Fixing the legacy frontend system (`core-app-api` `RouteResolver`), beyond the `core-plugin-api` bridge hook.
- Changing behavior for refs that are truly unbound. These keep returning `undefined`, or throw the existing error once the app is finalized.

## Gate 0 decision

The scope above was approved on 2026-10-31 and frozen by `write-contract.mjs`.

- Policy: `opus55-plus-flash38` (per-run override)
- Auth: `estimated`
- Test command: `CI=1 yarn test packages/frontend-app-api packages/frontend-plugin-api packages/core-plugin-api`, then `yarn tsc`, `yarn lint` and `yarn build:api-reports`.
