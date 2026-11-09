# Intent Brief — feature-extend — Cross-step conditional fields in the Scaffolder form wizard

## Context

Seed (verbatim): Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard.

Interview answer (Vaibhav's brief, verbatim):

Module: the Scaffolder form wizard, in plugins/scaffolder-react (Stepper, per-step schema extraction and validation, review step) and plugins/scaffolder (template form wiring and the template editor preview).

New capability: conditional fields (JSON Schema dependencies, if/then) can depend on answers from an earlier step, not only the same step. Example: step 1 asks "Is this a mobile SDK?" and step 2 shows SDK-specific fields only when the answer is Yes. Requested in backstage/backstage#31895.

Before: the step-2 SDK fields show regardless of the step-1 answer (or never show).
After: the step-2 fields appear only when step 1 was answered Yes, and the Review step lists them only in that case.

Constraints: form data is validated per step against that step's schema; the change must not break validation, back-navigation, the review step or existing same-step conditions. A previous attempt (PR #35196) was closed unmerged.

Acceptance criteria: React Testing Library tests on the Stepper show a step-2 field appears only when a step-1 flag is set, its required validation applies only then, and going back and changing the flag removes it from the review step; existing Stepper tests pass; tsc and lint pass. Update the docs for template authors.

Discovery notes: the Stepper keeps all step answers in `stepsState` but validates and resolves (createAsyncValidators, ReviewState `findSchemaForKey`) using only the current step's data. The backend (plugins/scaffolder-backend router) validates the full answer set against each step schema, so frontend "required" must agree with it.

## Goal

JSON Schema conditionals (`dependencies`, `if`/`then`/`else`) in a later Scaffolder parameter step can reference answers given in an earlier step: the dependent fields render, validate as required, and appear in the Review step only when the earlier-step condition holds; changing the earlier answer via back-navigation updates the later step and the Review step accordingly.

## Files in scope

- `plugins/scaffolder-react/src/next/components/Stepper/**` (Stepper.tsx, createAsyncValidators.ts, utils.ts, their tests)
- `plugins/scaffolder-react/src/next/components/ReviewState/**` (ReviewState.tsx, util.ts, their tests)
- `plugins/scaffolder-react/src/next/components/Form/**`
- `plugins/scaffolder-react/src/next/components/Workflow/**`
- `plugins/scaffolder-react/src/next/hooks/**` (useTemplateSchema, useTransformSchemaToProps, their tests)
- `plugins/scaffolder-react/src/next/lib/**` (schema.ts and tests)
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/**` (editor preview wiring)
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/**` (template form wiring)
- `docs/features/software-templates/input-examples.md`
- `docs/features/software-templates/writing-templates.md`
- `.changeset/*.md` (new changeset for `@backstage/plugin-scaffolder-react`, and `@backstage/plugin-scaffolder` if touched; minor bumps)

## Files off-limits

- Project defaults (`.env*`, `.mcp.json`, `node_modules/**`, `dist/**`, `.sdlc/**`, `.git/**`, …)
- AI configs (default OFF-LIMITS): `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `routing-policy.yaml`
- `**/dist-types/**`, `build/**`, `.yarn/**`
- `docs/releases/**`, `**/CHANGELOG.md`
- `**/report*.api.md`, `**/knip-report.md` (generated)
- ESLint / Prettier / TS config: `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`
- `plugins/scaffolder-backend/**`, `plugins/scaffolder-common/**` (reference only)

## Acceptance criteria

1. RTL tests on the Stepper: a step-2 field appears only when a step-1 flag is set.
2. Its required validation applies only when the flag is set.
3. Going back and changing the flag removes the field (and its value) from the Review step.
4. Existing Stepper tests (and other scaffolder-react `src/next` tests) still pass.
5. `yarn tsc` and lint pass.
6. Template-author docs updated with a cross-step conditional example.
7. New source files carry the Apache 2.0 header (2026); changeset added.

## Non-goals

- Changing backend validation in `plugins/scaffolder-backend`.
- Changing the public type shape of `TemplateParameterSchema`.
- Reworking same-step conditional behaviour or the legacy (non-`next`) form.
- Regenerating API reports (only if the public API changes; flagged, not done by the run).

## Gate 0 — approved (final scope)

- Stack: node-typescript (confirmed).
- Test command (confirmed): `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` (never run lint with --fix).
- Auth mode: estimated.
- Policy: opus55-plus-flash38-agsdk.
- Existing AI setup: all off-limits.
- File scope: allowlist and off-limits as proposed.
- Regulated-repo warning acknowledged: no regulated data in this repo.
- .gitignore: do not add `.sdlc/` (not in allowlist; noted for the final report).
