## This invocation

mode: brownfield
intent: feature-new
run_id: 20261104-130720-feature-new-entity-rename-redirect
change_plan: .sdlc/runs/20261104-130720-feature-new-entity-rename-redirect/change_plan.md
provenance: .sdlc/runs/20261104-130720-feature-new-entity-rename-redirect/provenance.json
write review to: .sdlc/runs/20261104-130720-feature-new-entity-rename-redirect/review.json
Results already in hand (do not re-run):
- CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs: pass, 408 passed / 6 skipped / 0 failed of 414 suites; 3921 passed / 41 skipped tests (baseline 3894 passed, 0 failed)
- yarn tsc: pass (0 errors); yarn tsc:full: pass
- yarn lint:all: pass (0 errors)
- yarn build:api-reports:only --ci (catalog-model, catalog-client, catalog-backend, catalog, techdocs): pass; report.sql.md gains only the new table
- prettier --check on every typed file: pass
- Fix rounds: 1 (EntityLayout.test.tsx type error), 2 (two new frontend tests: EntityLayout.test.tsx alert assertion, alpha/pages.test.tsx ambiguous text query)
- Not run by the fixed command: packages/catalog-model and packages/catalog-client tests (judged only by tsc/lint)