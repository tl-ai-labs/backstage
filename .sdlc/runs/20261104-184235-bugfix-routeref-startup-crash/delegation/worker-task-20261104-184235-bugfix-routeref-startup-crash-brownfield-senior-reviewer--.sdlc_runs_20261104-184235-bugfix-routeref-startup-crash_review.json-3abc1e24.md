## This invocation

mode: brownfield
intent: bugfix
run_id: 20261104-184235-bugfix-routeref-startup-crash
change_plan: .sdlc/runs/20261104-184235-bugfix-routeref-startup-crash/change_plan.md
provenance: .sdlc/runs/20261104-184235-bugfix-routeref-startup-crash/provenance.json
write: .sdlc/runs/20261104-184235-bugfix-routeref-startup-crash/review.json
Results already in (do not re-run):
- red check U01 (createSpecializedApp.test.tsx, new case only): failed on the unchanged code at apply time; passes after the fix (1 passed, 34 skipped).
- red check U02 (useRouteRef.test.tsx, new case only): failed on the unchanged code at apply time; passes after the fix (1 passed, 7 skipped).
- CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api: 50/50 suites, 434/434 tests passed (baseline 432).
- yarn tsc: exit 0. yarn lint:all: exit 0. yarn build:api-reports: exit 0, no report file changed.
- Per-file eslint and prettier checks: passed on all 6 files.