# Delta Requirements — Cross-Step Conditional Fields in the Scaffolder Form Wizard

- **Run ID:** `20261104-170641-feature-extend-cross-step-conditional-fields`
- **Mode:** `brownfield`
- **Intent:** `feature-extend`
- **Brief:** `.sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/intent_brief.md`

---

## In scope

1. **Cross-step conditional field rendering in `Stepper`:** Support JSON Schema conditional constructs (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, `anyOf`) in a wizard step (`step[N]`) that reference parameter keys answered in one or more earlier steps (`step[0..N-1]`), showing and hiding conditional fields dynamically based on the shared `stepsState` without re-rendering earlier steps' input controls in the later step.
2. **Cross-step conditional `required` and schema validation in `Stepper`:** Enforce JSON Schema `required` and property validation rules introduced by cross-step `dependencies` or `if`/`then`/`else` branches only when the condition on the earlier step's value is satisfied, allowing the step to submit without those fields when the condition is not satisfied (including when an earlier boolean or optional field was left unset/`undefined`).
3. **Cross-step async custom-field validation (`createAsyncValidators`):** Resolve conditional field definitions in `createAsyncValidators` against the accumulated cross-step `formData` and step schema so custom field extension validators on conditionally revealed fields run when the cross-step condition is active and are skipped when inactive.
4. **Stale conditional state pruning on back-navigation and condition change:** When a user navigates back to an earlier step and changes an answer such that a later step's conditional field is no longer active in any step's resolved schema, omit/remove that inactive field (and its stale value) from `ReviewState` display and from the final `onCreate` payload.
5. **Cross-step schema resolution in `ReviewState` (`findSchemaForKey` and `ReviewState`):** Resolve conditional properties in `ReviewState` (`findSchemaForKey` and `processSchema`) using the full cross-step `formState` across `dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, and `anyOf` so review metadata (titles, `ui:backstage.review` masking/hiding, `enumNames`, password/secret masking) and field visibility accurately reflect active cross-step conditions.
6. **Automated unit and integration tests:** Add React Testing Library and unit tests across `Stepper.test.tsx`, `createAsyncValidators.test.ts`, `utils.test.ts`, `schema.test.ts`, `useTemplateSchema.test.tsx`, `ReviewState.test.tsx`, and `ReviewState/util.test.ts` covering cross-step conditional rendering, conditional `required` validation, back-navigation state cleanup, and review table rendering.
7. **Template-author documentation and release changeset:** Document cross-step conditional parameters with a worked YAML example in `docs/features/software-templates/input-examples.md` (and `docs/features/software-templates/writing-templates.md` if needed), add `.changeset/scaffolder-cross-step-conditional-fields.md`, and regenerate API reports via `yarn build:api-reports` if any public/alpha signature changes.

---

## Out of scope

1. **Backend parameter validation:** Any changes to `plugins/scaffolder-backend` or server-side task parameter validation.
2. **Custom non-JSON-Schema template syntax:** Introducing new custom YAML directives or non-standard JSON Schema keywords beyond standard Draft-07 `dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, and `anyOf`.
3. **Stepper UI or legacy form redesign:** Redesigning the `Stepper` layout, step navigation controls, step header/stepper bar, or legacy (non-`next`) Scaffolder components.
4. **Files outside the Gate 0 28-path allowlist:** Modifying any off-limits files including `.gitignore`, `.claude/**`, `.cursor/**`, `AGENTS.md`, `.github/copilot-instructions.md`, `docs/releases/**`, `**/CHANGELOG.md`, `.changeset/pre.json`, existing `.changeset/*.md` files, or ESLint/Prettier/TypeScript configuration files.

---

## Functional requirements per module

