## This invocation

mode: brownfield. intent: feature-new. run_id: 20261104-000000-feature-new-home-unread-notifications-card.
Write .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/requirements.md from the intent brief at .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/intent_brief.md (read discovery.md and stack-profile.md in the same folder for repo facts).
Phase 1 rules for feature-new: new-feature requirements. Sections: In scope (numbered, testable); Out of scope (numbered, from the brief's non-goals); Functional requirements per module with ids FR-1, FR-2, ... (modules: notifications home card, notifications page deep-link highlight, live refresh (signals + polling fallback), widget registration legacy + new frontend system, home-react card extensions without app context, docs and changesets); Non-functional requirements NFR-1...; PII inventory (table: field, sensitivity, protection); Role matrix (role x resource x action); Acceptance criteria with ids AC-1, AC-2, ... (numbered, executable, matching the brief's 9 criteria); Open questions for HITL (if any). No backend changes. Test command confirmed at Gate 0: CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all. Known at base: 2 tests fail on Postgres 9 and 11, not this run's to fix.

## The step's input files

Copied into the project for you, in the order given (read each with read_file):
- .sdlc/runs/20261104-000000-feature-new-home-unread-notifications-card/inputs/intent_brief.md