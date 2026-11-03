# Intent Brief — feature-extend — Cross-step conditional fields in the Scaffolder form wizard

## Context

Scaffolder templates can already show, hide or require fields with JSON Schema `dependencies`,
`oneOf`/`allOf` and `if`/`then`/`else`, but only when the controlling field lives in the same
parameter step. The wizard (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`)
keeps every step's answers in `stepsState` and passes them all as `formData`, yet renders and
validates each step against that step's schema alone (`useTemplateSchema` builds per-step
`schema`/`uiSchema`). RJSF ignores a `dependencies` key whose trigger is not in the current step's
properties, and an `if` that points at an earlier step's field is untested and undocumented.
The Review step (`ReviewState`, `findSchemaForKey`) resolves `dependencies` from form state but has
no notion of a field hidden by an earlier step's answer, and answers to fields that later become
hidden stay in `stepsState` and are submitted.

Requested in backstage/backstage#31895. A previous attempt, PR #35196 ("Fix cross-step scaffolder
field conditions"), is still open upstream (last updated 2026-10-27); PR #36464 ("adapt template
steps to user choices") and PR #34292 (`when` conditions on parameter steps) also overlap. Per the
user's Gate 0 decision, the run continues regardless and does not read those PRs.

## Goal

Conditional fields expressed with JSON Schema `dependencies` or `if`/`then` can depend on answers
given in an earlier step of the wizard, not only the same step.

Example: step 1 asks "Is this a mobile SDK?" (boolean). Step 2 shows SDK-specific fields, and
requires them, only when step 1 was answered Yes; the Review step lists them only in that case.

- Before: the step-2 SDK fields show regardless of the step-1 answer, or never show.
- After: the step-2 fields appear only when step 1 was answered Yes, their `required` rule applies
  only then, and going back to step 1 and changing the answer removes them (and their values) from
  the Review step.

Hidden-value rule: a hidden field's value is cleared only when its condition depends on an answer
from an earlier step. Same-step conditions keep exactly today's behaviour (values are not cleared).

## Run settings (Gate 0)

- Test command, used word for word for the whole run:
  `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
- Never run lint with `--fix`; never run `yarn lint --fix`.
- Auth mode: `vendor`. Policy: `argon4-plus-sonnet55`. The policy's endpoints (Vertex AI in project
  `temp-genmedia-study`, and Anthropic) are accepted for this repo.

## Files in scope

Frontend wizard (`plugins/scaffolder-react`):
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts`
- `plugins/scaffolder-react/src/next/components/Stepper/*` (new helper + test, if the plan needs one)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx`
- `plugins/scaffolder-react/src/next/lib/schema.ts`
- `plugins/scaffolder-react/src/next/lib/schema.test.ts`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts`
- `plugins/scaffolder-react/report.api.md`, `plugins/scaffolder-react/report-alpha.api.md`
  (only if a public API changes; regenerated with `yarn build:api-reports`)

Template form wiring and editor preview (`plugins/scaffolder`):
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.test.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/**` (form preview; only if wiring
  changes are needed there)

Companion files:
- `docs/features/software-templates/input-examples.md` (the "Use parameters as conditional for
  fields" section) and `docs/features/software-templates/writing-templates.md` (`spec.parameters`)
- `.changeset/*.md` — one new changeset for `@backstage/plugin-scaffolder-react` (minor, new
  feature; plus `@backstage/plugin-scaffolder` only if that package changes)

## Files off-limits

- Project defaults: `.env`, `.env.*`, `.mcp.json`, `.cursor/rules/**`, `.claude/settings.local.json`,
  `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`
- AI configs: `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`
- Repo rules: `.yarn/**`, `.husky/**`, `dist-types/**`, `dist-storybook/**`,
  `plugins/*/src/schema/openapi/generated/**`, `packages/*/src/schema/openapi/generated/**`,
  `.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`, `docs/releases/**`,
  `**/CHANGELOG.md`
- Backend and shared types are out of this job: `plugins/scaffolder-backend/**`,
  `plugins/scaffolder-common/**`

## Acceptance criteria

1. React Testing Library tests on the Stepper show that a step-2 field appears only when a step-1
   flag is set.
2. The step-2 field's `required` validation applies only when the step-1 flag is set; with the flag
   unset the user can advance past step 2 without it.
3. Going back to step 1 and clearing the flag removes the step-2 field (and its value) from the
   Review step.
4. Existing same-step conditions (`dependencies`, `if`/`then`/`else`, `oneOf`) keep working
   exactly as today, including keeping the values of fields they hide.
5. Per-step validation, back-navigation and the Review step are not broken.
6. The run's test command passes:
   `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all`
   (existing Stepper, `useTemplateSchema`, `schema`, `ReviewState` and `TemplateWizardPage`
   tests included).
7. Template-author docs describe cross-step conditions with a worked example, and a changeset covers
   the published package(s).
8. Tests use `screen` and `findBy*` queries, add no test IDs, and prefer fewer thorough tests.

## Non-goals

- Backend parameter validation (`plugins/scaffolder-backend/src/service/router.ts`) is not changed.
- No new template keyword (for example a `when` condition on steps, as in PR #34292) and no change
  to `plugins/scaffolder-common` types or its JSON schema.
- No hiding or skipping of whole steps (PR #36464's territory).
- No change to the legacy frontend system beyond what shared components already receive.
- Existing templates must keep their current behaviour; no breaking public API change.

## Gate 0 — approved (final scope)

Approved 2026-11-03. Write contract frozen with 13 allowlist and 30 off-limits patterns exactly as
listed under "Files in scope" and "Files off-limits" above. Auth mode `vendor`, policy
`argon4-plus-sonnet55`, test command as in "Run settings".
