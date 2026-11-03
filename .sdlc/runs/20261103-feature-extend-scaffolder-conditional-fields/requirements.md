# Requirements — Cross-step conditional fields in the Scaffolder form wizard

**Run ID:** `20261103-feature-extend-scaffolder-conditional-fields`
**Mode:** `brownfield` | **Intent:** `feature-extend` (delta requirements against current Scaffolder wizard behavior)

---

## In scope

1. **Cross-step `dependencies` evaluation in the wizard step form:** Enable a parameter step in `plugins/scaffolder-react` to define JSON Schema `dependencies` (including `oneOf`/`allOf` and `if`/`then`/`else` branches inside `dependencies`) whose controlling property is defined and answered in an earlier wizard step, so dependent fields and their validation rules (such as `required`) are dynamically included only when the earlier step's answer satisfies the condition.
2. **Cross-step `if`/`then`/`else` evaluation in the wizard step form:** Enable a parameter step to define top-level or `allOf`/`oneOf`/`anyOf`-nested JSON Schema `if`/`then`/`else` blocks referencing properties answered in an earlier step, so conditional properties and `required` constraints apply in the current step based on prior step answers.
3. **Selective clearing of hidden field values for cross-step conditions only:** When a user navigates back to an earlier step and changes an answer such that a conditional field in a later step becomes hidden, remove that hidden field's value from `stepsState` (so it is neither displayed in the Review step nor submitted to `onCreate`), while preserving existing same-step conditional behavior (values of fields hidden by same-step conditions are **not** cleared).
4. **Cross-step conditional resolution in `ReviewState` (`findSchemaForKey` / `processSchema`):** Update the Review step schema lookup and state rendering so fields controlled by cross-step `dependencies` or `if`/`then`/`else` conditions are shown in the Review table only when their condition is currently satisfied, and omitted when hidden.
5. **Async custom field validation compatibility (`createAsyncValidators`):** Ensure per-step async field validation resolves cross-step conditional schemas accurately against the combined `stepsState` without failing on hidden fields or missing schema definitions for active conditional fields.
6. **Unit and integration tests in `plugins/scaffolder-react` (and `plugins/scaffolder` if touched):** Add React Testing Library and unit tests covering cross-step `dependencies` and `if`/`then`/`else` field visibility, conditional `required` validation, back-navigation value clearing for cross-step hidden fields, preservation of same-step hidden field values, and Review step rendering.
7. **Template author documentation and changeset:** Document cross-step conditional fields with a worked example in `docs/features/software-templates/input-examples.md` and `docs/features/software-templates/writing-templates.md`, and add a single `.changeset/*.md` file for `@backstage/plugin-scaffolder-react` (`minor`, plus `@backstage/plugin-scaffolder` only if modified).

---

## Out of scope

