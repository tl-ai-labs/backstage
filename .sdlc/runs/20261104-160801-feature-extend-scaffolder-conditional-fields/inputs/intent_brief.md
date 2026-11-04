# Intent Brief — feature-extend — Scaffolder cross-step conditional fields

## Context

Command seed (verbatim): "Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard."

The user's brief (verbatim, from the interview):

> Module: the Scaffolder form wizard, in plugins/scaffolder-react (Stepper, per-step schema extraction and validation, review step) and plugins/scaffolder (template form wiring and the template editor preview).
>
> New capability: conditional fields (JSON Schema dependencies, if/then) can depend on answers from an earlier step, not only the same step. Example: step 1 asks "Is this a mobile SDK?" and step 2 shows SDK-specific fields only when the answer is Yes. Requested in backstage/backstage#31895.
>
> Before: the step-2 SDK fields show regardless of the step-1 answer (or never show).
> After: the step-2 fields appear only when step 1 was answered Yes, and the Review step lists them only in that case.
>
> Constraints: form data is validated per step against that step's schema; the change must not break validation, back-navigation, the review step or existing same-step conditions. A previous attempt (PR #35196) was closed unmerged.
>
> Acceptance criteria: React Testing Library tests on the Stepper show a step-2 field appears only when a step-1 flag is set, its required validation applies only then, and going back and changing the flag removes it from the review step; existing Stepper tests pass; tsc and lint pass. Update the docs for template authors.

Relevant code on this branch (`BS-FE-08/argon4-agsdk-only`, HEAD `f20fd9b59828`):

- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`: the wizard. It keeps all steps' answers in one `stepsState`, renders each step's `Form` with `formData={stepsState}`, and validates the active step's `mergedSchema` with `createAsyncValidators` on Next.
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` and `plugins/scaffolder-react/src/next/lib/schema.ts`: per-step schema and `ui:` extraction, including from `dependencies`, `then` and `else`, plus feature-flag filtering.
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` and `util.ts`: the review step. `findSchemaForKey` resolves each answer's step using only that step's own `dependencies` keys from the form state.
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx` (renders `Workflow`), and `TemplateEditorPage/TemplateEditorForm.tsx` with `TemplateFormPreviewer.tsx` (the editor preview renders `Stepper`).
- Template-author docs: `docs/features/software-templates/input-examples.md` ("Use parameters as conditional for fields") and `docs/features/software-templates/writing-templates.md` (`spec.parameters`).

The run works from this branch's code and this brief only. It does not consult PR #35196, other PRs linked from the issue, or `master`.

Gate 0 was approved on 2026-11-04 with:

- `vendor` auth
- policy `argon4-agsdk-only`
- the test command under Acceptance criteria
- the scope below, unchanged

`.gitignore` is not in scope, because this checkout already ignores `.sdlc/` through `.git/info/exclude`. The final report repeats that `.gitignore` itself doesn't cover `.sdlc/`.

## Goal

A template's conditional fields (JSON Schema `dependencies`, `if`/`then`) can depend on answers given in an earlier step of the wizard, not only the same step. A step-2 field conditioned on a step-1 answer appears only when that answer matches. Its `required` validation applies only then, and the Review step lists it only in that case.

## Files in scope

`@backstage/plugin-scaffolder-react` (the wizard):

- `plugins/scaffolder-react/src/next/components/Stepper/**`: Stepper, per-step validation and its tests
- `plugins/scaffolder-react/src/next/components/ReviewState/**`: the review step and its tests
- `plugins/scaffolder-react/src/next/hooks/**`: per-step schema extraction (`useTemplateSchema`) and its tests
- `plugins/scaffolder-react/src/next/lib/**`: `extractSchemaFromStep` and its tests

`@backstage/plugin-scaffolder` (form wiring and editor preview):

- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/**`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm*`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPreviewer*`

Companion files:

- `docs/features/software-templates/input-examples.md`
- `docs/features/software-templates/writing-templates.md`
- `.changeset/*cross-step*.md` (new changesets only; no existing changeset matches this name)
- `plugins/scaffolder-react/report.api.md`, `plugins/scaffolder-react/report-alpha.api.md`, `plugins/scaffolder/report.api.md`, `plugins/scaffolder/report-alpha.api.md`: regenerated with the repo's API report tooling, and only if the public API changes
- `plugins/scaffolder-react/package.json`, `plugins/scaffolder/package.json`, `yarn.lock`: only if a dependency is added

## Files off-limits

Discovery's defaults:

- `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`
- `.env`, `.env.*`, `.env.local`, `.envrc`
- `node_modules/**`, `dist/**`, `dist-types/**`, `dist-storybook/**`, `build/**`, `coverage/**`, `.yarn/**`
- `**/report*.api.md` and `**/knip-report.md`, except the four reports named in scope
- `.sdlc/**`, `.git/**`

From the repo's instructions:

- `docs/releases/**`
- ESLint, Prettier and TypeScript config files
- Every existing file in `.changeset/`

How the frozen contract enforces this: off-limits rules are checked before the allowlist. So `**/report*.api.md` and the existing changesets are kept out by not being allowlisted, which the contract refuses by default, rather than by an off-limits pattern. That pattern would also block the four allowlisted reports. The remaining entries are frozen as off-limits patterns, with `**/` variants for nested build output and config files.

## Acceptance criteria

1. React Testing Library tests on the Stepper show that a step-2 field appears only when a step-1 flag is set.
2. The same tests show that the step-2 field's `required` validation applies only when the flag is set.
3. The same tests show that going back and changing the step-1 flag removes the field from the Review step.
4. The existing Stepper tests pass.
5. `yarn tsc` and lint pass.
6. The template-author docs describe conditions on an earlier step's answers.
7. A changeset covers each changed published package.

Test command: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`

## Non-goals

None are stated in the brief beyond its constraints. The change must not break:

- per-step validation
- back-navigation
- the Review step
- existing same-step conditions
