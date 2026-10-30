# Stack profile — learned from repo scan

Built 2026-10-30 from HEAD `f20fd9b5`. Tier 2b triggered: no pre-authored adapter matches a
Backstage monorepo (shipped adapters are `generic.md`, `nest.md`, `python.md`). **Where this
profile and an adapter disagree, this profile wins** — it was read off the actual repo.

## Language & runtime

TypeScript `~5.7`, Node `22 || 24`, ESM-style `import`/`export` syntax throughout source
(packages are built by `backstage-cli`; migrations are the one CJS exception). Yarn Berry
`4.18.1` with `nodeLinker: node-modules`. Private workspace root (`packages/*`, `plugins/*`,
236 packages). Jest 30 with `NODE_OPTIONS=--experimental-vm-modules`; Playwright for e2e;
Storybook 10 for component docs. React 18 types pinned via root `resolutions`.

## Framework

**Backstage** — its own plugin framework, in two live generations that coexist:

- **Legacy frontend system** — `@backstage/core-plugin-api`: `createPlugin`,
  `createRouteRef`, `createRoutableExtension`, `createApiFactory`. Lives in
  `plugins/<x>/src/plugin.ts` + `src/routes.ts`.
- **New frontend system** — `@backstage/frontend-plugin-api`: `createFrontendPlugin` plus
  *Blueprints* (`PageBlueprint`, `ApiBlueprint`, `EntityContentBlueprint`,
  `EntityIconLinkBlueprint`, `AddonBlueprint`). Lives in `plugins/<x>/src/alpha/`.
- **Backend system** — `@backstage/backend-plugin-api`: `createBackendPlugin`, `coreServices`,
  service refs, extension points. Express + knex underneath.

A user-visible change usually has to land in **both** frontend generations.

## Conventions detected

### File naming

- `PascalCase.ts` for a file whose main export is a class or React component:
  `DefaultEntitiesCatalog.ts`, `AuthorizedEntitiesCatalog.ts`, `CatalogPlugin.ts`,
  `EntityPageDocs.tsx`, `Router.tsx`.
- `camelCase.ts` for factory functions and helper modules: `createRouter.ts`, `conversion.ts`,
  `routes.ts`, `helpers.ts`, `stitching/`, `parseEntityFacetParams.ts`.
- Tests sit **next to** their subject: `conversion.ts` → `conversion.test.ts`,
  `DefaultEntitiesCatalog.ts` → `DefaultEntitiesCatalog.test.ts`. No separate `test/` tree
  (except `src/tests/` for integration-ish suites in catalog-backend).
- No `.service.ts` / `.controller.ts` suffixes — the *class name* carries the role
  (`...Catalog`, `...Service`, `...Database`, `...Processor`, `...Provider`).
- `alpha.ts` / `src/alpha/` is the convention for not-yet-stable public surface; it is a
  separate package entry point.
- Knex migrations: `plugins/catalog-backend/migrations/<YYYYMMDDHHMMSS>_snake_case_name.js`.

### Mandatory file header

Every source file starts with the Apache 2.0 header. New files use the **current** year;
existing files keep theirs.

```ts
/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ... (full 13-line block, copy verbatim from a neighbouring file)
 */
```

### Backend route shape — `plugins/catalog-backend/src/service/createRouter.ts`

An async `createRouter(options)` factory returning `express.Router`, built from the OpenAPI
spec, with destructured options and chained `.get(...)` handlers. Auditing and credentials are
explicit per route.

```ts
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = await createOpenApiRouter({ validatorOptions: { /* ... */ } });
  const { entitiesCatalog, locationService, config, logger, httpAuth, auditor } = options;

  router
    .get('/entities', async (req, res) => {
      const auditorEvent = await auditor.createEvent({
        eventId: 'entity-fetch',
        request: req,
        meta: { queryType: 'all', query: req.query },
      });
      try {
        const filter = parseEntityFilterParams(req.query);
        const credentials = await httpAuth.credentials(req);
        // ...
        await auditorEvent?.success();
      } catch (error) {
        await auditorEvent?.fail({ error });
        throw error;
      }
    })
```

Routes are **schema-first**: `createOpenApiRouter` validates against
`plugins/catalog-backend/src/schema/openapi`. A new endpoint means updating the spec, not just
adding a handler. Request parsing lives in small `src/service/request/parseX.ts` modules;
response writing in `src/service/response/`.

### Service / class shape — `DefaultEntitiesCatalog.ts`

