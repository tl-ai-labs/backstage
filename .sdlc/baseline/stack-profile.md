# Stack profile: learned from repo scan

Built 2026-11-04 for run 20261104-docs-catalog-model-tsdoc. The scan sampled `packages/catalog-model`, the focus of this run. Other packages in the monorepo may differ, and AGENTS.md says to match each package's own style.

## Language & runtime
- TypeScript ~5.7 on Node 22 or 24, with Yarn 4 (Berry) workspaces.
- Package sources are published as `src/index.ts` (`main` and `types` point at src). `backstage-cli package build` produces `dist`.
- Modules are ESM-style `import`/`export` with relative imports and no path aliases.
- JSON schemas are imported directly, for example `import jsonSchema from '../schema/kinds/Component.v1alpha1.schema.json'`.

## Framework
- Backstage: the frontend uses React and the backend uses Express, both driven by `@backstage/cli`.
- `catalog-model` is a `common-library`. It contains plain TS types, validators (ajv and zod v4) and the catalog model layer builder. It has no framework wiring.

## Conventions detected

### File header
Every source file starts with the Apache 2.0 header. Keep the existing year; new files use the current year.
```ts
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 */
```

### File naming
- Types and kinds use PascalCase files named after the export, such as `src/kinds/ComponentEntityV1alpha1.ts` and `src/entity/policies/DefaultNamespaceEntityPolicy.ts`.
- Functions use camelCase files, such as `src/model/modelActions/addTag.ts` and `src/model/compileCatalogModel.ts`.
- Tests sit next to their source as `*.test.ts`.
- Each folder has an `index.ts` barrel.

### TSDoc shape (the key convention for this run)
The style is a summary sentence, then an optional `@remarks` block separated by blank lines, then the release tag. In functions, `@param name - desc` and `@returns` follow the release tag. Links use `{@link X}`.

From `src/kinds/ComponentEntityV1alpha1.ts`:
```ts
/**
 * Backstage catalog Component kind Entity. Represents a single, individual piece of software.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/features/software-catalog/system-model}
 *
 * @public
 */
export interface ComponentEntityV1alpha1 extends Entity {

/**
 * {@link KindValidator} for {@link ComponentEntityV1alpha1}.
 *
 * @public
 */
export const componentEntityV1alpha1Validator =
```
From `src/entity/ref.ts`:
```ts
/**
 * Extracts the kind, namespace and name that form the compound entity ref
 * triplet of the given entity.
 *
 * @public
 * @param entity - An entity
 * @returns The compound entity ref
 */
export function getCompoundEntityRef(entity: Entity): CompoundEntityRef {
```
From `src/model/modelActions/addTag.ts`, interface members get their own short `/** ... */` blocks:
```ts
/**
 * The definition of a catalog model tag.
 *
 * @alpha
 */
export interface CatalogModelTagDefinition {
  /**
   * The name of the tag, e.g. "java".
   */
  name: string;
```
- Release tags (`@public`, `@alpha`) already exist on exports. **Do not change release tags.** Changing one changes the API surface and API Extractor validates the tags.
- The public surface is defined by `src/index.ts` and `src/alpha.ts`. Some exports are visible only inside the package, such as `opsFromCatalogModelTag` in `addTag.ts`, which `modelActions/index.ts` may or may not re-export. Check the barrels before deciding that something is "undocumented public API".

### Test shape
Jest with `describe`/`it`/`beforeEach`, async expectations (`await expect(p).resolves...`) and YAML fixtures inlined through the `yaml` package. From `src/entity/policies/DefaultNamespaceEntityPolicy.test.ts`:
```ts
describe('DefaultNamespaceEntityPolicy', () => {
  let policy: DefaultNamespaceEntityPolicy;
  beforeEach(() => { policy = new DefaultNamespaceEntityPolicy(); });
  it('leaves untouched if it already has a namespace', async () => {
    const result = policy.enforce(withNamespace);
    await expect(result).resolves.toBe(withNamespace);
```

### Config
Not applicable to catalog-model. Backstage apps use `app-config*.yaml` through `@backstage/config`.

### Data layer
Not applicable. Entity validation uses ajv-compiled JSON schemas (`src/schema/**`, `kinds/util.ts#ajvCompiledJsonSchemaValidator`) and zod (`model/jsonSchema/zod.ts`).

### Framework-owned wiring
- Kind model layers are declared with `createCatalogModelLayer({ layerId: 'catalog.backstage.io/kind-<x>', builder: model => model.addKind({...}) })` and exported as `<kind>EntityModel`, tagged `@alpha`.
- `defaultCatalogEntityModel` composes these layers.

## Sample files inspected
- packages/catalog-model/src/index.ts (kind: entry point)
- packages/catalog-model/src/alpha.ts (kind: entry point)
- packages/catalog-model/src/model/index.ts (kind: barrel)
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts (kind: type/validator/model layer)
- packages/catalog-model/src/model/modelActions/addTag.ts (kind: model action)
- packages/catalog-model/src/entity/ref.ts (kind: utility functions)
- packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.test.ts (kind: test)

## Notes for downstream codegen
- Docs-only edits: add `/** ... */` blocks directly above exports, and above interface members where siblings already have them. Do not change any code, signatures, release tags or copyright years.
- Use `// (undocumented)` in `report.api.md` (45 markers) and `report-alpha.api.md` (25 markers) as the worklist. Afterwards, regenerate with `yarn build:api-reports` and confirm the markers dropped. Do not hand-edit the reports.
- Write in plain adopter-facing language and follow `docs/contribute/doc-style-guide.md`. A `check-docs-quality` lint runs on md files only.
- Verify with `yarn tsc` (root) and `CI=1 yarn test packages/catalog-model`. Run `yarn prettier --write` on the changed files only.
- Changeset: catalog-model is published at 1.10.2. No existing changeset names it. Doc comments ship in the `.d.ts` output, so decide at Gate 0 whether a `patch` changeset is wanted. AGENTS.md says doc and test-only changes outside published behavior often don't need one.
