# Stack profile — learned from repo scan

Built 2026-10-29 from `/Users/macbook/Documents/GitHub/Google-Projects/backstage` at
`f20fd9b598285c88401406b3812fe00d7708136c`. Triggered because the dominant stack (React/TypeScript) has no
pre-authored adapter — the shipped set is `generic.md`, `nest.md`, `python.md`. **This profile wins over
`generic.md` on any conflict.**

Sampling was weighted toward `plugins/scaffolder-react` and `plugins/scaffolder`, the packages relevant to
the upcoming job. Conventions vary between packages in this monorepo; project instructions state
explicitly that **consistency within a package beats consistency across the repo**. Treat the sampled
package as authoritative for the files being edited.

## Language & runtime

TypeScript `~5.7.0`, ESM-authored sources compiled by `backstage-cli`. Node `22 || 24`. Yarn Berry 4.18.1
with workspaces (`packages/*`, `plugins/*`, 235 packages). Root `tsconfig.json` extends
`@backstage/cli/config/tsconfig.json`, sets `jsx: "react-jsx"` (no `import React` needed) and
`useUnknownInCatchVariables: false`. React 18. Jest 30 under `--experimental-vm-modules`.

## Framework

React + **react-jsonschema-form (RJSF)** for the Scaffolder form layer: `@rjsf/core`, `@rjsf/utils`,
`@rjsf/material-ui`. Two themes coexist — legacy Material UI v4 (`mui`) and the newer `@backstage/ui`
(`bui`) — selected at runtime. Backstage's own plugin architecture layers on top: frontend plugins expose
extensions via `@backstage/frontend-plugin-api` (new system) or `@backstage/core-plugin-api` (old system).

## Conventions detected

### File naming

`PascalCase.tsx` for components, one component per directory with a barrel:

```
next/components/Stepper/
  Stepper.tsx            <- the component, named export
  Stepper.test.tsx       <- colocated test
  createAsyncValidators.ts
  createAsyncValidators.test.ts
  utils.ts
  utils.test.ts
  index.ts               <- barrel, explicit re-exports
```

- Hooks: `camelCase` with `use` prefix — `useTemplateSchema.ts`, `useTransformSchemaToProps.ts`.
- Plain modules: `camelCase.ts` — `schema.ts`, `utils.ts`, `createAsyncValidators.ts`.
- Tests: `*.test.ts` / `*.test.tsx`, **colocated beside the implementation**, never in a separate
  `__tests__/` tree. Variant suffixes exist for theme-specific tests (`Form.bui.test.tsx`).
- No `.controller.ts` / `.service.ts` suffixes anywhere — this is not a layered-backend codebase.

### Mandatory file header

Every new `.ts`/`.tsx`/`.js`/`.jsx` source file must carry the Apache 2.0 header with the **current year**.
`eslint-plugin-notice` enforces it. **Never change the year on an existing file.**

```ts
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

Does not apply to JSON/YAML config, generated files, or markdown.

### Component shape

Arrow-function components assigned to a `const`, named export, props typed inline or via an exported
interface. TSDoc with a release tag (`@alpha`, `@public`) on anything exported. From
`next/components/Form/Form.tsx`:

```tsx
import { withTheme } from '@rjsf/core';
import { useMemo, PropsWithChildren } from 'react';
import { FieldProps } from '@rjsf/utils';
import { Theme as MuiTheme } from '@rjsf/material-ui';

const MuiForm = withTheme(MuiTheme);
const BuiForm = withTheme(generateBuiTheme());

/**
 * The Form component
 * @alpha
 */