### Module 1: Step Schema Extraction & Hook Resolution
**Files in scope:**
- `plugins/scaffolder-react/src/next/lib/schema.ts`
- `plugins/scaffolder-react/src/next/lib/index.ts`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`
- `plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts`

- **FR-1 (UI schema extraction for conditional branches):** `extractSchemaFromStep` in `plugins/scaffolder-react/src/next/lib/schema.ts` must continue to extract `ui:*` properties from `properties`, `items`, `dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, and `anyOf` without losing `uiSchema` definitions when a step's conditional branch references a property defined in an earlier step.
- **FR-2 (Step schema preservation for conditional-only steps):** `useTemplateSchema` in `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` must preserve `dependencies`, `if`, `then`, `else`, `allOf`, `oneOf`, and `anyOf` on each step's `schema` and `mergedSchema`, ensuring steps that define fields solely inside conditional blocks (with or without top-level `properties`) retain their conditional schemas and `type: 'object'` structure after feature-flag filtering.

### Module 2: Stepper Form Rendering, Validation & State Management
**Files in scope:**
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`
- `plugins/scaffolder-react/src/next/components/Stepper/utils.ts`
- `plugins/scaffolder-react/src/next/components/Stepper/index.ts`

- **FR-3 (Cross-step condition evaluation in `Stepper`):** When `Stepper` renders the active step's `<Form>`, conditional schemas (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, `anyOf`) in `currentStep.schema` that reference properties from earlier steps (`steps[0..activeStep - 1]`) must be evaluated against the current `stepsState` (including treating unset boolean/optional properties from earlier steps appropriately so `if: { properties: { flag: { const: true } } }` does not evaluate to `true` when `flag` is `undefined` or `false`).
- **FR-4 (No duplicate rendering of earlier-step control fields):** Resolving cross-step conditions for the active step must not cause fields declared in earlier steps (and referenced only as condition predicates in `dependencies` or `if`/`oneOf` branches of the active step) to be rendered as visible form inputs in the active step, unless the active step explicitly re-declares that field as an editable property of the active step.
- **FR-5 (Conditional `required` and AJV validation per step):** When a cross-step condition in `steps[activeStep]` is satisfied, any `required` constraints and property schemas inside the active conditional branch must be enforced by RJSF/AJV on step submission (`handleNext`). When the cross-step condition is not satisfied, those conditional `required` constraints and property schemas must not block step submission.
- **FR-6 (Cross-step async custom field validation):** `createAsyncValidators` in `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts` must resolve the active step's schema against the accumulated `formData` (including values from earlier steps) so custom field validators attached via `ui:field` inside conditional branches (`dependencies`, `if`/`then`/`else`, `allOf`, `oneOf`, `anyOf`) are executed when the branch is active and skipped when inactive.
- **FR-7 (Pruning inactive conditional field values on step changes):** When a user fills in a conditional field in a later step, navigates back to an earlier step (via the **Back** button or clickable step label), and changes the earlier step's answer so the later step's conditional field is no longer part of any step's active schema for the current `stepsState`, the inactive conditional field and its value must be excluded from the Review step and omitted from the values passed to `onCreate`.

### Module 3: Review Step Schema Lookup & Display
**Files in scope:**
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts`

- **FR-8 (Cross-step condition resolution in `findSchemaForKey`):** `findSchemaForKey` in `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` must evaluate each step's `mergedSchema` using condition data from `formState` across all steps—supporting not only `dependencies` on same-step or earlier-step keys, but also `if`/`then`/`else`, `allOf`, `oneOf`, and `anyOf` conditions—without falsely matching keys that are not defined in the step's active schema for the current `formState`.
- **FR-9 (Filtering inactive conditional fields in `ReviewState`):** `ReviewState` in `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` must only display properties that are active in the resolved schemas (when `schemas` are provided) or valid under the current `formState`, while preserving existing behavior when `schemas` is empty (`schemas={[]}`) and preserving all `ui:backstage.review` (`mask`, `show: false`, `name`, `explode`), `enumNames`, and `password`/`Secret` masking rules for active conditional fields.

