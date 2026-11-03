## Conventions

- Every new .ts or .tsx file must start with the standard Backstage Apache 2.0 license header dated 2026; existing files must preserve their current copyright year.
- Use TypeScript with explicit types matching @backstage/types (JsonObject, JsonValue) and @rjsf/utils (UiSchema, FieldValidation).
- Do not modify public or @alpha exported signatures in @backstage/plugin-scaffolder-react so report.api.md and report-alpha.api.md stay unchanged.
- React Testing Library tests must use screen and findBy*/getBy*/queryBy* queries rather than waitFor where possible, must not add data-testid attributes, and must prefer fewer, thorough user-journey tests.

## Decisions

- Where shared cross-step schema resolution helpers live: Export resolveConditionalSchema, resolveStepSchema, collectCrossStepHiddenKeys, and collectAllSchemaKeys from plugins/scaffolder-react/src/next/lib/schema.ts without re-exporting them from src/next/lib/index.ts (not Re-exporting from src/next/lib/index.ts (would alter @alpha public API report); not Creating a separate helper file (unnecessary extra file when lib/schema.ts already owns step schema extraction)) — Keeps all schema extraction and conditional resolution in lib/schema.ts while preserving report.api.md and report-alpha.api.md unchanged.
- Condition evaluation semantics for JSON Schema if and dependencies branches: Strip undefined values from formData and normalize condition schemas so properties keys without a 'not' keyword are added to required before calling Draft07.isValid from json-schema-library (not Calling Draft07.isValid or AJV on raw condition schemas without required (causes undefined/unanswered fields to vacuously pass properties constraints in Draft-07)) — In JSON Schema Draft-07, properties constraints pass vacuously when a key is absent; requiring positive condition keys ensures unanswered fields do not trigger then/oneOf branches.
- Distinguishing cross-step conditions from same-step conditions: Treat a dependency key or if/allOf/oneOf/anyOf condition as cross-step when its controlling property is not in the current step's own top-level properties, resolving and removing cross-step conditions while leaving same-step conditions intact in the step schema (not Resolving both same-step and cross-step conditions into static properties (would break RJSF live same-step toggling and same-step hidden value retention)) — RJSF natively handles same-step conditions when the trigger property is in the current step's properties, whereas cross-step triggers are fixed while on a later step.
- Selective clearing of hidden field values in Stepper stepsState: Prune keys in collectCrossStepHiddenKeys(steps, nextState) inside Stepper handleChange and handleNext by removing keys defined in a step's mergedSchema that are absent from any step's cross-step-resolved mergedSchema (not Enabling RJSF liveOmit/omitExtraData globally (would strip values from other steps and clear same-step hidden fields); not Pruning only on handleCreate (would leave stale cross-step hidden values visible or retained when navigating between steps)) — Cross-step-resolved mergedSchema retains all same-step conditional branches and active cross-step branches, so only fields from inactive cross-step branches are removed.
- ReviewState handling of conditional fields and findSchemaForKey: Resolve each step's mergedSchema with resolveConditionalSchema in findSchemaForKey and processSchema, return the original step object from findSchemaForKey when matched, and in ReviewState omit keys where findSchemaForKey returns null if the key belongs to collectAllSchemaKeys(props.schemas) (not Returning a cloned step object from findSchemaForKey (breaks reference-equality checks in util.test.ts); not Unconditionally returning [] when findSchemaForKey returns null (breaks ReviewState.test.tsx cases where schemas is empty or formState has undeclared keys)) — Preserves backward compatibility for undeclared keys and reference equality in findSchemaForKey while hiding inactive conditional fields and resolving active conditional schemas.

## Files of this change

- `plugins/scaffolder-react/src/next/lib/schema.ts` (U01, edit) — import: `import { collectAllSchemaKeys, collectCrossStepHiddenKeys, resolveConditionalSchema, resolveStepSchema } from '../../lib/schema';`
  - `function resolveConditionalSchema(schema: JsonObject, formData: JsonObject, priorStepKeys: Set<string>): JsonObject`
  - `function resolveStepSchema(step: ParsedTemplateSchema, formData: JsonObject, priorStepKeys: Set<string>): ParsedTemplateSchema`
  - `function collectCrossStepHiddenKeys(steps: ParsedTemplateSchema[], formData: JsonObject): Set<string>`
  - `function collectAllSchemaKeys(steps: Pick<ParsedTemplateSchema, 'mergedSchema'>[]): Set<string>`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts` (U02, edit) — import: `import { createAsyncValidators, type FormValidation } from './createAsyncValidators';`
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (U03, edit) — import: `import { Stepper, type StepperProps, type BackstageTemplateStepperClassKey } from './Stepper';`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` (U04, edit) — import: `import { isJsonObject, formatKey, findSchemaForKey } from './util';`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (U05, edit) — import: `import { ReviewState, type ReviewStateProps } from './ReviewState';`
- `plugins/scaffolder-react/src/next/lib/schema.test.ts` (U06, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts` (U07, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts` (U08, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx` (U09, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (U10, edit)
- `docs/features/software-templates/input-examples.md` (U11, edit)
- `docs/features/software-templates/writing-templates.md` (U12, edit)
- `.changeset/scaffolder-cross-step-conditional-fields.md` (U13, create)
