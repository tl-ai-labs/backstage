# Stack profile: learned from repo scan

Built 2026-11-04 for run 20261104-101757-feature-new-entity-former-names. The sampling focused on the catalog and TechDocs packages.

## Language & runtime

- TypeScript ~5.7 on Node 22/24, Yarn 4 workspaces (`packages/*`, `plugins/*`).
- Source is ESM-style TS (`import`/`export`, named exports only per ADR003, no default exports).
- Knex migrations are plain JS with `// @ts-check` and CommonJS `exports.up`/`exports.down`.
- Every new `.ts`/`.tsx`/`.js` file starts with the Apache-2.0 header "Copyright 2026 The Backstage Authors". Existing years are never changed.

## Framework

Backstage, an in-house plugin framework:

- Frontend: React 18, using either the legacy `core-plugin-api` (route refs, `useApi`, `createRouteRef`) or the new `frontend-plugin-api` (extensions/blueprints in `src/alpha/`).
- Backend: `backend-plugin-api` services with Express routers, knex for the DB, and `@backstage/errors` for typed HTTP errors.
- The REST contract is OpenAPI (`src/schema/openapi.yaml`). The server router and client are generated from it.

## Conventions detected

### File naming

- Components and classes: PascalCase files in a PascalCase folder with an `index.ts` barrel, e.g. `components/EntityLayout/EntityLayout.tsx`, `components/TechDocsRedirectNotification/{TechDocsRedirectNotification.tsx,index.ts}`.
- Hooks: camelCase `useX.ts`, kept next to their component (`TechDocsReaderPage/useExternalRedirect.ts`).
- Backend ops: camelCase function-per-file (`database/operations/refreshState/checkLocationKeyConflict.ts`).
- Tests sit next to the source as `X.test.ts(x)`.
- Migrations: `migrations/YYYYMMDDHHMMSS_snake_case_description.js`.

### Handler / controller shape (Express router in catalog-backend `createRouter.ts`)

```ts
.get('/entities/by-name/:kind/:namespace/:name', async (req, res) => {
  const { kind, namespace, name } = req.params;
  const entityRef = stringifyEntityRef({ kind, namespace, name });
  const auditorEvent = await auditor.createEvent({
    eventId: 'entity-fetch', request: req,
    meta: { queryType: 'by-name', entityRef: entityRef },
  });
  try {
    const { items } = await entitiesCatalog.entitiesBatch({
      entityRefs: [stringifyEntityRef({ kind, namespace, name })],
      credentials: await httpAuth.credentials(req),
    });
    await auditorEvent?.success();
    writeSingleEntityResponse(res, items, `No entity named '${name}' found, ...`);
  } catch (err) { await auditorEvent?.fail({ error: err }); throw err; }
})
```

- The router is typed from the generated OpenAPI router.
- Not-found cases `throw new NotFoundError(msg)`, and the shared middleware turns that into a 404.

### Service / DB operation shape

```ts
export async function checkLocationKeyConflict(options: {
  tx: Knex | Knex.Transaction;
  entityRef: string;
  locationKey?: string;
}): Promise<string | undefined> {
  const { tx, entityRef, locationKey } = options;
  const row = await tx<DbRefreshStateRow>('refresh_state')
    .select('location_key').where('entity_ref', entityRef).first();
  ...
}
```

- Functions take a single options object.
- Row types come from `database/tables.ts` (`Db*Row`, snake_case columns, documented with TSDoc).

### Frontend hook shape (`useEntityFromUrl.ts`, `useExternalRedirect.ts`)

