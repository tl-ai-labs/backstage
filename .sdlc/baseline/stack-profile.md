# Stack profile - learned from repo scan

Scope: Backstage monorepo, sampled around `plugins/scaffolder-react` (form wizard) and `plugins/scaffolder` (template editor). Other packages may differ; per repo rules, match each package's own style.

## Language & runtime
TypeScript (root `tsconfig.json`, checked with `yarn tsc` from the root only), React 18-style function components, ESM `import` syntax compiled by `backstage-cli`. Node 22 or 24, Yarn 4.18.1 workspaces with `nodeLinker: node-modules`. Tests run on Jest through `backstage-cli repo test` (`CI=1 yarn test <path>`).

## Framework
Backstage frontend plugin. Old API (`@backstage/core-plugin-api`: `useApi`, `useApiHolder`, `useAnalytics`) is mixed with the new system (`@backstage/frontend-plugin-api`: `useTranslationRef`). UI uses Material UI v4 (`makeStyles`, `@material-ui/core/*` deep imports) plus `@backstage/ui` (`Button` with `onPress` / `isDisabled`). Forms use react-jsonschema-form 5.24.13 with `@rjsf/validator-ajv8` and `ajv-errors`. Pointer resolution for review and async validation uses `json-schema-library` `Draft07`.

## Conventions detected

### File naming
- PascalCase component folder with an `index.ts` barrel: `components/Stepper/Stepper.tsx`, `components/Stepper/index.ts`, `components/ReviewState/{ReviewState.tsx,util.ts,index.ts}`.
- Hooks are camelCase `useX.ts` in `next/hooks/`, each with a sibling `useX.test.tsx`.
- Helpers are camelCase files: `createAsyncValidators.ts`, `utils.ts`, `lib/schema.ts`.
- Tests sit next to the source as `*.test.ts(x)`.

### Header (mandatory)
Every source file starts with the Apache 2.0 block: `Copyright <year> The Backstage Authors`. New files use 2026. Existing years stay unchanged.

### Component shape (`plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`)
```tsx
/**
 * The Props for {@link Stepper} component
 * @alpha
 */
export type StepperProps = {
  manifest: TemplateParameterSchema;
  extensions: FieldExtensionOptions<any, any>[];
  formProps?: FormProps;
  initialState?: Record<string, JsonValue>;
  onCreate: (values: Record<string, JsonValue>) => Promise<void>;
  ...
};

export const Stepper = (stepperProps: StepperProps) => {
  const { t } = useTranslationRef(scaffolderReactTranslationRef);
  const { presentation, steps } = useTemplateSchema(props.manifest);
  const [stepsState, setStepsState] =
    useState<Record<string, JsonValue>>(initialState);
```
- Exported arrow-function components. Public types carry TSDoc with `@alpha` or `@public` release tags (API Extractor enforces them).
- `useCallback` and `useMemo` are used heavily, and state updates use the functional form (`setStepsState(current => ({ ...current, ...formData }))`).
- User-facing strings go through `t('stepper.xxx')` from `src/translation.ts`. A new string needs a key there.

### Hook / helper shape (`next/hooks/useTemplateSchema.ts`, `next/lib/schema.ts`)
```ts
export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): { steps: ParsedTemplateSchema[]; presentation?: TemplatePresentationV1beta3 } => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title, description, mergedSchema: schema, ...extractSchemaFromStep(schema),
  }));
```
- Recursive schema walkers use a local `isObject(value): value is JsonObject` guard, `hasOwnProperty` checks, and the `JsonObject` / `JsonValue` types from `@backstage/types`.
- Deep clone uses `parse(stringify(x))` from `flatted`. Merging uses `lodash` `merge`.

