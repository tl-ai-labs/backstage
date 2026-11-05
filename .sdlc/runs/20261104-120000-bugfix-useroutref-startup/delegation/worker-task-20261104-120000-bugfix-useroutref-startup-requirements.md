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

mode: brownfield
intent: bugfix
run_id: 20261104-120000-bugfix-useroutref-startup
Brief: .sdlc/runs/20261104-120000-bugfix-useroutref-startup/intent_brief.md (read it in full; its "Run constraints", "Files off-limits" and "Non-goals" bind).
Write: .sdlc/runs/20261104-120000-bugfix-useroutref-startup/requirements.md

Phase 1 rules for a bugfix job — "reproduce + diagnose" form:
- Reproduce: state exactly how the bug shows (an app root element in the new frontend system calling useRouteRef during startup throws "No path for <routeRef>"), and the reproducing test that must fail on the current code (the integration test in packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx named in the brief).
- Diagnose: verify the brief's pre-investigation against the code yourself, do not trust it: (1) resolveBasePath in packages/frontend-app-api/src/routing/RouteResolver.ts (~line 153) throws when an ancestor's path is not registered in the bootstrap-phase partial tree; (2) RouteResolutionApiProxy in packages/frontend-app-api/src/wiring/phaseApis.tsx is re-initialized in place at finalization, and useRouteRef in packages/frontend-plugin-api/src/routing/useRouteRef.tsx memoizes on the API identity, so a startup-rendered element never re-resolves. Cite file and line for what you confirm, and say plainly if anything differs.
- Sections: In scope, Out of scope, Functional requirements (FR-n), Non-functional requirements (NFR-n: no render loops, no breaking change to useRouteRef or RouteResolutionApi — any addition is optional; match each package's own style; Apache 2.0 header with current year on any new source file; changesets and docs as the brief lists), PII inventory (say none), Role matrix (say not applicable), Acceptance criteria (AC-n, executable — take the brief's five, with the run's test command verbatim: CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports), Open questions for HITL.
- Constraints: do not look up or read open upstream PRs. Never propose lint --fix. API report files change only by running yarn build:api-reports, never by hand. .gitignore is not touched. The old frontend system (core-* packages) is out of scope.