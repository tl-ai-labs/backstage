# Stack profile: learned from repo scan

Scope: sampled with the docs-intent target package `packages/catalog-model` in focus. Repo-wide conventions differ per package. CLAUDE.md says to match each package's own style.

## Language & runtime
TypeScript ~5.7 (5.7.3 installed), Node 22 || 24, ESM-style `import`/`export` in source. Yarn 4 workspaces (`packages/*`, `plugins/*`). Packages export TS source directly (`"main": "src/index.ts"`). API Extractor (7.57.3, via `@backstage/repo-tools`) produces `report.api.md` / `report-<entry>.api.md` per entry point.

## Framework
Backstage. `@backstage/catalog-model` is a `common-library` role package (no React, no backend wiring): types, validators, entity policies and the alpha catalog model layer.

## Conventions detected

### File naming
- PascalCase per exported class/interface: `src/kinds/ComponentEntityV1alpha1.ts`, `src/entity/policies/FieldFormatEntityPolicy.ts`, `src/validation/KubernetesValidatorFunctions.ts`.
- camelCase for function modules: `src/entity/conditions.ts`, `src/entity/ref.ts`. Tests sit beside the source as `*.test.ts`.

### File header
Every source file starts with the Apache 2.0 block `Copyright 20XX The Backstage Authors`. Never change the year on existing files.

### TSDoc shape (top-level)
```ts
/**
 * Ensures that the format of individual fields of the entity envelope
 * is valid.
 *
 * @remarks
 *
 * This does not take into account machine generated fields such as uid and etag.
 *
 * @public
 */
export class FieldFormatEntityPolicy implements EntityPolicy {
```
The summary sentence comes first, then an optional `@remarks` block (blank line after the tag), then the release tag (`@public` / `@alpha`) last. Links use `{@link https://backstage.io/docs/features/software-catalog/system-model}`.

### TSDoc shape (members)
```ts
export type Entity = {
  /**
   * The version of specification format for this particular entity that
   * this is written against.
   */
  apiVersion: string;

  /**
   * The high level entity type being described.
   */
  kind: string;
```
Members get a multi-line `/** ... */` block with a summary only. No release tag on members.

### Methods with params (src/validation/CommonValidatorFunctions.ts, src/entity/policies/types.ts)
```ts
  /**
   * Checks that the value can be safely transferred as JSON.
   *
   * @param value - The value to check
   */
  static isJsonSafe(value: unknown): boolean {
```
```ts
  /**
   * Applies validation or mutation on an entity.
   *
   * @param entity - The entity, as validated/mutated so far in the policy tree
   * @returns The incoming entity, or a mutated version of the same, or
   *          undefined if this processor could not handle the entity
   * @throws An error if the entity should be rejected
   */
  enforce(entity: Entity): Promise<Entity | undefined>;
```
The `@param name - description` form uses a hyphen, as TSDoc requires. `{@inheritDoc X}` is used in `src/model/operations/*` and could be used for the five `enforce` methods (`{@inheritDoc EntityPolicy.enforce}`). The architect decides.

### Test shape
Jest `describe`/`it.each` tables beside the source (e.g. `src/validation/KubernetesValidatorFunctions.test.ts`). Run with `CI=1 yarn test packages/catalog-model`. A TSDoc-only change needs no new tests.

### Config
Not relevant (library). JSON schemas live under `src/schema/kinds/*.schema.json` and are compiled with ajv (`ajvCompiledJsonSchemaValidator`). The schema `description` fields there are an accurate source for wording the `spec` member docs.

### Data layer
None.

### Framework-owned wiring
Public exports flow through `src/index.ts` (barrel `export *` from `./entity`, `./kinds`, `./validation`, …). Alpha exports flow through `src/alpha.ts`. Kind aliases are re-exported in `src/kinds/index.ts` (e.g. `ApiEntityV1alpha1 as ApiEntity`).

## Sample files inspected
- packages/catalog-model/src/entity/Entity.ts (kind: type with documented members)
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts (kind: kind interface)
- packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts (kind: kind interface)
- packages/catalog-model/src/entity/conditions.ts (kind: type guards)
- packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts, DefaultNamespaceEntityPolicy.ts, types.ts (kind: policy classes / interface)
- packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts, CommonValidatorFunctions.ts (kind: validator classes)
- packages/catalog-model/src/validation/KubernetesValidatorFunctions.test.ts (kind: test)

## Notes for downstream codegen
- Only add comments. Do not change signatures, imports or headers. The API report must change only by losing `// (undocumented)` lines.
- For the 8 `is*Entity` guards, add a summary line above the existing `@public` tag inside the existing block. Do not add a second block.
- Word `KubernetesValidatorFunctions.*` docs from the actual checks (e.g. `isValidKind`: string, 1-63 chars, `^[a-zA-Z][a-z0-9A-Z]*$`). Accuracy over boilerplate.
- `apiVersion`/`kind`/`spec` member docs should match `Entity`'s member wording, specialised per kind, and can draw on `src/schema/kinds/<Kind>.v1alpha1.schema.json` descriptions.
- Follow `docs/contribute/doc-style-guide.md` for prose. Run `yarn prettier --write <changed files>`.
