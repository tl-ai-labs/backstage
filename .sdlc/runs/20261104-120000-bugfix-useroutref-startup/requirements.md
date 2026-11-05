# Requirements Analysis — Bugfix: `useRouteRef` in App Root Elements Crashes During Startup

- **Run ID**: `20261104-120000-bugfix-useroutref-startup`
- **Mode**: brownfield
- **Intent**: bugfix

---

## Reproduce & Diagnose

### Reproduce
- **Symptom**: In the new frontend system, an app root element attached to `app/root.elements` (such as a banner) that calls `useRouteRef` while the app is starting up (during the bootstrap phase of `prepareSpecializedApp`) crashes by throwing `Error: No path for <routeRef>` when the target route ref's own path is known in the partial tree but an ancestor route ref's path is not yet registered. Furthermore, once the crash is prevented (or when the target route ref itself is deferred until finalization), the startup-rendered `app/root.elements` component never updates to receive the resolved route function after app finalization.
- **Reproducing test (must fail on current code)**: A new integration test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (under `describe('prepareSpecializedApp', ...)`) that renders a prepared app whose `app/root.elements` extension (e.g., a banner component) calls `useRouteRef` on a route ref that cannot be resolved during bootstrap (such as when an ancestor route path or target route is in a deferred subtree) and only becomes resolvable upon finalization. On the current code, rendering during startup either throws `No path for ...` or fails to resolve the link after finalization.

### Diagnose (Verified Against Codebase)
1. **Unregistered ancestor path throws in `resolveBasePath` (`packages/frontend-app-api/src/routing/RouteResolver.ts`)**:
   - **Confirmed**: During bootstrap, `createBootstrapApp` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`, lines 48–101) calls `instantiateAndInitializePhaseTree` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`, lines 241–279) with `stopAtAttachment: ({ node, input }) => isSessionBoundaryAttachment(node, input)` (stopping at `app/root.children`, line 204–206 of `treeLifecycle.tsx`) and `skipChild: options.skipBootstrapChild` (skipping `deferredRoots`, lines 526–528 of `prepareSpecializedApp.tsx`).
   - `extractRouteInfoFromAppNode` (`packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts`, lines 45–160) extracts `routePaths` and `routeParents` from the partially instantiated tree: if an ancestor node emitted a `routeRef` without a `routePath` (lines 119–136) while a descendant node emitted both a `routePath` and `routeRef` (lines 89–136), the descendant `targetRef` is present in `routePaths` with `routeParents` pointing to the ancestor `RouteRef`, whereas the ancestor `RouteRef` has no entry in `routePaths`.
   - In `packages/frontend-app-api/src/routing/RouteResolver.ts`, `RouteResolver.resolve` (lines 193–248) first calls `resolveTargetRef` (lines 42–87), which succeeds because `routePaths.get(ref)` is defined for `targetRef` (line 81). It then calls `resolveBasePath` (lines 92–164, invoked at lines 220–226).
   - In `resolveBasePath`, the ancestry loop (lines 113–133) walks `routeParents.get(targetSearchRef)` and prepends each unmatched ancestor `RouteRef` to `refDiffList` (line 132). Then at lines 150–161, `refDiffList.slice(0, -1).map(ref => ...)` looks up `const path = routePaths.get(ref)` (line 151) and at lines 152–154 throws `throw new Error(\`No path for \${ref}\`)` when `path === undefined`, instead of returning `undefined` so `RouteResolver.resolve` can return `undefined`.
