# Requirements — Bound Root-Element Route-Ref Render Count Test

## In scope

1. Update the single test `"should resolve page route refs in app root elements after finalization without render loops"` in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` to replace the exact post-finalization render count assertion (`expect(renderCount).toBe(2)`) with an upper-bound assertion of at most 3 (`expect(renderCount).toBeLessThanOrEqual(3)`).
2. Preserve the pre-finalization assertions in that test verifying that the route ref is initially unresolved (`expect(screen.getByText('Root link: unresolved')).toBeInTheDocument()`) and that the initial bootstrap render count is 1 (`expect(renderCount).toBe(1)`).
3. Preserve the post-finalization assertion in that test verifying that the page route ref resolves to `/my-page` (`expect(screen.getByText('Root link: /my-page')).toBeInTheDocument()`).
4. Pass the full verification suite (`CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports`) with 434 of 434 tests passing.

## Out of scope

1. Any changes to production source code under `packages/**` or `plugins/**` (including the earlier route-ref startup resolution fix).
2. Any changes to other test cases in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` or any other test files in the repository.
3. Creating, editing, or deleting any changeset files under `.changeset/**` (including `.changeset/routeref-startup-resolution.md`).
4. Any modifications to `report*.api.md` files produced by `yarn build:api-reports`.
5. Any modifications to configuration, build tooling, dependencies, or AI/editor configuration files.

## Functional requirements per module

### Module: `packages/frontend-app-api` (`src/wiring/createSpecializedApp.test.tsx`)

- **FR-1 (Pre-finalization unresolved route-ref coverage)**: The test `"should resolve page route refs in app root elements after finalization without render loops"` must assert that rendering `preparedApp.getBootstrapApp().element` before finalization displays `"Root link: unresolved"` (`expect(screen.getByText('Root link: unresolved')).toBeInTheDocument()`), proving that deferred page routes are not prematurely resolved during bootstrap.
- **FR-2 (Pre-finalization render count coverage)**: The test must assert that `RootElement` renders exactly once during bootstrap before finalization (`expect(renderCount).toBe(1)`).
- **FR-3 (Post-finalization route-ref resolution coverage)**: The test must assert that after calling `preparedApp.finalize()` and `rerender(finalizedApp.element)` inside `act(...)`, `useRouteRef(pageRouteRef)` in `RootElement` resolves and renders `"Root link: /my-page"` (`expect(screen.getByText('Root link: /my-page')).toBeInTheDocument()`).
- **FR-4 (Post-finalization render-loop bound coverage)**: The test must replace `expect(renderCount).toBe(2)` after finalization with an upper-bound assertion of at most 3 (`expect(renderCount).toBeLessThanOrEqual(3)`), allowing the expected 3 total renders across bootstrap, rerender, and route-resolution update while still failing if a render loop occurs (`renderCount > 3`).

## Non-functional requirements

- **NFR-1 (Strict diff containment)**: Only `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (and within it, only the post-finalization `renderCount` assertion in `"should resolve page route refs in app root elements after finalization without render loops"`) may be modified.
- **NFR-2 (Test conventions and determinism)**: The assertion must use standard Jest matchers (`toBeLessThanOrEqual(3)`) and existing React Testing Library conventions (`render`, `rerender`, `screen`, `act`) with deterministic synchronous execution.
- **NFR-3 (Type safety, lint, and API report compliance)**: The workspace must pass `yarn tsc`, `yarn lint:all`, and `yarn build:api-reports` with zero errors and no uncommitted `report*.api.md` changes.

## PII inventory

None. This change modifies a unit test render-count assertion and processes no personally identifiable information.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| None  | None        | N/A        |

## Role matrix

Not applicable. This change is a unit test assertion update with no user roles, permissions, or access-control resources.

| Role | Resource | Action |
| ---- | -------- | ------ |
| N/A  | N/A      | N/A    |

## Acceptance criteria

1. **AC-1**: In `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`, the test `"should resolve page route refs in app root elements after finalization without render loops"` retains `expect(screen.getByText('Root link: unresolved')).toBeInTheDocument()` and `expect(renderCount).toBe(1)` before finalization.
2. **AC-2**: In `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`, the same test retains `expect(screen.getByText('Root link: /my-page')).toBeInTheDocument()` after finalization and asserts `expect(renderCount).toBeLessThanOrEqual(3)` instead of `expect(renderCount).toBe(2)`.
3. **AC-3**: Executing the Gate 0 acceptance command verbatim succeeds with exit code 0 and 434 of 434 tests passing:
   ```bash
   CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports
   ```
4. **AC-4**: `git diff --name-only` shows only `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` modified (no source files, no other tests, no `.changeset/**` files, and no `report*.api.md` files changed).

## Open questions for HITL

None.
