# Requirements — bugfix — useRouteRef in app root elements before finalization

Run: `20261031-120000-bugfix-approot-routeref` · intent: `bugfix` (reproduce + diagnose) · source: `intent_brief.md` (approved at Gate 0) · revision 3 (Gate 1 revise, 2026-10-31; only FR-1 and AC-7 changed from revision 2)

Binding run constraint: do not look at upstream PR backstage/backstage#36008, its merge commit, or the `master` / `origin/master` branch (no `gh pr view/diff` on #36008, no `git show/log/diff` against master), and do not base the design on that PR's file list. Work out the fix only from this branch's code and the brief. Reading issue #35932's description is allowed. This binds every phase, every packet, and every delegated agent, the Gemini agent worker included.

## Reproduction

1. Build a specialized app (`createSpecializedApp`) with a sign-in page, so the app goes through a bootstrap phase and then finalization.
2. Add an `app/root.elements` extension whose component calls `useRouteRef` for a route ref that is bound to a page route (a page extension under `app/routes`), and calls the returned function during render (for example, to build a link).
3. Render the app. Between sign-in and finalization, the root element renders against the bootstrap tree.
4. Observed: the legacy hook (`@backstage/core-plugin-api`) throws `No path for routeRef{type=...,id=...}`, and an extension error box replaces the element. The new-system hook (`@backstage/frontend-plugin-api`) returns `undefined` and keeps returning it after finalization until the pathname changes.

## Diagnosis (traced on this branch; the architect verifies it against the code)

- D-1. The bootstrap tree is built only up to the session boundary (`createBootstrapApp` in `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`, `stopAtAttachment` with `isSessionBoundaryAttachment`), so the bootstrap route resolution knows no page routes.
- D-2. At finalization (`prepareSpecializedApp.tsx`, `instantiateAndInitializePhaseTree`), `RouteResolutionApiProxy.initialize` (`phaseApis.tsx`) swaps the delegate inside the same proxy object. The API object's identity does not change.
- D-3. `clearFinalizationBoundaryInstances` deliberately keeps the `app/root.elements` instances, so root elements are not remounted at finalization.
- D-4. Both `useRouteRef` hooks memoize on `[routeResolutionApi, routeRef, pathname]`. None of these change at finalization, so the stale result from bootstrap sticks.
- D-5. The legacy hook turns that `undefined` into `throw new Error(\`No path for ${routeRef}\`)` for non-optional refs. The `routeRef{type=sub,id=…}` string in #35932 is the legacy `SubRouteRef.toString()`, so the reported crash comes from this hook.
- D-6. Both hooks get the same object from `useApi(routeResolutionApiRef)`: `routeResolutionApiRef` is defined in `@backstage/frontend-plugin-api`, and core-plugin-api imports it from there. During a new-system app's lifetime, that object is the `RouteResolutionApiProxy`. `@internal/frontend` is inlined into each consuming package, so module-level state there is not shared between packages, and core-plugin-api does not import it. The proxy object is the only thing both hooks already reach.

## In scope

1. Make route resolution in already-mounted components react to the app's finalization, so that both hooks re-resolve once page routes are known.
2. Make the legacy `useRouteRef` (core-plugin-api) return a callable value, not throw, during bootstrap for a non-optional ref that cannot be resolved yet (FR-3), and return the real link after finalization.
3. Make the new-system `useRouteRef` (frontend-plugin-api) return the real link after finalization, with no pathname change.
4. A reproducing test in `createSpecializedApp.test.tsx` that covers both hooks, plus focused hook tests where needed.
5. A changeset for the published packages whose code changes, and a docs update in `docs/frontend-system/architecture/10-app.md` that describes the new behavior. Both are always required.

## Out of scope

1. Changing how the bootstrap tree is built (it still stops at the session boundary). Page routes are not made available during bootstrap.
2. Remounting root elements at finalization.
3. Any change to `packages/core-compat-api/**` (off-limits).
4. Any change outside the frozen allowlist in `intent_brief.md`.

## Functional requirements

- **FR-1 (one shared finalization signal).** The signal lives on the route resolution API object that both hooks already get from `useApi(routeResolutionApiRef)`, as optional members of `RouteResolutionApi` (in `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts`). It has two parts: a way to tell whether the API is still in bootstrap, and a way to subscribe to the change at finalization (with an unsubscribe). `RouteResolutionApiProxy` implements both.

  Bootstrap ends, and the signal fires, only on finalization. On this branch, all three call sites below reach `RouteResolutionApiProxy.initialize` through `instantiateAndInitializePhaseTree`:
  - `treeLifecycle.tsx:72`: startup, the bootstrap tree. This initialize must not end bootstrap or fire the signal.
  - `prepareSpecializedApp.tsx:689`: normal finalization. It ends bootstrap and fires the signal.
  - `prepareSpecializedApp.tsx:758`: finalization after a bootstrap error. It ends bootstrap and fires the signal.

  The signal fires at most once for the life of the API object, even when both finalization paths run. The 758 path can run after 689 has already initialized the resolver, and that second finalization must not fire the signal again. The signal does not live in module-level state in `@internal/frontend`, because each package inlines its own copy, and core-plugin-api does not import it. No new required members: an implementation that lacks the optional members (`CompatRouteResolutionApi` in core-compat-api, and any adopter implementation) is treated as already finalized, with no change events. For those implementations, behavior is exactly as it is today.