2. **In-place proxy re-initialization and stale memoization in `useRouteRef` (`packages/frontend-app-api/src/wiring/phaseApis.tsx` & `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`)**:
   - **Confirmed**: `createPhaseApis` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`, lines 200–239) creates a single `RouteResolutionApiProxy` instance (lines 211–214) and registers it for `routeResolutionApiRef` (line 222).
   - During bootstrap, `instantiateAndInitializePhaseTree` (`phaseApis.tsx`, lines 274–277) calls `options.routeResolutionApi.initialize(routeInfo, options.routeRefsById.routes)`, which sets `this.#delegate = new RouteResolver(...)` in place on the `RouteResolutionApiProxy` instance (`phaseApis.tsx`, lines 144–160).
   - At finalization, `finalizeFromSessionState` (`packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`, lines 688–698) calls `clearFinalizationBoundaryInstances(options.tree)` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`, lines 171–198), which explicitly preserves `app/root.elements` instances (`if (node.spec.id === 'app/root' && input === 'elements') { continue; }`, lines 185–187), and then calls `instantiateAndInitializePhaseTree` again (`prepareSpecializedApp.tsx`, lines 689–698). This re-invokes `options.routeResolutionApi.initialize(...)` in place on the same `RouteResolutionApiProxy` object without notifying consumers.
   - In `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (lines 36–51), `useRouteRef` retrieves `const routeResolutionApi = useApi(routeResolutionApiRef)` (line 43) and computes `routeFunc` via `useMemo(() => routeResolutionApi.resolve(routeRef, { sourcePath: pathname }), [routeResolutionApi, routeRef, pathname])` (lines 45–48). Because `routeResolutionApi` is the exact same `RouteResolutionApiProxy` reference before and after finalization, `useMemo` does not recompute and the component in `app/root.elements` never re-renders or picks up the newly resolved route function.
   - **Differences from brief**: None. Both root causes in the brief's pre-investigation match the codebase at the exact files and line numbers cited above.

---

## In Scope

1. Update `resolveBasePath` and `RouteResolver.resolve` in `packages/frontend-app-api/src/routing/RouteResolver.ts` so that when any ancestor route ref in `refDiffList` has no registered path in `routePaths` (`routePaths.get(ref) === undefined`), `resolveBasePath` returns `undefined` (instead of throwing `No path for ${ref}`) and `RouteResolver.resolve` returns `undefined`.
2. Extend `RouteResolutionApi` in `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts` with an optional subscription/lifecycle mechanism (so existing implementations remain valid without breaking changes) allowing consumers to be notified when route resolution state changes.
3. Update `RouteResolutionApiProxy` in `packages/frontend-app-api/src/wiring/phaseApis.tsx` (and wiring in `prepareSpecializedApp.tsx` / `treeLifecycle.tsx` only if needed) to notify subscribed listeners when `initialize` is called (re-initializing the delegate `RouteResolver`).
4. Update `useRouteRef` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` to subscribe to the optional notification mechanism on `RouteResolutionApi` and re-resolve the route reference when the route resolution state updates, without causing infinite render loops.
5. Add unit and integration tests covering:
   - `packages/frontend-app-api/src/routing/RouteResolver.test.ts`: returning `undefined` when an ancestor route ref has no path in `routePaths`.
   - `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`: re-resolving when `RouteResolutionApi` notifies subscribers of updates, while remaining compatible with `RouteResolutionApi` implementations that do not implement the optional method.
   - `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`: reproducing integration test where an `app/root.elements` banner calls `useRouteRef` for a route that cannot be resolved during startup, renders without crashing (`useRouteRef` returns `undefined`), updates to render the resolved link after finalization, and keeps a bounded render count.
6. Regenerate API reports via `yarn build:api-reports` (`packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`, `packages/frontend-app-api/report.api.md`) and update TSDoc and documentation (`docs/frontend-system/architecture/36-routes.md`, `docs/frontend-system/building-apps/03-built-in-extensions.md`) as appropriate.
7. Add patch changesets in `.changeset/frontend-app-api-bootstrap-route-ref.md` (for `@backstage/frontend-app-api`) and `.changeset/frontend-plugin-api-route-ref-finalize.md` (for `@backstage/frontend-plugin-api`).

---

## Out of Scope

1. Any changes to the legacy frontend system (`packages/core-plugin-api/**`, `packages/core-app-api/**`, or other `core-*` packages).
2. Breaking changes to `useRouteRef` or `RouteResolutionApi` (any additions to `RouteResolutionApi` must be optional).
3. Refactoring how bootstrap and deferred trees are classified in `classifyBootstrapTree` (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`).
4. Modifying any off-limits files: `.env*`, `.mcp.json`, `node_modules/**`, `dist*/**`, `dist-types/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `docs/releases/**`, ESLint/Prettier/TypeScript configs, generated OpenAPI directories, and `.gitignore`.
5. Hand-editing API report files (`report*.api.md`) or running ESLint with `--fix`.

