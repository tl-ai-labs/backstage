## This invocation

mode: brownfield
intent: feature-new
run_id: 20261104-093718-feature-new-home-unread-notifs
change_plan: .sdlc/runs/20261104-093718-feature-new-home-unread-notifs/change_plan.md
provenance: .sdlc/runs/20261104-093718-feature-new-home-unread-notifs/provenance.json (note: plugins/notifications/report.api.md was also changed by the API report step but is missing from provenance; review it as part of the touched set; it was tracked and clean at git_head_before)
write review to: .sdlc/runs/20261104-093718-feature-new-home-unread-notifs/security_review.md

Suite summary (already run; do not re-run):
- CI=true yarn test plugins/notifications plugins/home-react: exit 1; 19 suites (16 pass, 3 fail), 926 tests (176 pass, 750 fail). The 3 failing suites are all plugins/notifications-backend ("knex is not a function"), identical at baseline before the run, off-limits. New suites pass: UnreadNotificationsCard.test.tsx, NotificationsPage.test.tsx, home-react extensions.test.tsx.
- yarn tsc: exit 0. yarn lint:all: exit 0.
- yarn tsc:full && yarn build:api-reports:only --ci plugins/notifications plugins/home-react: exit 0.
- Senior review: needs_changes with 3 findings (nested InfoCard in the home widget; test assertion), all fixed in fix round 4 and re-checked by the runs above.