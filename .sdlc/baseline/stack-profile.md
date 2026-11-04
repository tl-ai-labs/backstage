# Stack profile: learned from a repo scan

Built on 2026-11-04 by run `20261104-160801-feature-extend-scaffolder-conditional-fields`. Sampling covered the scaffolder packages (`plugins/scaffolder-react`, `plugins/scaffolder`, `plugins/scaffolder-backend`) because the run intent is feature-extend on scaffolder conditional fields. Other packages may differ; AGENTS.md says to match each package's own style.

## Language and runtime

- TypeScript throughout. Node 22 or 24, Yarn 4.18.1 workspaces with `workspace:^` cross-references.
- Packages are ESM-style TS sources that `backstage-cli` builds. Each `package.json` `exports` map points at `src/*.ts` (for example `"."`, `"./alpha"` and `"./testUtils"` in scaffolder-react).
- Every source file starts with the Apache 2.0 header `Copyright <year> The Backstage Authors`. New files use the current year; existing years are never changed.
- Type checking runs from the repo root with `yarn tsc`.

## Framework

Backstage, with two frontend systems living side by side:
- **New frontend system:** `@backstage/frontend-plugin-api` blueprints and extensions, exported from `/alpha` entry points.
- **Old frontend system:** `@backstage/core-plugin-api`, including `useApi` and `featureFlagsApiRef`.

The scaffolder forms run on react-jsonschema-form (`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8` 5.24.13) with `ajv-errors`. The UI mixes Material UI v4 (`@material-ui/core`) with the newer `@backstage/ui`. The backend runs on the Backstage backend system with express and knex.

## Conventions detected

### File naming

- React components and the hooks that sit next to them use one PascalCase or camelCase file per export, inside a folder with an `index.ts` barrel. Examples: `next/components/Stepper/Stepper.tsx`, `Stepper/index.ts`, `next/hooks/useTemplateSchema.ts`.
- Tests sit beside the source as `<name>.test.ts(x)`. Examples: `useFilteredSchemaProperties.test.tsx`, `lib/schema.test.ts`.
- Blueprints use PascalCase file names, such as `next/blueprints/FormFieldBlueprint.tsx`.
- Backend actions use lowercase names, with examples in sibling files: `scaffolder/actions/builtin/debug/wait.ts`, `wait.examples.ts`, `wait.test.ts`.
- Each field folder holds `<Field>.tsx`, `schema.ts`, `validation.ts` and `index.ts`. Example: `plugins/scaffolder/src/components/fields/EntityNamePicker/`.

### Hook shape (the scaffolder-react `next/hooks` layer)

```ts
/**
 * This hook will parse the template schema and return the steps with the
 * parsed schema and uiSchema. Filtering out any steps or properties that
 * are not enabled with feature flags.
 * @alpha
 */
export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): {
  steps: ParsedTemplateSchema[];
  presentation?: TemplatePresentationV1beta3;
} => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title, description, mergedSchema: schema,
    ...extractSchemaFromStep(schema),
  }));
```

- Exports are arrow-function consts.
- Every exported symbol carries a TSDoc comment with a release tag (`@public` or `@alpha`). API Extractor enforces this through `report*.api.md`.

### Schema processing (`plugins/scaffolder-react/src/next/lib/schema.ts`)

`extractSchemaFromStep` deep-copies a step with `flatted` (`parse(stringify(...))`). It then moves every `ui:*` key into a parallel rjsf `uiSchema` by walking `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then` and `else`. This is where JSON-Schema conditional constructs (`dependencies`, `if`/`then`/`else`, `oneOf`) already get their `ui:` options extracted.

```ts
  if (isObject(dependencies)) {
    for (const depName of Object.keys(dependencies)) {
      const schemaNode = dependencies[depName];
      if (!isObject(schemaNode)) {
        continue;
      }
      extractUiSchema(schemaNode, uiSchema);
    }
  }

  if (isObject(then)) {
    extractUiSchema(then, uiSchema);
  }
```

Feature-flag filtering of steps and properties happens in two places:
- `useTemplateSchema`, through `uiSchema['ui:backstage'].featureFlag`
- `useFilteredSchemaProperties`, through the `backstage:featureFlag` schema key, which also prunes `required`

`Stepper.tsx` (362 lines) consumes `useTemplateSchema`. It renders `<Form>` with `formContext={{ ...propFormContext, formData: stepsState }}` and validates with `customizeValidator` plus `ajvErrors` and `createAsyncValidators`.

### Field extension shape

```ts
export const EntityNamePickerFieldSchema = makeFieldSchema({
  output: z => z.string(),
});
export const EntityNamePickerSchema = EntityNamePickerFieldSchema.schema;
export type EntityNamePickerProps = typeof EntityNamePickerFieldSchema.TProps;
```

### Framework-owned wiring

