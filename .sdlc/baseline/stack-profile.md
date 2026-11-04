# Stack profile — learned from repo scan

Built 2026-11-04 for run 20261104-210415-docs-catalog-model-tsdoc (Tier 2b, trigger: no pre-authored adapter for node-typescript/Backstage). Sampling stayed within bounds (≤5 files per kind, all < 500 lines). The emphasis is on `packages/catalog-model`, the run's target.

## Language & runtime
- TypeScript ~5.7 on Node 22 || 24, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`).
- Packages publish from `src/` through `exports`: `packages/catalog-model` exposes `.` → `src/index.ts` and `./alpha` → `src/alpha.ts`.
- Source is ESM-style TypeScript compiled by `backstage-cli`. Knex migrations are CommonJS `.js` with `// @ts-check`.
- Every source file starts with the Apache 2.0 header (`Copyright <year> The Backstage Authors`). New files use the current year; existing years are never changed.

## Framework
Backstage, an in-house framework:
- Backend plugins are built with `createBackendPlugin` from `@backstage/backend-plugin-api`, with Express routers through `express-promise-router` and Knex for data.
- Frontends use React.
- `@backstage/catalog-model` is a framework-free `common-library`: types, constants, validators, entity policies, and `@alpha` model layers.

## Conventions detected

### File naming
- One main export per file, PascalCase file named after it: `src/kinds/ComponentEntityV1alpha1.ts`, `src/entity/policies/DefaultNamespaceEntityPolicy.ts`, `src/validation/CommonValidatorFunctions.ts`.
- Grouped constants and types use lowercase files: `src/kinds/relations.ts`, `src/kinds/types.ts`, `src/entity/policies/types.ts`.
- Folder barrels are `index.ts`.
- Tests sit next to the source as `<Name>.test.ts`.

### TSDoc conventions (catalog-model, the run's target)
Tag counts across `src/`:
- `{@link` ×106, `@public` ×74, `@alpha` ×72, `@remarks` ×62
- `@param` ×40, `@returns` ×27, `@see` ×8, `@deprecated` ×5, `@throws` ×3, `@example` ×3

Every exported symbol gets one `/** */` block, laid out in this order:
1. A one-sentence summary.
2. Optional `@remarks` after a blank line.
3. `@param`, `@returns`, `@throws`.
4. `@deprecated` (when present).
5. The release tag (`@public` / `@alpha`), always last.

Kind interface with `@remarks` and an external link (`src/kinds/ComponentEntityV1alpha1.ts`):
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
```
Validator constants are one-liners that cross-link (same file):
```ts
/**
 * {@link KindValidator} for {@link ComponentEntityV1alpha1}.
 *
 * @public
 */
export const componentEntityV1alpha1Validator =
```
Relation constants describe both directions and link the reverse (`src/kinds/relations.ts`):
```ts
/**
 * An ownership relation where the owner is usually an organizational
 * entity (user or group), and the other entity can be anything. Reversed
 * direction of {@link RELATION_OWNER_OF}.
 *
 * @public
 */
