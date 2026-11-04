# Requirements — Bugfix: App Root Elements Crash or Return Stale `undefined` on `useRouteRef` During Phased Startup

## In scope

1. Fix route resolution across phased app startup (`prepareSpecializedApp`) in `@backstage/frontend-app-api` (`packages/frontend-app-api/src/**`) and `@backstage/frontend-plugin-api` (`packages/frontend-plugin-api/src/**`) so that app root elements (`app/root.elements`) calling `useRouteRef` for a page route behind `app/root.children` render without error during bootstrap and automatically re-resolve to the concrete route path once the app is finalized.
2. Ensure `useRouteRef` updates across app finalization without causing an unbounded render loop (root elements must re-render a bounded number of times across finalization).
3. Preserve backwards compatibility on `RouteResolutionApi` by not adding any new required member to the `RouteResolutionApi` interface (since `CompatRouteResolutionApi` in `packages/core-compat-api` implements `RouteResolutionApi` and is outside scope).
4. Add a reproducing integration test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` that uses `prepareSpecializedApp` with an `app/root.elements` extension calling `useRouteRef` for a page route mounted behind `app/root.children`, switches from the bootstrap element to the finalized element inside a single mounted React root (never two separate `render` calls), fails on the unchanged branch, and passes with the fix.
5. Add or update unit tests in `packages/frontend-plugin-api/src/**` covering any updated `useRouteRef` behavior and any lifecycle or route resolution API additions.
6. Regenerate affected API report files within the allowlist (`packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`) exclusively via `yarn build:api-reports` (never hand-edited).
7. Update documentation (`docs/frontend-system/architecture/10-app.md`, `docs/frontend-system/architecture/36-routes.md`, and/or TSDoc comments on public exports) to describe any new or changed behavior or API.
8. Add new changeset file(s) (`.changeset/*.md`) written for adopters (with no internal symbol names) covering each modified published package (`@backstage/frontend-app-api` at `0.16.x` and `@backstage/frontend-plugin-api` at `0.18.x`, using `patch` for bug fixes or non-breaking API additions, `minor` only for breaking changes).

## Out of scope

1. Modifying the legacy `useRouteRef` implementation in `@backstage/core-plugin-api` (`packages/core-plugin-api/**`).
2. Modifying the compatibility layer in `@backstage/core-compat-api` (`packages/core-compat-api/**`, including `CompatRouteResolutionApi` in `ForwardsCompatProvider.tsx`).
3. Changing how the bootstrap tree splits at the `app/root.children` session boundary or instantiating page extensions before sign-in completes.
4. Modifying `@backstage/frontend-defaults` (`packages/frontend-defaults/**`), `plugins/app/**`, or example apps.
5. Modifying `.changeset/README.md`, `.gitignore`, `docs/releases/**`, `docs/reference/**`, `.yarn/**`, ESLint, Prettier, or TypeScript configuration files, or any file outside the brief's allowlist.

## Reproduction

### Scenario

1. An application is prepared using phased initialization via `prepareSpecializedApp` in `@backstage/frontend-app-api`.
2. An app root element extension attached to `app/root` (`input: 'elements'`, e.g., a global announcement banner) renders during the bootstrap phase (between sign-in and finalization) and calls `useRouteRef(pageRouteRef)` targeting a page extension mounted behind the `app/root.children` session boundary.
3. A single React root mounts the bootstrap element (`preparedApp.getBootstrapApp().element`) and subsequently updates to render the finalized element (`finalizedApp.element`) in place when finalization completes (matching the behavior of `PreparedAppRoot` in `packages/frontend-defaults/src/createApp.tsx`, without unmounting the React root or calling `render` a second time).

### Observed vs. Expected Behavior

- **Observed**:
  - During bootstrap, page extensions behind `app/root.children` are not instantiated yet, so their routes are not registered in the bootstrap `RouteResolver`.
  - In the old system (`@backstage/core-plugin-api`), a non-optional `useRouteRef` call when the route resolves to `undefined` throws `"No path for routeRef{...}"`, causing an extension error boundary box to render in place of the root element.
  - In the new frontend system (`@backstage/frontend-plugin-api`), `useRouteRef` returns `undefined` during bootstrap, and when the app transitions to the finalized element within the same React root, `useRouteRef` continues returning the stale `undefined` value instead of resolving the finalized page path.
- **Expected**:
  - The `app/root.elements` component renders without error during bootstrap (`useRouteRef` returns `undefined` while page routes behind `app/root.children` are not yet mounted).
  - Once the app is finalized and the React tree transitions from the bootstrap element to the finalized element within the same React root, `useRouteRef` in the preserved `app/root.elements` component re-evaluates and returns a working `RouteFunc` that resolves the concrete link path for the page route, without triggering render loops.

## Diagnosis

Analysis of the branch's code identifies four interacting factors that produce the bug:

1. **Bootstrap tree stops at `app/root.children` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`)**:
   `createBootstrapApp` invokes `instantiateAndInitializePhaseTree` with `stopAtAttachment: ({ node, input }) => isSessionBoundaryAttachment(node, input)`, which stops tree instantiation at `app/root.children`. Consequently, page extensions attached behind `app/root.children` have no `AppNodeInstance` during the bootstrap phase.
2. **Root elements preserve their bootstrap instances across finalization (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`)**:
   During finalization, `clearFinalizationBoundaryInstances(tree)` clears instances on `tree.root` and `app/root` to re-instantiate the boundary, but explicitly skips `node.spec.id === 'app/root' && input === 'elements'`. Thus, `app/root.elements` nodes retain their bootstrap React elements and remain mounted across the bootstrap-to-finalized transition when rendered inside a single React root.
3. **Single `RouteResolutionApiProxy` with unchanged object identity (`packages/frontend-app-api/src/wiring/phaseApis.tsx` and `prepareSpecializedApp.tsx`)**:
   `createPhaseApis` creates a single `RouteResolutionApiProxy` instance for the entire lifetime of the prepared app. During `createBootstrapApp`, `instantiateAndInitializePhaseTree` extracts route info from instantiated nodes only (`extractRouteInfoFromAppNode`)—which excludes all routes behind `app/root.children`—and calls `routeResolutionApi.initialize(...)`. At finalization (`finalizeFromSessionState`), `instantiateAndInitializePhaseTree` extracts the full route info and calls `routeResolutionApi.initialize(...)` again, swapping the private `#delegate` inside `RouteResolutionApiProxy` without changing the `routeResolutionApi` proxy reference itself.
4. **Memoization in `useRouteRef` never invalidates on phase transition (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`)**:
   `useRouteRef` computes `routeFunc` via `useMemo(() => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }), [routeResolutionApi, routeRef, pathname])`. Because `routeResolutionApi` (the `RouteResolutionApiProxy` instance), `routeRef`, and `pathname` all have identical references before and after finalization, React never recomputes the memoized `undefined` result in root elements that mounted during bootstrap, and nothing triggers those components to re-resolve once finalization initializes the full route table.

## Functional requirements per module

### Module: `@backstage/frontend-app-api` (`packages/frontend-app-api/src/**`)

- **FR-1**: `RouteResolutionApiProxy` (or a coordinated phase lifecycle / subscription mechanism in `packages/frontend-app-api/src/wiring/`) MUST notify active consumers when `routeResolutionApi.initialize(...)` updates the underlying route resolver at app finalization.
- **FR-2**: During the bootstrap phase of `prepareSpecializedApp`, `routeResolutionApi.resolve(...)` MUST safely return `undefined` for routes that are not yet instantiated behind `app/root.children`, and MUST resolve those routes to their concrete paths after finalization completes.
- **FR-3**: `app/root.elements` instances MUST continue to be preserved across finalization as designed in `clearFinalizationBoundaryInstances`, while any `useRouteRef` hooks inside those elements automatically update to return the resolved `RouteFunc` once finalization finishes.

### Module: `@backstage/frontend-plugin-api` (`packages/frontend-plugin-api/src/**`)

- **FR-4**: `useRouteRef` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` MUST subscribe to or otherwise observe route resolution / app phase updates so that when route information is re-initialized upon finalization, `useRouteRef` recomputes and returns the updated `RouteFunc<TParams> | undefined`.
- **FR-5**: `RouteResolutionApi` in `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts` MUST NOT gain any new required interface members, so external implementations such as `CompatRouteResolutionApi` in `packages/core-compat-api/src/compatWrapper/ForwardsCompatProvider.tsx` remain type-compatible without modification. Any new member on `RouteResolutionApi` (if used) MUST be optional, or notification MUST be handled via an optional method or separate API/mechanism.
- **FR-6**: `useRouteRef` MUST remain free of render loops across finalization; when route resolution state transitions from bootstrap to finalized, `useRouteRef` MUST cause at most a bounded re-render to deliver the newly resolved `RouteFunc`.

### Module: Tests (`packages/frontend-app-api` & `packages/frontend-plugin-api`)

- **FR-7**: A new test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` MUST use `prepareSpecializedApp` with an `app/root.elements` extension that calls `useRouteRef` for a page route mounted behind `app/root.children`.
- **FR-8**: The reproducing test in `createSpecializedApp.test.tsx` MUST transition from the bootstrap element (`getBootstrapApp().element`) to the finalized element (`finalizedApp.element`) inside a single mounted React root (e.g., via state update or `rerender` on the same root, matching `PreparedAppRoot` in `packages/frontend-defaults/src/createApp.tsx`), NEVER via two separate `render(...)` calls.
- **FR-9**: The reproducing test MUST assert that:
  1. The root element renders during bootstrap without throwing an error.
  2. Once finalized, `useRouteRef` in the root element resolves to the expected page path.
  3. The root element renders a bounded number of times across finalization (no render loop).
- **FR-10**: The reproducing test MUST fail on the unchanged branch prior to the fix and pass with the fix applied.

### Module: API Reports, Documentation, and Changesets

- **FR-11**: API reports (`packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`) MUST be kept in sync by running `yarn build:api-reports` (never hand-edited), and no API report outside the allowlist may be modified.
- **FR-12**: Documentation in `docs/frontend-system/architecture/10-app.md`, `docs/frontend-system/architecture/36-routes.md`, and/or TSDoc comments MUST be updated to reflect any new or changed behavior or public API.
- **FR-13**: New changeset file(s) in `.changeset/*.md` MUST be created for each changed published package (`@backstage/frontend-app-api` and/or `@backstage/frontend-plugin-api`), written for adopters without internal symbol names, and using the appropriate pre-1.0 semver bump (`patch` for bug fixes or non-breaking additions on `0.16.x` / `0.18.x`; `minor` only if breaking).

## Non-functional requirements

- **NFR-1 (Bounded Re-renders / No Render Loops)**: Across bootstrap and finalization, root elements calling `useRouteRef` MUST re-render a bounded number of times and MUST NOT enter an infinite render or effect loop.
- **NFR-2 (Strict File Scope Compliance)**: Only files matching the allowlist in the brief (`packages/frontend-app-api/src/**`, `packages/frontend-plugin-api/src/**`, `packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`, `docs/frontend-system/architecture/10-app.md`, `docs/frontend-system/architecture/36-routes.md`, `.changeset/*.md`) may be created or modified. All off-limits files (including `packages/core-plugin-api/**`, `packages/core-compat-api/**`, `packages/frontend-defaults/**`, `plugins/app/**`, `.changeset/README.md`, `.gitignore`, etc.) MUST remain untouched.
- **NFR-3 (License Headers)**: Any newly created source files MUST include the standard Backstage Apache 2.0 license header with copyright year `2026`.
- **NFR-4 (Verification & Quality Gates)**: The fixed verification command `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports` MUST exit 0 with all test suites passing, zero TypeScript errors across the monorepo, zero lint errors, and clean API report generation.

## PII inventory

None. This bugfix operates exclusively on in-memory frontend extension tree wiring and client-side route resolution metadata; no PII is collected, processed, stored, or transmitted.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| None  | N/A         | N/A        |

## Role matrix

Not applicable. Frontend route reference resolution (`useRouteRef`) and phased app tree wiring (`prepareSpecializedApp`) do not define or enforce authorization roles or resource access controls.

| Role | Resource | Action |
| ---- | -------- | ------ |
| N/A  | N/A      | N/A    |

## Acceptance criteria

- **AC-1**: A new test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` uses `prepareSpecializedApp` with a root element (`app/root.elements`) that calls `useRouteRef` for a page route mounted behind `app/root.children`. It renders the root element before and after finalization and asserts that it renders without an error and that the link resolves to the page's path once the app is finalized. The test switches from the bootstrap element to the finalized element inside one React root (as `PreparedAppRoot` in `packages/frontend-defaults/src/createApp.tsx` does), not with two separate `render` calls: a second `render` remounts the root element and would hide a stale link.
- **AC-2**: That test fails on the unchanged branch and passes after the fix.
- **AC-3**: No render loop: the root element re-renders a bounded number of times across finalization.
- **AC-4**: Test command passes (the BS-BF-08 study's fixed command, used word for word): `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports`.
- **AC-5**: Changesets cover each changed published package with the correct bump, and docs describe any new or changed behavior or API.

## Open questions for HITL

None. The reproduction, root cause, file scope, constraints, and acceptance criteria are fully specified in the intent brief and verified against the branch's code.