---

## Functional Requirements per Module

### Module: `@backstage/frontend-app-api` — Routing (`packages/frontend-app-api/src/routing/RouteResolver.ts`)
- **FR-1**: In `resolveBasePath` (`packages/frontend-app-api/src/routing/RouteResolver.ts`, lines 92–164), when iterating over ancestor route refs in `refDiffList.slice(0, -1)` (lines 150–161), if `routePaths.get(ref)` is `undefined`, `resolveBasePath` MUST return `undefined` instead of throwing `new Error(\`No path for \${ref}\`)`. (Parameterized ancestor paths where `path.includes(':')` MUST continue to throw `Cannot route to ${targetRef} with parent ${ref} as it has parameters`.)
- **FR-2**: In `RouteResolver.resolve` (`packages/frontend-app-api/src/routing/RouteResolver.ts`, lines 193–248), if `resolveBasePath` returns `undefined`, `resolve` MUST return `undefined`.

### Module: `@backstage/frontend-plugin-api` — Route Resolution API Definition (`packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts`)
- **FR-3**: `RouteResolutionApi` (`packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts`, lines 47–61) MUST be extended with an optional lifecycle or subscription method (with full TSDoc documentation) that allows callers to subscribe to changes in route resolution state and receive an unsubscribe callback (or equivalent non-breaking optional contract).

### Module: `@backstage/frontend-app-api` — Phase APIs (`packages/frontend-app-api/src/wiring/phaseApis.tsx`)
- **FR-4**: `RouteResolutionApiProxy` (`packages/frontend-app-api/src/wiring/phaseApis.tsx`, lines 113–165) MUST implement the optional subscription/notification contract from `RouteResolutionApi` and notify all active subscribers whenever `initialize(routeInfo, routeRefsById)` (lines 144–160) updates the underlying `#delegate` `RouteResolver`.

