## How this step runs

You are running this helper's instructions with tools of your own instead of the ones they name. Read the project
with read_file, list_files and search_files (paths relative to the project root); some files are kept from you by
the run's read rule, and a refusal says so. Hand in requirements.md with write_requirements (the whole document).
Every piece you hand in is checked at once; a refusal lists every problem: fix the piece and hand it in again.
You have no tool that changes a project file or runs a shell; where the instructions say Write, Edit or Bash for
anything else, there is nothing to do. The step is done when every piece is accepted.

## The helper's instructions

### Phase 1 — requirements_analysis

Read `<brief.md>` (passed in $ARGUMENTS) and produce `<output_dir>/requirements.md` with sections:

- **In scope** (numbered, testable)
- **Out of scope** (numbered)
- **Functional requirements per module** (FR-1, FR-2, ...)
- **Non-functional requirements** (NFR-1, ...)
- **PII inventory** (table: field, sensitivity, protection)
- **Role matrix** (role × resource × action)
- **Acceptance criteria** (numbered, executable)
- **Open questions for HITL** (if any)

## This invocation

mode: brownfield. intent: feature-new. run_id: 20261104-005757-feature-new-home-unread-notifications-card.
Brief: .sdlc/runs/20261104-005757-feature-new-home-unread-notifications-card/intent_brief.md (read it in full; its "Run constraints (Gate 0)" section binds this run). Repo facts: .sdlc/runs/20261104-005757-feature-new-home-unread-notifications-card/discovery.md and .sdlc/baseline/current.json (read only the sections you need).
Write .sdlc/runs/20261104-005757-feature-new-home-unread-notifications-card/requirements.md in the feature-new form (new-feature requirements) with these sections: In scope (numbered, testable); Out of scope (numbered); Functional requirements per module (FR-1, FR-2, ... grouped: home-react CardExtension fallback; notifications home card component; live refresh via signals + polling fallback; mark-as-read; deep link /notifications?id=<id> via the plugin's route ref and highlighting on NotificationsPage/NotificationsTable; legacy createCardExtension export; new-frontend-system HomePageWidgetBlueprint widget in src/alpha.tsx; translations; package.json dependency on @backstage/plugin-home-react; API reports, changesets (patch for both packages), README and docs/notifications/usage.md + usage--old.md updates); Non-functional requirements (NFR-1, ...: Apache-2.0 2026 header on new source files, match each package's existing style, no backend change, no test IDs, RTL screen/findBy* queries, cleanup of subscriptions and timers); PII inventory (table: field, sensitivity, protection); Role matrix (role x resource x action); Acceptance criteria (AC-1, ... numbered, executable — include the run's test command word for word: CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all); Open questions for HITL (if any). Every requirement must stay within the brief's "Files in scope"; never plan a change in an off-limits path (notifications-backend/common/node, signals*, plugins/home, packages/app*, docs/releases, lint/prettier/TS configs, .gitignore). Inspect the existing code in plugins/notifications/src and plugins/home-react/src to ground the requirements in real names (components, api refs, route refs, translation ref), but do not design the change.