# Intent Brief — feature-new — Entity former names and redirects

## Context

A catalog entity's URL is built from its kind, namespace and name, so renaming a service or moving it to
another namespace breaks every bookmark, wiki link and chat message that pointed at it. The user sees
"Entity not found". Plugins keyed on the entity name, such as TechDocs URLs, break the same way. The request
has been open since 2021 (backstage/backstage#5231).

Today a rename has no identity continuity: a changed `metadata.name` produces a new entity with a new UID,
and the old one is removed (`catalog.orphanStrategy` defaults to `delete`).

- Before: `/catalog/default/component/old-name` shows the "Entity not found" page.
- After: the same link lands on `/catalog/default/component/new-name` with a notice that the entity was
  renamed from `old-name`.

Seed description: Remember an entity's former names in the Backstage catalog and redirect old entity-page and
TechDocs links to the renamed entity, with a notice.

## Goal

Let an entity declare its former refs, have the catalog backend index and resolve them safely through a new
lookup, and have the entity page and TechDocs reader redirect old links from their not-found path with a
"this entity was renamed" notice.

### Proposed answers to the design questions

The architect may refine these at Gate 1; any change is called out there.

- **How a former name is declared:** a well-known annotation in `packages/catalog-model` holding
  comma-separated full entity refs, so namespace moves are covered as well as renames. A former ref must have
  the same kind as the claiming entity and must not be the entity's own ref. Malformed values are reported as
  entity processing errors and ignored; they do not stop the entity from being ingested.
- **Who may claim a former name:** a claim is honoured only when nothing live holds that ref, or when the live
  holder shares the claimant's location key (the rename-in-flight case). A claim on a live entity from another
  source is rejected and reported as an entity processing error, so one entity cannot take over another's name
  and inherit its links when that entity later disappears.
- **Competing claims:** when two entities claim the same former ref, the earliest recorded claim wins and the
  loser gets an entity processing error. The result is deterministic and does not depend on processing order.
- **A new entity takes an old name:** exact lookups always win. A claim on that ref goes inactive while the
  live entity exists, and takes effect again only if that entity goes away.
- **Permission checks on the redirect target:** the lookup returns the target only through the normal
  `catalog.entity.read` checks, including conditional decisions. A missing claim, a conflict and a denied target
  all produce the same not-found response, so the lookup never reveals that a hidden entity exists or what it
  is called.
- **Keeping existing lookups fast:** the existing by-name, by-refs and query paths are unchanged and gain no
  joins. Former refs live in a dedicated indexed table added by a migration, queried only by the new lookup,
  and the frontend calls that lookup only after an exact lookup has returned not found.
- **Chains:** resolution is a single hop. An entity renamed twice lists both former refs, so there is no
  traversal and no possibility of a loop.
- **API compatibility:** the new `CatalogApi` lookup must not break existing third-party implementers of
  `CatalogApi` or `CatalogService`. Whether that means an optional method, or an accepted breaking bump, is
  decided at Gate 1.

## Files in scope

- `packages/catalog-model/src/**`, `packages/catalog-model/report*.api.md`
- `packages/catalog-client/src/**`, `packages/catalog-client/report*.api.md`
- `plugins/catalog-backend/src/**`, `plugins/catalog-backend/migrations/**`,
  `plugins/catalog-backend/report*.api.md`
- `plugins/catalog-node/src/**`, `plugins/catalog-node/report*.api.md`
- `plugins/catalog-react/src/testUtils/**`, `plugins/catalog-react/report*.api.md`
- `plugins/catalog/src/**`, `plugins/catalog/report*.api.md`
- `plugins/techdocs/src/**`, `plugins/techdocs/report*.api.md`
- `plugins/techdocs-react/src/**`, `plugins/techdocs-react/report*.api.md`
- `contrib/catalog/read-write-split/workspace/packages/app/src/catalogApi.ts`,
  `contrib/catalog/read-write-split/workspace/packages/backend/src/catalogService.ts`
- `docs/features/software-catalog/**`, `docs/features/techdocs/**`
- `.changeset/*.md`, except `.changeset/config.json` and `.changeset/pre.json`
- `.gitignore`, only to add a `.sdlc/` entry

The two OpenAPI generated folders sit inside the `src/**` globs above and are in scope here, against the
discovery default, because the new lookup endpoint needs them regenerated:
`plugins/catalog-backend/src/schema/openapi/generated/**` and
`packages/catalog-client/src/schema/openapi/generated/**`. They are changed only by the repository's OpenAPI
generate command, never by hand. `report*.api.md` files are changed only by `yarn build:api-reports`.

## Files off-limits

- `.env`, `.env.*`, `.mcp.json`, `.cursor/**`, `.claude/**`, `node_modules/**`, `dist/**`, `dist-types/**`,
  `build/**`, `.next/**`, `.git/**`, `.sdlc/**` (the run's own records excepted)
- `.github/copilot-instructions.md`, `plugins/catalog-backend/CLAUDE.md`
- `docs/releases/**`, every `CHANGELOG.md`, `.github/**`, `AGENTS.md`
- `.changeset/config.json`, `.changeset/pre.json`, `.yarn/releases/**`
- `.eslintrc.js`, `**/.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`, `**/tsconfig.json`
- `*-credentials.yaml`, `*.local.yaml`
- `yarn.lock` and every `package.json`, unless Gate 1 names a specific dependency change

## Acceptance criteria

1. An entity can declare former refs through the new annotation, documented with the well-known annotations.
2. Backend tests cover former-name indexing, conflict handling (competing claims, a claim on a live entity,
   a new entity taking the old name) and permissioned lookup (a denied target is indistinguishable from a
   missing one).
3. `packages/catalog-client` exposes the lookup method, implemented in `CatalogClient`,
   `InMemoryCatalogClient` and the test mocks.
4. Opening `/catalog/<namespace>/<kind>/<old-name>` lands on the renamed entity's page with a notice naming the
   former name, in both the old and new frontend systems, keeping the sub-route, query and hash. The redirect
   replaces the history entry, so Back does not loop.
5. Opening an old TechDocs URL lands on the renamed entity's docs with a notice, keeping the docs sub-path,
   query and hash.
6. When no claim resolves, or the viewer may not read the target, the existing not-found pages render unchanged.
7. jsdom tests cover the redirect and notice on the entity and docs routes.
8. `yarn tsc` and `yarn lint` pass, API reports are regenerated, and changesets cover every affected published
   package.

9. The catalog-backend database rules are followed: the query performance battery runs before and after the
   schema change, and `queries.md` and `baseline.md` under
   `plugins/catalog-backend/src/tests/performance/query-battery/` are updated where the change affects them.
   If the battery cannot run in this environment, the final report says so.

## Non-goals

- Automatic rename detection. Renames that nobody declares do not redirect.
- Redirects across kinds.
- Rewriting relations, or other stored refs, that still point at a former ref.
- Redirects in plugins other than catalog and TechDocs, including search results and scaffolder.
- Moving or copying published TechDocs content. Docs are served from the new ref's own site.
- Redirects from an orphan kept by `catalog.orphanStrategy: keep`. A kept orphan is a live entity, so the exact
  lookup wins. This limitation is documented.
