# Requirements: bugfix, app root elements crash on `useRouteRef` during startup

Run: `20261101-131558-bugfix-userouteref-startup`. Base: the current commit, with no fetch, merge or
rebase. Form: reproduce + diagnose.

## Observed behaviour

In the new frontend system, an `app/root.elements` element that calls `useRouteRef` during startup
crashes with `No path for <routeRef>`.

## Diagnosis (hypothesis until the reproducing test confirms it)

No test has reproduced this yet; the chain below comes from reading the code. The reproducing test
decides whether it holds.

1. `createApp` renders `getBootstrapApp().element` first and swaps to `finalizedApp.element` once
   `onFinalized` fires (`packages/frontend-defaults/src/createApp.tsx`).
2. `createBootstrapApp` instantiates the tree with `stopAtAttachment` at `app/root.children`
   (`treeLifecycle.tsx`), so `extractRouteInfoFromAppNode` sees no plugin page routes and the
   `RouteResolver` built by `RouteResolutionApiProxy.initialize` (`phaseApis.tsx`) has no path for them.
3. `resolve` returns `undefined` for such a ref. It does not throw, because the proxy's delegate is set.
4. `@backstage/core-plugin-api` `useRouteRef` treats `undefined` from the route resolution API as a
   wiring error for any non-optional ref and throws `No path for ...`
   (`packages/core-plugin-api/src/routing/useRouteRef.tsx`). This is the suspected crash site.
5. `@backstage/frontend-plugin-api` `useRouteRef` returns `undefined` and memoizes on
   `[routeResolutionApi, routeRef, pathname]`. `clearFinalizationBoundaryInstances` skips
   `app/root.elements`, so the element keeps its bootstrap instance. The proxy's identity never changes
   when `initialize` swaps its delegate at finalization, so the memo stays `undefined` until the
   pathname changes. The same stale memo exists in the core hook.
6. Compat path: an element under `compatWrapper` also reaches `routeResolutionApi` through
   `LegacyRoutingProvider` (`BackwardsCompatProvider.tsx`), so the core hook's two memos both depend on
   the same proxy.

`RouteResolver.ts:153`, which throws the same message in a parent-path case, is not on this path and
is not changed.

## In scope

1. A reproducing test that fails on the current code for the reason above.
2. Startup tolerance in the `core-plugin-api` hook, limited to the window before the app is finalized.
3. Refreshing both hooks at finalization, with no pathname change.
4. A lifecycle signal of this repository's own that the hooks can read, on this base.
5. Companions: changeset coverage, documentation, and API reports if the public surface changes.

## Out of scope

1. Instantiating routes behind `app/root.children` during bootstrap.
2. Changing which extensions are deferred at bootstrap.
3. `RouteResolver` parent-path handling.
4. Migrating callers away from the `core-plugin-api` hook.
5. Cherry-picking or adopting upstream `AppLifecycleApi` (a650c4f97d12, 0caa8966ca0f). The signal here
   is separate and will need reconciling with upstream later.
6. Editing `packages/core-plugin-api/src/extensions/extensions.tsx` (not allowlisted). Its mount point
   check must keep working unchanged.
7. Any `report-alpha.api.md` (not allowlisted).

## Functional requirements

- **FR-1 Reproduction.** A test creates an app with an `AppRootElementBlueprint` element that calls the
  `@backstage/core-plugin-api` `useRouteRef` with a non-optional ref to a page behind
  `app/root.children`, and fails on the current code with `No path for`. A new test case in an existing
  file must be selectable alone, so its red check judges that case only.
- **FR-2 No crash during bootstrap.** While the app is not finalized, the `core-plugin-api` hook does
  not throw `No path for ...` for a ref the bootstrap route info cannot resolve, and the rendered element
  shows no error. This holds with and without a sign-in page. The hook's non-optional return type stays
  callable, so an element that calls the returned function during render must not crash either.
- **FR-3 Working after finalization.** After finalization, with no pathname change and no remount, an
  element that stayed mounted holds a route function that returns the correct path. This applies to
  both the `core-plugin-api` and the `frontend-plugin-api` hooks, directly and under `compatWrapper`.
- **FR-4 Wiring errors stay visible.** A non-optional ref still unresolved after finalization throws
  `No path for ...` from the `core-plugin-api` hook, on render. The mount point check in
  `extensions.tsx`, which matches on that message prefix, keeps working. Tolerance in FR-2 ends at
  finalization and does not outlive it.
- **FR-5 Legacy apps unchanged.** With no route resolution API (routing context only, the `app-legacy`
  style), `useRouteRef` behaves exactly as today, including its error messages.
- **FR-6 Other implementations keep working.** A `RouteResolutionApi` that does not carry the lifecycle
  signal keeps today's behaviour. This covers existing test mocks such as `{ resolve }`, `CompatRouteResolutionApi`
  in `ForwardsCompatProvider.tsx`, and any adopter-provided implementation. They count as already
  finalized: no tolerance and no new required member.
