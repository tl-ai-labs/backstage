# Stack profile, learned from a repo scan

Built 2026-10-31 for run `20261031-0945-feature-extend-scaffolder-cross-step-conditions`. The sampling focused on `plugins/scaffolder-react` and `plugins/scaffolder`. CLAUDE.md says that each package's own style wins over consistency across the repo.

## Language & runtime

TypeScript ~5.7 on Node 22/24, with Yarn 4 workspaces (`packages/*`, `plugins/*`). Packages publish straight from `src/` (`"main": "src/index.ts"`, with `exports` for `.`, `./alpha` and `./testUtils`). ESM-style `import` syntax is compiled by `@backstage/cli`. Run type checking only from the root with `yarn tsc` and no options.

## Framework

Backstage frontend plugins: React 18, `@backstage/core-plugin-api` / `@backstage/frontend-plugin-api`, and react-jsonschema-form (`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8` plus `ajv-errors`). The UI mixes Material UI v4 (`makeStyles`, `@material-ui/core/*` default imports) with `@backstage/ui` (`Button`). The review step resolves schemas with `json-schema-library` (Draft07).

## Conventions detected

### File naming

- Components use PascalCase files inside a same-named folder with an `index.ts` barrel: `components/Stepper/Stepper.tsx`, `components/Stepper/index.ts`, `components/ReviewState/ReviewState.tsx`.
- Hooks and helpers use camelCase files: `hooks/useTemplateSchema.ts`, `Stepper/createAsyncValidators.ts`, `Stepper/utils.ts`, `lib/schema.ts`.
- Tests sit next to the file they test: `X.test.ts` / `X.test.tsx`.

### File header (required on new files)

```ts
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 * limitations under the License.
 */
```

Use the current year only on new files. Never change the year on existing files.

### API annotation

Every export of `src/next/**` carries a TSDoc release tag, usually `/** @alpha */` or `/** ... @alpha */`. Public API changes must be reflected in `report*.api.md` through `yarn build:api-reports`.

### Hook shape (`plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`)

```ts
/**
 * This is the parsed template schema that is returned from the {@link useTemplateSchema} hook.
 * @alpha
 */
export interface ParsedTemplateSchema {
  uiSchema: UiSchema;
  mergedSchema: JsonObject;
  schema: JsonObject;
  title: string;
  description?: string;
}

export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): { steps: ParsedTemplateSchema[]; presentation?: TemplatePresentationV1beta3 } => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title, description, mergedSchema: schema, ...extractSchemaFromStep(schema),
  }));
```

Hooks are arrow-function `const` exports with an explicit return type. Comments explain each filter step.

### Component shape (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`)

```tsx
/**
 * The `Stepper` component is the Wizard that is rendered when a user selects a template
 * @alpha
 */
export const Stepper = (stepperProps: StepperProps) => {
  const { t } = useTranslationRef(scaffolderReactTranslationRef);
  const { layouts = [], components = {}, onCreate, ...props } = stepperProps;
  const { presentation, steps } = useTemplateSchema(props.manifest);
  const [activeStep, setActiveStep] = useState(0);
  const [stepsState, setStepsState] = useState<Record<string, JsonValue>>(initialState);
```

- Props are an exported `type XProps = {...}` with TSDoc and deprecation notes.
- Styles use `makeStyles(theme => ({...}), { name: 'BackstageTemplateStepper' })` together with an exported `...ClassKey` union.
- Callbacks are wrapped in `useCallback` and derived data in `useMemo`.
- UI strings come from `scaffolderReactTranslationRef` (`t('stepper.nextButtonText')`). New user-visible strings go into `src/translation.ts`.
- The cross-step state is `stepsState`. It is passed to `<Form formData={stepsState} formContext={{...propFormContext, formData: stepsState}} schema={currentStep.schema}>`, and validated per step via `createAsyncValidators(steps[activeStep]?.mergedSchema, validators, {...})`.

### Pure helper shape (`plugins/scaffolder-react/src/next/lib/schema.ts`, `Stepper/utils.ts`)

```ts
function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export const extractSchemaFromStep = (
  inputStep: JsonObject,
): { uiSchema: UiSchema; schema: JsonObject } => {
  const uiSchema: UiSchema = {};
  const returnSchema: JsonObject = parse(stringify(inputStep));
  extractUiSchema(returnSchema, uiSchema);
  return { uiSchema, schema: returnSchema };
};
```

