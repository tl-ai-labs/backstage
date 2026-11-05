## This invocation

mode: brownfield
intent: bugfix
run_id: 20261104-170616-bugfix-routeref-startup
change_plan: .sdlc/runs/20261104-170616-bugfix-routeref-startup/change_plan.md
provenance: .sdlc/runs/20261104-170616-bugfix-routeref-startup/provenance.json
write review to: .sdlc/runs/20261104-170616-bugfix-routeref-startup/security_review.md
Suite summary (final, after Gate 3 revise fix round 4, which changed packages/frontend-plugin-api/src/routing/useRouteRef.tsx):
- CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api: FAIL, 1 failed / 433 passed (only the reproducing test U01, renderCount 3 vs expected 2); baseline 432/432 passed
- yarn tsc: PASS; yarn lint:all: PASS; yarn build:api-reports: PASS