export const Form = (
  props: PropsWithChildren<
    ScaffolderRJSFFormProps & Pick<FormProps, 'EXPERIMENTAL_theme'>
  >,
) => {
  const { EXPERIMENTAL_theme: themeProp, ...formProps } = props;
  const theme: ScaffolderTheme = themeProp ?? 'mui';
  const WrappedForm = theme === 'bui' ? BuiForm : MuiForm;
  // ...
};
```

Note: no `React.FC`, no default exports, `useMemo` used liberally to stabilise derived objects passed to
RJSF.

### Hook shape

Hooks return a typed object, derive everything from arguments, and are documented with a release tag.
From `next/hooks/useTemplateSchema.ts` — **the most relevant existing precedent for conditional field
logic**, since it already does per-property filtering:

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

  const returningSteps = steps
    .filter(step => { /* drop steps gated by a feature flag */ })
    .map(step => {
      // NOTE: property stripping is deliberately skipped when the step
      // declares JSON Schema `dependencies`.
      if (step.schema?.properties || !step.schema?.dependencies) {
        strippedSchema.schema.properties = Object.fromEntries(
          Object.entries((step.schema?.properties ?? {}) as JsonObject)
            .filter(([key]) => { /* uiSchema[key]['ui:backstage'].featureFlag */ }),
        );
      }
      return strippedSchema;
    });

  return { presentation: manifest.presentation, steps: returningSteps };
};
```

Memoised transform hooks follow the same pattern with `useMemo` and early returns
(`useTransformSchemaToProps.ts`).

### Pure-module / util shape

Named `export function`, local type guards, no classes. Recursion over JSON Schema is the house style —
from `next/lib/schema.ts`:

```ts
function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractUiSchema(schema: JsonObject, uiSchema: JsonObject) {
  if (!isObject(schema)) return;
  const { properties, items, anyOf, oneOf, allOf, dependencies, then, else: _else } = schema;
  // ...walks each branch recursively, hoisting `ui:` keys out of the data schema
}
```

`Stepper/utils.ts` repeats the pattern with its own `isObject` and a recursive `hasErrors`. Small local
type guards are duplicated per module rather than shared — follow that, do not refactor into a shared util.

### Barrel shape

`index.ts` files use explicit named re-exports with `type` modifiers, never `export *`:

```ts
export {
  Stepper,
  type StepperProps,
  type BackstageTemplateStepperClassKey,
} from './Stepper';
export {
  createAsyncValidators,
  type FormValidation,
} from './createAsyncValidators';
```

### Test shape

Jest + React Testing Library via Backstage's `renderInTestApp`. `describe` / `it`, `await`ed queries,
and — per project instructions — **fewer, thorough tests with multiple assertions** over many tiny ones.
Prefer `screen` and `.findBy*` over `waitFor`; do not add test IDs to implementation.

```tsx
import { renderInTestApp } from '@backstage/test-utils';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { SecretsContextProvider } from '../../../secrets';
import { TemplateParameterSchema } from '../../../types';
import { Stepper } from './Stepper';

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

    for (const step of manifest.steps) {
      expect(getByText(step.title)).toBeInTheDocument();
    }
  });
});
```

Scaffolder component tests build an inline `TemplateParameterSchema` literal as the fixture and wrap in
`SecretsContextProvider`. Imports in tests are **relative** (`'../../../types'`), not package-aliased.

Run with `CI=1 yarn test <path>` from the repo root. Always pass a path.

### Imports

- Relative within a package (`'./FieldTemplate'`, `'../../../extensions'`).
- Package-scoped across packages (`'@backstage/plugin-scaffolder-react'`, `'@backstage/types'`).
- `import type` / inline `type` modifiers used for type-only imports.
- No path aliases (`@/`, `~/`) anywhere.
- No `import React from 'react'` — `jsx: react-jsx` is on; import only the hooks used.

### Config

No dotenv. Runtime config is `app-config.yaml` read through `@backstage/config`; packages declare their
own schema in `config.d.ts` (included by root tsconfig). `process.env` reads are confined to CLI/tooling
and test plumbing.

### Data layer

Not relevant to the scaffolder frontend. Backend packages use Knex (`knexfile.js` at root,
`db/migrations` per plugin). The frontend talks to the backend through typed API refs
(`scaffolderApiRef`) obtained via `useApi`.

### Framework-owned wiring