- Helpers use type guards on `JsonObject`/`JsonValue` from `@backstage/types`.
- The schema walkers recurse through `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then` and `else`. Any new keyword handling should follow the same walk.
- `lodash` (`merge`, `startCase`) is already a dependency.

### Test shape

Hook test (`hooks/useTemplateSchema.test.tsx`):

```tsx
import { renderHook } from '@testing-library/react';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
describe('useTemplateSchema', () => {
  it('should generate the correct schema', () => {
    const manifest: TemplateParameterSchema = { title: 'Test Template', steps: [ ... ] };
```

Component test (`components/Stepper/Stepper.test.tsx`):

```tsx
const { getByRole } = await renderInTestApp(
  <SecretsContextProvider>
    <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
  </SecretsContextProvider>,
);
await act(async () => {
  fireEvent.click(getByRole('button', { name: 'Next' }));
});
expect(getByRole('button', { name: 'Review' })).toBeInTheDocument();
```

- Jest (via backstage-cli) with `describe`/`it`.
- Inline `TemplateParameterSchema` manifests.
- `renderInTestApp` from `@backstage/test-utils`.
- CLAUDE.md prefers fewer, thorough tests with several assertions, `screen` plus `findBy*` over `waitFor`, and no test IDs. The existing file uses destructured queries and `act`, but new tests should lean toward `screen`/`findBy*`.

Pure-lib test (`lib/schema.test.ts`): `describe('extractSchemaFromStep', () => { it('transforms deep schema', () => { const inputSchema: JsonObject = {...}; ... }) })`.

### Config

Not relevant to this feature. Runtime config comes from `app-config.yaml` through Backstage config APIs. Template behaviour is driven by the template YAML `spec.parameters` (JSON Schema plus `ui:*` keys plus `ui:backstage` for Backstage-specific options such as `featureFlag`).

### Data layer

None on the frontend side. The form state is plain `Record<string, JsonValue>`, and validation uses ajv8 through rjsf `customizeValidator()`.

### Framework-owned wiring

- `@backstage/plugin-scaffolder-react` exports the wizard pieces from `src/next/index.ts` (barrels `api`, `components`, `lib`, `hooks`, ...). These are surfaced through the `./alpha` entry.
- `@backstage/plugin-scaffolder` consumes them in `src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx` (`<Workflow manifest onCreate .../>`) and in the template editor preview at `src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx` (`<Stepper .../>`). Behaviour added in `useTemplateSchema` / `Stepper` therefore reaches both automatically.

## Sample files inspected

- plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx (kind: component / controller-equivalent)
- plugins/scaffolder-react/src/next/components/Stepper/utils.ts (kind: helper)
- plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts (kind: hook / service-equivalent)
- plugins/scaffolder-react/src/next/lib/schema.ts (kind: lib)
- plugins/scaffolder-react/src/next/components/ReviewState/util.ts (kind: helper)
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx (kind: test)
- plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx (kind: test)
- plugins/scaffolder-react/src/next/lib/schema.test.ts (kind: test)
- plugins/scaffolder-react/src/next/index.ts, plugins/scaffolder-react/package.json (kind: entry/wiring)
- plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx, TemplateEditorPage/TemplateEditorForm.tsx (kind: wiring)

## Notes for downstream codegen

- Match the file being edited. In scaffolder-react `next/`, that means arrow-function exports, `@alpha` TSDoc, `JsonObject` type guards and `useCallback`/`useMemo`.
- Keep schema transformation pure and in `lib/` or hooks, with unit tests next to the code. Keep `Stepper.tsx` thin.
- Any field hidden by a cross-step condition must stay consistent in three places: the rendered step schema, the per-step validation (`mergedSchema` passed to `createAsyncValidators` and the ajv `required`), and the review step (`ReviewState` / `findSchemaForKey`).
- Template authors write conditions in YAML under `spec.parameters`. Document new syntax in `docs/features/software-templates/input-examples.md` (next to "Use parameters as conditional for fields") and/or `writing-templates.md`, following `docs/contribute/doc-style-guide.md`.
- Add a `.changeset/*.md` with a minor bump for each affected published package (scaffolder-react 3.x, scaffolder 1.x). Write it for adopters and keep code symbols out of it. Edit the file directly and do not use the changeset CLI.
- If exports change, regenerate the API reports (`yarn build:api-reports`). Never run `yarn build`.
