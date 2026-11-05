## This invocation

mode: brownfield
intent: docs
run_id: 20261105-100510-docs-catalog-model-tsdoc
Brief: .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/intent_brief.md (read it first). Discovery context: .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/discovery.md and .sdlc/baseline/stack-profile.md (read only the sections you need).

Write .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/requirements.md, Phase 1 in its docs form (scoped: "what docs?"). Sections: In scope (numbered, testable); Out of scope (numbered); Functional requirements (FR-1, FR-2, ... — one per group of exports or per file: the 8 type guards in conditions.ts, the 8 KubernetesValidatorFunctions static methods, the 5 policy enforce methods, the 24 apiVersion/kind/spec members of the 8 kind interfaces, the regenerated API reports, and the single patch changeset for @backstage/catalog-model); Non-functional requirements (NFR-: comments only, no runtime change; match the package's existing TSDoc style — summary-only member comments with no release tags, `@param value - ...`, `{@inheritDoc}` where it fits; accuracy against the implementation; Apache header and copyright years untouched; prettier only on changed files; changeset adopter-facing with no code symbols); PII inventory (state none); Role matrix (state not applicable); Acceptance criteria (AC-1, ... numbered and executable, including the Gate 0 test command verbatim: `yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md`, `yarn tsc`, `CI=1 yarn test packages/catalog-model`, and that only allowlisted files change); Open questions for HITL (only if real). Keep it concise. Note that `yarn build:api-reports` regenerates every package's report and only catalog-model's two reports are in the write contract: other packages' report changes, if any, are reported, not written.

## The step's input files

Copied into the project for you, in the order given (read each with read_file):
- .sdlc/runs/20261105-100510-docs-catalog-model-tsdoc/inputs/intent_brief.md