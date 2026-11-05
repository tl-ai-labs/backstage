## This invocation

mode: brownfield
intent: refactor
run_id: 20261105-100258-refactor-react18-only
change_plan: .sdlc/runs/20261105-100258-refactor-react18-only/change_plan.md
provenance: .sdlc/runs/20261105-100258-refactor-react18-only/provenance.json (git_head_before f20fd9b598; 86 files touched; read edited files as `git diff f20fd9b598 -- <file>`, new files in full; hasReactDomClient.ts was deleted by a tooling step)
write: .sdlc/runs/20261105-100258-refactor-react18-only/review.json
Results already run (baseline before -> after; do not re-run):
- yarn tsc: pass -> pass
- yarn lint:all: pass -> pass
- yarn lint:peer-deps: pass -> pass
- Gate 0 suite (core-app-api, test-utils, frontend-test-utils): 550/550 -> 550/550 pass
- frontend-dev-utils: 4/4 -> 3/3 pass (legacy-render fallback test removed per plan U68)
- dev-utils 5/5, techdocs transformers 59/59, test-utils 83/83, cli-module-build 153/153, cli-module-new 63 pass + 2 skipped, frontend-plugin-api 230/230, ui 448/448: unchanged, all pass
- repo-tools peer-deps: no test file exists (0 tests, exit 0 before and after)
- yarn build:api-reports packages/test-utils: regenerated, removes only LegacyRootOption and its two option intersections
- React 17/16 peer-range grep over packages/*/package.json, plugins/*/package.json and cli-module-new templates: 0 matches
Known and accepted out of scope: packages/cli-module-build/knip-report.md still names the deleted hasReactDomClient.ts (person's PR follow-up).