### Module 4: Workflow & Template Editor / Wizard Integration
**Files in scope:**
- `plugins/scaffolder-react/src/next/components/Workflow/Workflow.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPreviewer.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`

- **FR-10 (Transparent propagation to Workflow and Template Editor preview):** Because `Workflow`, `TemplateWizardPage`, `TemplateEditorForm`, and `TemplateFormPreviewer` render `Stepper` from `@backstage/plugin-scaffolder-react/alpha`, cross-step conditional fields must work identically in both the runtime template wizard and the template editor form preview without breaking existing props or dry-run execution.

### Module 5: Documentation & Release Artifacts
**Files in scope:**
- `docs/features/software-templates/input-examples.md`
- `docs/features/software-templates/writing-templates.md`
- `.changeset/scaffolder-cross-step-conditional-fields.md`
- `plugins/scaffolder-react/report.api.md`
- `plugins/scaffolder-react/report-alpha.api.md`
- `plugins/scaffolder/report.api.md`
- `plugins/scaffolder/report-alpha.api.md`

- **FR-11 (Template-author documentation):** Update `docs/features/software-templates/input-examples.md` under the `"Use parameters as conditional for fields"` section to include a worked multi-step YAML example demonstrating a field in step 2 conditionally shown and required based on a parameter in step 1 (and update `docs/features/software-templates/writing-templates.md` only if a cross-reference pointer is needed).
- **FR-12 (Changeset and API reports):** Create `.changeset/scaffolder-cross-step-conditional-fields.md` with a `minor` bump for `@backstage/plugin-scaffolder-react` (and `@backstage/plugin-scaffolder` only if its published source files change). If any exported public or `@alpha` API signatures change, regenerate API reports using `yarn build:api-reports`.

---

## Non-functional requirements

- **NFR-1 (Backwards compatibility):** Existing single-step conditional schemas (`dependencies`, `if`/`then`/`else`, `oneOf`, `allOf`, `anyOf`), nested object merging across steps (where two steps intentionally define the same property key), feature-flag filtering (`ui:backstage.featureFlag` and `backstage:featureFlag`), query parameter initialization (`useFormDataFromQuery`), custom layouts, and custom `ReviewStepComponent` / `ReviewStateComponent` overrides must remain 100% backwards-compatible.
- **NFR-2 (Testing standards):** All new and updated React Testing Library tests in `plugins/scaffolder-react` must follow repository conventions (`.claude/CLAUDE.md`): prefer `screen` and `findBy*` queries for async assertions, avoid introducing `data-testid` attributes, and keep tests focused and thorough.
- **NFR-3 (Code & license header conventions):** Any newly created source files (if any; note the frozen 28-path allowlist) must include the Apache 2.0 license header with year `2026`; existing files must retain their original copyright header years unchanged.
- **NFR-4 (Documentation style compliance):** Documentation changes in `docs/features/software-templates/input-examples.md` (and `writing-templates.md` if touched) must follow `docs/contribute/doc-style-guide.md` (U.S. English, meaningful variable names rather than `foo`/`bar`/`baz`, bold for UI elements, code fences with `yaml`).
- **NFR-5 (Build, typecheck, and lint cleanliness):** Changes must pass `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` with zero TypeScript or ESLint errors, without running forbidden commands (`yarn build`, `yarn release`, or the interactive changeset CLI).

---

## PII inventory

This feature extends client-side JSON Schema form evaluation in `@backstage/plugin-scaffolder-react` and does not introduce any new database tables, persistence layers, analytics payloads, or external network transmissions. Template parameter values held in `stepsState` may contain user-supplied data as summarized below:

