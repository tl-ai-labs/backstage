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

mode: brownfield. intent: feature-new. run_id: 20261103-210033-feature-new-entity-rename-redirects.
Brief: .sdlc/runs/20261103-210033-feature-new-entity-rename-redirects/intent_brief.md (approved at Gate 0; its allowlist, off-limits list, non-goals and run settings are binding). Repo facts: .sdlc/runs/20261103-210033-feature-new-entity-rename-redirects/discovery.md and .sdlc/baseline/current.json (read only the sections you need).
Write .sdlc/runs/20261103-210033-feature-new-entity-rename-redirects/requirements.md in the feature-new form (new-feature requirements), with sections: In scope (numbered, testable); Out of scope (numbered, from the brief's non-goals); Functional requirements per module (FR-1, FR-2, ... grouped by catalog-model, catalog-backend, catalog-client, plugins/catalog (legacy and new frontend system entity page), plugins/techdocs, docs, changesets); Non-functional requirements (NFR-1, ...: lookup-by-ref performance unchanged and former-name path consulted only on a miss, catalog DB performance guidance, permission non-leak, Apache 2.0 2026 header on new files, no hand edits to generated OpenAPI code or API reports); PII inventory (table); Role matrix (role x resource x action, including a user who cannot read the redirect target); Acceptance criteria (AC-1, ..., numbered and executable, mapping the brief's acceptance criteria: backend tests for indexing, conflicts and permissioned lookup; jsdom tests for entity route redirect + notice, docs route redirect with sub-path preserved, unknown ref still Entity not found; tsc and lint pass; changeset bump levels; docs). Open questions for HITL: list the brief's four design questions as questions the architect must answer, with a recommended default for each (live entity always wins; a user who cannot read the target gets not found). Every FR and AC must be testable and traceable to the brief. Do not invent scope beyond the brief.