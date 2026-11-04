## This invocation

mode: brownfield
intent: refactor
run_id: 20261104-210402-refactor-require-react18
change plan: .sdlc/runs/20261104-210402-refactor-require-react18/change_plan.md
provenance: .sdlc/runs/20261104-210402-refactor-require-react18/provenance.json
write your review to: .sdlc/runs/20261104-210402-refactor-require-react18/review.json

Check results already in hand (do not re-run them):
- `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`: exit 0; 86/86 suites, 550/550 tests (baseline 86/550).
- `CI=true yarn test packages/frontend-plugin-api packages/dev-utils packages/frontend-dev-utils packages/ui packages/cli-module-build packages/repo-tools plugins/techdocs`: exit 0; 184/184 suites, 1584/1584 tests (baseline 1585; the one removed is the planned legacy-render test in createDevApp.test.tsx).
- `yarn install --immutable`: exit 0.
- `yarn build:knip-reports packages/cli-module-build --ci`: exit 0. `yarn build:api-reports:only packages/test-utils --ci`: exit 0.
- Greps: no `use-sync-external-store`, `HAS_REACT_DOM_CLIENT` or `ReactDOM.render` left in packages/*/src, plugins/*/src or cli-module-test-jest/config; no React 16/17 range in any workspace manifest or cli-module-new template.

Read touched files as `git diff <git_head_before> -- <file>` (new files in full). Review the diff against change_plan.md and requirements.md (.sdlc/runs/20261104-210402-refactor-require-react18/requirements.md), including the six changesets against its Changeset rules (bump levels, plain adopter-facing language, no internal symbol names; process.env.HAS_REACT_DOM_CLIENT is allowed and required in the cli-module-build/cli-module-test-jest changeset). Report each defect as a finding with its file.