# Requirements — feature-extend — Scaffolder cross-step conditional fields

Run: `20261029-144036-feature-extend-scaffolder-conditional-fields` · Intent: feature-extend (delta requirements)
Source: `intent_brief.md` (Gate 0 approved 2026-10-29) · Upstream request: backstage/backstage#31895

## Current behaviour (the delta's starting point)

- `Stepper.tsx` keeps one flat `stepsState` for all steps and passes the whole of it as `formData` to each
  step's `<Form>`, but each step's `schema` is only that step's own schema (`useTemplateSchema` →
  `extractSchemaFromStep`). rjsf resolves `dependencies` and `if`/`then`/`else` against `formData`, so a later
  step's condition naming an earlier field can resolve by accident, untested and undocumented.
- A root-level `if` whose `properties` names a field that is absent passes vacuously (JSON Schema semantics),
  so a later-step branch can show before the earlier answer exists unless the template author also lists the
  field under the `if`'s `required`.
- `ReviewState` / `findSchemaForKey` give `getSchema` only the `dependencies` keys of the form state, never the
  data an `if` needs; a key no schema resolves falls back to being shown under its formatted key name, so a value
  left in `stepsState` after its branch was switched off still shows in the review step.
- Custom field validators (`createAsyncValidators`) walk the active step's `mergedSchema`.

## In scope

1. A later wizard step's JSON Schema `dependencies` (property and schema dependencies, including the `oneOf`
   form) and root-level `if`/`then`/`else` (also inside `allOf`) resolve against the whole form state, answers
   from earlier steps included, both when the step renders and when it validates on Next.
2. The review step lists a field declared only inside a conditional branch only when that branch is active for
   the current form state, whichever step the condition's field belongs to.
3. Unit / RTL tests in `plugins/scaffolder-react/src/next/**` covering the above and the unchanged behaviour.
4. Template-author documentation in `docs/features/software-templates/` with a worked example.
5. One changeset `.changeset/scaffolder-cross-step-conditions.md` (`@backstage/plugin-scaffolder-react`: minor;
   `@backstage/plugin-scaffolder` only if its source changes).
6. `plugins/scaffolder/src/alpha/components/TemplateWizardPage/**` and `TemplateEditorPage/**` only where needed
   to pass earlier answers through (expected: no change, since both render the same `Stepper`).

## Out of scope

1. Scaffolder backend parameter validation (`plugins/scaffolder-backend/**`) — follow-up.
2. Types in `plugins/scaffolder-common/**`, including `TemplateParameterSchema` — unchanged.
3. Regenerating API reports (`yarn build:api-reports`) — follow-up if an export changes.
4. Removing values of inactive fields from the data the wizard submits (`onCreate`) — see Open question 2.
5. Conditions that depend on a _later_ step's answers (only earlier, or same-step, answers are in scope).
6. Any change to `.gitignore`, ESLint/Prettier/TypeScript config, `docs/releases/**`, `report*.api.md`.

## Functional requirements

### Module: form schema resolution (`plugins/scaffolder-react/src/next` — `Stepper`, `lib/schema.ts`, `hooks/useTemplateSchema.ts`, `hooks/useFilteredSchemaProperties.ts`)

- **FR-1** When step N (N > 1) declares a root-level `if`/`then`/`else` whose condition names a field answered
  in an earlier step, the fields of the active branch render in step N, and the fields of the inactive branch
  do not, using the answers held in the shared form state.
- **FR-2** When step N declares `dependencies` keyed on a field answered in an earlier step (property
  dependency, schema dependency, or `oneOf` dependency), the dependent fields render in step N exactly as they
  would if the dependency field were in step N.
- **FR-3** On Next / Review, `required` entries inside an active branch of step N are enforced; `required`
  entries inside an inactive branch are not, so the user can advance without answering hidden fields.
- **FR-4** Custom field-extension validators (`createAsyncValidators`) run for a conditional field only when its
  branch is active for the current form state, and keep running exactly as today for unconditional fields.
- **FR-5** Going back to an earlier step, changing the answer a later condition depends on, and moving forward
  again re-evaluates the later step's conditions with the new answer (show/hide and `required` both follow).
- **FR-6** Step-level and property-level `ui:backstage.featureFlag` filtering in `useTemplateSchema`, and the
  `ui:*` extraction in `extractSchemaFromStep` (including inside `then`/`else`/`dependencies`), keep working
  unchanged for steps that use cross-step conditions.
- **FR-7** Any new helper exported from `@backstage/plugin-scaffolder-react` (if one is needed at all) is a new
  export only: no existing export changes signature, type or default behaviour. Prefer no new public export.

### Module: review step (`components/ReviewState/**`)

- **FR-8** The review step resolves each form-state key against each step's schema with the whole form state
  available to that step's conditions (`dependencies` and `if`/`then`/`else`), so a field whose branch is active
  is shown with its schema title, `ui:backstage.review` options, enum names and masking, as today.
- **FR-9** A key that some step's schema declares only inside a conditional branch, and whose branch is inactive
  for the current form state, is left out of the review step (it is not shown under its formatted key name).
- **FR-10** A key no step's schema declares at all (for example one supplied through the URL query
  `formData`) is still shown under its formatted key name, exactly as today.
- **FR-11** Review masking (`ui:widget: password`, `ui:field: Secret`, `ui:backstage.review.mask`,
  `review.show: false`) applies to cross-step conditional fields exactly as to any other field.

### Module: template wiring (`plugins/scaffolder/src/alpha/components/TemplateWizardPage/**`, `TemplateEditorPage/**`)

