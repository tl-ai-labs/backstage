## This invocation

mode: brownfield
intent: feature-new
run_id: 20261104-000000-feature-new-home-unread-notifications-card
change_plan: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/change_plan.md
provenance: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/provenance.json
write review JSON to: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/review.json
Suite summary (already run, do not re-run):
- CI=true yarn test plugins/notifications plugins/home-react: 924/926 pass, 17/18 suites; the 2 failures are DatabaseNotificationsStore (POSTGRES_9, POSTGRES_11) settings, which also fail at base (not this run's).
- yarn tsc: pass.
- yarn lint:all: pass.
- Per-file checks (prettier, eslint, file tests, docs-quality): pass on every applied file; 1 fix round applied (home-react extensions.tsx type, extensions.test.tsx lazy-card case removed, HomePageUnreadNotifications.test.tsx query and mock typing).
- API reports regenerated with yarn build:api-reports (notifications report.api.md and report-alpha.api.md changed; home-react unchanged).