# Requirements (delta) — Scaffolder conditional fields across wizard steps

Run: `20261031-0945-feature-extend-scaffolder-cross-step-conditions` · intent: feature-extend · requested in backstage/backstage#31895 (an earlier attempt, PR #35196, was closed unmerged).

## Current behavior (what changes)

The `next` Scaffolder wizard (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`) keeps every answer in one `stepsState` object and renders each step with `schema={currentStep.schema}` and `formData={stepsState}`. Conditions inside a step's schema (`dependencies`, `if`/`then`/`else`) are written for, and only reliably work against, fields of the same step:

- The per-step custom validation (`createAsyncValidators`) walks the step's `mergedSchema` and the data submitted for that step; a conditional branch that depends on an earlier-step answer is not resolved against that answer.
- The review step (`ReviewState`, `findSchemaForKey`) resolves a key's schema with only the step's own `dependencies` keys as data, so `if`/`then`/`else` branches and conditions on earlier-step answers are not resolved; a field whose condition is false is still listed (under a generated label), including a value left over after the user went back and changed the earlier answer.

## In scope

1. Conditions in a step's schema — property and schema `dependencies`, and `if`/`then`/`else` (including nested in `allOf`) — evaluate against the answers of all earlier steps together with the current step's answers.
2. Required validation of a conditionally required field applies only while its condition holds, in both the form's own validation and the custom field validation run on Next.
3. The review step lists a conditional field only while its condition holds against the final answers.
4. Back-navigation keeps answers; changing an earlier answer re-evaluates later steps' conditions and the review step.
5. The same behavior in the template editor preview (`plugins/scaffolder/src/alpha/components/TemplateEditorPage/**`) and the template wizard page, with wiring there only if the shared `Stepper` change does not already cover them.
6. Tests (React Testing Library for the Stepper; unit tests for changed helpers), template-author documentation, and a new changeset.

## Out of scope

1. The legacy (non-`next`) form system, beyond what shared code requires.
2. Any template syntax beyond standard JSON Schema `dependencies` / `if`/`then`/`else` evaluated against earlier-step answers (no new `ui:` options, no expression language).
3. Backend, template actions, and the template parameter schema endpoint.
4. Conditions that depend on answers from a _later_ step.
5. Editing existing changesets, release notes (`docs/releases/**`), or ESLint / Prettier / TypeScript config.

## Functional requirements

### Module: scaffolder-react `next` Stepper (`components/Stepper/**`)

- **FR-1** When a step is rendered, its conditional schema parts (`dependencies`, `if`/`then`/`else`) resolve against the combined answers of every earlier step plus the current step, so a field in step N can be shown or hidden by an answer given in step M < N.
- **FR-2** A field that is required only inside a conditional branch whose condition depends on an earlier-step answer blocks Next (with the normal required-field error) only while that condition holds; when it does not hold, Next proceeds without that field.
- **FR-3** Custom field validation (`createAsyncValidators`) on Next validates the fields of the branch that is active for the combined answers (earlier steps plus current step), and does not run validators for fields of an inactive branch.
- **FR-4** Going back to an earlier step keeps every answer already given; after an earlier answer changes, revisiting the later step shows or hides its conditional fields according to the new answer.
- **FR-5** Existing behavior is unchanged for templates without cross-step conditions: same-step `dependencies` and `if`/`then`/`else`, feature-flag filtering of steps and properties (`ui:backstage.featureFlag`), `initialState` / query-string pre-fill, custom field extensions and their validation, layouts, and the `onCreate` call.

### Module: scaffolder-react `next` schema hooks and helpers (`hooks/**`, `lib/**`)

- **FR-6** Parsing a step's schema (`useTemplateSchema`, `extractSchemaFromStep`) keeps `if`/`then`/`else` and `dependencies` that reference properties defined in earlier steps, so the condition reaches the form intact (it is not dropped because the referenced property is absent from the step's own `properties`), and `ui:*` options inside those branches still move to the uiSchema.

### Module: scaffolder-react `next` review step (`components/ReviewState/**`)

- **FR-7** The review step resolves each answer's schema against the combined final answers, so a field defined only in a conditional branch (same-step or cross-step, `dependencies` or `if`/`then`/`else`) is listed only when its branch is active, and is listed with its schema `title` / `ui:backstage.review` options when it is.
- **FR-8** After the user goes back and changes an earlier answer so that a later conditional field's condition no longer holds, the review step no longer lists that field.
- **FR-9** Review options that exist today keep working for conditional fields when their branch is active: `ui:backstage.review.show: false`, `review.mask`, `review.name`, `review.explode`, password / secret masking, and `enumNames`.

### Module: scaffolder alpha pages (`TemplateWizardPage/**`, `TemplateEditorPage/**`)

- **FR-10** The template wizard page and the template editor preview show the cross-step behavior of FR-1 to FR-8. If they render the shared `Stepper` / `Workflow` unchanged, no change is made in `plugins/scaffolder`.

### Companion

- **FR-11** Template-author documentation in `docs/features/software-templates/input-examples.md` (and a pointer from `writing-templates.md` if it fits) shows a two-step example: step 1 asks a yes/no question, step 2 shows and requires extra fields only when step 1 was answered Yes, using `if`/`then` (and notes that `dependencies` works the same way). The docs follow `docs/contribute/doc-style-guide.md`.
- **FR-12** A **new** changeset file in `.changeset/` gives `@backstage/plugin-scaffolder-react` a `minor` bump (and `@backstage/plugin-scaffolder` too, only if it is changed), written for adopters in plain language without code symbols. Existing changesets are not edited.
- **FR-13** The public API does not change unless the design requires it; if it does, `report*.api.md` for the affected package is updated to match.

## Non-functional requirements

- **NFR-1** No new runtime dependencies; reuse `@rjsf/*` (ajv8 validator) and `json-schema-library` already used by the package.
- **NFR-2** New `.ts`/`.tsx` source files carry the Apache 2.0 header with year 2026; existing headers are not touched. Code matches each package's existing style.
- **NFR-3** Tests prefer fewer, thorough tests with several assertions; React Testing Library tests use `screen` and `findBy*` over `waitFor` and add no test IDs to the implementation.
- **NFR-4** No noticeable slowdown: condition resolution runs only on render / Next / review of the current wizard, not on every keystroke beyond what the form already does.
- **NFR-5** `yarn build`, `changesets version` and `release` are never run.

## PII inventory

| Field                                                | Sensitivity                             | Protection                                                                                                                                                             |
| ---------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Template form answers (any field a template defines) | Varies by template; may include secrets | No change in storage or transport. Existing review masking (`ui:widget: password`, `ui:field: Secret`, `review.mask`) must keep applying to conditional fields (FR-9). |

## Role matrix

| Role                 | Resource                   | Action                                                     |
| -------------------- | -------------------------- | ---------------------------------------------------------- |
| Template user        | Scaffolder wizard form     | Fill steps, go back, review, create — unchanged            |
| Template author      | Template `spec.parameters` | May now write conditions referring to earlier-step answers |
| Template editor user | Template editor preview    | Preview the same behavior — unchanged permissions          |

No permission or authorization change.

## Acceptance criteria

- **AC-1** A React Testing Library test on the `Stepper` with a two-step template (step 1: a boolean / yes-no flag; step 2: a field shown via `if`/`then` on that flag) shows the step-2 field when the flag is set and does not show it when the flag is unset.
- **AC-2** In the same scenario the step-2 field is required only when the flag is set: Next/Review is blocked with a required error when the flag is set and the field is empty, and proceeds when the flag is unset.
- **AC-3** A test that sets the flag, fills the step-2 field, reaches review (field listed), goes back to step 1, unsets the flag, and returns to review shows the field is no longer listed.
- **AC-4** The existing tests in `plugins/scaffolder-react` and `plugins/scaffolder` pass, including every existing `Stepper`, `ReviewState`, `useTemplateSchema` and `schema` test.
- **AC-5** `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` passes (failures already present before the run excepted and reported).
- **AC-6** `docs/features/software-templates/input-examples.md` contains the cross-step example of FR-11, and a new `.changeset/*.md` exists per FR-12.

## Open questions for HITL

**Resolved at Gate 1 (approved, no answer given): the default applies.** A field whose cross-step condition no longer holds is dropped from the Review step only; the values submitted by `onCreate` stay as today.

1. **Submitted values of hidden fields.** When a field's cross-step condition stops holding after the user goes back, should its stale value also be removed from what `onCreate` submits, or only from the review step? **Default if not answered: only from the review step** — the submitted values stay as today, which keeps the change narrow and leaves same-step behavior untouched. Removing it from the submission too is a stricter behavior change that could affect existing templates relying on today's behavior.
