# Requirements — bugfix — app root elements crash on useRouteRef during startup

Run: `20261029-182121-bugfix-userouteref-startup` · intent: bugfix (reproduce + diagnose) · package: `@backstage/frontend-app-api`

## Reproduction

1. Build a specialized app (`createSpecializedApp` / `prepareSpecializedApp`) with:
   - a page extension attached under `app/root.children` (for example via `app/routes`) that outputs
     `coreExtensionData.routePath` (`/foo`) and `coreExtensionData.routeRef` (`fooRouteRef`);
   - an extension attached to `app/root.elements` whose component calls `useRouteRef(fooRouteRef)`
     (the `@backstage/core-plugin-api` hook, which throws `No path for routeRef{...}` when the resolver
     returns `undefined`) and renders a link to the result.
2. Render the bootstrap element (`getBootstrapApp().element`).
3. Observed: rendering throws `No path for routeRef{...}`. With the `@backstage/frontend-plugin-api`
   hook the element instead gets `undefined` and keeps it after finalization.

## Diagnosis (verified against the code at HEAD `2e8b88268c8a`)

- `createBootstrapApp` (`wiring/treeLifecycle.tsx`) calls `instantiateAndInitializePhaseTree` with
  `stopAtAttachment` on `app/root.children`, so nodes under that input have no instance during bootstrap.
- `instantiateAndInitializePhaseTree` (`wiring/phaseApis.tsx`) then calls `extractRouteInfoFromAppNode`,
  which reads `routePath` / `routeRef` only from `node.instance`. The deferred page routes are therefore
  missing from `routePaths` / `routeParents`, and `RouteResolver.resolve` returns `undefined` for them.
- `app/root.elements` instances are rendered in bootstrap and preserved through finalization
  (`clearFinalizationBoundaryInstances` skips that input). At finalization the proxy's delegate is replaced
  (`RouteResolutionApiProxy.initialize`), but the proxy object itself is the same API instance, so a
  `useMemo` keyed on the API (as in `useRouteRef`) does not recompute: the preserved element keeps the
  bootstrap result even after finalization.

## In scope

1. Make route resolution during bootstrap return a working route function for route refs whose page lives
   under the deferred `app/root.children` subtree, or otherwise make startup not crash.
2. Ensure the preserved `app/root.elements` element resolves the correct link once the app is finalized.
3. A reproducing test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`.
4. One patch changeset for `@backstage/frontend-app-api`.

## Out of scope

1. Changes to `useRouteRef` in `@backstage/core-plugin-api` or `@backstage/frontend-plugin-api`.
2. Changing the bootstrap/finalization boundary or which extensions render during bootstrap.
3. The old frontend system (`@backstage/core-app-api`).
4. Public API changes to `@backstage/frontend-app-api` (no API report changes).

## Functional requirements

- **FR-1** During bootstrap, `routeResolutionApi.resolve(ref)` for a route ref attached by a page under
  `app/root.children` must not return `undefined` solely because that subtree is deferred; it must produce
  the same path the finalized app would produce for it when the page's path and ref do not depend on
  finalization-only state. (A page that is later disabled by a predicate is not required to resolve at
  bootstrap either way.)
- **FR-2** After finalization, an `app/root.elements` element that resolved a route ref during bootstrap
  must render the link the finalized resolver produces (no stale bootstrap resolution).
- **FR-3** Route resolution for refs already resolvable during bootstrap, and the finalized route
  objects / app tree route info, must be unchanged.
- **FR-4** A patch changeset for `@backstage/frontend-app-api` describes the fix in adopter terms, without
  code symbols.

## Non-functional requirements

- **NFR-1** Minimal change confined to the allowlisted files; match the package's existing style.
- **NFR-2** No new public exports; `report*.api.md` unchanged.
- **NFR-3** No new files except the changeset (any new source file would need the Apache 2.0 header).

## PII inventory

None. The change touches client-side route resolution only.

## Role matrix

Not applicable: no authorization surface changes.

## Acceptance criteria

- **AC-1** A new test in `createSpecializedApp.test.tsx` renders the bootstrap app with an
  `app/root.elements` extension that calls `useRouteRef` for a page route mounted under `app/root.children`.
  It fails on the current code (throws `No path for routeRef`, or renders no link) and passes after the fix.
- **AC-2** In the same test, after finalization the element renders the correct link (`/foo`) for the route.
- **AC-3** `CI=1 yarn test packages/frontend-app-api/src/wiring` and
  `CI=1 yarn test packages/frontend-app-api/src/routing` pass.
- **AC-4** A patch changeset for `@backstage/frontend-app-api` exists under `.changeset/`.

## Open questions for HITL

None blocking. The fix direction (spec-level route extraction for the deferred subtree versus a fresh
resolver identity at finalization, or both) is decided in the change spec.
