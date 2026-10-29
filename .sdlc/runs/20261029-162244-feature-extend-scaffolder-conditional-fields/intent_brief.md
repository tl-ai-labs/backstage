# Intent Brief — feature-extend — Cross-step conditional fields in the Scaffolder form wizard

## Context

Backstage Scaffolder templates declare their input form as wizard steps, each a JSON Schema object
rendered by `scaffolder-react` (RJSF-based). JSON Schema conditionals (`dependencies`, `if`/`then`)
work only *within* a step today: a step-2 field cannot depend on a step-1 answer.

Example of the desired behavior (from upstream issue `backstage/backstage#31895`, OPEN, labels
`type:suggestion`, `priority:contrib-needed`, `area:scaffolder`): step 1 asks "Is this a mobile
SDK?", step 2 shows SDK-specific fields only when the answer is Yes.

- **Before:** the step-2 SDK fields show regardless of the step-1 answer, or never show.
- **After:** the step-2 fields appear only when step 1 was answered Yes, and the Review step lists
  them only in that case.

A previous attempt, `backstage/backstage#35196`, is **not present in this repository** — verified
on this base commit: `useTemplateSchema.ts:73` still carries the original
`if (step.schema?.properties || !step.schema?.dependencies)` guard, and `getConditionalProperties`
appears nowhere in the tree. This run therefore delivers the **whole capability on this base
commit**, not increments on top of that PR. Its diff is kept alongside this brief as
`reference-pr35196.diff` for reference only; no branch is fetched and no part of it is assumed.

> Recorded for accuracy, with no effect on this scope: the GitHub API currently reports #35196 as
> `state: OPEN`, `closed: false`, `closedAt: null`, last updated 2026-10-27. If it is in fact live,
> this run yields a competing implementation of the same issue — a PR-time consideration, not a
> build-time one.

### Code the change must work with

Verified by reading the tree on this commit:

- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` — parses the manifest into
  `ParsedTemplateSchema[]`, filtering steps and properties by feature flag. The guard at line 73
  overwrites `properties` with only top-level entries, dropping properties that exist solely inside
  a `dependencies` subschema.
- `plugins/scaffolder-react/src/next/lib/schema.ts` — `extractSchemaFromStep` already walks
  `properties`/`items`/`anyOf`/`oneOf`/`allOf`/`dependencies`/`then`/`else` to hoist `ui:` keys, so
  the conditional shapes are already understood here.
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` — holds `stepsState`
  (accumulated answers for all steps) and already passes `formData={stepsState}` to `Form`
  (line ~296), so cross-step data is present at render; what is missing is that each step's
  `schema` declares only its own properties, leaving a later step's condition nothing to reference.
  `handleChange` merges rather than replaces, and `omitExtraData`/`liveOmit` are destructured out of
  `formProps` (~lines 280-282), so stale values can persist after a governing answer changes.
  Per-step validation runs through `createAsyncValidators(steps[activeStep]?.mergedSchema, ...)`.
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` and its
  `util.ts` — the review step resolves each key via `findSchemaForKey`, which builds its `data`
  argument from **only the current step's own** `schema.dependencies` keys. A step-2 condition
  depending on a step-1 answer therefore resolves against empty data, so the review step cannot
  determine whether the field's condition holds.
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx:184` — the
  template editor preview renders the same `Stepper`, and `TemplateFormPreviewer.tsx` sits beside
  it; the template form wiring in `plugins/scaffolder/src` is in scope per the brief.

Decisions confirmed with the requester:

- Deliver the **whole capability on this base commit**. Do not depend on, or assume, #35196.
- Mechanism: standard JSON Schema `dependencies` / `if`/`then`, as in the issue's example.
- Reach: cross-step, **fields only**. Whole steps always render; conditional step skipping is out of
  scope.
- Backward compatibility: strict and additive. Existing same-step conditions, per-step validation,
  back-navigation and the review step must all keep working.

## Goal

Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of
the form wizard — with the Review step, per-step validation and back-navigation all correct.

Concretely:

