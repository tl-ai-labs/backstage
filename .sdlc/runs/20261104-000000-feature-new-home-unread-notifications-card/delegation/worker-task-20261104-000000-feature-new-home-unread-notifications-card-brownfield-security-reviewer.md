## This invocation

mode: brownfield
intent: feature-new
run_id: 20261104-000000-feature-new-home-unread-notifications-card
change_plan: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/change_plan.md
provenance: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/provenance.json
write: .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/security_review.md
Suite summary (already run, do not re-run):
- CI=true yarn test plugins/notifications plugins/home-react: 924/926 pass; the 2 failures are DatabaseNotificationsStore POSTGRES_9/11 settings, failing at base too.
- yarn tsc: pass. yarn lint:all: pass.
- Senior review: approved, no findings.
- New dependency: @backstage/plugin-home-react (workspace:^) in plugins/notifications; yarn.lock +1 line.