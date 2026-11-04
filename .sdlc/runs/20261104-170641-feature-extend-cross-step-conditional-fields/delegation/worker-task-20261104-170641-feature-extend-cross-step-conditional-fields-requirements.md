## This invocation

mode: brownfield
intent: feature-extend
run_id: 20261104-170641-feature-extend-cross-step-conditional-fields
Brief: .sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/intent_brief.md (Gate 0 approved; its "Files in scope" is the frozen 28-path write-contract allowlist).
Discovery snapshot: .sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/discovery.md

Phase 1 rules for feature-extend: write delta requirements to .sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/requirements.md, with sections In scope, Out of scope, Functional requirements (FR-1, ...), Non-functional requirements (NFR-1, ...), PII inventory, Role matrix, Acceptance criteria (AC-1, ..., each executable), Open questions for HITL. Describe only what changes relative to the existing behavior, and keep every requirement inside the brief's files in scope.
Test command confirmed at Gate 0: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` (repo root).
User decision at Gate 0: leave .gitignore unchanged.
Repo rules (.claude/CLAUDE.md): new source files need an Apache 2.0 header with year 2026; do not change years on existing headers; API reports are regenerated with `yarn build:api-reports`, never hand-edited; never run `yarn build`, `yarn release` or the changeset CLI; the changeset file is written directly under .changeset/; RTL tests prefer `screen` and `findBy*`, no test IDs; docs follow docs/contribute/doc-style-guide.md.

## The step's input files

Copied into the project for you, in the order given (read each with read_file):
- .sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/inputs/intent_brief.md