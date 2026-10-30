# Requirements: redirect old links when catalog entities are renamed

Run `20261029-feature-new-entity-former-names` · intent `feature-new` · pick BS-NF-12 · upstream request backstage/backstage#5231.

## Summary

An entity's owner states the refs it used to have in a new well-known annotation. The catalog backend indexes those former refs. A new lookup resolves a former ref to the entity that now claims it, and it only answers when the caller may read that entity. The catalog entity page and the TechDocs reader page use that lookup on their not-found path. They redirect to the entity's current URL and show a notice that the entity was renamed.

## In scope

1. A well-known annotation, `backstage.io/former-names`, that lists the entity's former refs. Changes are in `packages/catalog-model`: the constant, its description in the well-known annotations model, and validation of the value.
2. The catalog backend indexes former refs and adds a read endpoint that resolves a former ref to the entity's current ref. The endpoint checks permissions and handles conflicts. Changes are in `plugins/catalog-backend`.
3. A client method for that endpoint in `packages/catalog-client` (`CatalogClient` and `InMemoryCatalogClient`).
4. A redirect plus a "renamed" notice on the entity page's not-found path, in `plugins/catalog`, for both frontend systems.
5. A redirect plus a "renamed" notice on the TechDocs reader's not-found path, in `plugins/techdocs`, for both frontend systems. The docs sub-path is kept.
6. Docs in `docs/features/software-catalog/` and `docs/features/techdocs/`.
7. Changesets for every published package that changes.

## Out of scope

1. Automatic rename detection. Former names are always declared by the entity.
2. Changes to the existing `GET /entities/by-name/...`, `entitiesBatch`, `getEntityByRef` or query endpoints. Their responses and performance stay exactly as they are.
3. Rewriting relations or refs held by other entities (for example `spec.owner: old-name` elsewhere).
4. Redirects in plugins other than catalog and techdocs. This includes `techdocs-backend`, `catalog-react` and `catalog-node`, which are outside the write contract.
5. Generated API reports (`report*.api.md`, `report*.sql.md`), CHANGELOG files, release notes, and ESLint, Prettier or TypeScript config.
6. A new database table or Knex migration, unless the architect shows that the existing search index cannot serve the lookup through an index (see NFR-2).

## Functional requirements

### catalog-model

