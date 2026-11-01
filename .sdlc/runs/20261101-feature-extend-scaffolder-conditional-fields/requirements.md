# Requirements — feature-extend — Scaffolder conditional fields across wizard steps

Delta requirements. Everything not named here stays as it is today. Source: `intent_brief.md` (backstage/backstage#31895).

## In scope

1. Conditional fields written in a later parameter step with JSON Schema `dependencies` or `if`/`then` can depend on answers given in any earlier step of the form wizard, in the Scaffolder Stepper (`plugins/scaffolder-react`).
2. The Review step and the submitted values, for fields hidden by a cross-step condition.
3. Regression tests that pin same-step behaviour as it is today.
4. Template author documentation and release coverage (changeset, API reports if regenerated).

## Out of scope

1. Hiding whole steps (#34292, #36464).
2. New template syntax or any template schema change.
3. Backend validation changes; `plugins/scaffolder-backend/**` and `plugins/scaffolder-common/**` are off-limits. A backend dry run or task validates as it does today.
4. Replacing the validator (#36467).
5. Any change to same-step conditions, including their stale-value behaviour.
6. Conditions inside a nested object's own schema: only conditions at the top level of a step's schema are in scope (see Open questions, Q2).
7. Conditions that read a field from a later step.

## Definitions

- **Earlier step**: a parameter step positioned before the step that holds the condition.
- **Conditional branch**: the `then` or `else` of a top-level `if` (also inside a top-level `allOf`), or a schema dependency in top-level `dependencies` (the `allOf`/`if` form and the `oneOf` form).
- **Cross-step condition**: a condition that reads at least one field of an earlier step. A condition that reads both an earlier-step field and a field of its own step counts as cross-step (Gate 0).
- **Same-step condition**: a condition that reads only fields of its own step.
- **Resolved field**: a field present in a step's schema once that step's conditions are evaluated against the current answers of every step.

## Functional requirements

### Form wizard (`plugins/scaffolder-react`)

- **FR-1 Cross-step `dependencies`.** A field defined in a `dependencies` branch keyed on an earlier-step field renders in its later step exactly when the earlier answer selects that branch, for the `allOf`/`if` form and the `oneOf` form. Today the wizard ignores such an entry: the resolved schema has `dependencies` removed and adds no property, so the frontend renders no field and raises no error, and the user passes every step. The backend `jsonschema` validation still rejects those values, so the failure surfaces at task creation. This requirement removes that mismatch.
- **FR-2 Cross-step `if`/`then`.** A top-level `if`/`then` (with optional `else`, and inside a top-level `allOf`) in a later step resolves against earlier-step answers, as it does today, and stays that way after this change.
- **FR-3 Required follows the branch.** A field's `required` from a cross-step conditional branch applies only while that branch is selected, in per-step validation and in any validation of the whole form. A user is never blocked on a field that is not on screen.
- **FR-4 Earlier-step fields stay where they belong.** Making earlier answers available to a later step does not render an earlier-step field in the later step, does not validate it there, does not let a later step edit it, and does not list it twice in Review.
- **FR-5 Drop rule.** A value is dropped from Review and from submission only when all of these hold:
  a. its field is defined inside a conditional branch;
  b. that branch's condition is a cross-step condition;
  c. that branch is not selected for the current answers;
  d. no step resolves the field for the current answers.
  A key that another step still resolves is kept.
- **FR-6 One rule for Review and submission.** Review and the values passed to `onCreate` apply the same rule, so for cross-step conditions what Review shows is what is sent.
- **FR-7 Same-step behaviour unchanged.** A same-step condition keeps its current rendering, validation, Review and submission behaviour, including a stale value staying in Review and in the submission. Hidden fields that are not conditional (for example `ui:widget: hidden`, `ui:backstage.review.show: false`) keep their current behaviour.
- **FR-8 Back-navigation.** Going back, changing an answer and moving forward re-evaluates conditions in later steps, in Review and in submission. Moving between steps otherwise behaves as today, including step titles, activeStep handling, async validators and `onChange` form state.

### Template editor (`plugins/scaffolder`)

- **FR-9 Preview.** The template editor preview renders the same `Stepper`, so it gets the same behaviour. A test or no change is expected in `TemplateEditorForm*`.

### Documentation and release

- **FR-10 Author docs.** `docs/features/software-templates/writing-templates.md` and/or `input-examples.md` explain cross-step conditional fields with a `dependencies` example and an `if`/`then` example, what happens to a hidden value, and how same-step conditions differ, following `docs/contribute/doc-style-guide.md`.
- **FR-11 Release coverage.** Every published package whose behaviour changes has changeset coverage in `.changeset/*.md`, written for adopters with no internal symbols, using the correct bump for each package's version. `.changeset/pre.json` exists, so prerelease mode applies. New source files carry the Apache 2.0 header with year 2026. API reports are regenerated only if the public API changes.

## Non-functional requirements

- **NFR-1 No new syntax.** No new `ui:` key, schema keyword or Stepper prop is required of a template author.
- **NFR-2 Public API.** No breaking change to the public API of `@backstage/plugin-scaffolder-react` or `@backstage/plugin-scaffolder`. An exported function keeps its signature, or gains only optional parameters.
- **NFR-3 Performance.** Evaluating conditions adds no noticeable delay to typing in a step; work scales with the size of the template's parameters.
- **NFR-4 Mergeability.** `Stepper.tsx` changes stay small and the logic lives in `lib/` or a hook where it can, because #34292, #36464 and #36467 also touch `Stepper.tsx`.
- **NFR-5 Tests.** Fewer thorough tests with multiple assertions, using React Testing Library `screen` and `findBy*`, no new test IDs in the implementation (`.claude/CLAUDE.md`).
- **NFR-6 Style.** Match the conventions of each file and package. Do not update copyright years on existing files.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| None new | n/a | The change adds no field, storage or logging. Form values stay in form state as today. `ui:field: Secret` values keep their current handling; a secret hidden by a cross-step condition follows FR-5 and is not displayed in Review. |

## Role matrix

Unchanged. No auth, permission or role logic is touched.

| Role | Resource | Action |
|---|---|---|
| Template author | Template parameters | Write `dependencies` and `if`/`then` as today; may now read earlier-step fields |
| Template user | Scaffolder form | Fill in, review and submit, as today |

## Acceptance criteria

Criteria AC-1 to AC-7 are React Testing Library tests in `plugins/scaffolder-react`, run with `CI=1 yarn test plugins/scaffolder-react`.

- **AC-1** Stepper: a step-2 field appears only when a step-1 flag is set, for `dependencies` (both forms) and for top-level `if`/`then`.
- **AC-2** Stepper: that field's required validation applies only while the flag is set, for both `dependencies` and `if`/`then`, and step 2 can be passed with the flag unset.
- **AC-3** Stepper: going back and changing the flag removes the field from the Review step, for both `dependencies` and `if`/`then`.
- **AC-4** Stepper: a field hidden by a cross-step condition is not in the values passed to `onCreate`, and for cross-step conditions Review shows exactly what is sent.
- **AC-5** A key that another step still resolves is kept in Review and submission. A condition reading both an earlier-step field and a field of its own step behaves as cross-step.
- **AC-6** Regression: a same-step `dependencies` and a same-step `if`/`then` keep today's behaviour, including a stale same-step value staying in Review and in the submission.
- **AC-7** Earlier-step fields are not rendered or validated in a later step and are not duplicated in Review.
- **AC-8** Existing Stepper, ReviewState and hook tests pass; validation, back-navigation and the review step are not broken. `CI=1 yarn test plugins/scaffolder-react` passes, and `CI=1 yarn test plugins/scaffolder` passes for any file changed there.
- **AC-9** `yarn tsc` and `yarn lint` pass.
- **AC-10** Template author docs are updated, and release coverage exists in `.changeset/` for the changed published packages.

## Open questions for HITL

- **Q1 Restoring a dropped value.** If a user turns the flag off, then back on, should the field show the value typed earlier, or be empty? The decisions cover Review and submission, not in-progress form state. Default in this document: the value stays in the step's in-progress form state and comes back with the field, because moving between steps keeps form state today and the rule only filters Review and submission.
- **Q2 Nested conditions.** Default in this document: out of scope (Out of scope 6). `@rjsf` evaluates a nested object's conditions against that object's own data, so they cannot read an earlier step without new behaviour. The docs will say so.
- **Q3 Query-string draft.** The wizard's current form data may reach the URL or `onChange` callers. Default in this document: `onChange` and the query-string draft keep receiving what they receive today; only Review and `onCreate` apply the rule.
- **Q4 Overlap with #35196.** This run does not build on that unmerged PR; its diff is a reference, and this work may conflict with it. Noted for the person deciding what to open as a PR.
