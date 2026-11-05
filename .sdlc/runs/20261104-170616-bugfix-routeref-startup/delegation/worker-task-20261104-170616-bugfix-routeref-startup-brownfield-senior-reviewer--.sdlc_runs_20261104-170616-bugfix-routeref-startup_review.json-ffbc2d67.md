## This invocation

mode: brownfield
intent: bugfix
run_id: 20261104-170616-bugfix-routeref-startup
change_plan: .sdlc/runs/20261104-170616-bugfix-routeref-startup/change_plan.md
provenance: .sdlc/runs/20261104-170616-bugfix-routeref-startup/provenance.json
write review to: .sdlc/runs/20261104-170616-bugfix-routeref-startup/review.json
Suite summary (after fix round 1):
- reproducing test U01 (CI=true yarn test packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx): FAIL, 1 failed / 34 passed. The new test fails: 'Root link: /my-page' is not found after finalization. Before round 1 the link resolved but renderCount was 3 instead of 2. Round 1 replaced useSyncExternalStore in useRouteRef.tsx with useState + useEffect, and the link no longer resolves. On the original code it failed: 'Root link: /my-page' was not found.
- reproducing test U02 (useRouteRef.test.tsx): PASS 8/8 (failed on the original code: Expected "/hello", Received undefined)
- CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api: FAIL, 1 failed / 433 passed (only the U01 test); baseline before the run: 432/432 passed
- yarn tsc: PASS; yarn lint:all: PASS; yarn build:api-reports: PASS (baseline: all passed)
The reproducing test judges the fix and must not be changed: report the U01 failure as a finding on the source file that must change (useRouteRef.tsx and/or phaseApis.tsx), with the root cause.