- **FR-2 (new-system hook re-resolves).** `useRouteRef` in `packages/frontend-plugin-api` subscribes to the FR-1 signal and re-runs resolution when it fires. A component mounted during bootstrap then gets the real `RouteFunc` after finalization, with no pathname change and no remount. Its return contract is unchanged: `RouteFunc | undefined`, with `undefined` during bootstrap for a ref that is not yet resolvable.
- **FR-3 (legacy hook during bootstrap: exact return value).** While the API reports bootstrap, `useRouteRef` in `packages/core-plugin-api` does not throw for a non-optional ref that does not resolve. Instead it returns a placeholder `RouteFunc`. Calling it with any params returns the empty string `''` and never throws. A banner that calls the result during render therefore renders, with a link that points nowhere until finalization. Optional external refs keep returning `undefined`, as today. Once the API reports finalized, the hook returns the real `RouteFunc`. If a non-optional ref still cannot be resolved after finalization, it throws `No path for …` as it does today. When the API has no FR-1 members (treated as finalized), today's throw is kept.
- **FR-4 (legacy hook re-resolves).** The legacy hook subscribes to the same FR-1 signal and re-resolves when it fires, as in FR-2. Both hooks observe one signal on one object.
- **FR-5 (no render loops).** The subscription renders only when the signal fires: at most one extra render per mounted hook at finalization, and none at all when the API lacks the FR-1 members or is already finalized at mount. A component that mounts after finalization, or during finalization, must not miss the change (check the state after subscribing). Unsubscribe on unmount. React 17 and 18 are both supported, so `useSyncExternalStore` is not used directly. Follow the in-package pattern of `useTranslationRef`.
- **FR-6 (unchanged behavior outside the bootstrap window).** Apps without a sign-in or bootstrap phase, legacy apps (no new route resolution API), and refs that resolve at once behave exactly as before.

## Non-functional requirements

- **NFR-1.** No breaking change to any public API. `RouteResolutionApi` gets optional members only. No member becomes required.
- **NFR-2.** New source files carry the Apache 2.0 header with the year 2026. Existing headers keep their year. Each file's existing style is matched.
- **NFR-3.** Tests: fewer, thorough tests. Use React Testing Library with `screen` and `findBy*`, not `waitFor`, and add no test IDs.
- **NFR-4.** The changeset is a new `.changeset/*.md`, written for adopters, with no internal symbol names. It names only the packages whose published code changes. Each package gets the bump the repo rules require. Packages below 1.0 (`@backstage/frontend-plugin-api` 0.18.x, `@backstage/frontend-app-api` 0.16.x) get `patch`, both for the fix and for new optional API members. `@backstage/core-plugin-api` (1.12.x) gets `patch` for the fix, or `minor` if its public API gains anything new. Use separate changesets where packages need different messages or bump types.
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

- **AC-1 (reproducing test, both hooks).** `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` renders `app/root.elements` elements that call `useRouteRef` for a page route, through both `@backstage/core-plugin-api` and `@backstage/frontend-plugin-api`. Each element calls the result during render. The test covers two states:
  - Before finalization (bootstrap, sign-in pending): neither element throws and no error box appears. The legacy element renders with the FR-3 placeholder (`''`), and the new-system element renders its "not yet resolved" state.
  - After finalization: both elements show the page's real path, with no pathname change.
  
  Each hook's case fails on the code before the fix: the legacy case on the bootstrap throw, and the new-system case on the link that stays unresolved after finalization.
- **AC-2.** `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports` exits 0.
- **AC-3.** `CI=true yarn test packages/core-plugin-api` exits 0.
- **AC-4 (no render loop).** A test shows that each hook's component renders a bounded number of times across finalization: at most one extra render caused by the signal. It also shows that a hook used with an API lacking the FR-1 members causes no extra render.
- **AC-5.** One or more `.changeset/*.md` files cover every published package whose code changed, with the bumps NFR-4 requires and adopter-facing wording.
- **AC-6 (docs).** `docs/frontend-system/architecture/10-app.md` describes the new behavior:
  - App root elements render before the app is finalized, before page routes are known.
  - During that time, the new-system `useRouteRef` returns `undefined`, and the legacy hook returns a link function that returns an empty string.
  - Both update to the real link once the app is finalized.
  
  The update follows `docs/contribute/doc-style-guide.md`.
- **AC-7 (bootstrap-error path).** A test covers finalization after a bootstrap error (the `prepareSpecializedApp.tsx:758` path). A root element that calls `useRouteRef` and is mounted during bootstrap re-resolves when that path finalizes the app, and it does not throw. The test also asserts that the finalization signal fires exactly once, both when the error path is the only finalization and when it runs after the normal finalization (689). It asserts as well that the startup initialize (`treeLifecycle.tsx:72`) leaves the API in bootstrap and fires nothing.

## Open questions for HITL

None.
