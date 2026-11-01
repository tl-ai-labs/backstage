# Stack profile: learned from repo scan

Sampling was weighted toward the scaffolder packages this run touches. Backstage has 235 packages, and the project ranks consistency within a package above consistency across the repo, so check the target package before applying these rules elsewhere.

## Language & runtime

TypeScript ~5.7 on Node 22 or 24, managed by Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`). Packages export TypeScript source directly (`"main": "src/index.ts"`) during development. There is no per-package build step while developing, and `yarn tsc` runs only from the repo root.

## Framework

Backstage, a custom in-house plugin framework, on React 18 and Express 4. Three systems coexist:

- `core-*` packages: old frontend system
- `frontend-*` packages: new frontend system (extensions and blueprints)
- `backend-*` packages: backend system (`createBackendPlugin`, services, extension points)

The Scaffolder form is built on `@rjsf/core` 5.24.13 with `@rjsf/validator-ajv8`. The backend validates template parameters with the `jsonschema` library, which is a different validator. `json-schema-library` (`Draft07`) resolves dynamic schemas in the review step.

## Conventions detected

### File naming

From `plugins/scaffolder-react/src/next`:

- Components use PascalCase `.tsx`: `Stepper.tsx`, `ReviewState.tsx`
- Hooks use `useCamelCase.ts`: `useTemplateSchema.ts`
- Utilities use camelCase `.ts`: `createAsyncValidators.ts`, `utils.ts`, `schema.ts`
- Tests sit beside the source as `<name>.test.ts(x)`: `useTemplateSchema.test.tsx`
- Component folders carry an `index.ts` barrel: `components/ReviewState/index.ts`

Types are PascalCase with no `I` prefix, type parameters use a `T` prefix, and names use whole words (`STYLE.md`).

### Handler / controller shape

Frontend behaviour is packaged as extensions built from blueprints:

```tsx
export const FormDecoratorBlueprint = createExtensionBlueprint({
  kind: 'scaffolder-form-decorator',
  attachTo: { id: 'api:scaffolder/form-decorators', input: 'formDecorators' },
  dataRefs: {
    formDecoratorLoader: formDecoratorExtensionDataRef,
  },
  output: [formDecoratorExtensionDataRef],
  *factory(params: { decorator: ScaffolderFormDecorator }) {
    yield formDecoratorExtensionDataRef(params.decorator);
  },
});
```

Components are arrow-function constants with an exported props type. Every exported symbol has a TSDoc block with a release tag:

```tsx
/**
 * The `Stepper` component is the Wizard that is rendered when a user selects a template
 * @alpha
 */
