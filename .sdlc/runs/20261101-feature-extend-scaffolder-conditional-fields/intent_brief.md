# Intent Brief — feature-extend — Scaffolder conditional fields across wizard steps

## Context

Request: let a Scaffolder template show, hide or require fields based on answers given in an earlier
step of the form wizard. Requested in backstage/backstage#31895.

Module: the Scaffolder form wizard in `plugins/scaffolder-react` (Stepper, per-step schema extraction
and validation, review step) and `plugins/scaffolder` (template form wiring and the template editor
preview).

Example: step 1 asks "Is this a mobile SDK?" and step 2 shows SDK-specific fields only when the answer
is Yes.

Before: the step-2 SDK fields show regardless of the step-1 answer, or never show.
After: the step-2 fields appear only when step 1 was answered Yes, and the Review step lists them only
in that case.

Established before scoping, by probing the installed `@rjsf/utils` 5.24.13, `@rjsf/validator-ajv8` and
backend `jsonschema` libraries directly (not in a browser), with earlier-step answers in form data:

- Top-level `if`/`then` in a later step already resolves against earlier answers: the field is shown and
  `required` is enforced on frontend and backend.
- `dependencies` keyed on an earlier-step field (both the documented `allOf`/`if` form and the `oneOf`
  form) does not render the field, but `required` is still enforced on both sides: a dead end.
- After a condition turns false, the old value stays in form state and passes validation in every form.
  `Stepper` merges each step's data into `stepsState`, which feeds Review and `onCreate`.

Related open PRs (checked 2026-11-01):

- #35196 (cross-step conditions, `useTemplateSchema` only; open, not closed, reopened by a maintainer,
  awaiting review). It injects earlier steps' properties into later step schemas. It does not change
  Review or stale values.
- #34292 (`when` on whole parameter steps; a maintainer wants it merged first), #36464
  (`ui:backstage.visibleWhen` on whole steps; changes requested), #36467 (replaces the ajv8 validator;
  draft). All three touch `Stepper.tsx`, so merge conflicts are likely.

## Goal

Conditional fields written with JSON Schema `dependencies` or `if`/`then` in a later step can depend on
answers from any earlier step, with the same behaviour as same-step conditions, and with no new template
syntax.

## Files in scope

- `plugins/scaffolder-react/src/next/components/Stepper/**`
- `plugins/scaffolder-react/src/next/components/ReviewState/**`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`, `useTemplateSchema.test.tsx`
- `plugins/scaffolder-react/src/next/hooks/index.ts`
- `plugins/scaffolder-react/src/next/lib/**`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm*` (the preview renders
  the same `Stepper`, so a test or no change is expected here)
- `docs/features/software-templates/input-examples.md`
- `docs/features/software-templates/writing-templates.md`
- `.changeset/*.md`
- `plugins/scaffolder-react/report*.api.md`, `plugins/scaffolder-react/knip-report.md`,
  `plugins/scaffolder/report*.api.md`, `plugins/scaffolder/knip-report.md` (only if regenerated)

## Files off-limits

Project defaults, plus the AI configs and generated or tooling paths from discovery. Also
`plugins/scaffolder-backend/**`, `plugins/scaffolder-common/**` and `docs/releases/**`.

## Acceptance criteria

- React Testing Library tests on the Stepper show that a step-2 field appears only when a step-1 flag is
  set, that its required validation applies only then, and that going back and changing the flag removes
  it from the review step.
- Those behaviours hold for both `dependencies` and top-level `if`/`then`.
- Existing Stepper tests pass; validation, back-navigation, the review step and same-step conditions are
  not broken.
- A field hidden by a cross-step condition is not submitted (run decision, see below).
- Regression tests pin same-step behaviour, including a stale same-step value staying in Review and the
  submission.
- `yarn tsc` and `yarn lint` pass.
- Template author docs are updated.

## Decisions

- Cross-step only (Gate 0 revision): a value is dropped only when its field is defined inside a
  conditional branch whose condition reads at least one field from an earlier step, that condition is
  now false, and no step resolves the field for the current answers. A key that another step still
  resolves is kept.
- Same-step conditions behave exactly as they do today. A condition that reads only fields of its own
  step keeps its current rendering, validation, Review and submission behaviour, including a stale value
  staying in Review and the submission.
- Review and submission use the same rule, so for cross-step conditions what Review shows is what is sent.

## Non-goals

- Hiding whole steps (#34292, #36464).
- New template syntax or template schema changes.
- Backend validation changes.
- Replacing the validator (#36467).

## Gate 0 outcome

Approved 2026-11-01. Auth mode `estimated`, policy `opus55-only`, test command
`CI=1 yarn test plugins/scaffolder-react`. `.gitignore` not changed: note in the final report that `.sdlc/`
is not ignored. A condition reading both an earlier-step field and a field of its own step counts as
cross-step. Scope as listed above.
