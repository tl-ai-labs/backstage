# Requirements — Bugfix: App root elements crash or fail to resolve `useRouteRef` during startup (`20261104-170616-bugfix-routeref-startup`)

## In scope

1. **IS-1**: Ensure app root elements (`AppRootElementBlueprint` / extensions attached to `{ id: 'app/root', input: 'elements' }`) that call `useRouteRef` for a page route render during the bootstrap phase without crashing with `No path for routeRef`.
2. **IS-2**: Ensure `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`) re-evaluates and returns the resolved `RouteFunc` once app finalization initializes `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`) with the finalized route tree, even when the root element remains mounted across bootstrap and finalization and `pathname` does not change.
3. **IS-3**: Narrow any route-resolution handling so it only prevents app root elements from crashing before finalization; `RouteResolver`'s (`packages/frontend-app-api/src/routing/RouteResolver.ts:153`) existing throw behavior for callers after the app is finalized must stay as it is.
4. **IS-4**: Add a reproducing regression test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` that renders an app root element calling `useRouteRef` for a page route both before and after finalization, fails on the unpatched code, and passes after the fix, plus unit tests in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` (and `packages/frontend-app-api/src/routing/RouteResolver.test.ts` if `RouteResolver.ts` is touched).
5. **IS-5**: Update API reports (`packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`) and documentation (`docs/frontend-system/architecture/36-routes.md`, `docs/frontend-system/building-apps/03-built-in-extensions.md`) if public API or documented behavior changes, and add hand-written `patch` changesets under `.changeset/*.md` for `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api`.
6. **IS-6**: Stay strictly within the allowlisted files in scope:
   - `packages/frontend-app-api/src/wiring/phaseApis.tsx`
   - `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`
   - `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`
   - `packages/frontend-app-api/src/routing/RouteResolver.ts`
   - `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`
   - `packages/frontend-app-api/src/routing/RouteResolver.test.ts`
   - `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
   - `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`
   - `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts`
   - `packages/frontend-plugin-api/src/apis/definitions/index.ts`
   - `packages/frontend-plugin-api/src/apis/index.ts`
   - `packages/frontend-app-api/report.api.md`
   - `packages/frontend-plugin-api/report.api.md`
   - `packages/frontend-plugin-api/report-alpha.api.md`
   - `docs/frontend-system/architecture/36-routes.md`
   - `docs/frontend-system/building-apps/03-built-in-extensions.md`
   - `.changeset/*.md`

## Out of scope

1. **OOS-1**: Changing the legacy frontend system packages (`@backstage/core-plugin-api`, `@backstage/core-app-api`).
2. **OOS-2**: Restructuring the bootstrap/finalize phase split in `prepareSpecializedApp` (`packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`) or `treeLifecycle` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`).
3. **OOS-3**: Instantiating `app/root.children` or making page routes known during the bootstrap phase before sign-in and predicate resolution complete.
4. **OOS-4**: Modifying any off-limits files, including `.env*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `docs/releases/**`, ESLint/Prettier/TypeScript configuration files, `.gitignore`, or generated OpenAPI directories.

## Reproduction

### Exact steps to reproduce

1. Configure a new-frontend-system app via `prepareSpecializedApp` (as used by `createApp` in `packages/frontend-defaults/src/createApp.tsx:123-132` and tested in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`) with:
   - `@backstage/plugin-app` (`appPluginOriginal`), which defines `app/root` (`plugins/app/src/extensions/AppRoot.tsx:62-146`) and `app/routes` (`plugins/app/src/extensions/AppRoutes.tsx:61-118`, attached under `app/layout` -> `app/root` `children`).
   - A page extension (e.g. `PageBlueprint` or an extension attached to `{ id: 'app/routes', input: 'routes' }`) that outputs `coreExtensionData.routePath('/my-page')` and `coreExtensionData.routeRef(pageRouteRef)`.
   - An app root element (created via `AppRootElementBlueprint` or attached to `{ id: 'app/root', input: 'elements' }`) that renders a React component calling `useRouteRef(pageRouteRef)` to construct a link to the page route.
2. Obtain and render the bootstrap app element via `const bootstrapApp = preparedApp.getBootstrapApp(); render(bootstrapApp.element);` (the phase rendered while sign-in or async predicate loading is in progress).
3. Finalize the app (`preparedApp.finalize()` or `preparedApp.onFinalized(...)`) and render the finalized element (`finalizedApp.element`).

### Observed error and failure behavior

- **During bootstrap**: Because `createBootstrapApp` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx:72-84`) stops tree instantiation at `app/root` `children` (`isSessionBoundaryAttachment` at `treeLifecycle.tsx:204-206`), page extensions under `app/routes` are not instantiated yet. `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:269-277`) is initialized from the bootstrap tree alone, where no page routes exist.
  - When `RouteResolver.resolve` (`packages/frontend-app-api/src/routing/RouteResolver.ts:150-154`) traverses `refDiffList` before finalization for a route whose ancestor `RouteRef` has no path in the bootstrap `routePaths`, it throws `Error: No path for routeRef{...}` at `RouteResolver.ts:153`, causing `ExtensionBoundary` (`packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx:32`) to catch the error and fail the extension.
  - When a root element or test asserts that `useRouteRef(pageRouteRef)` resolves (or when called via `@backstage/core-plugin-api`'s `useRouteRef` bridge at `packages/core-plugin-api/src/routing/useRouteRef.tsx:115-131`), `routeResolutionApi.resolve(pageRouteRef)` returns `undefined`, throwing `Error: No path for routeRef{...}`.
- **After finalization**: When finalization completes, `RouteResolutionApiProxy.initialize` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:144-160`) replaces `this.#delegate` with a new `RouteResolver` containing the page routes. However, `clearFinalizationBoundaryInstances` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx:185-187`) preserves `app/root` `elements` instances across bootstrap and finalization, and `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx:45-48`) memoizes `routeResolutionApi.resolve(routeRef, { sourcePath: pathname })` on `[routeResolutionApi, routeRef, pathname]`. Because `routeResolutionApi` is the same `RouteResolutionApiProxy` instance, `routeRef` is unchanged, and `pathname` is unchanged, `useRouteRef` never re-runs or invalidates its memoized `undefined` result, so the link remains unresolved (`undefined` / `No path for routeRef`) even after the app is finalized.

## Diagnosis

### Verified root causes in code

1. **Bootstrap tree excludes `app/root.children` while instantiating `app/root.elements`**:
   - In `packages/frontend-app-api/src/wiring/treeLifecycle.tsx:72-84`, `createBootstrapApp` calls `instantiateAndInitializePhaseTree` with `stopAtAttachment: ({ node, input }) => isSessionBoundaryAttachment(node, input)`.
   - `isSessionBoundaryAttachment` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx:204-206`) returns `true` for `node.spec.id === 'app/root' && input === 'children'`.
   - `AppRoot` (`plugins/app/src/extensions/AppRoot.tsx:136-138, 288, 301`) renders `inputs.elements` (`extraElements`) immediately during bootstrap, whereas `inputs.children` (`app/layout` -> `app/routes` -> page extensions) is not instantiated until finalization.
   - `instantiateAndInitializePhaseTree` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:269-278`) calls `extractRouteInfoFromAppNode` (`packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts:45-160`), which reads `current.instance?.getData(coreExtensionData.routePath)` (lines 69-71) and `current.instance?.getData(coreExtensionData.routeRef)` (line 73). Because page extensions under `app/root.children` have `current.instance === undefined` during bootstrap, `routeInfo.routePaths` contains no page routes.

2. **`RouteResolutionApiProxy` mutates `#delegate` in place without notifying consumers**:
   - `createPhaseApis` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:211-214, 222`) registers a single `RouteResolutionApiProxy` instance in `phaseApiRegistry`.
   - During bootstrap (`treeLifecycle.tsx:72-84`) and again during finalization (`prepareSpecializedApp.tsx:689-698`), `instantiateAndInitializePhaseTree` (`phaseApis.tsx:274-277`) calls `options.routeResolutionApi.initialize(routeInfo, options.routeRefsById.routes)`.
   - `RouteResolutionApiProxy.initialize` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:144-160`) overwrites `this.#delegate = new RouteResolver(...)` (lines 148-156) on the same `RouteResolutionApiProxy` instance without any subscription or version/revision notification mechanism.

3. **`clearFinalizationBoundaryInstances` preserves `app/root.elements` and `useRouteRef` memoizes exclusively on `[routeResolutionApi, routeRef, pathname]`**:
   - In `packages/frontend-app-api/src/wiring/treeLifecycle.tsx:183-187`, `clearFinalizationBoundaryInstances` explicitly skips `node.spec.id === 'app/root' && input === 'elements'`, so bootstrap-mounted `app/root` element nodes keep their `AppNodeInstance` and React element references across finalization.
   - In `packages/frontend-plugin-api/src/routing/useRouteRef.tsx:42-50`:
     ```ts
     const { pathname } = useLocation();
     const routeResolutionApi = useApi(routeResolutionApiRef);

     const routeFunc = useMemo(
       () => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }),
       [routeResolutionApi, routeRef, pathname],
     );
     ```
     Because `routeResolutionApi` is the same `RouteResolutionApiProxy` object reference before and after finalization, `routeRef` is the same reference, and `pathname` does not change when finalization completes, `useRouteRef` has no signal to trigger a re-render or recompute `useMemo` when `RouteResolutionApiProxy.initialize` replaces `#delegate`.

4. **Pre-finalization route resolution for root elements vs. post-finalization `RouteResolver` behavior**:
   - Before finalization, `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:113-165`) is initialized with only the partial bootstrap tree where page routes under `app/root.children` do not yet have paths in `routePaths`, while after finalization `RouteResolver` (`packages/frontend-app-api/src/routing/RouteResolver.ts:150-161`) has the complete finalized route tree and intentionally throws `new Error(\`No path for ${ref}\`)` at `RouteResolver.ts:153` if an ancestor `RouteRef` in `refDiffList` lacks a path. Any fix must only prevent app root elements from crashing before finalization, while keeping `RouteResolver`'s existing throw behavior for callers after finalization unchanged.

## Functional requirements per module

### Module: `@backstage/frontend-app-api` (`phaseApis.tsx`, `RouteResolver.ts`, `prepareSpecializedApp.tsx`, `treeLifecycle.tsx`)

- **FR-1**: `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx:113-165`) must expose a mechanism (e.g., an observable/subscription or `useSyncExternalStore`-compatible subscribe/snapshot contract) that notifies subscribers whenever `initialize(routeInfo, routeRefsById)` (`phaseApis.tsx:144-160`) updates `#delegate`, without changing the `RouteResolutionApiProxy` instance identity in `ApiHolder`.
- **FR-2**: When `RouteResolutionApiProxy.initialize` is called during finalization (`packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx:689-698`, `phaseApis.tsx:274-277`), all active subscribers must be notified once so hooks observing route resolution re-evaluate against the newly initialized `RouteResolver` delegate.
- **FR-3**: Ensure app root elements calling `useRouteRef` before finalization do not crash with `No path for <ref>`, while keeping `RouteResolver`'s (`packages/frontend-app-api/src/routing/RouteResolver.ts:153`) existing throw behavior for callers after the app is finalized unchanged.

### Module: `@backstage/frontend-plugin-api` (`useRouteRef.tsx`, `RouteResolutionApi.ts`)

- **FR-4**: `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx:36-51`) must subscribe to route resolution state changes (when supported by the `RouteResolutionApi` implementation, such as `RouteResolutionApiProxy`) so that when routes are initialized or updated on finalization, `useRouteRef` re-renders the consuming component and re-invokes `routeResolutionApi.resolve(routeRef, { sourcePath: pathname })`.
- **FR-5**: During bootstrap (before page routes under `app/root.children` are instantiated), `useRouteRef` called from an `app/root` element for a page route must return `undefined` without throwing an error, and once finalization completes, `useRouteRef` must return the resolved `RouteFunc` that produces the target page path.
- **FR-6**: `useRouteRef` must remain backward-compatible with mock or custom `RouteResolutionApi` implementations in tests (e.g., `{ resolve }` passed via `TestApiProvider` in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx:66,88`) that only implement `resolve(...)`.

### Module: Tests, Docs, API Reports, and Changesets

- **FR-7**: Add a regression test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` that renders an `app/root` element calling `useRouteRef` for a page route before finalization (asserting it renders without crashing) and after finalization (asserting `useRouteRef` resolves to the expected page path and that render count is bounded).
- **FR-8**: Add unit tests in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` (and `packages/frontend-app-api/src/routing/RouteResolver.test.ts` if `RouteResolver.ts` is touched) covering re-resolution on route initialization updates while preserving `RouteResolver`'s existing post-finalization throw behavior.
- **FR-9**: If public types in `@backstage/frontend-plugin-api` or `@backstage/frontend-app-api` change, update the API reports via `yarn build:api-reports` (`packages/frontend-app-api/report.api.md`, `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`), and update `docs/frontend-system/architecture/36-routes.md` / `docs/frontend-system/building-apps/03-built-in-extensions.md` if needed.
- **FR-10**: Create hand-written `patch` changeset files in `.changeset/*.md` for `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api` using adopter-facing language without internal symbol names.

## Non-functional requirements

- **NFR-1 (No render loops)**: Subscribing `useRouteRef` to `RouteResolutionApiProxy` updates must not cause infinite or redundant re-renders. An app root element calling `useRouteRef` must render a bounded number of times across bootstrap and finalization (at most once per phase transition / location pathname change), and must not re-render when `pathname`, `routeRef`, and the underlying route resolver state have not changed.
- **NFR-2 (Preserve bootstrap/finalize phase split)**: The fix must not alter the bootstrap/finalize phase split in `prepareSpecializedApp.tsx` and `treeLifecycle.tsx`. `app/root.children` must remain deferred until finalization, and `app/root.elements` must continue to preserve their bootstrap instances across finalization (`treeLifecycle.tsx:185-187`).
- **NFR-3 (Referential stability of `RouteFunc`)**: `useRouteRef` must continue to memoize the returned `RouteFunc` so that changes to URL search (`?foo=bar`) or hash (`#foo`) parameters without a `pathname` or route table change do not re-resolve `routeResolutionApi.resolve` (preserving all existing assertions in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx:126-208`).
- **NFR-4 (Repository conventions & headers)**:
  - Any new `.ts` / `.tsx` source files must include the standard Backstage Apache 2.0 license header with year `2026`.
  - Copyright years on existing files must not be modified.
  - Tests must follow Backstage testing conventions: prefer few thorough tests, use React Testing Library `screen` and `findBy*` over `waitFor`, and do not introduce `data-testid` attributes.
  - Changesets must use `patch` bump level and be written in clear adopter-facing prose without internal class/function symbol names.
  - ESLint, Prettier, TypeScript configuration files, and `docs/releases/**` must never be modified.

## PII inventory

None. This bugfix operates purely on in-memory frontend route references, route path strings, and React component lifecycle wiring; no personal or sensitive data is processed, stored, or transmitted.

| Field | Sensitivity | Protection |
| --- | --- | --- |
| None | N/A | N/A |

## Role matrix

N/A. Frontend route reference resolution in `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api` does not define or enforce RBAC roles or permissions.

| Role | Resource | Action |
| --- | --- | --- |
| N/A | N/A | N/A |

## Acceptance criteria

1. **AC-1**: A test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` renders an app root element (`app/root` `elements` input / `AppRootElementBlueprint`) that calls `useRouteRef` for a page route both before and after finalization, verifies that bootstrap rendering succeeds without throwing `"No path for routeRef"`, and asserts that after finalization the link resolves to the page's configured path; this test fails on the current unpatched code and passes after the fix.
2. **AC-2**: The app root element calling `useRouteRef` renders a bounded number of times across bootstrap and finalization (verified by an explicit render-count assertion in tests, ensuring no render loops).
3. **AC-3**: Existing and new unit tests in `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` and `packages/frontend-app-api/src/routing/RouteResolver.test.ts` pass, including verification that `useRouteRef` does not re-resolve when only search or hash parameters change, re-resolves when the route resolution state updates, and `RouteResolver`'s existing throw behavior after finalization remains intact.
4. **AC-4**: The verification command `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports` exits with code 0 with no TypeScript, lint, or API report drift errors.
5. **AC-5**: Hand-written `patch` changeset files exist in `.changeset/` covering `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api` in adopter-facing language without internal symbol names, and documentation is updated if behavior or public API changed.

## Open questions for HITL

None. The reproduction, root cause, files in scope, and acceptance criteria are fully specified and verified against the codebase.
