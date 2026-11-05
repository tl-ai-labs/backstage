## This invocation

mode: brownfield. intent: test. run_id: 20261105-135542-test-routeref-render-bound. requirements: .sdlc/runs/20261105-135542-test-routeref-render-bound/requirements.md. intent brief: .sdlc/runs/20261105-135542-test-routeref-render-bound/intent_brief.md. Hand over the change spec as sections under .sdlc/runs/20261105-135542-test-routeref-render-bound/change.sections/. Test job rules: at least one tests unit, no tooling unit, and project_checks must hold the full test suite and the typecheck for this change (from the Gate 0 test command: CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api, and yarn tsc; lint via yarn lint:all). The write contract allows only packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx, and only the post-finalization renderCount assertion in the test "should resolve page route refs in app root elements after finalization without render loops" changes (toBe(2) to an upper bound of at most 3). Note: AC-4 covers paths outside .sdlc/ only (user accepted at Gate 1).

## The step's input files

Copied into the project for you, in the order given (read each with read_file):
- .sdlc/runs/20261105-135542-test-routeref-render-bound/inputs/intent_brief.md