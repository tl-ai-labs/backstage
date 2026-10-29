# Intent Brief — feature-extend — Scaffolder cross-step conditional fields

## Context

Scaffolder templates can already show, hide or require fields with JSON Schema `dependencies` and
`if`/`then`, but only against answers in the same step. All wizard steps share one flat form state
(`Stepper.tsx` `stepsState`), and each step's `<Form>` receives the full form data. However, each step's
schema is extracted and validated on its own (`useTemplateSchema` / `extractSchemaFromStep`), nothing removes
hidden fields from `required`, and the review step (`ReviewState` / `findSchemaForKey`) only resolves
`dependencies`. A root-level `if` in a later step that names an earlier field may partly work by accident
through the ajv8 validator, but it is undocumented, untested and inconsistent.

Requested in backstage/backstage#31895. A previous attempt (PR #35196) was closed unmerged.

## Goal

Let conditional fields (JSON Schema `dependencies` and `if`/`then`/`else`) in a later step of the Scaffolder
form wizard depend on answers given in an earlier step.

Example: step 1 asks "Is this a mobile SDK?". Step 2 shows SDK-specific fields only when the answer is Yes.

- Before: the step-2 SDK fields show regardless of the step-1 answer (or never show).
- After: the step-2 fields appear only when step 1 was answered Yes, are required only then, and the Review
  step lists them only in that case.

## Files in scope

- `plugins/scaffolder-react/src/next/**` — Stepper, per-step schema extraction and validation
  (`lib/schema.ts`, `hooks/useTemplateSchema.ts`, `hooks/useFilteredSchemaProperties.ts`,
  `components/Stepper/**`, `components/ReviewState/**`), and their tests.
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/**` and
  `plugins/scaffolder/src/alpha/components/TemplateEditorPage/**` — template form wiring and the template
  editor preview, only where needed to pass earlier answers through.
- `docs/features/software-templates/input-examples.md` and
  `docs/features/software-templates/writing-templates.md` — template-author documentation.
- `.changeset/scaffolder-cross-step-conditions.md` — new changeset (`@backstage/plugin-scaffolder-react`:
  minor; add `@backstage/plugin-scaffolder` only if its source changes). None of the existing scaffolder
  changesets cover this behaviour.

## Files off-limits

- Project defaults and discovery proposals: `.env`, `.env.*`, `.devcontainer/devcontainer.env`, `.mcp.json`,
  `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `yarn.lock`, `.git/**`, `.sdlc/**`.
- AI configs: `.claude/**`, `.cursor/**`, `AGENTS.md`, `.github/copilot-instructions.md`.
- `docs/releases/**`, `**/report*.api.md` (regenerated only by `yarn build:api-reports`),
  `plugins/scaffolder-common/src/schema/openapi/generated/**`.
- `plugins/scaffolder-backend/**`, `plugins/scaffolder-common/**` (out of scope for this run).

## Acceptance criteria

1. React Testing Library tests on the Stepper show that a step-2 field appears only when a step-1 flag is set.
2. The step-2 field's `required` validation applies only when the step-1 flag is set.
3. Going back and changing the step-1 flag removes the step-2 field from the review step.
4. Existing same-step conditions, back-navigation and review-step behaviour still work; existing Stepper,
   `useTemplateSchema`, `lib/schema`, `ReviewState/util` and `useFilteredSchemaProperties` tests pass
   (`CI=1 yarn test plugins/scaffolder-react/src/next`).
5. `yarn tsc` and `yarn lint --fix` pass.
6. Template-author docs describe how to make a field depend on an earlier step, with an example.
7. A changeset covers the adopter-facing change.

## Non-goals

- Changing the scaffolder backend's parameter validation (`plugins/scaffolder-backend`).
- Changing `TemplateParameterSchema` or other types in `plugins/scaffolder-common`.
- Any breaking change: existing templates must behave exactly as today, and the change must be strictly
  additive to the public exports of `@backstage/plugin-scaffolder-react`.
- Regenerating API reports inside the run (follow-up: `yarn build:api-reports` if any export changes).

## Gate 0 decisions (approved 2026-10-29)

- Intent: feature-extend. Policy: opus55-plus-sonnet55. Auth mode: estimated.
- Test command: `CI=1 yarn test plugins/scaffolder-react/src/next`; also `yarn tsc` and `yarn lint --fix`.
- Scope frozen exactly as "Files in scope" / "Files off-limits" above.
- `.gitignore` not changed; `.sdlc/` is not gitignored (note for the final report).
- Backend per-step validation and API report regeneration are follow-ups, not part of this run.
