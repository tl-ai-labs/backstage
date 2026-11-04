## Conventions

- Format with Prettier using @backstage/cli/config/prettier (single quotes, trailing commas, 2-space indentation, 80-col print width).
- Retain existing Apache-2.0 copyright headers and years on edited files; do not alter license comments.
- Import types and values using Backstage package and relative import conventions matching the surrounding module.
- In React Testing Library tests, prefer screen queries and findBy* for async assertions, and never introduce data-testid attributes.
- Documentation in docs/ must use U.S. English, meaningful parameter names (not foo/bar/baz), bold for UI labels, and yaml code fences.

## Decisions

- Cross-step conditional schema evaluation strategy: Resolve conditional JSON Schema constructs (dependencies, if/then/else, allOf, and conditional oneOf/anyOf) against accumulated stepsState in Stepper/utils.ts and reuse across Stepper, createAsyncValidators, ReviewState, and findSchemaForKey. (not Injecting earlier step properties into currentStep.schema.properties for RJSF to evaluate; not Relying on raw JSONSchema Draft07 getSchema with unmodified formData) — Injecting earlier step properties into currentStep.schema.properties causes RJSF to re-render earlier steps' inputs in the active step, while raw JSONSchema Draft07 treats unset undefined properties as satisfying if: { properties: { flag: { const: true } } } when required is omitted.
- Unset boolean and optional property semantics in cross-step conditions: When evaluating condition predicates, populate schema default values for undefined fields, treat unset boolean properties (undefined) as false for boolean const/not comparisons, and require positive property conditions (such as const or enum without not) to match a defined value. (not Mutating stepsState to replace undefined with false on step submission) — Existing Stepper behavior and tests require untouched optional fields to remain present with undefined values in stepsState while preventing if: { properties: { flag: { const: true } } } from evaluating to true when flag is undefined.
- Pruning stale conditional values on back-navigation: Compare all property keys defined across template steps (including conditional branches) against the active resolved property keys for the current stepsState, and omit keys that belong only to inactive conditional branches when advancing steps, rendering ReviewState, or calling onCreate. (not Enabling RJSF omitExtraData and liveOmit on the per-step Form) — RJSF omitExtraData only sees the active step's schema and would strip values collected in earlier steps from the shared stepsState.

## Files of this change

- `plugins/scaffolder-react/src/next/lib/schema.ts` (U01, edit)
  - `function extractSchemaFromStep(inputStep: JsonObject): { uiSchema: UiSchema; schema: JsonObject }`
  - `function createFieldValidation(): FieldValidation`
  - `function isConditionOnlyProperty(propKey: string, propSchema: JsonObject, options?: { depKey?: string; baseProperties?: JsonObject; earlierStepKeys?: Set<string> }): boolean`
  - `function resolveConditionalSchema(schema: JsonObject, formData: JsonObject, options?: ResolveSchemaOptions): JsonObject`
  - `function collectAllSchemaPropertyKeys(schema: JsonObject, earlierStepKeys?: Set<string>, depKey?: string): Set<string>`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (U02, edit)
  - `function useTemplateSchema(manifest: TemplateParameterSchema): { steps: ParsedTemplateSchema[]; presentation?: TemplatePresentationV1beta3 }`
- `plugins/scaffolder-react/src/next/components/Stepper/utils.ts` (U03, edit)
  - `function hasErrors(errors?: FormValidation): boolean`
  - `function isObject(value: JsonValue | undefined): value is JsonObject`
  - `function resolveConditionalSchema(schema: JsonObject, formData: JsonObject, options?: ResolveSchemaOptions): JsonObject`
  - `function collectAllSchemaPropertyKeys(schema: JsonObject, earlierStepKeys?: Set<string>, depKey?: string): Set<string>`
  - `function resolveStepSchema(stepSchema: JsonObject, steps: ParsedTemplateSchema[], activeStep: number, formData: JsonObject): JsonObject`
  - `function pruneInactiveStepsState(steps: ParsedTemplateSchema[], state: Record<string, JsonValue>): Record<string, JsonValue>`
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts` (U04, edit)
  - `function createAsyncValidators(rootSchema: JsonObject, validators: Record<string, undefined | CustomFieldValidator<unknown, unknown>>, context: { apiHolder: ApiHolder }): (formData: JsonObject) => Promise<FormValidation>`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` (U05, edit)
  - `function findSchemaForKey(key: string, schemas: ParsedTemplateSchema[], formState: Partial<{ [key: string]: JsonValue }>): ParsedTemplateSchema | null`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (U06, edit)
  - `function ReviewState(props: ReviewStateProps): JSX.Element`
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (U07, edit)
  - `function Stepper(stepperProps: StepperProps): JSX.Element`
- `plugins/scaffolder-react/src/next/lib/schema.test.ts` (U08, edit)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx` (U09, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/utils.test.ts` (U10, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts` (U11, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts` (U12, edit)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx` (U13, edit)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (U14, edit)
- `docs/features/software-templates/input-examples.md` (U15, edit)
- `.changeset/scaffolder-cross-step-conditional-fields.md` (U16, create)
