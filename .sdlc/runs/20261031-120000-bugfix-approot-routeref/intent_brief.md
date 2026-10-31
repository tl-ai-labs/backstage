# Intent Brief — bugfix — useRouteRef in app root elements before finalization

Status: approved at Gate 0 (2026-10-31), with the changes listed under "Gate 0 decisions". Context, Goal, Files in scope (first paragraph) and Acceptance criteria quote the user's brief word for word; where the earlier interview answers differ, the brief wins.

## Context

Observed: in the new frontend system, app root elements (components rendered around the whole app, such as a global announcement banner) render between sign-in and app finalization, before page routes are known. A root element that calls useRouteRef for a page route throws "No path for routeRef", and the app shows an extension error box in place of the banner. Reported in backstage/backstage#35932.

## Goal

Expected: the banner renders, and useRouteRef returns the correct link once the app is finalized, without render loops.

## Files in scope

Files involved: packages/frontend-app-api (prepareSpecializedApp, phaseApis) and packages/frontend-plugin-api (useRouteRef, possibly a lifecycle API), plus tests and docs.

Frozen allowlist:

- `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`
- `packages/frontend-app-api/src/wiring/phaseApis.tsx`
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (the reproducing test)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`
- `packages/frontend-plugin-api/src/apis/definitions/**` (the lifecycle API, if the design needs one)
- `packages/core-plugin-api/src/routing/useRouteRef.tsx` (Gate 0 decision 1: the error in #35932 is thrown there)
- `packages/core-plugin-api/src/routing/useRouteRef.test.tsx` (Gate 0 decision 1)
- `packages/core-plugin-api/report.api.md`, `packages/core-plugin-api/report-alpha.api.md` (Gate 0 decision 1: write these ONLY if core-plugin-api's public API changes; otherwise leave them untouched)
- `packages/frontend-internal/src/**` (Gate 0 decision 2: lets the design avoid a new public API if that fits)
- `packages/frontend-plugin-api/report.api.md`, `packages/frontend-plugin-api/report-alpha.api.md`, `packages/frontend-app-api/report.api.md` (the "API reports pass" criterion)
- `.changeset/*.md` (new file; repo rules require changeset coverage for published packages)
- `docs/frontend-system/architecture/10-app.md`

## Files off-limits

Project defaults from `.sdlc/project.json`, discovery's proposed list (minus the API report files named in the allowlist), and the AI configs found by discovery. Explicitly: `packages/core-compat-api/**` (Gate 0 decision 3). Its `CompatRouteResolutionApi` implements `RouteResolutionApi`, so any change to that interface must stay backward compatible: new members optional, or on a separate API.

## Acceptance criteria

How we know it's fixed: a createSpecializedApp test renders a root element that calls useRouteRef before and after finalization and asserts the link resolves; the test fails before the fix; tsc, lint and API reports pass.

Check command (Gate 0 decision 4, exact; used for the baseline and the end-of-run checks):

```
CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports
```

Also run:

```
CI=true yarn test packages/core-plugin-api
```

## Non-goals

Not stated in the brief.

Run constraint (user instruction, 2026-10-31): do not look at upstream PR backstage/backstage#36008, its merge commit, or `master`, and do not base the design on that PR's file list. Work out the fix only from this branch's code and this brief. This binds every phase and every model, including the Gemini agent worker, which can run git commands in the repo.

## Gate 0 decisions (2026-10-31, as written by the user)

1. Add packages/core-plugin-api/src/routing/useRouteRef.tsx and useRouteRef.test.tsx to the allowlist, plus that package's report files only if its API changes. The error in #35932 is thrown there.
2. Add packages/frontend-internal/src/** so the design can avoid a new public API if that fits.
3. Keep core-compat-api off-limits.
4. Use this exact line as the check for the baseline and the end-of-run checks:
CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports
Also run CI=true yarn test packages/core-plugin-api.

Run settings: policy `flash-agsdk-only-v38`, auth mode `vendor` (the only mode this policy allows), intent `bugfix`.
