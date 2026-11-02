# Stack profile — learned from repo scan

Scope: sampled from the catalog and TechDocs packages only, because that is where this repo's first run works. Other package families may differ, and the root instructions say consistency within a package beats consistency across the repo. Built for run `20261102-feature-new-entity-former-names` at HEAD `f20fd9b59828`.

## Language & runtime

TypeScript ~5.7 on Node 22 or 24, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`) with `nodeLinker: node-modules`. Package tooling comes from `backstage-cli` (`package test`, `package lint`) and `backstage-repo-tools` (API reports, OpenAPI generation). Migrations are plain CommonJS JavaScript with `// @ts-check`. Run `yarn tsc` from the root only, with no options.

## Framework

Backstage's own plugin framework, which sits on Express and Knex on the backend and React with MUI v4 and `@backstage/ui` on the frontend. Two frontend systems coexist. The old one uses `core-*` packages and `plugins/catalog/src/components/`, and the new one uses `frontend-*` packages and `plugins/catalog/src/alpha/`. Example apps cover both: `packages/app` is the new system and `packages/app-legacy` the old one.

## Conventions detected

### File naming
- React components, classes and their tests are PascalCase: `EntityOrphanWarning.tsx`, `DefaultRefreshService.ts`, `AuthorizedRefreshService.ts`.
- Hooks and factory functions are camelCase: `useEntityFromUrl.ts`, `useExternalRedirect.ts`, `createRouter.ts`.
- Tests sit next to the source as `<name>.test.ts(x)`.
- Migrations are `YYYYMMDDHHMMSS_snake_case.js`: `20261007000000_stitch_failure_count.js`.
- A component folder holds an `index.ts` barrel: `plugins/catalog/src/components/EntityOrphanWarning/index.ts`.

### Handler / controller shape

Express routers built in a `createRouter` function, reading credentials from `httpAuth` and throwing typed errors from `@backstage/errors`. From `plugins/techdocs-backend/src/service/router.ts`:

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

The catalog backend is schema-first. `plugins/catalog-backend/src/service/createRouter.ts` starts from `createOpenApiRouter` and chains `.get(...)` and `.post(...)` calls. Each route must match `src/schema/openapi.yaml`, which drives the generated server and the generated client in `packages/catalog-client`.

### Service shape

Small classes with explicit `private readonly` fields, interfaces in a sibling `types.ts`, and a decorator class for authorization. From `plugins/catalog-backend/src/service/AuthorizedRefreshService.ts`:

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

Frontend hooks use `useApi(...)` with `react-use` async helpers imported by the `esm` path, as in `import useAsyncRetry from 'react-use/esm/useAsyncRetry';`.

### Test shape

Backend database tests run against every supported engine. From `plugins/catalog-backend/src/service/DefaultRefreshService.test.ts`:

```ts
jest.setTimeout(60_000);

const databases = TestDatabases.create();

describe.each(databases.eachSupportedId())(
  'DefaultRefreshService, %p',
  databaseId => {
    const defaultLogger = mockServices.logger.mock();

    async function createDatabase(logger: LoggerService = defaultLogger) {
      const knex = await databases.init(databaseId);
      await applyDatabaseMigrations(knex);
```

Frontend tests use `renderInTestApp`, `TestApiProvider` and `screen` from `plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.test.tsx`:

```tsx
await renderInTestApp(
  <TestApiProvider
    apis={[
      [
        catalogApiRef,
        {
          removeEntityByUid: jest.fn(),
        },
      ],
    ]}
```

The root instructions prefer fewer thorough tests, `screen` with `.findBy*` over `waitFor`, and no new test IDs.

### Config

Read with `config.has`, `config.getOptionalString` and similar calls from `@backstage/config`, as in `plugins/techdocs-backend/src/plugin.ts`. Each plugin documents its schema in `config.d.ts` with TSDoc comments, as in `plugins/catalog-backend/config.d.ts`.

### Data layer

Knex with hand-written migrations and row types in `plugins/catalog-backend/src/database/tables.ts`. Query logic sits in `src/database/operations/`. From `plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js`:

```js
// @ts-check

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable('stitch_queue', table => {
    table.integer('failure_count').notNullable().defaultTo(0);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
```

### Framework-owned wiring

A backend plugin declares services in `registerInit` and mounts its router with `http.use`. From `plugins/techdocs-backend/src/plugin.ts`:

```ts
http.use(
  await createRouter({
    logger: logger,
    cache,
    // ...
    catalog,
  }),
);
```

A new-system frontend plugin lists extensions in `createFrontendPlugin`, as in `plugins/catalog/src/alpha/plugin.tsx`:

```tsx
export default createFrontendPlugin({
  pluginId: 'catalog',
  // ...
  routes: {
    catalogIndex: rootRouteRef,
    catalogEntity: entityRouteRef,
  },
```

User-facing strings live in translation refs: `catalogTranslationRef` in `plugins/catalog/src/alpha/translation.ts` and `techdocsTranslationRef` in `plugins/techdocs/src/translation.ts`.

## Sample files inspected
- plugins/techdocs-backend/src/service/router.ts (kind: controller)
- plugins/catalog-backend/src/service/createRouter.ts (kind: controller, over 500 lines, route list only)
- plugins/catalog-backend/src/service/AuthorizedRefreshService.ts (kind: service)
- plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts (kind: frontend hook)
- plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts (kind: frontend hook)
- plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.tsx (kind: frontend component)
- plugins/techdocs/src/reader/components/TechDocsRedirectNotification/TechDocsRedirectNotification.tsx (kind: frontend component)
- plugins/catalog-backend/src/service/DefaultRefreshService.test.ts (kind: test)
- plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.test.tsx (kind: test)
- plugins/catalog-backend/config.d.ts (kind: config)
- plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js (kind: migration)
- plugins/techdocs-backend/src/plugin.ts (kind: entry point)
- plugins/catalog/src/alpha/plugin.tsx (kind: entry point)

## Notes for downstream codegen
- New `.ts`, `.tsx`, `.js` and `.jsx` files need the Apache 2.0 header with the current year. Never change the year on existing files.
- Do not edit `src/schema/openapi/generated/**`, `report*.api.md` or `report.sql.md` by hand. Regenerate them with the repo tools.
- Frontend behavior that spans both systems usually needs to work in `plugins/catalog/src/components/` and `plugins/catalog/src/alpha/`.
- New components in `plugins/catalog` lean toward `@backstage/ui` (`Alert`, `Button`), while older TechDocs code still uses `@material-ui/core`. Match the file you are in.
- Inspect, create and update `.changeset/*.md` directly. Never use the changeset CLI, and never run `yarn build` or `yarn release`.
