# Requirements — Scaffolder Cross-Step Conditional Fields

## In scope

1. **Cross-step conditional field rendering in `Stepper` (`@backstage/plugin-scaffolder-react`)**: Support JSON Schema conditional constructs (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, `anyOf`) in a wizard step (`plugins/scaffolder-react/src/next/components/Stepper/**`, `plugins/scaffolder-react/src/next/hooks/**`, `plugins/scaffolder-react/src/next/lib/**`) that depend on parameter values answered in an earlier step of `Stepper`, so that conditional fields in a later step are shown or hidden based on earlier steps' answers in `stepsState`.
2. **Per-step conditional validation in `Stepper` (`@backstage/plugin-scaffolder-react`)**: Enforce JSON Schema `required` and field validation rules on cross-step conditional fields only when the condition on the earlier step's answer is satisfied, without breaking per-step validation (`createAsyncValidators` and RJSF `validator`) or existing same-step conditional validation.
3. **Back-navigation Review step filtering (`@backstage/plugin-scaffolder-react`)**: Ensure that navigating back (`handleBack` or step label click in `Stepper`) and changing an earlier step's answer updates what the form and Review step show and validate (`ReviewState` and `findSchemaForKey` in `plugins/scaffolder-react/src/next/components/ReviewState/**`) so fields whose cross-step or same-step conditions are no longer met are excluded from the Review step (`ReviewState`).
4. **Template wizard and template editor form preview compatibility (`@backstage/plugin-scaffolder`)**: Ensure `TemplateWizardPage` (`plugins/scaffolder/src/alpha/components/TemplateWizardPage/**`), `TemplateEditorForm` (`plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm*`), and `TemplateFormPreviewer` (`plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPreviewer*`) work seamlessly with cross-step conditional schemas.
5. **Unit and integration tests (`@backstage/plugin-scaffolder-react` and `@backstage/plugin-scaffolder`)**: Add React Testing Library tests in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (and companion unit tests in `ReviewState`, `hooks`, or `lib` as needed) verifying cross-step field visibility, conditional `required` validation, and removal from the Review step after back-navigation and toggling the earlier step's flag.
6. **Template-author documentation (`docs/features/software-templates/`)**: Update `docs/features/software-templates/input-examples.md` (under `## Use parameters as conditional for fields`) and, if applicable, `docs/features/software-templates/writing-templates.md` (under `## spec.parameters - FormStep | FormStep[]`) to document and show examples of conditional fields that depend on answers from an earlier step.
7. **Changesets and API reports**: Add changeset file(s) matching `.changeset/*cross-step*.md` covering each changed published package (`@backstage/plugin-scaffolder-react` and, if modified, `@backstage/plugin-scaffolder`), and update allowlisted API reports (`plugins/scaffolder-react/report*.api.md`, `plugins/scaffolder/report*.api.md`) only if public/alpha API signatures change.

## Out of scope

1. Backend Scaffolder task execution or action condition evaluation (`@backstage/plugin-scaffolder-backend`, `spec.steps[].if`), as cross-step parameter conditionals are a frontend form wizard capability.
2. Modifying any files outside the brief's allowlisted "Files in scope" (including `.gitignore`, `.claude/**`, `docs/releases/**`, ESLint/Prettier/TypeScript configuration files, existing `.changeset/*.md` files, or non-allowlisted `report*.api.md` files).
3. Consulting or copying from closed PR #35196, other PRs linked from issue `backstage/backstage#31895`, or `master` branch versions of files outside this checkout.
4. Conditional hiding or skipping of entire wizard steps based on earlier step answers (only fields within steps conditioned via JSON Schema constructs are in scope; step-level filtering remains governed by `ui:backstage.featureFlag` in `useTemplateSchema`).
5. Changing the values submitted when the task is created: the data passed to `onCreate` when the task is created remains unchanged.

---

## Functional requirements per module

### Module 1: `@backstage/plugin-scaffolder-react` — Per-step schema extraction, `Stepper`, and `ReviewState`

