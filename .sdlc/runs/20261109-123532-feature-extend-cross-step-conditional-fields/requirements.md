# Requirements (delta) — Cross-step conditional fields in the Scaffolder form wizard

Run: `20261109-123532-feature-extend-cross-step-conditional-fields` · Intent: `feature-extend` · Upstream request: backstage/backstage#31895 (an earlier attempt, PR #35196, was closed unmerged).

## Current behaviour (what exists, from discovery)

- `Stepper` (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`) keeps every step's answers in one `stepsState` object and renders one rjsf `Form` per step (`key={activeStep}`) with `schema = currentStep.schema` and `formData = stepsState`.
- On "Next", `handleNext` runs the custom field-extension validators (`createAsyncValidators`) against the current step's `mergedSchema`, resolving each property with `json-schema-library` using only the submitted step data.
- The default Review step (`ReviewState` + `findSchemaForKey` in `ReviewState/util.ts`) decides which step owns each answer by resolving the key against each step's schema, passing as data only the answers named by that step's own top-level `dependencies` keys. Conditions written as `if`/`then`/`else` (directly or in `allOf`) and conditions on keys owned by another step are not given the data they need.
- Answers stay in `stepsState` after the condition that showed their field stops holding (for example, after going back and changing the earlier answer).
- The backend (`plugins/scaffolder-backend`, reference only) validates the full answer set against every step's schema, so a cross-step `if`/`then` is evaluated there with all answers present.

## In scope

1. A later parameter step's JSON Schema conditionals — `dependencies` (schema form) and `if`/`then`/`else` (top level or inside `allOf`) — may test answers given in an earlier step.
2. Rendering: the dependent fields of the later step render only while the earlier-step condition holds.
3. Validation: `required` (and other constraints) introduced by the conditional branch apply only while the condition holds, both for rjsf's built-in validation and for custom field-extension validators run on "Next".
4. Review: the default Review step lists a conditional field (and its value) only while its condition holds against the full answer set.
5. Back-navigation: going back, changing the earlier answer, and moving forward again updates the later step's fields and the Review step accordingly.
6. Both consumers get the behaviour: the template wizard (`TemplateWizardPage` via `Workflow`) and the template editor preview (`TemplateEditorPage`, which uses `Stepper` directly), with wiring changes there only if needed.
7. Tests (RTL on `Stepper`, unit tests on any changed helpers), template-author docs, and a changeset.

## Out of scope

1. Any change to `plugins/scaffolder-backend` or `plugins/scaffolder-common` (reference only).
2. Changing the public type shape of `TemplateParameterSchema` or other public types.
3. Reworking same-step conditional behaviour (it must keep working unchanged) or the legacy (non-`next`) form.
4. Custom `ReviewStepComponent` implementations supplied by adopters (they receive the same props as today).
5. Regenerating API reports (`yarn build:api-reports`); if the public API changes, this is flagged in the final report, not done by the run.
6. Adding `.sdlc/` to `.gitignore` (declined at Gate 0).

## Functional requirements

### Module: Stepper (`plugins/scaffolder-react/src/next/components/Stepper/**`)

- **FR-1** — When a step's schema contains a conditional (`dependencies`, or `if`/`then`/`else` at top level or inside `allOf`) whose condition reads a property answered in an earlier step, the Stepper evaluates that condition against all answers collected so far (the full `stepsState` merged with the current step's live form data), not only the current step's data.
- **FR-2** — A field introduced by such a conditional branch is rendered on its step only while the condition holds, and is not rendered while it does not hold (including when the earlier answer is absent).
- **FR-3** — On "Next" (or "Review" on the last step), the `required` list and other constraints of a conditional branch are enforced only while the condition holds. When the condition holds and a required conditional field is empty, the step does not advance and the field shows a required error. When it does not hold, the step advances without that error.
- **FR-4** — Custom field-extension validators (`createAsyncValidators`) resolve each field's schema against the full answer set (earlier steps plus the current step), so a validator attached to a cross-step conditional field runs only while that field is present, and the property resolution of same-step fields is unchanged.
- **FR-5** — Going back to an earlier step, changing the controlling answer so the condition no longer holds, and moving forward again hides the dependent field on the later step and lets the later step advance without its required error.

### Module: Review step (`plugins/scaffolder-react/src/next/components/ReviewState/**`)

- **FR-6** — `findSchemaForKey` (and anything `ReviewState` uses to place answers) resolves conditional schemas with the answers the condition needs from the full form state, covering `dependencies` and `if`/`then`/`else` (top level and inside `allOf`), so a cross-step conditional field whose condition holds is listed under its step with its value.
- **FR-7** — A conditional field whose condition does not hold against the full form state is not listed in the Review step, even if a stale value for it remains in the form state (for example, after back-navigation changed the controlling answer).
- **FR-8** — Answers that are not conditional are listed exactly as today; the existing ordering, formatting (`formatKey`), masking of secret/`ui:widget: password` fields and `ui:backstage.review` options keep their current behaviour.

### Module: Schema helpers and hooks (`plugins/scaffolder-react/src/next/lib/**`, `hooks/**`)

- **FR-9** — Schema extraction (`extractSchemaFromStep` / `extractUiSchema`, `useTemplateSchema`) keeps `ui:*` options of fields declared inside cross-step `dependencies` / `then` / `else` branches, so those fields keep their widgets, help text and review options. Change only if a gap is found; otherwise covered by tests.

### Module: Consumers (`plugins/scaffolder/src/alpha/components/TemplateWizardPage/**`, `TemplateEditorPage/**`)

- **FR-10** — The template wizard and the template editor preview show the cross-step behaviour with no extra configuration from the template author. Edit these files only if the Stepper change needs wiring there.

### Documentation and release

- **FR-11** — `docs/features/software-templates/input-examples.md` gains a section with a complete two-step template example where step 2 shows and requires fields only when a step-1 answer is set (the "Is this a mobile SDK?" example), stating that the controlling answer may live in an earlier step and that hidden fields are left out of the Review step. `writing-templates.md` links to it where conditional parameters are described, if such a place exists. Follows `docs/contribute/doc-style-guide.md`.
- **FR-12** — A new changeset in `.changeset/` covers `@backstage/plugin-scaffolder-react` (`minor`, package is 3.0.0-next.0) and `@backstage/plugin-scaffolder` (`minor`, 1.41.0-next.0) only if that package's source changes; the message is adopter-facing, with no internal symbol names.

## Non-functional requirements

- **NFR-1** — No regression: every existing test under `plugins/scaffolder-react` and `plugins/scaffolder` passes; `yarn tsc` and `yarn lint:all` pass.
- **NFR-2** — Frontend `required`-ness of a cross-step conditional field agrees with the backend's evaluation of the full answer set (the backend validates all answers against each step schema), so a form the frontend accepts is not rejected by the backend with a 400 for that field, and vice versa.
- **NFR-3** — No change to exported/public type signatures. If an exported function gains an optional parameter, it must be optional and backwards compatible; any such change is flagged in the final report as needing `yarn build:api-reports`.
- **NFR-4** — New `.ts`/`.tsx` files carry the Apache 2.0 header with year 2026; existing headers are not changed. Code matches each package's existing style.
- **NFR-5** — Tests follow the repo rules: fewer, thorough tests with several assertions; RTL `screen` and `findBy*` over `waitFor`; no test IDs added to implementation.
- **NFR-6** — No measurable cost per keystroke beyond what the form already does: condition evaluation over the full answer set reuses existing libraries (rjsf `retrieveSchema` / `json-schema-library`), no new dependencies.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Template parameter answers (arbitrary, author-defined) | Varies; may include secrets via `ui:field: Secret` / `ui:widget: password` | Unchanged: existing masking in the Review step and secrets handling must keep working for conditional fields (FR-8). No new storage, logging or transmission of answers. |

## Role matrix

| Role | Resource | Action |
|---|---|---|
| Template author | Template YAML `spec.parameters` | Writes cross-step conditionals (no new permission) |
| Template user | Scaffolder wizard | Fills steps, navigates back, reviews, creates (unchanged permissions) |
| Adopter / integrator | `Stepper`, `Workflow`, `ReviewState` components | Uses them unchanged; no new required props |

No authorization surface changes.

## Acceptance criteria

1. **AC-1** — An RTL test on `Stepper` with a two-step manifest (step 1: boolean `isMobileSdk`; step 2: an `if`/`then` or `dependencies` conditional on `isMobileSdk` adding a required `sdkName`) shows `sdkName` on step 2 only when `isMobileSdk` was set on step 1, and not when it was left unset/false.
2. **AC-2** — In the same suite, with the flag set, pressing Review with `sdkName` empty stays on step 2 and shows a required error; with the flag unset, Review proceeds without it.
3. **AC-3** — In the same suite, after filling `sdkName` with the flag set, going back to step 1, clearing the flag, and moving forward to Review, the Review step does not list `sdkName` or its value; with the flag set it does list it.
4. **AC-4** — Unit tests on the Review helper (`ReviewState/util.test.ts` or `ReviewState.test.tsx`) cover a cross-step `if`/`then` and a cross-step `dependencies` key resolving to their step when the condition holds and to nothing when it does not; existing same-step cases still pass.
5. **AC-5** — Existing tests pass: `CI=true yarn test plugins/scaffolder-react plugins/scaffolder`.
6. **AC-6** — `yarn tsc` and `yarn lint:all` pass.
7. **AC-7** — `docs/features/software-templates/input-examples.md` contains a cross-step conditional example (FR-11).
8. **AC-8** — New source files carry the 2026 Apache 2.0 header; a changeset for `@backstage/plugin-scaffolder-react` (minor) exists in `.changeset/` (FR-12).

## Assumptions

- **A-1** — "Removes it (and its value) from the Review step" is met by hiding the field and its value in the Review step. The stale answer is also dropped from the values sent on Create only if the architect finds this can be done without changing same-step behaviour; otherwise the payload is left as today (the backend ignores properties not in a schema). See Q-1.
- **A-2** — Boolean flags use `const: true` / `enum: [true]` style conditions as in the existing docs examples; no new schema keywords are introduced.

## Open questions for HITL

- **Q-1** — Should a stale answer for a hidden cross-step conditional field also be removed from the values submitted on Create (and from the form state), or only hidden from the Review step? Default (as A-1): hide from Review; the architect may also prune it from the submitted values only if same-step behaviour stays untouched, otherwise the payload stays as today.
