# Requirements — bugfix — App root elements crash on useRouteRef during startup

Run: `20261031-162121-bugfix-approot-routeref` · Job: bugfix · Issue: backstage/backstage#35932 · HEAD `554df45cad`

## Reproduce

1. Create a specialized app (`createSpecializedApp`) with a page extension that has a `routeRef`, and a root
   element attached to `app/root` → `elements` whose component calls `useRouteRef` for that page's ref and
   renders the resulting link.
2. Render the app. During bootstrap, the root element renders before page routes are known.
3. Observed: through the `@backstage/core-plugin-api` `useRouteRef` (the old-system bridge), the element
   throws `No path for routeRef{...}` and an extension error box replaces it. Through the
   `@backstage/frontend-plugin-api` `useRouteRef`, the hook returns `undefined` during bootstrap and keeps
   returning `undefined` after finalization, because the result is never recomputed.
4. Expected: the element renders during startup without an error box. Once the app is finalized, the hook
   returns a function that produces the page's path.

## Diagnosis (verified by reading the code at HEAD)

- D-1 `createBootstrapApp` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`) instantiates the tree
  only up to the session boundary. Through `instantiateAndInitializePhaseTree`
  (`packages/frontend-app-api/src/wiring/phaseApis.tsx`), it then calls `RouteResolutionApiProxy.initialize`
  with route info pulled from that partial tree, so page refs under `app/root` → `children` have no path.
- D-2 `clearFinalizationBoundaryInstances` keeps the bootstrap instances of `app/root` → `elements`, so the
  rendered root elements survive into the finalized app.
- D-3 At finalization, `RouteResolutionApiProxy.initialize` is called again on the same proxy object. Its
  identity does not change, and it does not notify anyone.
- D-4 The `frontend-plugin-api` `useRouteRef` memoizes on `[routeResolutionApi, routeRef, pathname]`, so a
  value computed during bootstrap is never recomputed after finalization.
- D-5 The `core-plugin-api` `useRouteRef` bridge throws `No path for ${routeRef}` when the new API returns
  `undefined` for a required ref. That is the reported crash.

## In scope

1. Re-resolving `useRouteRef` (in both `frontend-plugin-api` and the `core-plugin-api` bridge) when the app's
   route information changes between bootstrap and finalization.
2. Not crashing root elements during startup when a page route ref cannot be resolved yet.
3. A reproducing test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`.
4. Changesets for every changed published package, the regenerated API reports, and the docs for the
   behavior where app root elements are documented.

## Out of scope

1. Changing which parts of the tree are instantiated at bootstrap, or moving `app/root` → `elements` behind
   the session boundary.
2. The legacy frontend system (`core-app-api` `RouteResolver`) beyond the `core-plugin-api` bridge hook.
3. Behavior for refs that are truly unbound: once the app is finalized, these still return `undefined`
   (new API, or an optional ref) or throw the existing `No path for` error (a required ref through the bridge).

## Functional requirements

- FR-1 Route resolution notifies its consumers when its route information changes (re-initialization at
  finalization), without changing what `resolve` returns for a given route information.
- FR-2 The `frontend-plugin-api` `useRouteRef` re-resolves the ref when the route information changes, and
  returns the finalized link without needing a remount.
- FR-3 The `core-plugin-api` `useRouteRef` bridge re-resolves the same way. While the app has not been
  finalized, it does not throw `No path for` for a ref that is unresolved only because its route is not
  known yet. After finalization, a required ref that still has no path throws exactly as before.
- FR-4 Re-resolving causes no render loop: each change in route information causes at most one extra
  render per hook consumer.
- FR-5 Any addition to the public `RouteResolutionApi` stays backward compatible: an existing implementation
  (for example a test mock in `@backstage/frontend-test-utils` or an adopter's own) that lacks the addition
  keeps working, and the hooks fall back to today's behavior for it.

## Non-functional requirements

- NFR-1 No new dependencies. Use React primitives that already exist in the packages (for example
  `useSyncExternalStore` from `react`, or state plus effect), matching each package's React peer range.
- NFR-2 New source files carry the Apache 2.0 header with year 2026. Existing headers stay unchanged.
- NFR-3 Changesets are written directly in `.changeset/`. Use a patch bump for packages below 1.0. For a
  package at 1.0 or above, the bump follows `CLAUDE.md` (patch for a fix, minor if a new public API is added).
- NFR-4 API reports are regenerated with `yarn build:api-reports` only, never edited by hand.

## PII inventory

None. The change touches client-side routing only.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| —     | —           | —          |

## Role matrix

Not applicable. There is no authorization surface; route resolution is the same for every user.

## Acceptance criteria

- AC-1 A new test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` renders a root
  element attached to `app/root` → `elements`. The element calls `useRouteRef` for a page route. The test
  asserts that the element renders during startup without an error box, and that after finalization the
  rendered link resolves to the page's path. The test fails at HEAD and passes with the fix.
- AC-2 During startup, the root element renders without an extension error box, through both the
  `frontend-plugin-api` hook and the `core-plugin-api` bridge.
- AC-3 After finalization, `useRouteRef` returns the correct link, with no render loop (FR-4).
- AC-4 `CI=1 yarn test packages/frontend-app-api packages/frontend-plugin-api packages/core-plugin-api` passes.
- AC-5 `yarn tsc` passes, `yarn lint` passes, and `yarn build:api-reports` leaves the reports consistent.
- AC-6 A changeset covers each changed published package.

## Open questions for HITL

- Q-1 Should the fix add an optional subscription member to the public `RouteResolutionApi` interface
  (an API report change in `frontend-plugin-api`), or keep the notification internal to `frontend-app-api`
  (for example a versioned value the hooks read)? The architect will pick one and record the choice as a
  decision; if it adds a public member, Gate 2 opens.
