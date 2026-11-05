## This invocation

mode: brownfield
intent: refactor
run_id: 20261105-100258-refactor-react18-only
change_plan: .sdlc/runs/20261105-100258-refactor-react18-only/change_plan.md
provenance: .sdlc/runs/20261105-100258-refactor-react18-only/provenance.json (git_head_before f20fd9b598; 86 files touched; read edited files as `git diff f20fd9b598 -- <file>`, new files in full; hasReactDomClient.ts deleted; yarn.lock refreshed by `yarn install`)
write: .sdlc/runs/20261105-100258-refactor-react18-only/security_review.md
Results already run (do not re-run):
- yarn tsc, yarn lint:all, yarn lint:peer-deps: pass (before and after)
- Gate 0 command verbatim (tsc && lint:all && lint:peer-deps && core-app-api/test-utils/frontend-test-utils tests): exit 0, 550/550
- Per-package suites frontend-dev-utils 3/3 (one legacy test removed per plan), dev-utils 5/5, techdocs transformers 59/59, test-utils 83/83, cli-module-build 153/153, cli-module-new 63+2 skipped, frontend-plugin-api 230/230, ui 448/448: pass
- Senior review: approved, 0 findings
For the yarn.lock change, the dependency-risk check is: which packages were removed/added/changed version (expected: use-sync-external-store and @types/use-sync-external-store entries dropped where no longer depended on; no new third-party packages).