In the new frontend system, fields are registered as `FormFieldBlueprint` extensions in `plugins/scaffolder/src/alpha/extensions.tsx`, each with a lazy import:

```ts
export const entityNamePickerFormField = FormFieldBlueprint.make({
  name: 'entity-name-picker',
  params: {
    field: () =>
      import('./fields/EntityNamePicker').then(m => m.EntityNamePicker),
  },
});
```

`FormFieldBlueprint` (in scaffolder-react `next/blueprints`) is a `createExtensionBlueprint` with `kind: 'scaffolder-form-field'` that attaches to `api:scaffolder/form-fields`. Public exports go through barrel `index.ts` files, such as `next/index.ts` re-exporting `./api`, `./components`, `./lib`, `./hooks`, `./blueprints` and `./extensions`.

### Backend action shape

```ts
  return createTemplateAction({
    id,
    description: 'Waits for a certain period of time.',
    examples,
    schema: {
      input: {
        minutes: z =>
          z
            .number({
              description: 'Waiting period in minutes.',
```

Action input and output schemas are zod callbacks (`z => z...`). Examples live in a sibling `*.examples.ts` file and are tested in `*.examples.test.ts`.

### Test shape

- Jest runs through `backstage-cli package test`, using `describe` and `it` with plain `expect`. Hooks are tested with `renderHook` from `@testing-library/react`.
- APIs are mocked with `mockApis.featureFlags.mock()` from `@backstage/frontend-test-utils` and wrapped in `TestApiProvider` from `@backstage/test-utils`.
- Template manifests are written inline as typed `TemplateParameterSchema` objects.
- From AGENTS.md: prefer fewer, thorough tests with several assertions each. With React Testing Library, prefer `screen` and `findBy*` over `waitFor`, and don't add test IDs.

```ts
const mockFeatureFlagApi = mockApis.featureFlags.mock();

describe('useFilteredSchemaProperties', () => {
  it('should return the same manifest if no feature flag is set', () => {
    mockFeatureFlagApi.isActive.mockReturnValue(true);
    const manifest: TemplateParameterSchema = { title: 'Test Action template', ... };
    const filteredManifest = renderHook(
      () => useFilteredSchemaProperties(manifest),
      { wrapper: ({ children }) => (
          <TestApiProvider apis={[[featureFlagsApiRef, mockFeatureFlagApi]]}>
```

### Config

- Runtime config comes from `app-config*.yaml`, read through Backstage's config API.
- Package config schemas live in `config.d.ts` files.
- The scaffolder packages read only `LOG_LEVEL` and `NODE_ENV` directly from env.

### Data layer

`scaffolder-backend` uses knex, through the Backstage database service and migrations. The frontend scaffolder packages have no data layer.

## Sample files inspected

- `plugins/scaffolder-react/src/next/lib/schema.ts` (lib, schema processing)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (hook)
- `plugins/scaffolder-react/src/next/hooks/useFilteredSchemaProperties.ts` (hook)
- `plugins/scaffolder-react/src/next/hooks/useFilteredSchemaProperties.test.tsx` (test)
- `plugins/scaffolder-react/src/next/blueprints/FormFieldBlueprint.tsx` (wiring)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (component; imports and structure only)
- `plugins/scaffolder/src/components/fields/EntityNamePicker/schema.ts` (field schema)
- `plugins/scaffolder/src/alpha/extensions.tsx` (registration)
- `plugins/scaffolder-backend/src/scaffolder/actions/builtin/debug/wait.ts` (backend action)
- `.changeset/fix-bui-array-item-titles.md` (changeset format)

## Notes for downstream codegen

- Put the Apache 2.0 header with the current year on every new `.ts` or `.tsx` file.
- Tag every new exported symbol with TSDoc and a release tag, such as `@alpha` for the `next/` and alpha APIs. Public API changes need regenerated `report*.api.md` files. Don't edit those by hand; run `yarn build:api-reports`.
- Changes to published packages need a changeset in `.changeset/*.md`, written as front-matter mapping each package to a bump, then plain adopter-facing prose. Example: `'@backstage/plugin-scaffolder-react': patch`. Scaffolder-react is at 3.0.0-next.0 and scaffolder at 1.41.0-next.0, so a new feature is `minor` on both. Check the existing changesets first.
- Template-schema transforms in scaffolder-react should be pure functions over `JsonObject` in `next/lib`, wired into the `next/hooks` layer, with sibling `*.test.ts` coverage. Stick with the existing `isObject` guards and the `for...in` plus `hasOwnProperty` style.
- Import style: package imports by name (for example `@backstage/plugin-scaffolder-react`, even inside the package itself, as `useTemplateSchema.ts` does), relative imports for siblings, and lodash per-method imports (`lodash/cloneDeep`) in some files.
- Features need docs: TSDoc, the package README, or `docs/features/software-templates/` for template author-facing behavior.