export const Stepper = (stepperProps: StepperProps) => {
  const { t } = useTranslationRef(scaffolderReactTranslationRef);
  const { layouts = [], components = {}, onCreate, ...props } = stepperProps;
```

### Service shape

Backend plugins declare extension points in `register` and wire dependencies in `registerInit`:

```ts
export const scaffolderPlugin = createBackendPlugin({
  pluginId: 'scaffolder',
  register(env) {
    const addedActions = new Array<TemplateAction<any, any>>();
    env.registerExtensionPoint(scaffolderActionsExtensionPoint, {
      addActions(...newActions: TemplateAction<any>[]) {
        addedActions.push(...newActions);
      },
    });
    // ...
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
```

Hooks return parsed, typed data and keep schema work in plain functions:

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

### Test shape

Jest through `backstage-cli repo test`, with `describe` and `it`, and tests beside the source. Hook tests use `renderHook` with an API provider wrapper:

```tsx
const mockFeatureFlagsApi = mockApis.featureFlags.mock({
  isActive: jest.fn(() => false),
});

const { result } = renderHook(() => useTemplateSchema(manifest), {
  wrapper: ({ children }: PropsWithChildren<{}>) => (
    <TestApiProvider apis={[mockFeatureFlagsApi]}>
      {children}
    </TestApiProvider>
  ),
});
```

Component tests render through `renderInTestApp` from `@backstage/test-utils`:

```tsx
const { getByText } = await renderInTestApp(
  <ErrorListTemplate {...errorList} />,
);

for (const error of errorList.errors) {
  expect(getByText(error.stack)).toBeInTheDocument();
}
```

The project instructions are stricter than this older test. For new tests, use `screen` and `findBy*` over `waitFor`, avoid test IDs, and prefer fewer thorough tests with several assertions. Mock helpers come from both `@backstage/test-utils` and `@backstage/frontend-test-utils`, so follow the neighbouring test.

### Config

Config is schema-declared in a per-plugin `config.d.ts`, with `@visibility` annotations, and read through typed accessors:

```ts
export interface Config {
  /** Configuration options for the scaffolder plugin */
  scaffolder?: {
    /**
     * Default PGP signing key for signing commits.
     * @visibility secret
     */
    defaultCommitSigningKey?: string;
```

Backend code reads it with `config.getOptionalBoolean(...)` and `config.getOptionalNumber(...)`. Template form behaviour is not app config: it is declared in the template YAML through JSON Schema and `ui:*` keys, including `ui:backstage`.

### Data layer

Knex with typed row generics, and JavaScript migrations in `migrations/`:

```ts
const [result] = await this.db<RawDbTaskRow>('tasks')
  .where({ id: taskId })
  .select([
```

```js
// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('tasks', table => {
    table.binary('workspace').nullable().comment('A snapshot of the workspace');
  });
};
```

### Framework-owned wiring

A new frontend extension must be listed in the plugin's `extensions` array:

```tsx
export default createFrontendPlugin({
  pluginId: 'scaffolder',
  title: 'Create',
  // ...
  extensions: [
    scaffolderApi,
    scaffolderPage,
    // ...
    formDecoratorsApi,
    formFieldsApi,
    repoUrlPickerFormField,
    // ...
```

Backend routes are built with `createOpenApiRouter`. The `src/schema/openapi/generated` code is generated and must not be edited by hand.

## Sample files inspected

- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (kind: component)
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (kind: component)
- `plugins/scaffolder-react/src/next/blueprints/FormDecoratorBlueprint.tsx` (kind: extension blueprint)
- `plugins/scaffolder/src/alpha/plugin.tsx` (kind: entry point and frontend wiring)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (kind: hook)
- `plugins/scaffolder-react/src/next/lib/schema.ts` (kind: schema utility)
- `plugins/scaffolder-backend/src/ScaffolderPlugin.ts` (kind: backend plugin)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx` (kind: test)
- `plugins/scaffolder-react/src/next/components/Stepper/ErrorListTemplate/errorListTemplate.test.tsx` (kind: test)
- `plugins/scaffolder-backend/config.d.ts` (kind: config)
- `plugins/scaffolder-backend/migrations/20240401213200_workspace.js` (kind: migration)
- `plugins/scaffolder-backend/src/scaffolder/tasks/DatabaseTaskStore.ts` (kind: data layer, excerpt only)

`plugins/scaffolder-backend/src/service/router.ts` (1,254 lines) exceeds the 500-line sampling bound. It was excerpted for parameter validation only and did not inform these conventions.

## Notes for downstream codegen

- **Licence header:** new `.ts`, `.tsx`, `.js` and `.jsx` files need the Apache 2.0 header reading `Copyright 2026 The Backstage Authors`. Never change the year on existing files.
- **Release tags:** every export needs TSDoc with `@public` or `@alpha`, because API reports validate them. New exports change `report.api.md` or `report-alpha.api.md`.
- **Self-imports:** code under `plugins/scaffolder-react/src/next` imports shared types from `@backstage/plugin-scaffolder-react` as well as by relative path. Match the file being edited.
- **UI:** `Stepper.tsx` mixes `@backstage/ui` (`Button`) with Material UI v4 (`makeStyles`, `LinearProgress`). Use what the surrounding file uses.
- **User-facing strings:** route them through `scaffolderReactTranslationRef` in `plugins/scaffolder-react/src/translation.ts`.
- **Imports:** named `lodash` imports (`import { merge } from 'lodash'`), and inline `type` modifiers where the file already uses them.
- **Changesets:** edit `.changeset/*.md` directly, in plain language for adopters, with no internal symbol names. Packages at 1.0.0 or higher take `minor` for a non-breaking new feature. Check existing changesets first.
- **Docs:** behaviour changes need docs. For this area, use `docs/features/software-templates/`, following `docs/contribute/doc-style-guide.md`.
- **Never run:** `yarn build`, `yarn changesets version`, `yarn release`, or the changesets CLI.
