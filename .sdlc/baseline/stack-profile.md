# Stack profile - learned from repo scan

Built 2026-11-04 for run 20261104-170641-feature-extend-cross-step-conditional-fields.
Why Tier 2b ran: the primary stack is React/TypeScript (Backstage frontend plugins), and no pre-authored adapter matches it (only generic, nest, python ship). Sampling focused on `plugins/scaffolder-react` and `plugins/scaffolder`.

## Language & runtime
TypeScript ~5.7 on Node 22/24, ESM-style `import` syntax compiled by `backstage-cli`. Yarn 4 workspaces (`packages/*`, `plugins/*`). Type check runs only from the root with `yarn tsc`. React 18 function components with hooks. Public API surfaces are tracked in `report*.api.md` (API Extractor) with release tags (`@public`, `@alpha`) in TSDoc.

## Framework
Backstage plugin system. scaffolder-react has two surfaces: `src/` (public, legacy) and `src/next/` (exported via `/alpha`). Forms use rjsf 5.24.13 (`@rjsf/core` `withTheme`, `@rjsf/validator-ajv8` `customizeValidator` + `ajv-errors`). Server-side-style schema walking for review and async validation uses `json-schema-library` `Draft07`. UI mixes `@backstage/ui` (`Button`) with Material UI v4 (`MuiStepper`, `makeStyles`).

## Conventions detected

### File naming
- Components: PascalCase dir + file + barrel: `src/next/components/Stepper/Stepper.tsx`, `Stepper/index.ts`, `ReviewState/ReviewState.tsx`
- Helpers: camelCase/lowercase next to the component: `Stepper/createAsyncValidators.ts`, `Stepper/utils.ts`, `ReviewState/util.ts`
- Hooks: `src/next/hooks/useTemplateSchema.ts`. Lib: `src/next/lib/schema.ts`
- Tests sit next to the code: `X.test.ts` / `X.test.tsx`

### File header (mandatory)
```ts
/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 * limitations under the License.
 */
```
New files use the current year (2026). Never change the year on existing files.

### Component / handler shape
```tsx
/**
 * The `Stepper` component is the Wizard that is rendered when a user selects a template
 * @alpha
 */
export const Stepper = (stepperProps: StepperProps) => {
  const { t } = useTranslationRef(scaffolderReactTranslationRef);
  const { layouts = [], components = {}, onCreate, ...props } = stepperProps;
  const { presentation, steps } = useTemplateSchema(props.manifest);
  const [stepsState, setStepsState] =
    useState<Record<string, JsonValue>>(initialState);
  const validation = useMemo(() => {
    return createAsyncValidators(steps[activeStep]?.mergedSchema, validators, {
      apiHolder,
    });
  }, [steps, activeStep, validators, apiHolder]);
```
Exported arrow-function consts with a TSDoc block and release tag. Props types are exported (`StepperProps`, `ReviewStateProps`). Strings go through `useTranslationRef` (translation keys in `src/translation.ts`).

### Utility / lib shape
```ts
function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Takes a step from a Backstage Template Manifest and converts it to a JSON Schema and UI Schema for rjsf
 * @alpha
 */
export const extractSchemaFromStep = (
  inputStep: JsonObject,
): { uiSchema: UiSchema; schema: JsonObject } => {
```
Uses `JsonObject` / `JsonValue` from `@backstage/types` and type-guard helpers. Recursive walkers cover `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then`, `else`. Type guards like `isObject` / `isJsonObject` are duplicated locally in several files.

### Hook shape
```ts
export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): {
  steps: ParsedTemplateSchema[];
  presentation?: TemplatePresentationV1beta3;
} => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title, description, mergedSchema: schema, ...extractSchemaFromStep(schema),
  }));
```

### Test shape
```tsx
describe('Stepper', () => {
  it('should render the step titles for each step of the manifest', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'React JSON Schema Form Test',
    };
    const { getByText } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );
```
Jest + `describe/it('should ...')`. Components render with `renderInTestApp` from `@backstage/test-utils` (ReviewState uses plain `render`). Interaction uses `fireEvent` / `act`. Older tests destructure queries. The repo rules prefer `screen` + `findBy*` for new tests, no test IDs, and fewer, thorough tests. Pure lib tests build a `JsonObject` input and `expect(...).toEqual(expected)`.

### Config
Not applicable to this area. The template manifest (`TemplateParameterSchema`) is the input. Backstage `app-config.yaml` holds the runtime config.

### Data layer
Not applicable to this area (frontend). Form state is a flat `Record<string, JsonValue>` shared across steps in `Stepper` (`stepsState`), merged on `onChange` and on `handleNext`.

### Framework-owned wiring
- `Stepper` is consumed by `Workflow` (`src/next/components/Workflow/Workflow.tsx`) -> `TemplateWizardPage` in `plugins/scaffolder`, and directly by `TemplateEditorForm` (template editor preview) through `@backstage/plugin-scaffolder-react/alpha`.
- Exports flow through barrels: `Stepper/index.ts` -> `src/next/components/index.ts` -> `src/next/index.ts` -> `src/alpha.ts`. A new exported symbol shows up in `report-alpha.api.md` after `yarn build:api-reports`.
- Release notes go in hand-written `.changeset/*.md` files (frontmatter `'@backstage/plugin-scaffolder-react': minor`). Pre mode `next` is on.

## Sample files inspected
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx (kind: component/controller)
- plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts (kind: validator)
- plugins/scaffolder-react/src/next/lib/schema.ts (kind: service/lib)
- plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts (kind: hook/service)
- plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx, util.ts (kind: component, lib)
- plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx (kind: consumer/wiring)
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx, lib/schema.test.ts, ReviewState/ReviewState.test.tsx (kind: test)

## Notes for downstream codegen
- Keep `@alpha` exports' signatures backward-compatible where possible. A changed signature is a breaking change: `major` for scaffolder-react 3.x, and it needs a changeset plus regenerated API reports.
- Each rjsf `Form` gets `schema={currentStep.schema}`. Cross-step conditionals therefore need the other steps' answers to reach the condition. Options: inject earlier-step values into the condition schema, or use rjsf `formContext.formData`, or extend schema resolution. Remember that `createAsyncValidators` and `findSchemaForKey` evaluate `mergedSchema` per step with `json-schema-library` and need the same awareness.
- Use `JsonObject` / `JsonValue` from `@backstage/types`, plus local type guards. Don't add lodash beyond the existing `startCase` use.
- New tests go in the existing `*.test.ts(x)` next to the code. Prefer `screen` / `findBy*`.
- Docs: add a cross-step example under "Use parameters as conditional for fields" in `docs/features/software-templates/input-examples.md`, following `docs/contribute/doc-style-guide.md`.