- **FR-1 (Cross-step conditional schema resolution)**: When `useTemplateSchema` (`plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`), `extractSchemaFromStep` (`plugins/scaffolder-react/src/next/lib/schema.ts`), and `Stepper` (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`) prepare and render `currentStep.schema` and `mergedUiSchema` for the active step (`steps[activeStep]`), conditional constructs (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, `anyOf`) that reference properties defined in earlier steps of `manifest.steps` must evaluate against the accumulated `stepsState` without re-rendering the earlier step's controlling field as a visible input in the later step.
- **FR-2 (Standard JSON Schema condition evaluation)**: Conditions must evaluate according to standard JSON Schema semantics—the same semantics used by the backend's parameter validation in `plugins/scaffolder-backend/src/service/router.ts` (around line 590, which validates the full submitted `values` against each `spec.parameters` step schema with the `jsonschema` package's `validate`)—with no special-case handling for an unset flag. Templates that condition a later step's fields on an earlier step's boolean flag use a standard JSON Schema condition that cannot match when the flag is unset, such as an `if` that lists the flag under `required` (for example `if: { properties: { flag: { const: true } }, required: [flag] }`) or `dependencies` keyed on the flag.
- **FR-3 (Per-step conditional `required` and custom field validation)**: On clicking Next or Review (`handleNext` in `Stepper.tsx`), validation of the active step via RJSF `validator` and `createAsyncValidators(steps[activeStep]?.mergedSchema, validators, { apiHolder })` (`plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`) must enforce `required` and field validators for cross-step conditional fields only when the earlier step's condition is met, and must allow advancing when the condition is not met.
- **FR-4 (Preservation of same-step conditionals and per-step validation)**: Existing same-step `dependencies` and `if`/`then`/`else` behavior, `ui:*` extraction in `extractSchemaFromStep`, feature-flag filtering in `useTemplateSchema`, and per-step validation in `Stepper` must continue to work without regression.
- **FR-5 (Back-navigation Review step visibility)**: When a user fills in a conditional field in a later step, navigates back to an earlier step (via `handleBack` or clicking a prior `MuiStepLabel` in `Stepper.tsx`), and changes the controlling answer so the later step's condition is no longer satisfied, what the form shows and validates—including the Review step (`ReviewState` in `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` and `findSchemaForKey` in `plugins/scaffolder-react/src/next/components/ReviewState/util.ts`)—must reflect the updated condition so the now-inactive conditional field does not appear in `ReviewState`.
- **FR-6 (`ReviewState` and `findSchemaForKey` cross-step display resolution)**: `findSchemaForKey` (`plugins/scaffolder-react/src/next/components/ReviewState/util.ts`) and `ReviewState` (`plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx`) must accurately resolve schema definitions for fields defined inside cross-step `dependencies` and `if`/`then`/`else` blocks using the full `formState` across steps, formatting visible fields with their schema `title` / `ui:backstage.review` options and omitting conditional fields from the `ReviewState` table when their controlling cross-step or same-step condition is not active.

### Module 2: `@backstage/plugin-scaffolder` — Wizard and Template Editor wiring

- **FR-7 (`TemplateWizardPage`, `TemplateEditorForm`, and `TemplateFormPreviewer` compatibility)**: `TemplateWizardPage` (`plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`), `TemplateEditorForm` (`plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx`), and `TemplateFormPreviewer` (`plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPreviewer.tsx`) must pass template step schemas to `Workflow` / `Stepper` such that cross-step conditional fields work consistently both in the production template wizard and in the template editor live form preview.

### Module 3: Documentation and Changesets

- **FR-8 (Template-author documentation)**: Update `docs/features/software-templates/input-examples.md` (and `docs/features/software-templates/writing-templates.md` if appropriate) to explain and provide a YAML example showing how a step in `spec.parameters` can conditionally show and require fields based on a parameter value collected in an earlier step, using a condition that cannot match when the earlier step's flag is unset (an `if` that lists the flag under `required`, such as `if: { properties: { flag: { const: true } }, required: [flag] }`, or `dependencies` keyed on the flag).
- **FR-9 (Changeset generation)**: Create adopter-facing changeset file(s) matching `.changeset/*cross-step*.md`:
  - `@backstage/plugin-scaffolder-react` (`minor` bump on `3.0.0-next.0`) describing support for cross-step conditional fields in the Scaffolder form wizard in plain language without internal symbol names.
  - `@backstage/plugin-scaffolder` (`minor` for a feature or `patch` for a fix on `1.41.0-next.0`, in a separate changeset file if its message differs), only if files in `plugins/scaffolder/` are modified.

---

## Non-functional requirements

- **NFR-1 (Code style and license headers)**: Any modified files must match the surrounding file's TypeScript/React conventions, and any newly created source files must include the standard Backstage Apache 2.0 license header with year `2026`.
- **NFR-2 (Testing standards)**: Tests must follow `.claude/CLAUDE.md` rules: prefer fewer, thorough tests; use React Testing Library with `screen` and `findBy*` queries over `waitFor`; and do not add `data-testid` attributes to implementation components.
- **NFR-3 (Documentation style)**: Documentation updates in `docs/features/software-templates/input-examples.md` and `docs/features/software-templates/writing-templates.md` must follow `docs/contribute/doc-style-guide.md` (U.S. English, active voice, present tense, sentence-case headings, `yaml` fenced code blocks, meaningful variable names rather than `foo`/`bar`).
- **NFR-4 (Public API stability)**: Public and `@alpha` exports in `@backstage/plugin-scaffolder-react` and `@backstage/plugin-scaffolder` must remain backward-compatible. API report files (`plugins/scaffolder-react/report.api.md`, `plugins/scaffolder-react/report-alpha.api.md`, `plugins/scaffolder/report.api.md`, `plugins/scaffolder/report-alpha.api.md`) must only be modified if public/alpha API signatures change.
- **NFR-5 (Type safety and lint compliance)**: All changes must pass TypeScript type checking (`yarn tsc`) and repository linting (`yarn lint:all`) with zero errors.

---

## PII inventory

No new PII fields or data stores are introduced by this feature. Existing Scaffolder form state (`stepsState` / `formState`) is handled transiently in browser memory and masked in `ReviewState` as before:

| Field | Sensitivity | Protection |
| --- | --- | --- |
| Template parameter values (`stepsState` / `formState` in `Stepper` and `ReviewState`) | Varies by template (user-supplied form inputs; may include secrets/passwords) | Kept in component state only; fields with `ui:widget: 'password'`, `ui:field: 'Secret'`, or `ui:backstage.review.mask` / `ui:backstage.review.show: false` remain masked (`******` or custom mask) or hidden in `ReviewState`; inactive conditional fields are excluded from `ReviewState` display, while the data passed to `onCreate` stays as it is today. |

---

## Role matrix

No permission or access-control rules change in this feature; existing Scaffolder roles and resource interactions apply:

| Role | Resource | Action |
| --- | --- | --- |
| Authenticated Backstage User | `Stepper` / `TemplateWizardPage` (`spec.parameters` multi-step form) | Fill step inputs, navigate Next/Back across steps, view dynamically conditioned fields in later steps |
| Authenticated Backstage User | `ReviewState` (Review step in `Stepper`) | View active step answers in `ReviewState` (excluding fields whose same-step or cross-step condition is not met) and trigger `onCreate` (the data passed to `onCreate` stays as it is today) |
| Template Author | `TemplateEditorForm` / `TemplateFormPreviewer` & `docs/features/software-templates/*` | Author and preview multi-step templates with cross-step `dependencies` or `if`/`then` conditional fields |

---

## Acceptance criteria

- **AC-1**: React Testing Library tests in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx`—using a standard JSON Schema condition that cannot match when the step-1 flag is unset (an `if` that lists the flag under `required`, such as `if: { properties: { flag: { const: true } }, required: ['flag'] }`, or `dependencies` keyed on the flag)—verify that a step-2 field conditioned on the step-1 flag appears in Step 2 only when the step-1 flag is set, and does not appear in Step 2 when the step-1 flag is unset or false.
- **AC-2**: The same tests in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` verify that the step-2 conditional field's `required` validation applies only when the step-1 flag is set (blocking advancement to Review when empty, and allowing advancement to Review without the field when the step-1 flag is not set).
- **AC-3**: The same tests in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` verify that after filling the step-2 conditional field and reaching the Review step, navigating back to Step 1 and unsetting the step-1 flag removes the step-2 conditional field from the Review step (`ReviewState`).
- **AC-4**: All existing tests in `plugins/scaffolder-react` and `plugins/scaffolder` (including `Stepper.test.tsx`, `ReviewState.test.tsx`, `util.test.ts`, `useTemplateSchema.test.tsx`, and `schema.test.ts`) pass without regression.
- **AC-5**: The Gate 0 approved test, typecheck, and lint command passes cleanly:
  `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
- **AC-6**: `docs/features/software-templates/input-examples.md` (and `docs/features/software-templates/writing-templates.md` if updated) documents how template authors can define conditional fields that depend on answers from an earlier step, conforming to `docs/contribute/doc-style-guide.md`.
- **AC-7**: Adopter-facing changeset file(s) matching `.changeset/*cross-step*.md` exist for each changed published package (`@backstage/plugin-scaffolder-react` as `minor`, and `@backstage/plugin-scaffolder` if changed) with plain-language descriptions containing no internal symbol names.

---

## Open questions for HITL

None. The scope, behavior, target files, and acceptance criteria are fully specified in the approved Gate 0 intent brief.