export const RELATION_OWNED_BY = 'ownedBy';
```
Method docs on types: `@param name - text` with the hyphen and no trailing period, then multi-line `@returns` indented under the tag (`src/kinds/types.ts`, `src/entity/policies/types.ts`):
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
Static class methods (`src/validation/CommonValidatorFunctions.ts`): the summary starts with "Checks that the value …", every parameter gets a `@param`, and `@see` takes a bare URL:
```ts
  /**
   * Checks that the value is a valid DNS label.
   *
   * @param value - The value to check
   * @see https://tools.ietf.org/html/rfc1123
   */
  static isValidDnsLabel(value: unknown): boolean {
```
`@deprecated` goes before the release tag and names the replacement (`src/entity/constants.ts`):
```ts
/**
 * Annotation for specifying the API server of a Kubernetes cluster
 *
 * @deprecated Import this constant from `@backstage/plugin-kubernetes-common` instead
 * @public
 */
```
Typical gaps the run will fill:
- Only class-level docs on policy classes. `DefaultNamespaceEntityPolicy` documents the class ("Sets a default namespace if none was set.") but not its `constructor` or `enforce`.
- Undocumented members: interface members (`apiVersion`, `kind`, `spec` fields of every kind interface) and the method signatures of the `Validators` type in `src/validation/types.ts`.
- These are the 45 + 25 `// (undocumented)` markers in `report.api.md` / `report-alpha.api.md`.
- Non-exported internals such as `wellKnownAnnotationsModel` in `src/kinds/annotations.ts` are not part of the public API and need no docs.

### Handler / controller shape
Express routers are created by an exported `createRouter(options)` factory (`plugins/user-settings-backend/src/service/router.ts`):
```ts
import Router from 'express-promise-router';
...
export async function createRouter(options: {
  ...
}): Promise<express.Router> {
  const router = Router();
  ...
  router.get('/buckets/:bucket/keys/:key(*)', async (req, res) => {
```

### Service shape
- Classes are built through static async factories, e.g. `await DatabaseUserSettingsStore.create({ database })`.
- Dependencies arrive as a single options object, not destructured in the signature (STYLE.md).
- Catalog-model's service-like units are policy classes that implement the `EntityPolicy` type:
```ts
export class DefaultNamespaceEntityPolicy implements EntityPolicy {
  private readonly namespace: string;

  constructor(namespace: string = DEFAULT_NAMESPACE) {
    this.namespace = namespace;
  }

  async enforce(entity: Entity): Promise<Entity> {
```

### Test shape
- Jest through `backstage-cli package test`, with `describe`/`it` and `beforeEach`. Fixtures are inline YAML parsed with `yaml`, and async results are asserted with `await expect(...).resolves`.
- Example: `src/entity/policies/DefaultNamespaceEntityPolicy.test.ts`.
```ts
describe('DefaultNamespaceEntityPolicy', () => {
  let withNamespace: any;
  ...
  it('leaves untouched if it already has a namespace', async () => {
    const result = policy.enforce(withNamespace);
    await expect(result).resolves.toBe(withNamespace);
```
AGENTS.md prefers fewer, thorough tests with several assertions each. A TSDoc-only change needs no new tests.

### Config
- Backend packages read config through the `coreServices.rootConfig` / `Config` API (`app-config.yaml`), not raw env.
- `catalog-model` has no runtime config. Schema validation uses ajv with JSON schemas in `src/schema/kinds/*.schema.json`, and zod (^4) in the model layer.

### Data layer
Knex. Migrations are CommonJS files in `<plugin>/migrations/`, for example `plugins/user-settings-backend/migrations/20220824183000_init.js`:
```js
// @ts-check

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('user_settings', table => {
    table.comment('The table of user related settings');
```

### Framework-owned wiring
Backend plugins register through `createBackendPlugin` and `env.registerInit` deps (`plugins/user-settings-backend/src/plugin.ts`):
```ts
export default createBackendPlugin({
  pluginId: 'user-settings',
  register(env) {
    env.registerInit({
      deps: {
        database: coreServices.database,
        httpRouter: coreServices.httpRouter,
        ...
      },
      async init({ database, httpAuth, httpRouter, signals }) {
        ...
        httpRouter.use(await createRouter({ userSettingsStore, httpAuth, signals }));
```
- Catalog-model's public surface is wired only by re-exports from `src/index.ts` (`export * from './kinds'`, …) and `src/alpha.ts`.
- A symbol is public API only if it is reachable from one of those two files. Those are the symbols that appear in the API reports.

## Sample files inspected
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts (kind: tsdoc-kinds)
- packages/catalog-model/src/kinds/relations.ts (kind: tsdoc-kinds)
- packages/catalog-model/src/kinds/types.ts (kind: tsdoc-kinds)
- packages/catalog-model/src/kinds/annotations.ts (kind: tsdoc-kinds)
- packages/catalog-model/src/entity/constants.ts (kind: tsdoc-deprecated)
- packages/catalog-model/src/entity/policies/types.ts (kind: tsdoc-policies)
- packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts (kind: tsdoc-policies / service)
- packages/catalog-model/src/validation/CommonValidatorFunctions.ts (kind: tsdoc-validation)
- packages/catalog-model/src/validation/types.ts (kind: tsdoc-validation)
- packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.test.ts (kind: test)
- packages/catalog-model/src/index.ts, packages/catalog-model/src/alpha.ts (kind: entry point)
- plugins/user-settings-backend/src/service/router.ts (kind: handler)
- plugins/user-settings-backend/src/plugin.ts (kind: wiring)
- plugins/user-settings-backend/migrations/20220824183000_init.js (kind: data layer)

## Notes for downstream codegen
- Comments only. Do not change signatures, re-exports, release tags or copyright years.
- Never convert arrow-function constants to `function` in this run, even though STYLE.md prefers `function`: that would change the API surface.
- Keep the block order shown under "TSDoc conventions": summary, `@remarks`, `@param`, `@returns`, `@throws`, `@deprecated`, release tag last.
  - Put a blank ` *` line before `@remarks` and before the tag block.
  - Wrap text at about 80 columns as the existing files do.
- Member docs on interfaces are short `/** One line. */` or 3-line blocks with no release tag; members inherit the parent's tag.
- `@param name - text` always has the hyphen (API Extractor warns otherwise). Use `{@link Symbol}` for in-package symbols and `{@link https://…}` for URLs.
- Summaries should say what the value *is*, as the existing docs do ("A relation of …", "Checks that the value …", "Validates entities of a certain kind."). Do not restate the type.
- For entity spec fields, take meanings from the JSON schemas in `src/schema/kinds/*.v1alpha1.schema.json`, whose `description` fields are authoritative. Also see `docs/features/software-catalog/descriptor-format.md`.
- After editing, regenerate `report.api.md` / `report-alpha.api.md` (`yarn tsc:full`, then `yarn build:api-reports:only packages/catalog-model`, or the root `yarn build:api-reports`). Never hand-edit them. Run `yarn prettier --write` on changed files only.
