# Stack profile — learned from repo scan

Sampling was weighted towards the catalog and TechDocs packages this run will touch. It is not a survey of all 235 packages, and `AGENTS.md` says each package's own style wins over repo-wide consistency.

## Language & runtime

TypeScript ~5.7 on Node 22 or 24, managed by yarn 4 with `nodeLinker: node-modules`. Source uses ES `import` syntax, with `node:` prefixes for built-ins (`node:crypto`, `node:path`). Migrations are the exception: they are CommonJS `.js` files with `// @ts-check`. `useUnknownInCatchVariables` is off, so `catch (error)` can read `error.message` directly.

## Framework

Backstage itself, with three layers to tell apart:

- **Backend system:** `createBackendPlugin` and `coreServices`, with Express routers underneath.
- **New frontend system:** `plugins/*/src/alpha/`, built from `@backstage/frontend-plugin-api` blueprints.
- **Old frontend system:** `plugins/*/src/components/`, plus `packages/app-legacy`, built on `@backstage/core-plugin-api`.

Both frontend systems are live. In `plugins/catalog` they share code, so a change usually has to work in both.

## Conventions detected

### File naming

- Classes use PascalCase files named after the class: `DefaultRefreshService.ts`, `AuthorizedRefreshService.ts`.
- Single-function files use camelCase: `checkLocationKeyConflict.ts`, `readScmEventHandlingConfig.ts`.
- React components use PascalCase in a same-named folder with an `index.ts` barrel: `EntityContextMenu/EntityContextMenu.tsx`.
- Tests sit next to the source as `<name>.test.ts(x)`.
- Migrations are `YYYYMMDDHHMMSS_snake_case.js`. The newest is `20261007000000_stitch_failure_count.js`, so a new one must sort after it.

Every new source file starts with the Apache 2.0 header, using `Copyright 2026 The Backstage Authors`. Existing files keep their original year.

Exports are named, and ADR 003 says to avoid default exports. Public API carries a TSDoc release tag such as `@public`, and internals use `@internal`.

### Handler / controller shape

The router is built in a `createRouter(options)` function. Routes declared in OpenAPI use `createOpenApiRouter()`, and errors are thrown as `@backstage/errors` types for the shared middleware to serialize. From `plugins/techdocs-backend/src/service/router.ts`, which uses a plain router instead:

```ts
router.get('/metadata/techdocs/:namespace/:kind/:name', async (req, res) => {
  const { kind, namespace, name } = req.params;
  const entityName = { kind, namespace, name };

  const credentials = await httpAuth.credentials(req);

  // Verify that the related entity exists and the current user has permission to view it.
  const entity = await entityLoader.load(credentials, entityName);

  if (!entity) {
    throw new NotFoundError(
      `Unable to get metadata for '${stringifyEntityRef(entityName)}'`,
    );
  }
```

From `plugins/search-backend/src/service/router.ts`, the OpenAPI form:

```ts
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = await createOpenApiRouter();
  const { engine, types, config, logger, auth, httpAuth } = options;
```

The catalog's own `createRouter.ts` is 956 lines, over the sampling limit, so it was not read. It declares its by-name route at line 423 (`/entities/by-name/:kind/:namespace/:name`). Read that area before adding a sibling route.

### Service shape

Services are small classes with an options constructor. Permission checks live in a separate `Authorized*` wrapper that implements the same interface. From `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts`:

```ts
export class AuthorizedRefreshService implements RefreshService {
  private readonly service: RefreshService;
  private readonly permissionApi: PermissionsService;

  constructor(service: RefreshService, permissionApi: PermissionsService) {
    this.service = service;
    this.permissionApi = permissionApi;
  }

  async refresh(options: RefreshOptions) {
    const authorizeDecision = (
      await this.permissionApi.authorize(
```

The unwrapped counterpart is `DefaultRefreshService.ts`. Interfaces are in `src/service/types.ts`.

### Frontend shape

Function components only (ADR 006 says to avoid `React.FC`). Data loads through `useApi` plus `react-use/esm/*` hooks, always the `/esm/` path. From `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts`:

```ts
const {
  value: entity,
  error,
  loading,
  retry: refresh,
} = useAsyncRetry(
  () => catalogApi.getEntityByRef({ kind, namespace, name }),
  [catalogApi, kind, namespace, name],
);
```

User-visible text goes through a translation ref, such as `catalogTranslationRef` in `plugins/catalog/src/alpha/translation.ts`, read with `useTranslationRef`.

Two UI libraries coexist. `EntityLayout.tsx` uses MUI v4 `WarningPanel` and `Alert severity=`. `EntityLayoutBui.tsx` uses the BUI `Alert`:

```tsx
<Alert
  status="warning"
  title={t('entityLabels.warningPanelTitle')}
  description={t('entityPage.notFoundMessage', {
```

The closest redirect precedent is `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts`. It looks the entity up, then replaces the URL:

```ts
useEffect(() => {
  // Navigate to external TechDocs if a redirect URL is available
  if (!externalRedirectResult.loading && externalRedirectResult.value) {
    navigate(externalRedirectResult.value, { replace: true });
  }
```

### Test shape

Jest with `describe`/`it`. `AGENTS.md` prefers fewer, thorough tests, `screen` with `findBy*` over `waitFor`, and no added test IDs.

Database tests run against every supported engine. From `plugins/catalog-backend/src/database/operations/provider/refreshByRefreshKeys.test.ts`:

```ts
jest.setTimeout(60_000);

const databases = TestDatabases.create();

describe.each(databases.eachSupportedId())(
  'refreshByRefreshKeys, %p',
  databaseId => {
    async function createDatabase() {
      const knex = await databases.init(databaseId);
      await applyDatabaseMigrations(knex);
      return knex;
    }
```

- **Services:** plain `jest.fn()` objects cast to the interface, with `mockCredentials` from `@backstage/backend-test-utils`. See `AuthorizedLocationAnalyzer.test.ts`.
- **OpenAPI routers:** `wrapServer` from `@backstage/backend-openapi-utils/testUtils` with `mockServices`. See `plugins/catalog-backend/src/service/createRouter.test.ts`.
- **New frontend system:** `renderInTestApp`, `createExtensionTester` and `mockApis` from `@backstage/frontend-test-utils`. See `plugins/catalog/src/alpha/contextMenuItems.test.tsx`.

### Config

Config is read through the `Config` API with defaults applied in code, and each plugin declares its schema in `config.d.ts`. Any new key needs an entry there. From `plugins/catalog-backend/src/util/readScmEventHandlingConfig.ts`:

```ts
return {
  refresh:
    config.getOptionalBoolean(`${rootKey}.refresh`) ?? defaults.refresh,
  unregister:
    config.getOptionalBoolean(`${rootKey}.unregister`) ?? defaults.unregister,
  move: config.getOptionalBoolean(`${rootKey}.move`) ?? defaults.move,
};
```

### Data layer

Knex with raw table access and no ORM. Row types are hand-written in `plugins/catalog-backend/src/database/tables.ts`. Queries are single-function modules under `src/database/operations/<area>/`, taking `tx`. From `checkLocationKeyConflict.ts`:

```ts
export async function checkLocationKeyConflict(options: {
  tx: Knex | Knex.Transaction;
  entityRef: string;
  locationKey?: string;
}): Promise<string | undefined> {
  const { tx, entityRef, locationKey } = options;

  const row = await tx<DbRefreshStateRow>('refresh_state')
    .select('location_key')
    .where('entity_ref', entityRef)
    .first();
```

Code must work on Postgres, MySQL and SQLite. `insertUnprocessedEntity.ts` shows the pattern for dialect differences, including `isDatabaseConflictError` from `@backstage/backend-plugin-api`.

A migration from `plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js`:

```js
// @ts-check

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable('stitch_queue', table => {
    table.integer('failure_count').notNullable().defaultTo(0);
  });
};
```

### Framework-owned wiring

**Backend:** a plugin registers its deps and init through `createBackendPlugin`, and a router is mounted on `coreServices.httpRouter`. See `plugins/techdocs-backend/src/plugin.ts`.

**New frontend system:** pages are extensions. From `plugins/catalog/src/alpha/pages.tsx`, `catalogEntityPage` is built with `PageBlueprint.makeWithOverrides` and uses:

```ts
routeRef: convertLegacyRouteRef(entityRouteRef), // READ THE ABOVE
```

The comment above that line in `pages.tsx` should be read before changing the route.

**TechDocs routes:** `plugins/techdocs/src/routes.ts` defines two reader routes. `rootDocsRouteRef` takes `namespace`, `kind` and `name`. `rootCatalogDocsRouteRef` is the reader embedded in an entity page.

**OpenAPI:** `plugins/catalog-backend/src/schema/openapi.yaml` is the source. The package's `generate` script regenerates the server code and the `packages/catalog-client` client. Never hand-edit `src/schema/openapi/generated/**`.

## Sample files inspected

Line counts are shown where a file was only partly read.

