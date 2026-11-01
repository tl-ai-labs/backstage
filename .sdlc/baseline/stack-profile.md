# Stack profile — learned from repo scan

## Language & runtime

TypeScript monorepo on Node `22 || 24`, Yarn 4 workspaces (`packages/*`, `plugins/*`), `nodeLinker: node-modules`. The root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json`, with `jsx: react-jsx` and `useUnknownInCatchVariables: false`. Packages expose `src/index.ts` directly during development (`main`, `types`, and `exports` all point at source), and `backstage-cli package prepack` rewrites this at publish time.

## Framework

Backstage itself. The framework's own packages live in this repo: `@backstage/backend-plugin-api`, `@backstage/frontend-plugin-api`, and the legacy `@backstage/core-plugin-api`. Backend plugins sit on Express and Knex. Frontend plugins use React, with Material UI v4 in 39 packages and MUI v5 in 4.

## Conventions detected

### File naming

- Classes and types use `PascalCase.ts`, one main export per file: `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts`, `plugins/signals-node/src/DefaultSignalsService.ts`.
- Function-oriented modules use `camelCase.ts`: `packages/catalog-model/src/location/helpers.ts`, `packages/catalog-model/src/entity/conditions.ts`.
- Backend plugins use `src/plugin.ts` and `src/service/router.ts`.
- Tests sit next to the source as `<name>.test.ts`.
- Catalog kinds use `<Kind>EntityV1alpha1.ts`, with JSON schemas at `src/schema/kinds/<Kind>.v1alpha1.schema.json`.

### Handler / controller shape

Express routers built in a `createRouter(options)` factory, using `express-promise-router` and zod for request parsing. From `plugins/user-settings-backend/src/service/router.ts`:

```ts
export async function createRouter(options: {
  httpAuth: HttpAuthService;
  userSettingsStore: UserSettingsStore;
  signals: SignalsService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());
```

### Service shape

An interface plus a `Default*` implementation with a static `create` and a private constructor. From `plugins/signals-node/src/DefaultSignalsService.ts`:

```ts
/** @public */
export class DefaultSignalsService implements SignalsService {
  private events: EventsService;

  static create(options: SignalsServiceOptions) {
    return new DefaultSignalsService(options);
  }

  private constructor(options: SignalsServiceOptions) {
    ({ events: this.events } = options);
  }
```

### TSDoc shape

This is the pattern that matters most for docs work. From `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts`:

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
```

Constants, from `packages/catalog-model/src/location/annotation.ts`:

```ts
/**
 * Entity annotation pointing to the source (e.g. source code repository root or
 * similar) for this entity.
 *
 * @public
 */
export const ANNOTATION_SOURCE_LOCATION = 'backstage.io/source-location';
```

Method docs carry a short summary and `@param name - text`, with the hyphen required. From `plugins/signals-node/src/SignalsService.ts`:

```ts
  /**
   * Publishes a signal to user refs to specific topic
   * @param signal - Signal to publish
   */
```

`STYLE.md` rules: use `@remarks` to split a short index description from long detail, keep `function` declarations, avoid destructured public parameters. A block with only a release tag, such as `/** @public */`, still reports as undocumented. `packages/catalog-model/src/entity/conditions.ts` has this on all 8 `is*Entity` functions. The tag order in the file is description, `@remarks`, then the release tag, though `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` places `@see` tags after `@public`.

### Test shape

Jest globals with `describe` and `it`, inline fixtures, no test IDs. Backend tests use `@backstage/backend-test-utils`. From `plugins/user-settings-backend/src/service/router.test.ts`:

```ts
describe('createRouter', () => {
  const userSettingsStore: jest.Mocked<UserSettingsStore> = {
    multiget: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };
```

### Config

Runtime config comes from `app-config.yaml` through Backstage's config system. Each plugin declares its schema in `config.d.ts` (72 plugins), as a documented TypeScript `Config` interface. Example: `plugins/app-backend/config.d.ts`.

### Data layer

Knex with plain JS migrations in `plugins/<id>/migrations/` (84 files), each file `// @ts-check` with JSDoc types. From `plugins/app-backend/migrations/20240113144027_assets-namespace.js`:

```js
exports.up = async function up(knex) {
  const isMySQL = knex.client.config.client.includes('mysql');

  await knex.schema.alterTable('static_assets_cache', table => {
```

### Framework-owned wiring

Backend plugins register through `createBackendPlugin`, declaring `deps` and attaching routers in `init`. The host adds them with `backend.add(import(...))`. From `plugins/user-settings-backend/src/plugin.ts`:

```ts
export default createBackendPlugin({
  pluginId: 'user-settings',
  register(env) {
    env.registerInit({
      deps: {
        database: coreServices.database,
        httpAuth: coreServices.httpAuth,
```

`packages/catalog-model` has no such wiring. It is a library, and its exports flow through `src/index.ts` (`export *` from each folder) and `src/alpha.ts`.

## Sample files inspected

- plugins/user-settings-backend/src/service/router.ts (kind: controller)
- plugins/signals-node/src/SignalsService.ts (kind: service)
- plugins/signals-node/src/DefaultSignalsService.ts (kind: service)
- plugins/user-settings-backend/src/service/router.test.ts (kind: test)
- packages/catalog-model/src/entity/conditions.test.ts (kind: test)
- plugins/app-backend/config.d.ts (kind: config)
- plugins/app-backend/migrations/20240113144027_assets-namespace.js (kind: migration)
- packages/backend/src/index.ts (kind: entry point)
- plugins/user-settings-backend/src/plugin.ts (kind: wiring)
- plugins/user-settings/src/components/AuthProviders/EmptyProviders.tsx (kind: frontend component)
- packages/catalog-model/src/index.ts (kind: entry point)
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts (kind: domain type)
- packages/catalog-model/src/entity/conditions.ts (kind: domain function)
- packages/catalog-model/src/entity/ref.ts (kind: domain function)
- packages/catalog-model/src/EntityPolicies.ts (kind: domain class)
- packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts (kind: validator)
- packages/catalog-model/src/location/annotation.ts (kind: constants)
- STYLE.md (TSDoc rules, section "Documentation Guidelines")

## Notes for downstream codegen

- For TSDoc on entity interfaces, take field meaning from `packages/catalog-model/src/schema/kinds/*.schema.json`, not from the field names. The schemas carry the descriptions and the validation rules.
- For `KubernetesValidatorFunctions` and the `enforce` methods, describe what the code actually does. Keep the summary to the behavior a caller sees, including what is thrown or returned.
- Use `{@link Symbol}` for cross-references to exported symbols only, since a link to an unexported symbol produces an API Extractor warning.
- Do not change the copyright year on existing files. New source files need an Apache 2.0 header with the current year.
- Match each package's own style over repo-wide patterns, per the project instructions.
- Use U.S. English, per `docs/contribute/doc-style-guide.md`.
- `report*.api.md` files are generated. Regenerate with `yarn build:api-reports`, never by hand.