1. A field in step N can be conditionally rendered based on answers from steps 1..N-1, expressed as
   JSON Schema `dependencies` or `if`/`then`.
2. Such a field is required only when its governing condition holds, and never blocks a step while
   invisible.
3. The Review step lists a cross-step conditional field only when its condition holds, resolved
   against the accumulated form state from all steps rather than one step's own `dependencies`.
4. Back-navigating and changing the governing answer re-evaluates both rendering and the Review
   step, dropping the dependent field's stale value.
5. The template editor preview shows the same behavior as the live wizard.

## Files in scope

Allowlist:

- `plugins/scaffolder-react/src/next/hooks/**` — cross-step schema resolution in
  `useTemplateSchema.ts`, including the line-73 guard
- `plugins/scaffolder-react/src/next/lib/**` — schema-walking helpers
- `plugins/scaffolder-react/src/next/components/Stepper/**` — step schema/validation wiring,
  back-navigation state handling, and the Stepper tests
- `plugins/scaffolder-react/src/next/components/ReviewState/**` — review-step filtering and
  `findSchemaForKey`
- `plugins/scaffolder-react/src/types.ts` — only if the public type surface must change
- `plugins/scaffolder/src/**` — template form wiring and the template editor preview
- `.changeset/*.md` — required: published packages
- `docs/features/software-templates/**` — author-facing documentation

`plugins/scaffolder-common/**` is intentionally **not** in the allowlist: standard JSON Schema
conditionals need no change to the template schema contract. If the architect finds otherwise, that
is a Gate-1 finding, not a silent write.

`**/api-report*.md` is off-limits because it is generated by `yarn build:api-reports`. If the public
API of a touched package changes, the run flags regeneration as a manual follow-up.

## Files off-limits

Project defaults from `.sdlc/project.json.off_limits_default`, plus every AI config discovery
detected, plus:

```
.env, .env.*, .envrc, **/*-credentials.yaml
.claude/**, .cursor/**, .github/copilot-instructions.md, AGENTS.md, .mcp.json
.git/**, .sdlc/**
node_modules/**, dist/**, dist-types/**, dist-workspace/**, dist-storybook/**, build/**, coverage/**
.yarn/**, yarn.lock
**/CHANGELOG.md
**/api-report*.md
docs/reference/**, microsite/**, docs-ui/**
.eslintrc.js, .prettierignore, tsconfig.json
```

`.gitignore` is **not** in the allowlist. `.sdlc/` is excluded via `.git/info/exclude:7` in this
clone and is force-added at the end of the run; the run does not edit `.gitignore`.

## Acceptance criteria

1. React Testing Library tests on the `Stepper` show a step-2 field appears only when a step-1 flag
   is set.
2. That field's `required` validation applies only when the flag is set — a false condition does not
   block step completion on an invisible field.
3. Going back and changing the flag removes the field from the **Review step**.
4. The Review step lists a cross-step conditional field only when its condition holds, resolved
   against accumulated state from all steps.
5. Existing `Stepper` tests pass unchanged.
6. Existing `ReviewState` and `useTemplateSchema` tests pass unchanged, and existing **same-step**
   conditional behavior is unaffected.
7. The template editor preview shows the same behavior as the live wizard.
8. The full verification command passes:
   `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
   — measured against a green baseline captured before any edit.
9. Documentation under `docs/features/software-templates/` explains the capability for template
   authors, with a worked example matching the issue's mobile-SDK shape.
10. A changeset covers every published package touched. `@backstage/plugin-scaffolder-react` is at
    `3.0.0-next.0`, so an additive feature at >=1.0.0 takes a `minor` bump; written for adopters,
    naming no internal code symbols.

## Non-goals

- Conditional skipping of whole wizard steps (steps always render).
- Any scaffolder backend or task-execution change.
- Changes to `plugins/scaffolder-common`'s template schema contract.
- Fetching, merging or depending on the #35196 branch.
- Hand-editing generated API reports or changelogs.
- Editing `.gitignore`.
- Reworking the RJSF integration beyond what the capability requires.
