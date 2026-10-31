# Requirements — bugfix — useRouteRef in app root elements before finalization

Run: `20261031-120000-bugfix-approot-routeref` · intent: `bugfix` (reproduce + diagnose) · source: `intent_brief.md` (approved at Gate 0)

Binding run constraint: do not look at upstream PR backstage/backstage#36008, its merge commit, or the `master` / `origin/master` branch (no `gh pr view/diff` on #36008, no `git show/log/diff` against master), and do not base the design on that PR's file list. Work out the fix only from this branch's code and the brief. Reading issue #35932's description is allowed. This binds every phase, every packet, and every delegated agent, the Gemini agent worker included.

## Reproduction

1. Build a specialized app (`createSpecializedApp`) with a sign-in page, so the app goes through a bootstrap phase and then finalization.
2. Add an `app/root.elements` extension whose component calls `useRouteRef` for a route ref that is bound to a page route (a page extension under `app/routes`).
3. Render the app. Between sign-in and finalization, the root element renders against the bootstrap tree.
4. Observed: the legacy hook (`@backstage/core-plugin-api`) throws `No path for routeRef{type=...,id=...}`, and an extension error box replaces the element. With the new-system hook (`@backstage/frontend-plugin-api`), the hook returns `undefined` and keeps returning it after finalization until the pathname changes.

## Diagnosis (traced on this branch; the architect verifies it against the code)

- D-1. The bootstrap tree is built only up to the session boundary (`createBootstrapApp` in `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`, `stopAtAttachment` with `isSessionBoundaryAttachment`), so the bootstrap route resolution knows no page routes.
- D-2. At finalization (`prepareSpecializedApp.tsx`, `instantiateAndInitializePhaseTree`), `RouteResolutionApiProxy.initialize` (`phaseApis.tsx`) swaps the delegate inside the same proxy object. The API object's identity does not change.
- D-3. `clearFinalizationBoundaryInstances` deliberately keeps the `app/root.elements` instances, so root elements are not remounted at finalization.
- D-4. Both `useRouteRef` hooks memoize on `[routeResolutionApi, routeRef, pathname]`. None of these change at finalization, so the stale result from bootstrap sticks.
- D-5. The legacy hook turns that `undefined` into `throw new Error(\`No path for ${routeRef}\`)` for non-optional refs. The `routeRef{type=sub,id=…}` string in #35932 is the legacy `SubRouteRef.toString()`, so the reported crash comes from this hook.

## In scope

1. Make route resolution in already-mounted components react to the app's finalization, so that hooks re-resolve once page routes are known.
2. Make the legacy `useRouteRef` (core-plugin-api) not throw during bootstrap for a ref that cannot be resolved yet, and resolve it after finalization.
3. Make the new-system `useRouteRef` (frontend-plugin-api) return the real link after finalization without a pathname change.
4. A reproducing test in `createSpecializedApp.test.tsx`, plus focused hook tests where needed.
5. A changeset for the published packages whose code changes, and a docs note in `docs/frontend-system/architecture/10-app.md` if adopter-visible behavior changes.

## Out of scope

1. Changing how the bootstrap tree is built (still stops at the session boundary). Page routes are not made available during bootstrap.
2. Remounting root elements at finalization.
3. Any change to `packages/core-compat-api/**` (off-limits).
4. Any change outside the frozen allowlist in `intent_brief.md`.

## Functional requirements

- **FR-1 (finalization signal).** Route resolution exposes a way for a consumer to learn that the set of resolvable routes changed (finalization). It must be backward compatible with existing `RouteResolutionApi` implementations (including `CompatRouteResolutionApi` in core-compat-api): any new member is optional, or the signal lives on a separate API or in the private `@internal/frontend` package. A new public API is acceptable only if the internal route cannot carry the signal.
- **FR-2 (new-system hook re-resolves).** `useRouteRef` in `packages/frontend-plugin-api` re-runs resolution when the finalization signal fires, so a component mounted during bootstrap gets the real `RouteFunc` after finalization, with no pathname change and no remount.
- **FR-3 (legacy hook does not throw during bootstrap).** `useRouteRef` in `packages/core-plugin-api` does not throw `No path for …` for a non-optional ref while the app is still in bootstrap (before finalization). Once finalized, it returns the real link. After finalization, a ref that still cannot be resolved keeps today's behavior (throws for a non-optional ref).
- **FR-4 (legacy hook re-resolves).** The legacy hook also re-resolves when the finalization signal fires, as in FR-2.
- **FR-5 (no render loops).** The subscription must not trigger renders when nothing changed, and must not cause repeated renders. It works on React 17 and 18 (no direct `useSyncExternalStore`; follow the in-package pattern of `useTranslationRef`).
- **FR-6 (unchanged behavior outside the bootstrap window).** Apps without a sign-in or bootstrap phase, legacy apps (no new route resolution API), and refs that resolve at once behave exactly as before.

## Non-functional requirements

- **NFR-1.** No breaking change to any public API. The `RouteResolutionApi` interface stays compatible: no new required members.
- **NFR-2.** New source files carry the Apache 2.0 header with the year 2026. Existing headers keep their year. Each file's existing style is matched.
- **NFR-3.** Tests: fewer, thorough tests. Use React Testing Library with `screen` and `findBy*`, not `waitFor`, and add no test IDs.
- **NFR-4.** The changeset is a new `.changeset/*.md` with `patch` bumps, written for adopters with no internal symbol names. It names only the packages whose published code changes.
- **NFR-5.** API reports are regenerated by `yarn build:api-reports`, never hand-edited. Core-plugin-api's reports change only if its public API changes.
- **NFR-6.** Never run `yarn build`, `yarn changesets version` or `yarn release`. Run `yarn prettier --write` only on changed files.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| None. The change touches client-side routing state only. | — | — |

## Role matrix

| Role | Resource | Action |
|---|---|---|
| Not applicable. The change has no authorization surface. | — | — |

## Acceptance criteria

- **AC-1 (reproducing test).** A test in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` renders an `app/root.elements` element that calls `useRouteRef` for a page route, both before finalization (bootstrap, sign-in pending) and after it. It asserts that the element renders during bootstrap (no error box, no throw) and that, after finalization, the link resolves to the page's path. Before the fix this test fails.
- **AC-2.** `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports` exits 0.
- **AC-3.** `CI=true yarn test packages/core-plugin-api` exits 0.
- **AC-4.** No render loop: the reproducing test (or a hook test) shows the root element renders a bounded number of times across finalization.
- **AC-5.** A `.changeset/*.md` file covers every published package whose code changed, with `patch` bumps and adopter-facing wording.

## Open questions for HITL

None blocking. The architect chooses where the finalization signal lives (FR-1) from this branch's code: preferably `@internal/frontend`, otherwise an optional member or a separate API.