- **FR-1** Export `ANNOTATION_FORMER_NAMES = 'backstage.io/former-names'` from `@backstage/catalog-model`, with TSDoc, next to the other well-known annotation constants.
- **FR-2** The annotation value is a comma-separated list of entity refs. Whitespace around each item is ignored. A full ref (`kind:namespace/name`) is allowed. A shorter form (`namespace/name` or `name`) defaults the missing kind and namespace to the declaring entity's own kind and namespace. Export a parse helper (for example `parseFormerEntityRefs(entity)`) that returns the normalized, de-duplicated, lowercased full refs. Both the backend and the docs examples rely on this one helper.
- **FR-3** Claim rules, enforced when the entity is validated in the catalog (a processing error on the entity, never a crash). A former ref:

  - must have the same kind as the declaring entity (a Component cannot claim a Group's name),
  - must not equal the entity's own current ref,
  - must parse as a valid entity ref under the existing name and namespace policies.

  If any item breaks these rules, the entity gets a processing error that names the item, the same way other invalid annotations are reported.

- **FR-4** Register the annotation with a description in the well-known annotations model layer (`src/kinds/annotations.ts`).

### catalog-backend

- **FR-5** Former refs are indexed when an entity is stitched, so they can be looked up by exact ref without scanning entities. The architect chooses the storage, and it must meet NFR-2.
- **FR-6** New endpoint `GET /entities/by-former-name/:kind/:namespace/:name`. Resolution order:
  1. If an entity currently holds the requested ref, respond `404` with a message saying the ref is current, not former. A live entity always owns its own name, so no entity can hijack a live name.
  2. Otherwise, find the entities whose former refs contain the requested ref (compared case-insensitively, like refs elsewhere).
  3. If exactly one entity claims it and the caller may read it (`catalog.entity.read`, evaluated with the caller's credentials through the same permissioned path `entitiesBatch` uses), respond `200` with `{ "entityRef": "<current ref>" }`.
  4. If no entity claims it, or the caller may not read the claimant, respond `404`. The response body is the same in both cases, so nothing leaks.
  5. If more than one entity claims it, there is a conflict. Respond `404` with no redirect, and log a warning that names the conflicting refs. Do not name them in the response if the caller cannot read all of them.
- **FR-7** The endpoint emits an auditor event (`entity-fetch`, `queryType: 'by-former-name'`), the same way the by-name route does.
- **FR-8** The OpenAPI spec and the generated router types are updated for the new endpoint, if the package uses them.

### catalog-client

- **FR-9** Add an optional method to `CatalogApi`: `getEntityRefByFormerRef?(formerRef: string | CompoundEntityRef, options?: CatalogRequestOptions): Promise<string | undefined>`. It is optional so that existing third-party `CatalogApi` implementations still compile. It resolves to the current ref, or `undefined` on 404.
- **FR-10** Implement it in `CatalogClient` (the HTTP call to FR-6, with the token passed through) and in `InMemoryCatalogClient` (the same resolution rules as FR-6, without permissions).

### catalog frontend (`plugins/catalog`)

- **FR-11** When the entity page cannot find `kind/namespace/name` (the current "Entity not found" path), and only then, it calls `catalogApi.getEntityRefByFormerRef` if it exists. If that returns a ref, the page navigates with `replace` to the entity route of the current ref. It keeps the rest of the URL (sub-route and query string), and adds a marker such as a `renamedFrom` search param with the old ref. If it returns nothing or throws, the existing "Entity not found" UI shows, unchanged.
- **FR-12** When the page loads with the marker, it shows a dismissible notice: "This entity was renamed from `<old ref>`. Please update your links and bookmarks." The text comes from the plugin's translation ref. It shows in both the old (`src/components`) and new (`src/alpha`) entity pages and layouts.
- **FR-13** A normal entity page load costs exactly one entity fetch, with no extra request.

### techdocs frontend (`plugins/techdocs`)

- **FR-14** When the docs reader finds no entity for `/docs/:namespace/:kind/:name/*`, it resolves the former ref the same way as FR-11. On success it navigates with `replace` to the docs route of the current ref, and keeps the docs sub-path, hash and query string.
- **FR-15** After that redirect, the reader shows the renamed notice (from techdocs' translation ref). It reuses the existing redirect-notification pattern where possible. It shows in both the old and new frontend system readers.

### Docs and release

- **FR-16** Document the annotation in `docs/features/software-catalog/well-known-annotations.md`: its format, the claim rules, conflict behavior and permissions. Add a short "Renaming an entity" section that links to it, in the most suitable catalog doc. Document the docs redirect in `docs/features/techdocs/` (FAQ or how-to). Follow `docs/contribute/doc-style-guide.md`.
- **FR-17** Add changesets (new files in `.changeset/`) as `minor` for `@backstage/catalog-model`, `@backstage/catalog-client`, `@backstage/plugin-catalog-backend`, `@backstage/plugin-catalog` and `@backstage/plugin-techdocs`. Each one is written for adopters, without internal symbol names other than public API.

## Non-functional requirements

- **NFR-1** Existing lookups do not change. The by-name, batch, query and ancestry paths run exactly the same SQL as before. The former-ref lookup runs only on the not-found path.
- **NFR-2** The former-ref lookup is served by an index (an exact match on indexed columns), never by a sequential scan of entities or a `LIKE` on annotation values. If the change touches catalog-backend queries, indexes or schema, follow `plugins/catalog-backend/CLAUDE.md`: add the new query's reference SQL as a scenario in `src/tests/performance/query-battery/queries.md`. Update `baseline.md` only with measured results.
- **NFR-3** Every new source file has the Apache 2.0 header with year 2026. Existing headers are left as they are. Code matches each package's existing style.
- **NFR-4** Works on SQLite (the tests' default) and PostgreSQL. Any migration is reversible (`down`).
- **NFR-5** The redirect never reveals that an entity the caller cannot read exists (FR-6 step 4).
- **NFR-6** No new runtime dependencies.

## PII inventory

| Field                                  | Sensitivity                                                  | Protection                                                |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| Former entity refs (annotation values) | Low: organizational names, already public inside the catalog | Only returned to callers who may read the claiming entity |
| Entity refs in audit and log lines     | Low                                                          | The existing auditor and logger. No user data is added    |

No personal data is added.

## Role matrix

| Role                                                                | Resource                                  | Action                                              |
| ------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Entity owner (via the catalog-info.yaml in the source)              | `backstage.io/former-names` on own entity | Declare former refs (claim rules in FR-3)           |
| Any authenticated caller with `catalog.entity.read` on the claimant | `GET /entities/by-former-name/...`        | Get the current ref                                 |
| Caller without read on the claimant                                 | same                                      | Gets a 404, the same as when nothing claims the ref |
| Service principals (for example TechDocs)                           | same                                      | Same rules, using their own credentials             |

## Acceptance criteria

- **AC-1** catalog-model tests: the parser normalizes and defaults short forms, ignores empty items and whitespace, and de-duplicates. Validation rejects a different kind, the entity's own ref, and malformed refs.
- **AC-2** catalog-backend tests: an entity with `backstage.io/former-names` has its former refs indexed after stitching, and they are removed or updated when the annotation changes.
- **AC-3** catalog-backend router or catalog tests for the new endpoint: a single claimant gives `200` with the current ref; no claimant gives `404`; a live entity holding the ref gives `404` (no hijack); two claimants give `404` (conflict); a caller without read on the claimant gives `404`; and the auditor event is emitted.
- **AC-4** catalog-client tests: `CatalogClient.getEntityRefByFormerRef` calls the right URL, returns the ref on 200 and `undefined` on 404, and passes the token. `InMemoryCatalogClient` follows the same rules.
- **AC-5** plugins/catalog jsdom tests: an old URL redirects to the new entity URL and the renamed notice shows. When the lookup returns nothing, "Entity not found" shows unchanged. A normal load makes no former-ref call. Covers both the old and new frontend systems.
- **AC-6** plugins/techdocs jsdom tests: an old docs URL redirects to the new docs URL with the sub-path kept, and the notice shows. Covers the not-found fallback and both frontend systems.
- **AC-7** `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all` passes, apart from any failure already there before the run.
- **AC-8** Docs and changesets exist as described in FR-16 and FR-17. If the change touched backend queries or indexes, `queries.md` has the new scenario (NFR-2).

## Open questions for HITL

1. **Annotation vs. a metadata field.** I propose an annotation (`backstage.io/former-names`), because it needs no change to the metadata schema and matches how other opt-in catalog behavior is declared. Do you agree?
2. **Conflicts** (several entities claim the same former ref): I propose no redirect (404 plus a backend warning), rather than "oldest claim wins". Do you agree?
3. **Cross-namespace moves:** the claim rules allow a former ref in another namespace with the same kind, so moving namespaces is covered. Do you also want to forbid that, or restrict it to the same namespace?
4. **Performance baseline:** the `/catalog-db-performance` skill sits under `.claude/`, which is off-limits, and it needs a database. The run will add the new query scenario to `queries.md` but will not invent baseline numbers. Is updating `baseline.md` deferred to you acceptable?
5. `plugins/catalog-backend` is at `4.0.3-next.0` and the other packages are ≥1.0, so new features are `minor` changesets. Is that right?
