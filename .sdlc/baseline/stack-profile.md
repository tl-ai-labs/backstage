# Stack profile — learned from repo scan

Built 2026-11-03 for run 20261103-feature-extend-scaffolder-conditional-fields. Sampling focused on the scaffolder packages, because conventions differ per package (AGENTS.md: "consistency within a package is more important").

## Language & runtime
TypeScript in a Yarn 4 workspace monorepo. Type-checking runs once from the root with `yarn tsc`. Source is ESM-style `import` compiled by `backstage-cli`. React 17/18 function components and hooks, no class components. Every source file starts with the Apache 2.0 header `Copyright <year> The Backstage Authors`.

## Framework
Backstage plugin system. The scaffolder frontend uses React JSON Schema Form (`@rjsf/core` 5.24.13, `@rjsf/validator-ajv8` with `ajv-errors`, and `json-schema-library` Draft07 for per-field async validation). UI comes from Material UI v4 (`@material-ui/core`) mixed with `@backstage/ui` (`Button` with `onPress`/`isDisabled`). The backend is Express, validating parameters with `jsonschema`.

## Conventions detected

### File naming
- Components are PascalCase files in a same-named folder with an `index.ts` barrel: `src/next/components/Stepper/Stepper.tsx`, `Stepper/index.ts`.
- Hooks are camelCase `useX.ts` in `src/next/hooks/` with a barrel `hooks/index.ts`: `useTemplateSchema.ts`.
- Libs are lowercase: `src/next/lib/schema.ts`.
- Tests sit next to the file as `*.test.ts(x)`.

### Handler / controller shape (React component)
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
```
Exports are named arrow-function consts. Exported API carries TSDoc release tags (`@alpha`, `@public`), because API reports (`report-alpha.api.md`) are generated from them. Styles use `makeStyles(..., { name: 'BackstageTemplateStepper' })`. Strings go through `scaffolderReactTranslationRef`.

### Service shape (hook)
```ts
export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): {
  steps: ParsedTemplateSchema[];
  presentation?: TemplatePresentationV1beta3;
} => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title,
    description,
    mergedSchema: schema,
    ...extractSchemaFromStep(schema),
  }));
```
Hooks take the manifest and return derived, immutable data. Backstage APIs come in through `useApi(xApiRef)`. Data is copied with `{...spread}`, `cloneDeep` from lodash, or `parse(stringify())` from flatted.

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
Jest via `backstage-cli` with `describe/it` and `renderInTestApp` from `@backstage/test-utils`. Interactions use `fireEvent` inside `act`. Existing tests use destructured queries, but AGENTS.md asks new tests to prefer `screen` and `findBy*` over `waitFor`, and to add no test IDs. Hook tests use `renderHook` with `TestApiProvider` (see `useTemplateSchema.test.tsx`). Pure lib tests check plain input against expected output (`schema.test.ts`).

### Config
Runtime config comes from `app-config.yaml` and is read through `configApiRef`. Each package declares its config schema in `config.d.ts`. Scaffolder template behaviour is driven by the template entity YAML (`spec.parameters`) rather than app config. Feature flags use `featureFlagsApiRef`, with the `ui:backstage.featureFlag` / `backstage:featureFlag` keys.

### Data layer
Not relevant to the frontend. The backend uses Knex (see `knexfile.js`). Template parameters reach the frontend from `GET /v2/templates/:ns/:kind/:name/parameter-schema` (`router.ts` around line 484), which maps `spec.parameters` into `steps[].schema`.

### Framework-owned wiring
- Public surface: anything new must be exported through the package barrels (`src/next/hooks/index.ts`, `src/next/index.ts` → `src/alpha.ts`). Then run `yarn build:api-reports` to update `report*.api.md`.
- Field extensions register through `FormFieldBlueprint` (new frontend system) or `createScaffolderFieldExtension`. Form decorators use `FormDecoratorBlueprint`.
- Template keywords pass through `extractSchemaFromStep`, where `ui:*` keys move into the uiSchema. Backstage-specific keys use the `ui:backstage` / `backstage:` prefixes.

## Sample files inspected
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx (kind: component / controller)
- plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts (kind: hook / service)
- plugins/scaffolder-react/src/next/hooks/useFilteredSchemaProperties.ts (kind: hook / service)
- plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts (kind: hook)
- plugins/scaffolder-react/src/next/lib/schema.ts (kind: lib / schema transform)
- plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts (kind: validator)
- plugins/scaffolder-react/src/next/components/ReviewState/util.ts (kind: lib)
- plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx (kind: test)
- plugins/scaffolder-common/src/TemplateEntityV1beta3.ts (kind: types)
- plugins/scaffolder-backend/src/service/router.ts (kind: backend handler, parameter validation)

## Notes for downstream codegen
- Keep the Apache header (2026 on new files only), named exports, and TSDoc with release tags on every exported symbol.
- Import order seen in Stepper.tsx: `@backstage/*`, then `@material-ui/*`, then `@rjsf/*`, then lodash and react, then relative imports. Relative imports come from barrels (`'../../hooks'`).
- Write data handling immutably. Copy `JsonObject` values before mutating them, as `extractSchemaFromStep` does.
- When hiding a field, also drop it from `required` (`useFilteredSchemaProperties` precedent) and from the review page (`ReviewState/util.ts`).
- Keep frontend validation in line with backend `jsonschema` validation in `scaffolder-backend/src/service/router.ts`.
- Use `CI=1 yarn test plugins/scaffolder-react/src/next/<path>` for focused runs.
