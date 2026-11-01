# Stack profile — learned from repo scan

Built 2026-11-01T10:02:27Z for run 20261101-153026-docs-catalog-model-tsdoc. Sampling was focused on
`packages/catalog-model` because the run intent is TSDoc for that package. Frontend (React) and backend
(Express) plugin conventions were not sampled. Rebuild with `refresh_profile: true` before a code-change run
elsewhere in the monorepo.

## Language & runtime

TypeScript `~5.7` on Node 22 or 24, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`). Packages export their
TypeScript source directly (`"main": "src/index.ts"`, `exports` map to `./src/*.ts`). `@backstage/cli`
does the build, lint and test (Jest 30). ESLint config comes from `@backstage/cli/config/eslint-factory`,
Prettier from `@backstage/cli/config/prettier`. Every source file starts with an Apache 2.0 header whose
year is fixed when the file is created (for example `Copyright 2020 The Backstage Authors`).

## Framework

Backstage's own framework, with nothing else over it. `@backstage/catalog-model` is a `common-library`
(no React, no Express) with these runtime dependencies: `ajv`, `ajv-errors`, `lodash`, `zod@^4`,
`@backstage/errors`, `@backstage/types`.

## Conventions detected

### File naming

- One concept per file, named after its main export: `src/entity/Entity.ts`,
  `src/kinds/ComponentEntityV1alpha1.ts`, `src/model/createCatalogModelLayer.ts`.
- Kind files use the `<Kind>EntityV1alpha1.ts` pattern. JSON schemas sit in `src/schema/kinds/<Kind>.v1alpha1.schema.json`.
- Tests sit next to the code as `<name>.test.ts`.
- Each folder has an `index.ts` barrel (`src/entity/index.ts`, `src/kinds/index.ts`, `src/model/index.ts`).

### Public API surface (what TSDoc must cover)

- `.` -> `src/index.ts`: re-exports `./entity`, `./kinds`, `./location`, `./validation`, `EntityPolicies`, `CompoundEntityRef`.
- `./alpha` -> `src/alpha.ts`: explicit named re-exports (AiResource kinds, McpServerApiEntity, `export * from './model'`, `defaultCatalogEntityModel`).
- API Extractor reports: `packages/catalog-model/report.api.md` (74 tagged symbols) and `report-alpha.api.md` (69).
  The root script `build:api-reports` passes `-o ae-undocumented`, so the reports list **no** undocumented-symbol
  warnings. Use the reports to see what is public, not to find gaps.
- Internal helpers have no TSDoc and are not exported from a barrel, so they stay out of the public API:
  `opsFromCatalogModel*` (src/model/modelActions/\*.ts), `ajvCompiledJsonSchemaValidator` (src/kinds/util.ts),
  `throwAjvError` / `compileAjvSchema` (src/validation/ajv.ts), `jsonObjectSchema` / `jsonSchemaSchema`
  (src/model/jsonSchema/zod.ts), `wellKnownAnnotationsModel` (src/kinds/annotations.ts). Leave these alone
  unless the person asks otherwise. Adding a release tag to them would change the API report.

### TSDoc shape — type with documented members (src/entity/Entity.ts)

```ts
/**
 * The parts of the format that's common to all versions/kinds of entity.
 *
 * @remarks
 *
 * See also:
 * {@link https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/}
 * @public
 */
export type Entity = {
  /**
   * The version of specification format for this particular entity that
   * this is written against.
   */
  apiVersion: string;
```

### TSDoc shape — kind interface and validator (src/kinds/ComponentEntityV1alpha1.ts)

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
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  kind: 'Component';
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    ...
/**
 * {@link KindValidator} for {@link ComponentEntityV1alpha1}.
 *
 * @public
 */
export const componentEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the Component kind.
 *
 * @alpha
 */
export const componentEntityModel = createCatalogModelLayer({ ... });
```

Note: `spec.*` members of the kind interfaces have no member-level docs. They are the most likely gap
inside the public surface.

### TSDoc shape — function with @param / @returns (src/entity/ref.ts)

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

### TSDoc shape — callback-style type member (src/kinds/types.ts)

```ts
  /**
   * Validates the entity as a known entity kind.
   *
   * @param entity - The entity to validate
   * @returns Resolves to true, if the entity was of a kind that was known and
   *   handled by this validator, and was found to be valid. ...
   */
  check(entity: Entity): Promise<boolean>;
```

### Alpha model-layer shape (src/model/createCatalogModelLayer.ts, src/model/modelActions/addTag.ts)

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

### Test shape (src/entity/ref.test.ts)

Jest `describe` / `it`, nested `describe` per function, several `expect`s in each `it`. AGENTS.md prefers
fewer, more thorough tests. A TSDoc-only change needs no new tests.

### Config

Not applicable to catalog-model. Repo apps use `app-config.yaml` plus `@backstage/config`.

### Data layer

Not applicable to catalog-model (pure types and validators). Validation uses AJV-compiled JSON Schemas
(`src/schema/**/*.schema.json`) and Zod (`src/model/jsonSchema/zod.ts`). Backend plugins elsewhere use Knex.

### Framework-owned wiring

Public exports reach adopters only through the barrels (`src/index.ts`, `src/alpha.ts`, folder `index.ts`). Model
contributions are `createCatalogModelLayer({ layerId, builder })` objects that `compileCatalogModel` combines.

## Sample files inspected

- packages/catalog-model/src/index.ts (kind: entry point)
- packages/catalog-model/src/alpha.ts (kind: entry point)
- packages/catalog-model/src/entity/Entity.ts (kind: domain type)
- packages/catalog-model/src/entity/ref.ts (kind: utility functions)
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts (kind: kind definition / validator)
- packages/catalog-model/src/kinds/types.ts (kind: interface type)
- packages/catalog-model/src/model/createCatalogModelLayer.ts (kind: alpha API function)
- packages/catalog-model/src/model/modelActions/addTag.ts (kind: alpha definition + internal helper)
- packages/catalog-model/src/model/index.ts (kind: barrel)
- packages/catalog-model/src/validation/types.ts (kind: type alias)
- packages/catalog-model/src/entity/ref.test.ts (kind: test)
- packages/catalog-model/report.api.md, report-alpha.api.md (kind: API Extractor report)
- STYLE.md lines 170-240 (TSDoc guidance)

## Notes for downstream codegen

- Use TSDoc `/** ... */` blocks. Start with a short summary sentence, then a blank line, then `@remarks` for longer
  detail (STYLE.md: `@remarks` divides the short index description from the full text).
- Write `@param name - description`. The `-` is required by TSDoc, or API Extractor warns.
- Keep the existing release tag (`@public`, `@alpha`, `@deprecated`) and its position. Never add, remove or
  change one in a docs-only run, because that changes API reports and semver meaning.
- Cross-reference with `{@link Symbol}` and `{@link https://...}`. Point to backstage.io docs where they exist.
- Do not change the copyright year on existing files. Do not touch code, only comments.
- Do not edit `report.api.md` / `report-alpha.api.md` by hand. API Extractor generates them (`yarn build:api-reports`).
- Doc text follows `/docs/contribute/doc-style-guide.md`. Changes to non-private packages need changeset
  coverage according to AGENTS.md. A pure TSDoc change may still need a `patch` changeset for
  `@backstage/catalog-model`. Gate 0 / the person decides.
- Format changed files with `yarn prettier --write <paths>`. Run type checking only from the root with `yarn tsc`.
