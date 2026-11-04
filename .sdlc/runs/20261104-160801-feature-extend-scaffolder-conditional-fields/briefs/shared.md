## Conventions

- New source files must start with the Backstage Apache 2.0 license header with copyright year 2026; existing files keep their existing copyright year unchanged.
- Follow Prettier formatting (2-space indentation, single quotes, trailing commas) and TypeScript strict null/type checks without using any unless already present in the surrounding signature.
- Do not add any new package dependencies; use only packages already declared in plugins/scaffolder-react/package.json (@rjsf/utils, @rjsf/validator-ajv8, json-schema-library, lodash, flatted, @backstage/types).
- Do not alter public or alpha exported signatures re-exported from package entrypoints so API report files (report.api.md, report-alpha.api.md) remain unchanged.
- Write tests using React Testing Library with screen and findBy* queries instead of waitFor where possible, and never add data-testid attributes to implementation components.
- Changeset files in .changeset/ must use plain, adopter-facing language with no internal function, hook, or type symbol names.
- Documentation in docs/ follows docs/contribute/doc-style-guide.md (American English, active voice, sentence-case headings, runnable YAML examples).

## Decisions

- Cross-step conditional schema resolution helper placement and signature: Add internal helpers resolveStepSchema and getSchemaPropertyKeys in plugins/scaffolder-react/src/next/lib/schema.ts (not re-exported from plugins/scaffolder-react/src/next/lib/index.ts). (not Exporting new helpers from plugins/scaffolder-react/src/next/lib/index.ts or package root; not Duplicating conditional evaluation logic separately in Stepper, createAsyncValidators, and ReviewState) — Keeping the helpers internal to src/next/lib/schema.ts shares one standard JSON Schema resolution implementation across Stepper, createAsyncValidators, useTemplateSchema, and ReviewState without changing public or alpha API reports.
- Standard JSON Schema evaluation and undefined formState values: Strip keys whose value in formState/stepsState is undefined before evaluating JSON Schema conditions (if/then/else, dependencies, allOf, oneOf, anyOf) using @rjsf/validator-ajv8 isValid, while keeping stepsState itself untouched for onCreate. (not Treating missing boolean flags as false when evaluating if: { properties: { flag: { const: true } } } without required: ['flag']; not Mutating stepsState to delete undefined or inactive properties before calling onCreate) — Standard JSON Schema (and backend jsonschema validation) requires required: ['flag'] in if conditions or dependencies keyed on flag so an absent property does not vacuously match, and Out of Scope 5 requires keeping the data passed to onCreate unchanged.
- Preventing earlier-step controlling fields from re-rendering in later steps: When resolving cross-step conditional branches into a step schema, exclude property definitions for keys defined in earlier steps (previousStepKeys), cross-step dependency controlling keys, if-condition keys not in the current step's own properties, and pure discriminator constraint schemas (having const/enum without type or UI metadata) while keeping same-step conditionals intact for RJSF. (not Injecting earlier step property definitions into the current step's schema.properties so RJSF processDependencies can run on them; not Flattening same-step conditionals statically before passing schema to RJSF Form) — Injecting earlier step properties into a later step's schema.properties causes RJSF ObjectField to render the earlier step's input again on the later step, whereas resolving cross-step branches and stripping earlier-step discriminator keys renders only the current step's active fields while preserving live same-step reactivity.
- Filtering inactive conditional fields in ReviewState while preserving unschematized keys: Resolve each step's mergedSchema against the full formState in findSchemaForKey and processSchema, and when findSchemaForKey returns null for a key in formState, omit the key in ReviewState if isKeyDefinedInSchemas reports it is defined in any step schema, otherwise render the formatted key/value fallback. (not Rendering all keys present in formState regardless of whether their schema condition is met; not Dropping all keys where findSchemaForKey returns null even when schemas is empty or the key is not defined in any schema) — Conditional fields from inactive branches (including stale answers left in stepsState after navigating back and changing an earlier answer) are defined in step schemas and must be hidden when inactive, whereas existing callers/tests pass unschematized keys or empty schemas arrays and expect the fallback row.

## Files of this change

- `plugins/scaffolder-react/src/next/lib/schema.ts` (U01, edit) — import: `import { extractSchemaFromStep, getSchemaPropertyKeys, resolveStepSchema } from '../../lib/schema';`
  - `function getSchemaPropertyKeys(schema: JsonObject): Set<string>`
  - `function resolveStepSchema(inputSchema: JsonObject, formData: Partial<Record<string, JsonValue>>, options: ResolveStepSchemaOptions): JsonObject`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (U02, edit) — import: `import { useTemplateSchema, type ParsedTemplateSchema } from '../../hooks/useTemplateSchema';`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` (U03, edit) — import: `import { isJsonObject, formatKey, findSchemaForKey, isKeyDefinedInSchemas } from './util';`
  - `function isKeyDefinedInSchemas(key: string, schemas: ParsedTemplateSchema[]): boolean`
  - `function findSchemaForKey(key: string, schemas: ParsedTemplateSchema[], formState: Partial<{ [key: string]: JsonValue }>): ParsedTemplateSchema | null`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (U04, edit) — import: `import { ReviewState, type ReviewStateProps } from '../ReviewState';`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts` (U05, edit) — import: `import { createAsyncValidators, type FormValidation } from './createAsyncValidators';`
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (U06, edit) — import: `import { Stepper, type StepperProps } from './Stepper';`
- `plugins/scaffolder-react/src/next/lib/schema.test.ts` (U07, edit)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx` (U08, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts` (U09, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx` (U10, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts` (U11, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (U12, edit)
- `docs/features/software-templates/input-examples.md` (U13, edit)
- `.changeset/scaffolder-cross-step-conditional-fields.md` (U14, create)