```ts
const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
const catalogApi = useApi(catalogApiRef);
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

- Async work uses `react-use/esm/useAsync(Retry)`. Navigation uses `useNavigate()` with `navigate(url, { replace: true })`.
- User-facing strings come from translation refs (`createTranslationRef` in `src/translation.ts` or `src/alpha/translation.ts`) via `useTranslationRef(...)` and `t('entityPage.notFoundMessage', {...})`.
- Notices use MUI v4 (`WarningPanel`, `Alert`, `Snackbar`) in the legacy layouts and `@backstage/ui` `Alert` in `EntityLayoutBui.tsx`.

### Test shape

- Jest, using `describe`/`it`.
- Frontend tests use `@testing-library/react` (`renderHook`, `render`, `screen.findBy*`) with `TestApiProvider` from `@backstage/test-utils`:

```tsx
const wrapper = ({ children }) => (
  <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
    {children}
  </TestApiProvider>
);
```

- Backend router tests use `supertest` and `wrapServer` from `@backstage/backend-openapi-utils/testUtils`, with `mockServices`, `mockCredentials` and `TestDatabases` from `@backstage/backend-test-utils`. Dependencies are `jest.Mocked<...>` objects.
- DB tests run `describe.each(databases.eachSupportedId())`.
- Migration tests live in `plugins/catalog-backend/src/tests/migrations.test.ts`, one `it('<migration file name>.js', ...)` per migration.
- CLAUDE.md prefers fewer, thorough tests. It also prefers `screen` + `findBy*` over `waitFor`, and no test IDs.

### Config

Config comes from `app-config.yaml` through the `config` core service (`config.getOptionalBoolean(...)`). A schema is declared in each package's `config.d.ts`. No env validators are used.

### Data layer

Knex with Postgres, SQLite and MySQL support.

```js
// @ts-check
/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable('stitch_queue', table => {
    table.integer('failure_count').notNullable().defaultTo(0);
  });
};
exports.down = async function down(knex) { ... dropColumn ... };
```

Key tables:

- `refresh_state`: unprocessed entities, with `entity_ref` and `location_key`.
- `final_entities`: stitched JSON with `entity_ref`.
- `search`: flattened key/value pairs for filtering.
- `relations`, `stitch_queue`.

### Framework-owned wiring

- REST: edit `src/schema/openapi.yaml`, then run the package `generate` script (`backstage-repo-tools package schema openapi generate --server --client-package packages/catalog-client`). That regenerates the server router types and the catalog-client generated API. The hand-written `CatalogClient.ts` wraps the generated client.
- Legacy frontend routes come from `createRouteRef` plus `<Route path=...>` in `Router.tsx`. New-frontend routes come from page blueprints in `src/alpha/pages.tsx` (`path: '/catalog/:namespace/:kind/:name'`).
- Public API surface changes need `yarn build:api-reports`, which updates `report*.api.md` and `report.sql.md`.

## Sample files inspected

- plugins/catalog-backend/src/service/createRouter.ts (controller)
- plugins/catalog-backend/src/service/response/write.ts (service helper)
- plugins/catalog-backend/src/database/operations/refreshState/checkLocationKeyConflict.ts (data op)
- plugins/catalog-backend/src/database/tables.ts (ORM row types)
- plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js (migration)
- plugins/catalog-backend/src/service/createRouter.test.ts (test, backend)
- plugins/catalog-backend/src/tests/migrations.test.ts (test, migrations)
- plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts (hook)
- plugins/catalog/src/components/EntityLayout/EntityLayout.tsx, plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.tsx (component)
- plugins/catalog/src/alpha/translation.ts (i18n)
- plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts (+ .test.tsx) (hook + test)
- plugins/techdocs/src/reader/components/TechDocsRedirectNotification/TechDocsRedirectNotification.tsx (component)

## Notes for downstream codegen

- Match each package's local style. The monorepo varies, and within-package consistency wins.
- Add new well-known annotation or field constants to `packages/catalog-model/src/entity/constants.ts` with TSDoc and an `@public` tag, and export them from the package index.
- Never hand-edit `schema/openapi/generated/**`. Change `openapi.yaml` and regenerate.
- New user-facing strings go into the package translation ref, not inline literals.
- The model for a TechDocs redirect is `useExternalRedirect.ts`: catalog lookup, then `navigate(..., { replace: true })` once the lookup settles.
- For entity pages, the shared hook `useEntityFromUrl.ts` feeds both the legacy and the new system pages.
- Public API changes need TSDoc, API report regeneration, changesets (hand-written in `.changeset/`) and docs updates in `docs/features/...`.