- `plugins/search-backend/src/service/router.ts` (kind: handler)
- `plugins/techdocs-backend/src/service/router.ts` (kind: handler, first 206 lines)
- `plugins/techdocs-backend/src/plugin.ts` (kind: entry point, lines 17-126)
- `plugins/catalog-backend/src/service/DefaultRefreshService.ts` (kind: service)
- `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts` (kind: service)
- `plugins/catalog-backend/src/database/operations/refreshState/checkLocationKeyConflict.ts` (kind: data)
- `plugins/catalog-backend/src/database/operations/refreshState/insertUnprocessedEntity.ts` (kind: data)
- `plugins/catalog-backend/src/database/tables.ts` (kind: data, lines 17-76)
- `plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js` (kind: migration)
- `plugins/catalog-backend/src/database/operations/provider/refreshByRefreshKeys.test.ts` (kind: test)
- `plugins/catalog-backend/src/service/AuthorizedLocationAnalyzer.test.ts` (kind: test, first 71 lines)
- `plugins/catalog/src/alpha/contextMenuItems.test.tsx` (kind: test, first 76 lines)
- `plugins/catalog-backend/src/util/readScmEventHandlingConfig.ts` (kind: config)
- `plugins/catalog-backend/config.d.ts` (kind: config, lines 17-45)
- `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx` (kind: frontend page)
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` (kind: frontend hook)
- `plugins/catalog-react/src/hooks/useEntityOwnership.ts` (kind: frontend hook)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` (kind: frontend hook, lines 17-90)
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.tsx` (kind: frontend layout, lines 105-140)
- `plugins/catalog/src/alpha/pages.tsx` (kind: wiring, lines 17-60 plus a grep)
- `plugins/catalog/src/alpha/translation.ts` (kind: wiring, first 30 lines)
- `plugins/techdocs/src/routes.ts` (kind: wiring)
- `plugins/catalog-backend/CLAUDE.md` (kind: package instructions)
- `.changeset/calm-catalog-placeholders.md` (kind: changeset)

Files were chosen by relevance to the seed, not by recency. `plugins/catalog-backend/src/service/createRouter.ts` and `createRouter.test.ts` are over the 500-line limit and were only grepped.

## Notes for downstream codegen

- **Redirects must change the URL.** `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx` compares the loaded entity's ref with the route params and hides any mismatch, staying in a loading state. Returning a renamed entity from the existing lookup without navigating would hang the page.
- **Cover every entity layout.** `useEntityFromUrl` is shared by the new and old `CatalogEntityPage`. Three layouts render below it: `alpha/components/EntityLayout/EntityLayout.tsx`, `alpha/components/EntityLayout/EntityLayoutBui.tsx` and `components/EntityLayout/EntityLayout.tsx`.
- **TechDocs has its own entry path.** The standalone reader takes its entity from `rootDocsRouteRef` params, and its backend routes load by kind, namespace and name. Fixing only the catalog page leaves TechDocs links broken. `useExternalRedirect.ts` is the model, and it deliberately swallows catalog errors so docs still load.
- **Preserve the sub-path.** Old TechDocs and entity tab links can include a path after the entity name, so redirects should carry it across. `useExternalRedirect.ts` is built for sub-page navigation and is worth reading on this point.
- **Mind permissions.** A former-name lookup must not reveal entities the caller can't read. Follow the `Authorized*` wrapper pattern and test the deny path.
- **Former names need validity rules.** Entity envelopes are validated by `packages/catalog-model/src/schema/EntityEnvelope.schema.json`, `EntityMeta.schema.json` and `KubernetesValidatorFunctions`. Well-known annotations are exported constants, as in `packages/catalog-model/src/location/annotation.ts`. A new one should be a constant too.
- **Entity refs are lowercase in the database.** `tables.ts` documents `entity_ref` as lowercase `kind:namespace/name`, and `entity_id` is regenerated at random whenever a row is re-added, so it can't serve as a stable identity across a rename.
- **Catalog schema or query changes carry extra work.** `plugins/catalog-backend/CLAUDE.md` requires `/catalog-db-performance` before and after, and updates to `src/tests/performance/query-battery/queries.md` and `baseline.md` where affected. `report.sql.md` is generated from the schema by `yarn build:api-reports`.
- **Public API changes need generated reports.** Run `yarn build:api-reports` rather than editing `report*.api.md`.
- **Changesets describe adopter behaviour in plain language.** Edit `.changeset/` by hand. Use the package's version to pick the bump.
- **Docs are required.** New behaviour belongs under `docs/features/` following `docs/contribute/doc-style-guide.md`. Don't touch `docs/releases/`.
- **Zod imports differ per file.** `plugins/search-backend` uses `zod/v3` and `plugins/catalog` uses `zod/v4`. Match the file you're in.