### Module: `@backstage/frontend-plugin-api` — `useRouteRef` Hook (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`)
- **FR-5**: `useRouteRef` (`packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, lines 36–51) MUST subscribe to `routeResolutionApi` updates (when the optional subscription method is present on `routeResolutionApi`) and re-evaluate `routeResolutionApi.resolve(routeRef, { sourcePath: pathname })` when notified, returning `undefined` while a route cannot be resolved during startup and returning the resolved `RouteFunc` once the app is finalized.
- **FR-6**: `useRouteRef` MUST work without error when provided a `RouteResolutionApi` implementation (such as a test mock or custom implementation) that only implements `resolve` and omits the optional subscription method.

### Module: Tests, API Reports, Documentation, and Changesets
- **FR-7**: `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` MUST include an integration test that renders a prepared app with an `app/root.elements` banner calling `useRouteRef` on a route ref unresolvable during bootstrap, verifying that:
  1. During bootstrap, `useRouteRef` returns `undefined` and the banner renders without throwing `No path for ...`.
  2. After finalization, the banner re-renders and displays the resolved link.
  3. The banner's render count remains bounded (no render loops).
- **FR-8**: `packages/frontend-app-api/src/routing/RouteResolver.test.ts` and `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx` MUST include unit tests covering unregistered ancestor route refs in `RouteResolver` and re-resolution upon `RouteResolutionApi` update notification in `useRouteRef`.
- **FR-9**: Public API reports (`packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`, `packages/frontend-app-api/report.api.md`) MUST be updated exclusively by running `yarn build:api-reports`, and documentation (`docs/frontend-system/architecture/36-routes.md` and/or `docs/frontend-system/building-apps/03-built-in-extensions.md`) and TSDoc comments MUST reflect the updated behavior/API.
- **FR-10**: Two patch changeset files MUST be created with adopter-facing descriptions:
  - `.changeset/frontend-app-api-bootstrap-route-ref.md` (`@backstage/frontend-app-api`: `patch`)
  - `.changeset/frontend-plugin-api-route-ref-finalize.md` (`@backstage/frontend-plugin-api`: `patch`)

---

## Non-Functional Requirements

- **NFR-1 (No Render Loops)**: Subscribing to `RouteResolutionApi` in `useRouteRef` and notifying listeners in `RouteResolutionApiProxy.initialize` MUST NOT cause infinite re-render loops; a startup-rendered component calling `useRouteRef` MUST render a bounded number of times across bootstrap and finalization.
- **NFR-2 (Backward Compatibility)**: There MUST be no breaking changes to `useRouteRef` or `RouteResolutionApi`. Any addition to `RouteResolutionApi` MUST be optional so existing implementations and test mocks continue to typecheck and function without modification.
- **NFR-3 (Code Style & Conventions)**: Changes MUST match each package's existing TypeScript and React conventions (`@backstage/frontend-app-api` and `@backstage/frontend-plugin-api`).
- **NFR-4 (License Headers)**: Any newly created source file MUST include the standard Backstage Apache 2.0 license header with the current year (`Copyright 2026 The Backstage Authors`).
- **NFR-5 (Tooling & Guardrails)**: API report files MUST only be updated via `yarn build:api-reports` (never hand-edited). Linting MUST NOT be run with `--fix`. `.gitignore` MUST NOT be modified. Open upstream PRs MUST NOT be looked up or read.
- **NFR-6 (Changesets & Docs)**: Changesets and documentation files listed in the brief MUST be accurate, clear for adopters, and pass all repo lint and type checks.

---

## PII Inventory

None. This bugfix operates purely on client-side route reference resolution metadata and React hook lifecycle within `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api`; no personally identifiable information (PII) is collected, stored, processed, or transmitted.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| None  | None        | N/A        |

---

## Role Matrix

Not applicable. Route reference resolution in the frontend wiring layer does not define or enforce authorization roles or resource access controls.

| Role | Resource | Action |
| ---- | -------- | ------ |
| N/A  | N/A      | N/A    |

---

## Acceptance Criteria

1. **AC-1**: A new integration test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` renders an app whose app root element (a banner attached to `app/root.elements`) calls `useRouteRef` on a route ref that cannot be resolved during startup. Before the fix it fails with `No path for ...`. After the fix:
   - The banner renders during bootstrap without throwing.
   - After finalization, it shows the correct resolved link.
   - It does not keep re-rendering (render count stays bounded).
2. **AC-2**: During startup (and whenever a route ref or any of its ancestor route refs has no registered path yet), `useRouteRef` and `RouteResolver.resolve` return `undefined` instead of throwing `No path for <routeRef>`.
3. **AC-3**: The run's test command passes when executed verbatim:
   ```sh
   CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports
   ```
4. **AC-4**: The API reports (`packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`, `packages/frontend-app-api/report.api.md`) match the final public API as generated by `yarn build:api-reports`, and any new API is documented in TSDoc and in `docs/frontend-system/architecture/36-routes.md` and `docs/frontend-system/building-apps/03-built-in-extensions.md`.
5. **AC-5**: Patch changesets `.changeset/frontend-app-api-bootstrap-route-ref.md` (`@backstage/frontend-app-api`) and `.changeset/frontend-plugin-api-route-ref-finalize.md` (`@backstage/frontend-plugin-api`) exist and describe the fix in clear language for adopters.

---

## Open Questions for HITL

None. The root causes, reproduction scenario, scope boundaries, and acceptance criteria are fully specified and verified against the codebase.