Interface-first, `Default*` implementation, single destructured `options` object in the
constructor, `private readonly` fields, `#private` fields in newer code. `Authorized*`
decorator classes wrap the `Default*` ones to layer permissions.

```ts
export class DefaultEntitiesCatalog implements EntitiesCatalog {
  private readonly database: Knex;
  private readonly logger: LoggerService;

  constructor(options: { database: Knex; logger: LoggerService }) {
    this.database = options.database;
    this.logger = options.logger;
  }
```

Errors come from `@backstage/errors` (`InputError`, `NotFoundError`, `ConflictError`,
`ForwardedError`) — never bare `throw new Error` for anything a caller sees.

### Backend plugin wiring — `CatalogPlugin.ts`

```ts
export const catalogPlugin = createBackendPlugin({
  pluginId: 'catalog',
  register(env) {
    env.registerExtensionPoint(catalogProcessingExtensionPoint, /* impl */);
    env.registerInit({
      deps: { logger: coreServices.logger, database: coreServices.database, /* ... */ },
      async init({ logger, database }) { /* build + register router */ },
    });
  },
});
```

Extension points are declared as interfaces plus a `*ExtensionPoint` ref and an
`...ExtensionPointImpl` class in the same file.

### Frontend wiring — legacy, `plugins/*/src/routes.ts` + `plugin.ts`

Route refs are declared in their own `routes.ts` and imported by `plugin.ts`:

```ts
export const rootDocsRouteRef = createRouteRef({
  id: 'techdocs:reader-page',
  params: ['namespace', 'kind', 'name'],
});

export const viewTechDocRouteRef = createExternalRouteRef({
  id: 'view-techdoc',
  optional: true,
  params: ['namespace', 'kind', 'name'],
  defaultTarget: 'techdocs.docRoot',
});
```

Note `unregisterRedirectRouteRef` in `plugins/catalog/src/routes.ts` — the repo already has a
redirect-style external route ref to pattern-match against.

### Frontend wiring — new system, `plugins/*/src/alpha/index.tsx`

Blueprint `.make` / `.makeWithOverrides`, then one `createFrontendPlugin` default export
listing every extension. Config schemas are declared inline with **zod v4**.

```ts
import { z } from 'zod/v4';

const techdocsEntityIconLink = EntityIconLinkBlueprint.make({
  name: 'read-docs',
  params: { useProps: useTechdocsReaderIconLinkProps },
});

const techDocsEntityContent = EntityContentBlueprint.makeWithOverrides({
  configSchema: { withoutFeedbackLink: z.boolean().default(false) },
  inputs: { addons: createExtensionInput([AddonBlueprint.dataRefs.addon]) },
  // ...
});

export default createFrontendPlugin({
  pluginId: 'techdocs',
  title: 'Documentation',
  icon: <RiArticleLine />,
  info: { packageJson: () => import('../../package.json') },
  extensions: [techDocsClientApi, techDocsEntityContent, techdocsEntityIconLink /* ... */],
});
```

Zod version matters and differs by layer: backend `createRouter.ts` imports `zod/v3`,
new-frontend alpha imports `zod/v4`. **Match the neighbouring file, do not normalize.**

### Test shape

Jest + `describe`/`it`, co-located, no test IDs in implementation. Backend units are plain:

```ts
import { timestampToDateTime, rethrowError } from './conversion';

describe('rethrowError', () => {
  it('translates to conflict error when appropriate', () => {
    const sqliteUnique = new Error('SQLITE_CONSTRAINT: UNIQUE blah');
    expect(() => rethrowError(sqliteUnique)).toThrow(
      expect.objectContaining({
        name: 'ConflictError',
        message: expect.stringContaining('SQLITE_CONSTRAINT: UNIQUE blah'),
      }),
    );
  });
});
```

Frontend uses `renderInTestApp` from `@backstage/test-utils` plus `screen`, and
plugin-provided mock providers:

```ts
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { MockEntityListContextProvider } from '@backstage/plugin-catalog-react/testUtils';
```

Backend DB tests use `@backstage/backend-test-utils` (`TestDatabases`) and run against both
SQLite and Postgres. Repo rule: **fewer, thorough, multi-assertion tests**; prefer `findBy*`
over `waitFor`.

### Config

No `.env` anywhere. Config is `app-config.yaml` read through `@backstage/config` (`Config`
service / `configApiRef`), and **every config key must be declared** in the owning package's
`config.d.ts` as a TSDoc-commented `export interface Config`:

