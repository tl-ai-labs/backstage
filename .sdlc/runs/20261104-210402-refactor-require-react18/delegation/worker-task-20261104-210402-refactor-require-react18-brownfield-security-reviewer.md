## This invocation

mode: brownfield
intent: refactor
run_id: 20261104-210402-refactor-require-react18
change plan: .sdlc/runs/20261104-210402-refactor-require-react18/change_plan.md
provenance: .sdlc/runs/20261104-210402-refactor-require-react18/provenance.json
write your review to: .sdlc/runs/20261104-210402-refactor-require-react18/security_review.md

Check results already in hand (do not re-run them):
- `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`: exit 0; 86/86 suites, 550/550 tests (baseline 86/550).
- `CI=true yarn test packages/frontend-plugin-api packages/dev-utils packages/frontend-dev-utils packages/ui packages/cli-module-build packages/repo-tools plugins/techdocs`: exit 0; 184/184 suites, 1584/1584 tests (baseline 1585; the one removed is the planned legacy-render test).
- `yarn install --immutable`: exit 0. API report and knip report `--ci` checks: exit 0.
- Senior review: approved, no findings.

Read touched files as `git diff <git_head_before> -- <file>` (new files in full). Review every touched file by its kind (dependency diff in the manifests and yarn.lock — removed use-sync-external-store, narrowed React peer ranges; source; CLI diagnostics; changesets; docs). Findings only, each with its file.