### Validation shape (`next/components/Stepper/createAsyncValidators.ts`)
```ts
const parsedSchema = new JSONSchema(rootSchema);
const definitionInSchema = parsedSchema.getSchema({ pointer, data: formData });
if (!definitionInSchema) continue;
if (isJsonError(definitionInSchema)) throw new Error(definitionInSchema.message);
```
- Validators are wrapped in try/catch, and errors are collected as rjsf `FieldValidation` (`createFieldValidation()`). `hasErrors()` walks nested results.

### Test shape (`Stepper.test.tsx`, `ReviewState.test.tsx`)
```tsx
describe('Stepper', () => {
  it('should remember the state of the form when cycling through the pages', async () => {
    const manifest: TemplateParameterSchema = { steps: [ ... ], title: 'React JSON Schema Form Test' };
    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );
    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'name' }), { target: { value: 'im a test value' } });
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });
```
- `describe` and `it('should ...')` naming. Component tests use `renderInTestApp` from `@backstage/test-utils`. Pure components (ReviewState) use plain `render`. Queries are role-based (`getByRole('row', { name: 'Name John Doe' })`).
- Existing files use destructured queries with `act` + `fireEvent`. The repo rule for new tests says to prefer `screen` and `findBy*` over `waitFor`, use no test IDs, and write fewer, thorough tests.

### Config
No runtime config in this module. Behavior comes from the template manifest (`spec.parameters`, `ui:*` and `ui:backstage` keys) and from props (`formProps`, `layouts`, `extensions`). Feature flags come from `featureFlagsApiRef`.

### Data layer
None in the frontend. Templates arrive as `TemplateParameterSchema` (from `@backstage/plugin-scaffolder-common`). On submit, the backend (`plugins/scaffolder-backend/src/service/router.ts`) validates the merged `values` against every `spec.parameters` entry.

### Framework-owned wiring
- Exports go through barrels: `next/components/Stepper/index.ts` -> `next/components/index.ts` -> `next/index.ts` -> `src/alpha.ts` (`export * from './next'`). Anything newly exported shows up in `report-alpha.api.md` and needs a release tag.
- `Workflow` (scaffolder-react) wraps `Stepper` and is used by `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`. The template editor preview renders `Stepper` directly in `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx`.

## Sample files inspected
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx (kind: component / entry)
- plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts (kind: validator)
- plugins/scaffolder-react/src/next/components/Stepper/utils.ts (kind: helper)
- plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts (kind: hook)
- plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts (kind: hook)
- plugins/scaffolder-react/src/next/lib/schema.ts (kind: schema helper)
- plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx, util.ts (kind: component / helper)
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx (kind: test)
- plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx (kind: test)
- plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx (kind: consumer)
- docs/features/software-templates/input-examples.md (kind: docs)

## Notes for downstream codegen
- Keep pure logic, such as building a cross-step evaluation context, in `.ts` helpers next to the Stepper or in `next/lib/`, with unit tests. Keep React changes inside `Stepper.tsx`, `ReviewState`, and `useTemplateSchema`.
- The `<Form>` per step is keyed by `activeStep`, and `formData={stepsState}` already holds all answers. `createAsyncValidators` and `findSchemaForKey` resolve schemas with partial data (current step, or only `dependencies` keys). Cross-step conditions must feed earlier answers into those resolutions.
- Same-step conditionals already work through JSON Schema `dependencies` + `allOf`/`if`/`then` (see the docs). Prefer extending standard JSON Schema semantics over inventing new `ui:` keys, because the backend validates the same schemas.
- Changing a public or alpha signature (for example `ParsedTemplateSchema`, `StepperProps`, `ReviewStateProps`) means regenerating the API reports and writing a `minor` changeset for `@backstage/plugin-scaffolder-react` (3.0.0-next.0). Add `@backstage/plugin-scaffolder` (1.41.0-next.0, minor) only if its behavior changes.
- Docs updates belong in `docs/features/software-templates/input-examples.md` (next to "Use parameters as conditional for fields") and must follow `docs/contribute/doc-style-guide.md`.