- **FR-12** The template wizard page and the template editor's form preview show the same cross-step behaviour
  as the `Stepper`; source in `@backstage/plugin-scaffolder` changes only if that is not already true.

### Module: documentation and release notes

- **FR-13** `docs/features/software-templates/writing-templates.md` (and/or `input-examples.md`) explains that a
  field in a later step can depend on an earlier step's answer through `dependencies` and `if`/`then`/`else`,
  with a two-step YAML example ("Is this a mobile SDK?" → SDK-specific fields, required only when Yes), and
  advises listing the condition field under the `if`'s `required`. Follows `docs/contribute/doc-style-guide.md`.
- **FR-14** A changeset `.changeset/scaffolder-cross-step-conditions.md` describes the adopter-facing behaviour in
  plain language with no code symbols: `'@backstage/plugin-scaffolder-react': minor` (plus
  `'@backstage/plugin-scaffolder'` only if FR-12 changes its source).

## Non-functional requirements

- **NFR-1 Backwards compatibility.** Templates without cross-step conditions render, validate, navigate back and
  review exactly as today, with one decided exception (Gate 1, decision 1): a value whose conditional branch is
  inactive is no longer listed in the review step, for same-step conditions too. All existing tests under
  `plugins/scaffolder-react/src/next` pass unchanged, unless one asserts that exact stale-value display.
- **NFR-2 Additive API.** No breaking change to `@backstage/plugin-scaffolder-react`'s public exports; no edit to
  any `report*.api.md`.
- **NFR-3 Style.** Match each file's existing style; new source files carry the Apache 2.0 header with year
  2026; existing headers keep their year.
- **NFR-4 Tests.** Prefer fewer thorough tests with several assertions; RTL tests use `screen` and `findBy*`, not
  `waitFor` where avoidable, and add no test ids to the implementation.
- **NFR-5 Performance.** Condition resolution adds no network call and is memoised per step / form state as the
  existing hooks are; no noticeable slowdown on forms of the size of the existing test fixtures.
- **NFR-6 Checks.** `CI=1 yarn test plugins/scaffolder-react/src/next`, `yarn tsc` and `yarn lint --fix` pass from
  the repo root.

## PII inventory

| Field                                                           | Sensitivity                 | Protection                                                                                                                     |
| --------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Template form answers (any field, author-defined)               | Varies; may include secrets | Unchanged: kept in browser state; secrets via `ui:field: Secret` / `ui:widget: password` are masked in the review step (FR-11) |
| No new fields, storage, logging or network calls are introduced | —                           | —                                                                                                                              |

## Role matrix

| Role                              | Resource                               | Action                                                                 |
| --------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Backstage user running a template | Scaffolder wizard form (frontend only) | Fill steps, go back, review, create — unchanged permissions            |
| Template author                   | Template YAML `spec.parameters`        | Use cross-step `dependencies` / `if`-`then`-`else` — no new permission |

No authorization surface changes; the backend still validates submitted parameters as today.

## Acceptance criteria

- **AC-1** An RTL test on `Stepper` with a two-step manifest shows that a step-2 field appears only when a
  step-1 flag is set (absent when unset, present when set).
- **AC-2** In the same suite, the step-2 field's `required` validation blocks Review only when the step-1 flag is
  set, and the user advances freely when it is not.
- **AC-3** An RTL test shows that going back, clearing the step-1 flag and returning to the review step removes
  the step-2 field from the review step (and shows it when the flag is set).
- **AC-4** Tests cover both forms of condition across steps: root-level `if`/`then` and `dependencies`.
- **AC-5** `ReviewState` / `findSchemaForKey` tests show an active cross-step conditional field resolves to its
  schema (title, masking), an inactive one is omitted, and a key declared nowhere is still listed as today.
- **AC-6** Existing Stepper, `useTemplateSchema`, `lib/schema`, `ReviewState/util`, `ReviewState` and
  `useFilteredSchemaProperties` tests pass: `CI=1 yarn test plugins/scaffolder-react/src/next` exits 0.
- **AC-7** `yarn tsc` and `yarn lint --fix` pass from the repo root (no new errors versus the pre-run baseline).
- **AC-8** Template-author docs describe how to make a field depend on an earlier step, with a YAML example.
- **AC-9** A changeset covering `@backstage/plugin-scaffolder-react` (minor) describes the change in plain
  language with no code symbols.

## Gate 1 decisions (approved 2026-10-29, defaults applied)

1. FR-9 applies uniformly: the review step leaves out a value whose branch is inactive, whether the condition's
   field is in the same step or an earlier one. This changes what some existing templates show in the review
   step, so the changeset (FR-14) and the docs (FR-13) must say so in plain language.
2. Values of inactive fields are still sent on Create, exactly as today (out of scope 4 stands). The docs should
   mention that hidden values are still submitted, so backend actions should not assume they are absent.

## Open questions for HITL (Gate 1) — resolved above

1. **Inactive fields in the review step, same-step case.** FR-9 hides a value whose branch is inactive whatever
   step the condition lives in. Today a stale same-step value (left in form state after the user switched the
   branch off) is shown under its formatted key name. Default: apply FR-9 uniformly — showing a value for a
   field the user cannot see is the defect the brief describes. Alternative: hide only cross-step cases, keeping
   today's same-step behaviour byte-for-byte.
2. **Submitted data.** Default: values of inactive fields stay in the data sent on Create exactly as today
   (out of scope 4), since stripping them changes what existing templates submit. Alternative: strip them
   (would need its own changeset wording and is closer to a behaviour change).
