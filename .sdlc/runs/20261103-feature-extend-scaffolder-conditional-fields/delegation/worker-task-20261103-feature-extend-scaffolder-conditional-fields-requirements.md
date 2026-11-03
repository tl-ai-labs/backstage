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

mode: brownfield. intent: feature-extend. run_id: 20261103-feature-extend-scaffolder-conditional-fields.
Read the brief at .sdlc/runs/20261103-feature-extend-scaffolder-conditional-fields/intent_brief.md (the Gate 0-approved scope) and the discovery snapshot at .sdlc/runs/20261103-feature-extend-scaffolder-conditional-fields/discovery.md, and write .sdlc/runs/20261103-feature-extend-scaffolder-conditional-fields/requirements.md.

Phase 1 rules for this job (feature-extend = delta requirements): describe only the change against today's behaviour of the Scaffolder form wizard in plugins/scaffolder-react (and plugins/scaffolder only if wiring requires it). Sections: In scope (numbered, testable); Out of scope (numbered, from the brief's Non-goals); Functional requirements per module (FR-1, FR-2, ... each naming the file(s) it touches among the brief's "Files in scope"); Non-functional requirements (NFR-1, ...: backward compatibility for existing templates, no breaking public API change, repo conventions: Apache 2.0 header with year 2026 on new source files, match each package's style, RTL tests use screen and findBy* queries with no test IDs and prefer fewer thorough tests); PII inventory (likely none: say so); Role matrix (template author / template user; no authz change); Acceptance criteria (AC-1, ... executable, taken from the brief's 8 criteria); Open questions for HITL (only if genuinely open).

Binding user decisions (do not reopen them): clear a hidden field's value only when its condition depends on an answer from an earlier step; same-step conditions keep exactly today's behaviour, including keeping hidden values. The run's test command, word for word: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`. Never run lint with --fix; never run yarn build, yarn release or the changeset CLI. Do not read upstream PRs #35196, #36464 or #34292. Docs (docs/features/software-templates/input-examples.md, writing-templates.md) must describe cross-step conditions with a worked example, and one new changeset covers @backstage/plugin-scaffolder-react (minor) plus @backstage/plugin-scaffolder only if that package changes. Backend, scaffolder-common, step hiding and new template keywords are out of scope.