Two systems live side by side:

- **New frontend system** — blueprints from `@backstage/frontend-plugin-api`; scaffolder blueprints are
  under `plugins/scaffolder-react/src/next/blueprints/` and `plugins/scaffolder/src/alpha/`. Field
  extensions register as blueprint instances.
- **Old frontend system** — `createPlugin` / `createApiFactory` from `@backstage/core-plugin-api`; field
  extensions register via `createScaffolderFieldExtension` and are passed into the `Workflow`/`Stepper`
  as the `extensions` prop.

For the Scaffolder specifically, a new form behavior reaches users through the **template's JSON Schema +
`uiSchema`**, parsed by `extractSchemaFromStep` (`next/lib/schema.ts`) and consumed by `Stepper.tsx`.
Backstage-specific uiSchema options live under the `ui:backstage` namespace — e.g.
`uiSchema[prop]['ui:backstage'].featureFlag`. A new conditional-visibility option should follow that
namespace rather than inventing a top-level `ui:` key.

## Sample files inspected

- `plugins/scaffolder-react/src/next/components/Form/Form.tsx` (kind: component)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx` (kind: component, 362 lines)
- `plugins/scaffolder-react/src/next/components/Stepper/utils.ts` (kind: util)
- `plugins/scaffolder-react/src/next/components/Stepper/index.ts` (kind: barrel)
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (kind: test)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts` (kind: hook)
- `plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts` (kind: hook)
- `plugins/scaffolder-react/src/next/lib/schema.ts` (kind: schema util)
- `plugins/scaffolder-react/package.json` (kind: manifest)
- `tsconfig.json`, root `package.json` (kind: config)

## Notes for downstream codegen

1. **Apache 2.0 header with year 2026 on every new source file.** Lint fails without it. Never touch the
   year on an existing file.
2. **Colocate tests** as `X.test.tsx` next to `X.tsx`. No `__tests__/` directories.
3. **Named exports only**, arrow-function components, no `React.FC`, no default exports.
4. **TSDoc with a release tag** (`@alpha` / `@public`) on every exported symbol — the API-report tooling
   validates release tags. New exports from a public package mean `yarn build:api-reports` must run
   before the PR.
5. **A changeset is required** for `@backstage/plugin-scaffolder-react` (public, `3.0.0-next.0`). Write
   `.changeset/<name>.md` by hand; never use the changeset CLI, even to inspect. A new feature on a
   package at ≥1.0.0 is a `minor`. Message must be adopter-facing and must not name internal functions,
   classes, or variables.
6. **Do not add a third filtering mechanism** without reading all of `useTemplateSchema.ts`,
   `useFilteredSchemaProperties.ts`, and `lib/schema.ts` — two property-filtering paths already exist, and
   `useTemplateSchema.ts` has an explicit guard that skips filtering when `dependencies` are present.
7. **RJSF already supports** `dependencies`, `allOf`/`if`-`then`-`else`, and `oneOf` within a single step.
   The genuinely new capability is cross-step: conditions driven by answers from *earlier* steps, whose
   state lives on the `Stepper`, not inside the per-step RJSF instance. Prefer extending the existing
   `ui:backstage` uiSchema namespace and the `extractSchemaFromStep` walk over bolting on a parallel system.
8. **Both theme paths must keep working** — `mui` and `bui`. `Form.tsx` branches on theme and there are
   `.bui.test.tsx` variants; a form-layer change needs coverage for both.
9. **Documentation is required** for new behavior: `docs/features/software-templates/` plus TSDoc. Follow
   `docs/contribute/doc-style-guide.md`.
10. Read `beps/0010-scaffolder-templating-in-parameters` first — it covers adjacent prior design work on
    templating inside scaffolder parameters.
11. **Never run** `yarn build`, `yarn changesets version`, or `yarn release`. Never modify ESLint,
    Prettier, or TypeScript config.
12. Format with `yarn prettier --write <explicit paths>`; running it over folders rewrites unrelated files.
