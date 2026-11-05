## This invocation

mode: brownfield
intent: docs
run_id: 20261105-100510-docs-catalog-model-tsdoc
requirements: .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/requirements.md
intent_brief: .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/intent_brief.md

Hand over the change spec for this docs run. Units are documentation units only (phase: docs), with no tooling unit: one unit per source file in scope (15 files), plus one unit for the new patch changeset under .changeset/. The two report files (packages/catalog-model/report.api.md and report-alpha.api.md) are not units: the orchestrator regenerates them by running the Gate 0 test command (`yarn build:api-reports`) after the comments land, so FR-5 is met that way. Comments only: each unit's sites insert or fill TSDoc and change no code line.

## The step's input files

Copied into the project for you, in the order given (read each with read_file):
- .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/inputs/intent_brief.md