1. **Backend parameter validation:** No changes to `plugins/scaffolder-backend/src/service/router.ts` or any other files under `plugins/scaffolder-backend/**`.
2. **New template schema keywords or shared type changes:** No new template keywords (such as `when` conditions on steps as in PR #34292) and no changes to `plugins/scaffolder-common/**` types or `Template.v1beta3.schema.json`.
3. **Whole-step hiding or skipping:** No hiding, skipping, or dynamic addition/removal of entire wizard parameter steps (PR #36464's territory).
4. **Same-step hidden value clearing:** Do not alter how same-step conditional fields manage `stepsState`; values of fields hidden by a trigger in the same step must remain untouched in `stepsState`, preserving today's behavior.
5. **Legacy frontend system changes:** No changes to the legacy frontend system beyond what shared components in `plugins/scaffolder-react` and `plugins/scaffolder` already receive.
6. **Reading or copying upstream PRs:** Do not inspect or reference upstream PRs #35196, #36464, or #34292.

---

## Functional requirements per module

### Module 1: Stepper & Cross-Step Condition Resolution (`plugins/scaffolder-react`)

- **FR-1 — Resolve per-step active schema against earlier steps' answers**
  - **Files in scope:**
    - `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`
    - `plugins/scaffolder-react/src/next/components/Stepper/*` (optional new helper module and unit test if needed)
    - `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`
    - `plugins/scaffolder-react/src/next/lib/schema.ts`
  - **Delta requirement:** Currently, RJSF evaluates each step's `schema` in isolation and ignores `dependencies` keys whose controlling property is not in the current step's `properties`, and does not resolve cross-step `if`/`then`/`else` branches into the step's rendered `schema`/`uiSchema`. Update the step schema preparation / evaluation flow so that when a step contains `dependencies` or `if`/`then`/`else` (including inside `allOf`/`oneOf`/`anyOf`) referencing properties defined in earlier steps, those conditions are evaluated against the current `stepsState` (answers from earlier steps), and the resulting active `properties`, `required`, and `uiSchema` entries are surfaced to `<Form>` and `createAsyncValidators` for the active step. Same-step conditions must continue to be handled by RJSF exactly as today.

- **FR-2 — Clear values of fields hidden by earlier-step conditions**
  - **Files in scope:**
    - `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`
    - `plugins/scaffolder-react/src/next/components/Stepper/*` (optional new helper module and unit test if needed)
  - **Delta requirement:** Currently, `stepsState` accumulates all field values across steps and never removes keys when a field in step $N$ becomes hidden due to changing an answer in step $M < N$. Update `Stepper` state management (on step transition, state update, or before review/submission) so that any field in a later step whose visibility is controlled by an earlier step's answer has its value removed from `stepsState` whenever that cross-step condition is no longer satisfied. Fields controlled solely by same-step conditions must **not** have their values cleared when hidden.

- **FR-3 — Support cross-step conditional fields in async validation**
  - **Files in scope:**
    - `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`
    - `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`
  - **Delta requirement:** Ensure `createAsyncValidators` receives the resolved step `mergedSchema` (or evaluates against `formData` with cross-step conditions resolved) so custom field validators run on visible cross-step conditional fields and do not run on fields hidden by an unsatisfied cross-step condition.

- **FR-4 — Stepper and schema hook tests**
  - **Files in scope:**
    - `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx`
    - `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts`
    - `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx`
    - `plugins/scaffolder-react/src/next/lib/schema.test.ts`
  - **Delta requirement:** Add tests verifying:
    1. A step-2 field controlled by a step-1 flag (via `dependencies` and via `if`/`then`) renders only when the step-1 flag is set.
    2. Conditional `required` validation on the step-2 field blocks advancing only when the step-1 flag is set, and allows advancing without filling the field when the step-1 flag is unset.
    3. Navigating back to step 1 and unsetting the flag removes the step-2 field and clears its previously entered value from the Review step and `onCreate` payload.
    4. Same-step `dependencies`, `if`/`then`/`else`, and `oneOf` conditions continue to work and retain hidden field values in `stepsState`.

### Module 2: Review Step (`plugins/scaffolder-react`)

- **FR-5 — Omit fields hidden by cross-step conditions and include active cross-step conditional fields in `ReviewState`**
  - **Files in scope:**
    - `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx`
    - `plugins/scaffolder-react/src/next/components/ReviewState/util.ts`
    - `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx`
    - `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts`
  - **Delta requirement:** Currently, `findSchemaForKey` in `ReviewState/util.ts` only populates `data` for keys listed in `schema.dependencies` (missing `if`/`then`/`else` conditions), and `ReviewState.tsx` falls back to rendering `[[formatKey(key), value]]` even when `findSchemaForKey` returns `null`. Update `ReviewState` and `findSchemaForKey` so that:
    1. Cross-step `dependencies` and `if`/`then`/`else` conditions are evaluated using `formState` when looking up a field's schema definition in `findSchemaForKey` and `processSchema`.
    2. Fields that belong to a cross-step conditional branch that is currently inactive (and whose values were cleared or are hidden by an earlier step's condition) do not appear in the Review table.
    3. Existing `ReviewState` behavior for standard properties, same-step `dependencies`, password/secret masking, `ui:backstage.review` options, and nested objects remains intact.

### Module 3: Template Wizard Wiring & Public API Reports (`plugins/scaffolder-react`, `plugins/scaffolder`)

- **FR-6 — Preserve wizard page and editor preview compatibility**
  - **Files in scope:**
    - `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`
    - `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.test.tsx`
    - `plugins/scaffolder/src/alpha/components/TemplateEditorPage/**` (only if wiring changes are required)
    - `plugins/scaffolder-react/report.api.md`
    - `plugins/scaffolder-react/report-alpha.api.md`
  - **Delta requirement:** Keep `Workflow` and `Stepper` props backward-compatible so `TemplateWizardPage` and `TemplateEditorPage` require no breaking wiring changes. Only touch `plugins/scaffolder` or `report*.api.md` if a signature change in `plugins/scaffolder-react` requires it (preferring internal helpers that leave public API signatures unchanged).

### Module 4: Documentation & Release Notes (`docs`, `.changeset`)

- **FR-7 — Document cross-step conditional fields for template authors**
  - **Files in scope:**
    - `docs/features/software-templates/input-examples.md`
    - `docs/features/software-templates/writing-templates.md`
  - **Delta requirement:** Update the "Use parameters as conditional for fields" section in `input-examples.md` and the `spec.parameters` section in `writing-templates.md` to explain how a parameter step can conditionally show and require fields based on answers from an earlier step (with a complete worked YAML example) and note that values of cross-step conditional fields are cleared if the user goes back and changes the earlier step's answer.

- **FR-8 — Add changeset for published package(s)**
  - **Files in scope:**
    - `.changeset/*.md`
  - **Delta requirement:** Create one new changeset file by hand (do not run the changeset CLI) with a `minor` bump for `@backstage/plugin-scaffolder-react` (and `@backstage/plugin-scaffolder` only if files in `plugins/scaffolder` are modified), written in adopter-facing language without internal symbol names.

---

## Non-functional requirements

- **NFR-1 — Backward compatibility for existing templates:** All existing single-step and multi-step Scaffolder templates using `properties`, `dependencies`, `oneOf`/`anyOf`/`allOf`, `if`/`then`/`else`, `ui:order`, and `ui:backstage` (including `featureFlag` and `review` options) must continue to behave identically to today. Same-step conditional fields must keep their hidden values in `stepsState`.
- **NFR-2 — No breaking public API changes:** Public exports in `@backstage/plugin-scaffolder-react` and `@backstage/plugin-scaffolder-react/alpha` (`Stepper`, `StepperProps`, `useTemplateSchema`, `ParsedTemplateSchema`, `extractSchemaFromStep`, `ReviewState`, `createAsyncValidators`) must not introduce breaking changes. If any public or `@alpha` signature is extended, API reports (`report.api.md`, `report-alpha.api.md`) must stay in sync via `yarn build:api-reports`.
- **NFR-3 — Repository license header convention:** Every newly created `.ts` or `.tsx` source file must start with the standard Backstage Apache 2.0 license header dated `2026`. Existing files must keep their current copyright year unchanged.
- **NFR-4 — Code style and testing conventions:** Match each package's existing TypeScript and React style. React Testing Library tests must use `screen` and `findBy*`/`getBy*`/`queryBy*` queries rather than `waitFor` where possible, must not introduce `data-testid` attributes, and must prefer fewer, thorough user-journey tests.
- **NFR-5 — Verification and tool constraints:**
  - The verification command for the run is, word for word:
    `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
  - Never run lint with `--fix` (e.g., never run `yarn lint --fix`).
  - Never run `yarn build`, `yarn release`, `yarn changesets version`, or the `changeset` CLI.

---

## PII inventory

No new PII fields, storage mechanisms, telemetry payloads, or external data transmissions are introduced by this feature. The Scaffolder wizard already holds template form input in client-side React state (`stepsState`) and masks secret/password fields in `ReviewState`.

| Field | Sensitivity | Protection |
| :--- | :--- | :--- |
| None (no new PII fields introduced; existing template `stepsState` values remain in-memory React state) | N/A | Existing `ui:widget: password`, `ui:field: Secret`, and `ui:backstage.review.mask` / `show: false` protections in `ReviewState` remain unchanged; cross-step hidden values are cleared from `stepsState` when their condition becomes false. |

---

## Role matrix

This feature operates purely on client-side form schema evaluation and state management in the Scaffolder wizard. It introduces no authentication or authorization changes.

| Role | Resource | Action | Permission / Authz Impact |
| :--- | :--- | :--- | :--- |
| **Template Author** | Software Template YAML (`spec.parameters`) | Author multi-step schemas with cross-step `dependencies` or `if`/`then`/`else` conditions | No authz change (catalog entity registration rules unchanged). |
| **Template User** | Scaffolder Wizard (`Stepper`, `ReviewState`) | Fill multi-step form, navigate forward/back, review active parameters, and trigger `onCreate` | No authz change (existing Scaffolder task creation and permission checks unchanged). |

---

## Acceptance criteria

- **AC-1:** React Testing Library tests on `Stepper` (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx`) verify that a step-2 field controlled by a step-1 condition (`dependencies` and/or `if`/`then`) appears in step 2 only when the step-1 flag is set.
- **AC-2:** The step-2 conditional field's `required` validation applies only when the step-1 flag is set; when the step-1 flag is unset, the user can advance past step 2 to the Review step without filling the hidden step-2 field.
- **AC-3:** Going back from a later step (or Review step) to step 1 and clearing the controlling flag removes the dependent step-2 field and its value from both the Review step (`ReviewState`) and the values passed to `onCreate`.
- **AC-4:** Existing same-step conditions (`dependencies`, `if`/`then`/`else`, `oneOf`) continue working as today, including preserving the values of fields hidden by a same-step condition.
- **AC-5:** Per-step validation (both synchronous JSON Schema validation and `createAsyncValidators`), back-navigation (`handleBack` and step label clicks), and the Review step (`ReviewState`) continue to work without regressions.
- **AC-6:** The run's exact test, typecheck, and lint command passes with zero errors:
  `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
- **AC-7:** Template-author documentation (`docs/features/software-templates/input-examples.md` and `docs/features/software-templates/writing-templates.md`) describes cross-step conditional fields with a worked example, and a new changeset in `.changeset/` covers `@backstage/plugin-scaffolder-react` (`minor`, plus `@backstage/plugin-scaffolder` only if modified).
- **AC-8:** All new and updated React Testing Library tests use `screen` and `findBy*` queries, add no `data-testid` attributes, and prefer fewer, thorough tests.

---

## Open questions for HITL

None. All scope, behavioral, and verification questions were resolved in Gate 0 (specifically: hidden field values are cleared only when their condition depends on an earlier step's answer, while same-step conditions retain their current behavior).