| Field | Sensitivity | Protection |
|---|---|---|
| `stepsState` / `formData` (arbitrary template parameters in `Stepper`) | Low to Medium (may include component names, owner entity refs, repo URLs, or user inputs) | Held in transient React component state in browser memory; inactive conditional fields are pruned when conditions become false before `onCreate` submission. |
| Secret / password fields (`ui:field: Secret` or `ui:widget: password`) | High (tokens, passwords, credentials entered in template steps) | Stored via `SecretsContext` / masked in `ReviewState` as `'******'`; never logged or exposed in analytics events. |
| Masked or hidden review fields (`ui:backstage.review.mask` / `ui:backstage.review.show: false`) | Medium (fields configured by template authors for masking/omission on review) | Masked with configured replacement string or omitted from `ReviewState` metadata table in both same-step and cross-step conditional branches. |

---

## Role matrix

Client-side conditional field resolution operates within the existing Backstage Scaffolder frontend permission and catalog model; no permission rules are weakened or bypassed.

| Role | Resource | Action |
|---|---|---|
| **Template User (Authenticated Backstage User)** | `Stepper` / `Workflow` (`TemplateWizardPage`) | Fill step 1 parameters, view/fill dynamically resolved conditional fields in subsequent steps, navigate back to modify answers, review active parameters in `ReviewState`, and trigger `onCreate` (`scaffolderApi.scaffold`). |
| **Template Author / Developer** | `TemplateEditorForm` / `TemplateFormPreviewer` (`TemplateEditorPage`) | Author multi-step template YAML with cross-step `dependencies` or `if`/`then`/`else` rules, preview cross-step conditional behavior live in the editor `Stepper`, and execute dry runs. |
| **Unauthenticated / Unauthorized User** | Scaffolder routes & backend actions | Blocked by existing Backstage sign-in and permission framework checks (`task.create` / catalog entity visibility); client-side schema evaluation grants no additional access. |

---

## Acceptance criteria

- **AC-1 (Cross-step field visibility in `Stepper`):** A React Testing Library test in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` verifies that a conditional field in step 2 (defined via `dependencies` and/or `if`/`then`/`else` referencing a step-1 boolean or enum field) is hidden when the step-1 condition is not met and appears in step 2 when the step-1 condition is met.
- **AC-2 (Cross-step conditional `required` validation):** A React Testing Library test in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` verifies that when the step-1 flag is set, submitting step 2 without filling the conditionally `required` field displays a validation error and prevents advancing to Review; when the step-1 flag is unset, step 2 submits and advances to Review without the conditional field.
- **AC-3 (Back-navigation & Review step cleanup):** A React Testing Library test in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` verifies that after setting the step-1 flag, filling the conditional step-2 field, advancing to Review, navigating back to step 1, unsetting the flag, and advancing to Review again, the step-2 conditional field and its value are removed from the Review step and omitted from the `onCreate` callback argument.
- **AC-4 (Regression safety for existing behavior):** All existing and new unit/component tests in `Stepper.test.tsx`, `createAsyncValidators.test.ts`, `utils.test.ts`, `schema.test.ts`, `useTemplateSchema.test.tsx`, `ReviewState.test.tsx`, and `ReviewState/util.test.ts` pass, confirming same-step conditionals, nested object merging, async custom field validators, back-navigation, and `ReviewState` formatting continue to work.
- **AC-5 (Verification command & API report check):** Running `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` from the repository root exits with code `0` (and if any public/alpha API types changed, `yarn build:api-reports` produces clean `report*.api.md` files).
- **AC-6 (Template-author documentation):** `docs/features/software-templates/input-examples.md` contains a clear explanation and valid multi-step YAML example of cross-step conditional fields under `"Use parameters as conditional for fields"`, adhering to `docs/contribute/doc-style-guide.md`.
- **AC-7 (Changeset coverage):** `.changeset/scaffolder-cross-step-conditional-fields.md` exists with a `minor` changeset entry for `@backstage/plugin-scaffolder-react` (and `@backstage/plugin-scaffolder` if modified) describing cross-step conditional field support.

---

## Open questions for HITL

None — all scope boundaries, file allowlist (28 paths), verification commands, and `.gitignore` handling were confirmed and frozen at Gate 0.
