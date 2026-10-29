# Requirements — feature-extend — Cross-step conditional fields in the Scaffolder form wizard

Run: `20261029-162244-feature-extend-scaffolder-conditional-fields`
Intent: `feature-extend` · Mode: brownfield · Policy: `flash-agsdk-only-v38` · Auth: `vendor`
Base commit: see `provenance.json` → `git_head_before`
Source brief: `.sdlc/runs/20261029-162244-feature-extend-scaffolder-conditional-fields/intent_brief.md`

These are **delta requirements**: they describe only what this run changes relative to the base
commit. Everything not named here must keep behaving exactly as it does today.

## Context the requirements rest on

Four sites were read and verified on this base commit. They are the whole of the defect surface:

1. `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts:73` — the guard
   `if (step.schema?.properties || !step.schema?.dependencies)` overwrites `properties` with only
   the top-level entries, so a property that exists solely inside a `dependencies` subschema is
   dropped from the parsed step.
2. `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (~line 296) — already passes
   `formData={stepsState}`, i.e. every step's accumulated answers, to the form. Cross-step **data**
   is therefore already present at render time. The gap is that each step's `schema` declares only
   that step's own properties, so a later step's condition has nothing to reference. This is a
   schema-scoping problem, **not** a state-plumbing one.
3. `Stepper.tsx` (~lines 280-282) — `omitExtraData` / `liveOmit` are destructured out of
   `formProps`, and `handleChange` merges rather than replaces, so a value answered under a
   condition that no longer holds persists in `stepsState`.
4. `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` — `findSchemaForKey` builds
   its `data` argument from only the current step's own `schema.dependencies` keys, so a step-2
   condition that depends on a step-1 answer resolves against empty data. This is the concrete
   defect behind the review-step criterion.

Also relevant, and already correct: `plugins/scaffolder-react/src/next/lib/schema.ts` —
`extractSchemaFromStep` already walks `dependencies` / `then` / `else` / `anyOf` / `oneOf` /
`allOf` to hoist `ui:` keys, so those schema shapes are already understood in that module.

`plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx:184` renders the
same `Stepper`, so the preview largely inherits whatever the wizard does.

**Reference only:** `reference-pr35196.diff` beside this file is a prior upstream attempt that is
**not** in this tree (confirmed: the original guard is intact and `getConditionalProperties` appears
nowhere). Nothing in it may be fetched, merged or assumed. This run delivers the whole capability on
this base commit.

## In scope

1. Resolving a step's schema against the accumulated answers of **all earlier steps**, so a
   JSON Schema `dependencies` or `if`/`then` condition in step N may reference an answer from any
   step 1..N-1.
2. Rendering: a cross-step conditional field appears only when its governing condition holds.
3. Validation: such a field is required only when its condition holds, and never blocks step
   completion while it is invisible.
4. Review step: a cross-step conditional field is listed only when its condition holds, resolved
   against accumulated state from all steps rather than one step's own `dependencies`.
5. Back-navigation: changing a governing answer re-evaluates both rendering and the review step,
   and drops the dependent field's now-unreachable value from form state.
6. Template editor preview parity: the preview in `plugins/scaffolder/src` behaves as the live
   wizard does.
7. Author-facing documentation under `docs/features/software-templates/` with a worked example of
   the issue's mobile-SDK shape.
8. A changeset covering every published package this run touches.

## Out of scope

1. Conditional skipping of whole wizard steps. Steps always render; this run is **fields only**.
2. Any scaffolder backend or task-execution change.
3. Any change to the template schema contract in `plugins/scaffolder-common/**` — off-limits for
   this run. Standard JSON Schema conditionals are expected to need none; if the architect
   concludes otherwise, that is a finding to surface at a gate, never a silent write.
4. Hand-editing generated artifacts: `**/api-report*.md` and `**/CHANGELOG.md` are off-limits.
5. Fetching, merging or depending on any part of PR #35196.
6. Editing `.gitignore`, `.env*`, or any lint/format/TypeScript configuration.
7. Reworking the RJSF integration beyond what this capability requires.
8. New conditional syntax of our own invention. The mechanism is standard JSON Schema only.

## Functional requirements per module

### Module: schema resolution (`plugins/scaffolder-react/src/next/hooks/**`, `.../next/lib/**`)

- **FR-1** The parsed form of a step must retain properties that exist only inside a conditional
  subschema (`dependencies`, `if`/`then`/`else`, and the `anyOf`/`oneOf`/`allOf` branches already
  walked by `extractSchemaFromStep`), rather than being overwritten with top-level properties only.
  This is the `useTemplateSchema.ts:73` guard.
- **FR-2** A step's schema used for rendering and validation must be resolved against the
  accumulated answers of all steps, so that a condition referencing an earlier step's answer
  evaluates against the value actually given. Resolution must be a pure function of (step schema,
  accumulated form state) — no hidden mutation of the parsed manifest, so repeated resolution with
  the same inputs yields the same result.
- **FR-3** Resolution must be additive for existing templates: a step whose conditions reference
  only its own properties must resolve to exactly the schema it resolves to today, and a step with
  no conditions at all must be untouched.
- **FR-4** A condition that references a key answered in no step (absent from accumulated state)
  must be treated as not holding, and must not throw.

### Module: wizard form (`plugins/scaffolder-react/src/next/components/Stepper/**`)

- **FR-5** The active step must render only those fields whose governing conditions hold against
  accumulated state, including conditions governed by an earlier step's answer.
- **FR-6** Per-step validation must be built from the same resolved schema that was rendered, so a
  field that is required under a condition that does not hold cannot block advancing past its step,
  and a field that is required under a condition that does hold must block it.
- **FR-7** When a governing answer changes, values belonging to fields whose condition no longer
  holds must be dropped from form state rather than merged forward, so the subsequent steps, the
  review step and the submitted payload do not carry an unreachable answer.
- **FR-8** Back-navigation must preserve answers to fields whose conditions still hold, and
  re-evaluate conditions on arrival at each step. Existing back-navigation behaviour for
  unconditional fields must not change.

### Module: review step (`plugins/scaffolder-react/src/next/components/ReviewState/**`)

- **FR-9** `findSchemaForKey`'s data argument must be the accumulated answers across all steps, not
  the current step's own `dependencies` keys, so a key governed by an earlier step's answer resolves
  against the value actually given.
- **FR-10** The review step must list a cross-step conditional field when its condition holds and
  omit it when it does not. Existing review-step output for unconditional and same-step conditional
  fields must be byte-identical to today's.

### Module: template editor preview (`plugins/scaffolder/src/**`)

- **FR-11** The template editor preview must exercise the same resolution path as the live wizard,
  so an author editing a template sees cross-step conditionals behave as they will at run time. If
  parity requires no code change beyond what the shared `Stepper` already gives, that must be
  demonstrated by a test rather than asserted.

### Module: documentation and release metadata

- **FR-12** `docs/features/software-templates/` must document the capability for template authors:
  what is supported (cross-step, fields only), what is not (step skipping), and a worked example of
  the mobile-SDK shape from the originating issue, following
  `docs/contribute/doc-style-guide.md`.
- **FR-13** A changeset in `.changeset/` must cover every published package this run touches, with
  a `minor` bump for `@backstage/plugin-scaffolder-react` (at `3.0.0-next.0`, so an additive feature
  at >= 1.0.0 takes `minor`). Written for adopters, in plain language, naming no internal code
  symbol that is not public API. Written as a file directly — the changeset CLI is forbidden by
  repo rules.

## Non-functional requirements

- **NFR-1 Strict additive backward compatibility.** Every existing `Stepper`, `ReviewState` and
  `useTemplateSchema` test must pass unchanged. No existing test file may be rewritten to accommodate
  the change; a new case goes in a new test or is appended.
- **NFR-2 No new public API without flagging it.** `plugins/scaffolder-react/src/types.ts` may change
  only if the capability genuinely requires it. `**/api-report*.md` is off-limits, so any public API
  change must be reported as a manual `yarn build:api-reports` follow-up.
- **NFR-3 Repo conventions.** Apache 2.0 header with the current year on **new** source files only;
  never touch the year on an existing file. Match each package's and file's existing style. Prefer
  fewer thorough tests with multiple assertions. Use `screen` and `.findBy*` over `waitFor`. Do not
  add test IDs to the implementation.
- **NFR-4 No schema-contract change.** `plugins/scaffolder-common/**` is off-limits and must not be
  written to.
- **NFR-5 Mechanism fidelity.** Conditions are expressed in standard JSON Schema (`dependencies`,
  `if`/`then`) exactly as a template author would write them for RJSF, with no bespoke dialect.
- **NFR-6 Performance.** Schema resolution runs on every render of the active step, so it must not
  deep-clone the whole manifest per keystroke; resolution cost must stay proportional to the step
  being rendered.

## PII inventory

No PII is introduced, stored, logged or transmitted by this change. It is a client-side form
rendering and validation change: it decides which already-declared template fields are shown and
validated, and it removes values from in-memory form state. No new field, persistence, network call
or log statement is added.

| Field | Sensitivity | Protection |
|---|---|---|
| (none added) | — | — |

One adjacent consideration, stated so it is not missed: FR-7 **drops** values from form state when
their condition stops holding. That reduces, never increases, what reaches the scaffolder backend —
a value the user can no longer see is also no longer submitted.

## Role matrix

Not applicable. This change adds no authorization surface: it introduces no endpoint, no permission
check and no role-dependent behaviour. Who may see or submit a scaffolder template is decided by the
existing scaffolder permission framework, which this run does not touch.

| Role | Resource | Action |
|---|---|---|
| (unchanged) | scaffolder templates | governed by existing scaffolder permissions, untouched |

## Acceptance criteria

Measured against the green baseline captured before any edit (`baseline-verify/`).

- **AC-1** React Testing Library tests on the `Stepper` show a step-2 field appears only when a
  step-1 flag is set.
- **AC-2** That field's `required` validation applies only when the flag is set: with the flag
  unset, the step can be completed while the field is invisible; with the flag set, it cannot be
  completed while the field is empty.
- **AC-3** Going back and changing the flag removes the field from the review step.
- **AC-4** The review step lists a cross-step conditional field only when its condition holds,
  resolved against accumulated state from all steps.
- **AC-5** Existing `Stepper` tests pass unchanged.
- **AC-6** Existing `ReviewState` and `useTemplateSchema` tests pass unchanged, and existing
  **same-step** conditional behaviour is unaffected.
- **AC-7** The template editor preview shows the same behaviour as the live wizard.
- **AC-8** The full verification command passes:
  `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
  — relative to the pre-edit baseline. Any failure already present in the baseline is a baseline
  finding and is not attributed to this change; `lint:all` is whole-repo and the test span includes
  `plugins/scaffolder`, so this distinction matters.
- **AC-9** Documentation under `docs/features/software-templates/` explains the capability for
  template authors, with a worked example matching the issue's mobile-SDK shape.
- **AC-10** A changeset covers every published package touched, with a `minor` bump for
  `@backstage/plugin-scaffolder-react`, written for adopters and naming no internal code symbol.

## Open questions for HITL

1. **Dropping stale values (FR-7) is observable behaviour.** Today a value answered under a
   condition that later stops holding persists in form state and can still reach the backend. FR-7
   drops it. That is required by AC-3 and is the correct reading of the brief, but it is a behaviour
   change for a template that today relies on the stale value surviving. Confirm this is intended;
   it is the one place where "strictly additive" and "correct" pull apart.
2. **Whether `plugins/scaffolder-react/src/types.ts` needs to change** is left to the architect. If
   the public type surface does change, `yarn build:api-reports` regeneration becomes a manual
   follow-up (NFR-2, off-limits path) rather than part of this run.
3. **`plugins/scaffolder-common/**` is off-limits.** The expectation is that standard JSON Schema
   conditionals need no contract change there. If the architect finds a contract change is
   genuinely required, the run stops and asks rather than writing it.