- **FR-7 Companions.** Changes to published packages have changeset coverage, per the repository's
  rules. Behaviour changes are documented in `docs/frontend-system/architecture/10-app.md` and TSDoc. If
  the public API changes, the matching `report.api.md` matches what `yarn build:api-reports` generates.

## Non-functional requirements

- **NFR-1** No extra re-render of `useRouteRef` callers after the single finalization transition, and
  none at all in legacy apps.
- **NFR-2** The hooks stay safe under React concurrent rendering. A subscription, if used, must not
  miss a finalization that happens between render and subscribe.
- **NFR-3** Match each package's existing style. New source files carry the Apache 2.0 header for the
  current year; existing copyright years are left alone.
- **NFR-4** No change to `tsconfig`, ESLint or Prettier configuration, and no `yarn build`.

## PII inventory

None. This change reads and writes no personal data.

| Field | Sensitivity | Protection |
|---|---|---|
| n/a | n/a | n/a |

## Role matrix

Not applicable: no roles, resources or authorization paths change. Route resolution visibility is
unchanged.

## Acceptance criteria

- **AC-1** The test from FR-1 fails with `No path for` on the unfixed code, and passes after the fix.
- **AC-2** After the fix, that element renders during bootstrap with no error, both with and without
  a sign-in page.
- **AC-3** After finalization, without a pathname change, the element holds a route function returning
  the correct path, for both the `core-plugin-api` and `frontend-plugin-api` hooks.
- **AC-4** A non-optional ref still unresolved after finalization throws `No path for ...`, and the
  `extensions.tsx` mount point check still reports its error.
- **AC-5** `useRouteRef` in a legacy, routing-context-only setup is unchanged; the existing
  `useRouteRef.test.tsx` cases in both packages pass, unedited.
- **AC-6** `CI=1 yarn test <path>` passes on the touched paths and `yarn tsc` passes.

## Constraints the run's job puts on the plan

- A bugfix spec holds only the reproducing test units and `codegen` fix units. It holds no `docs` unit
  and no `tooling` unit, so the changeset and the doc page are `codegen` units, and `yarn build:api-reports`
  cannot be a tooling step. The spec should avoid a public API change if it can. If it cannot, the
  typed `report.api.md` edit must be proved against the generator by a check.
- `.changeset/*.md`, `docs/frontend-system/architecture/10-app.md` and the four `report.api.md` files
  are allowlisted; `report-alpha.api.md` is not.

## Gate 3 revision

Gate 3: revise, relayed by the coordinator as the user's explicit decision. AC-6 must pass in this run.

1. **R-1, the sign-in case.** "tolerates an unresolved route behind a sign-in page" is restructured so
   finalization is awaited outside the `act` callback. U01's plan text no longer asks for the deadlocking
   shape.
2. **R-2, the bootstrap-error case.** A new test case reaches `markFinalized()` on the bootstrap-error path
   (`prepareSpecializedApp.tsx:777`), so deleting that line fails a test.
3. **R-3, the before-fix evidence.** The recorded red run from before the fix stands as U01's before-fix
   evidence, on the user's authority. The fix is not reverted to re-prove red.
4. **R-4, scope.** Only `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` changes. No
   product code changes for this revision. A corrected test that fails for a reason pointing at product
   code stops the run for a report. A tool refusal of this route stops the run for a report too.

## Gate 3 second revision

Gate 3 again: the pipeline refused to re-plan U01 (`plan-lint` and `plan-to-packets --spec`, exit 1, because the
spec describes the files as they were before the run). The user chose option 1 and the senior review's wait
shape, relayed by the coordinator.

1. **R-5, one authorised exception.** One change set on
   `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`, wrapped in
   `write-provenance --before/--after`, typed in the session instead of by a packet. It does not extend to
   any other file or to product code, and the write contract stays as frozen. It is a departure from the packet
   flow and is recorded as one in the final report. `units-001.json` stays unaccepted: the edit is not a packet.
2. **R-6, the wait shape; this relaxes R-1's wording.** `finalizeApp` fires the trigger in a synchronous `act`,
   then runs `await act(async () => { finalizedApp = await promise; })`. The trigger has flushed before that
   callback starts, so the wait does not deadlock.
3. **R-7, proving the new case.** Removing `markFinalized()` from the product file is not authorised. The new
   case's effectiveness is shown in a way that makes no project write, or is reported as unproven.

## Gate 1 decisions

Gate 1: approved. The user settled both open questions at this gate; these override any wording above
that leaves them open.

1. **D-1, the bootstrap placeholder (the architect's to spell out, shown at Gate 2).** The architect
   must state exactly what the placeholder function returns when called during bootstrap, including what
   a link rendered during startup would point to before finalization. A decision that only says "a safe
   placeholder" does not meet this.
2. **D-2, the lifecycle signal (decided, not the architect's choice).** The signal is an internal
   contract with no public API change, so no `report.api.md` edit should be needed. If the architect
   finds the internal contract cannot hold, it stops and surfaces that at Gate 2. It does not switch to a
   public addition.