```ts
export interface Config {
  /** Configuration options for the catalog plugin. */
  catalog?: {
    /** Rules to apply to all catalog entities, from any location. */
    rules?: Array<{ allow: Array<string> }>;
  };
}
```

A new tunable (e.g. a redirect-notice toggle or former-name retention window) belongs there,
plus a line in `docs/conf`.

### Data layer

**knex** query builder, no ORM. Table names are snake_case and centralized in
`plugins/catalog-backend/src/database/tables.ts`; raw SQL only where unavoidable.
Migrations are CJS JS files with `exports.up` / `exports.down`, `// @ts-check`, and a JSDoc
knex param — and must work on **both Postgres and SQLite**:

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
  await knex.schema.alterTable('stitch_queue', table => {
    table.dropColumn('failure_count');
  });
};
```

Every `up` needs a real `down`. Entity identity helpers (`parseEntityRef`,
`stringifyEntityRef`, `getCompoundEntityRef`) live in
`packages/catalog-model/src/entity/ref.ts` — reuse them, never hand-format `kind:ns/name`.

### Import shapes

Scoped `@backstage/*` package imports first, then third-party, then relative — roughly
alphabetical within a group, prettier-enforced. `/alpha` and `/testUtils` subpath entry points
are normal (`@backstage/plugin-catalog-node/alpha`). Relative imports are plain `./` and `../`
— no `~/` or `@/` aliases. Types imported inline, occasionally `import type`.

## Sample files inspected

- `plugins/catalog-backend/src/service/createRouter.ts` (kind: backend route)
- `plugins/catalog-backend/src/service/CatalogPlugin.ts` (kind: backend plugin wiring)
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts` (kind: service class)
- `plugins/catalog-backend/src/database/conversion.test.ts` (kind: backend test)
- `plugins/catalog-backend/migrations/20261007000000_stitch_failure_count.js` (kind: migration)
- `plugins/catalog-backend/config.d.ts` (kind: config schema)
- `plugins/catalog/src/routes.ts`, `plugins/catalog/src/plugin.ts` (kind: legacy frontend wiring)
- `plugins/techdocs/src/routes.ts`, `plugins/techdocs/src/alpha/index.tsx` (kind: new frontend wiring)
- `plugins/catalog/src/components/CatalogTable/OffsetPaginatedCatalogTable.test.tsx` (kind: frontend test)
- `packages/catalog-model/src/entity/ref.ts` (kind: domain model)
- `.changeset/yarn-module-optional-yarnpkg-core.md` (kind: changeset)

## Notes for downstream codegen

1. **Copy the Apache header** from the file's neighbour, with the current year, into every new
   source file. CI lints this (`eslint-plugin-notice`).
2. **Never invent a `.service.ts`/`.controller.ts` layout.** Name the file after the exported
   class (`PascalCase.ts`) or the exported factory (`camelCaseFactory.ts`).
3. **Interface + `Default*` impl + optional `Authorized*` wrapper** is the backend idiom.
4. **New HTTP endpoint ⇒ OpenAPI spec change first** under
   `plugins/catalog-backend/src/schema/openapi`, then the handler; `createOpenApiRouter`
   validates requests against it.
5. **Co-locate tests** as `<Subject>.test.ts(x)`. Backend DB tests use `TestDatabases` and must
   pass on SQLite and Postgres.
6. **Both frontend generations.** A route or entity-page change needs the `routes.ts`/`plugin.ts`
   legacy path *and* the `src/alpha/` blueprint path, or half the users get nothing.
7. **Zod import path is layer-specific** — `zod/v3` in catalog-backend `createRouter.ts`,
   `zod/v4` in new-frontend alpha. Follow the file you are editing.
8. **New config keys go in the package's `config.d.ts`** with TSDoc, plus `docs/conf`.
9. **Migrations are CJS `.js`** with `// @ts-check`, timestamped filename, and a working `down`.
10. **Use `catalog-model` ref helpers** (`parseEntityRef`, `stringifyEntityRef`) rather than
    string-building entity refs.
11. **Add a changeset** under `.changeset/` for every touched published package, written for
    adopters, naming no internal symbols. Hand-write the file; never call the changeset CLI.
12. **Run `yarn build:api-reports`** after changing any package's exported surface, and
    `yarn tsc` from the repo root (no flags).
13. **Errors from `@backstage/errors`**, not bare `Error`, for anything a caller observes.
