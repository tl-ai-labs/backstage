# Requirements: Entity Rename Redirects & Former Name Resolution

**Run ID**: `20261104-130720-feature-new-entity-rename-redirect`  
**Mode**: `brownfield` | **Intent**: `feature-new`  
**Brief**: `.sdlc/runs/20261104-130720-feature-new-entity-rename-redirect/intent_brief.md`  
**Discovery**: `.sdlc/runs/20261104-130720-feature-new-entity-rename-redirect/discovery.md`

---

## 1. In Scope

1. **IS-1 (`packages/catalog-model`)**: Define and export a well-known entity annotation constant (`ANNOTATION_PREVIOUS_NAMES` = `'backstage.io/previous-names'`, or confirmed name at Gate 1) and a helper function (`parseEntityPreviousNames` / former entity ref parser) in `@backstage/catalog-model` so entities can declare one or more former names or entity references (defaulting `kind` and `namespace` to the declaring entity's own `kind` and `namespace`), validated against Backstage entity reference syntax.
2. **IS-2 (`plugins/catalog-backend` — Storage & Stitching)**: Add a forward-only Knex migration (timestamp after `20261007000000`, e.g. `20261104000000_previous_entity_names.js`) creating an indexed lookup table (`final_entity_previous_names` or equivalent) wired into `plugins/catalog-backend/src/database/tables.ts` and `plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts` so that when an entity is stitched into `final_entities`, its declared former entity references are extracted, normalized to lowercase `kind:namespace/name` triplets, and synchronized in the database.
3. **IS-3 (`plugins/catalog-backend` — Catalog Service, Authorization, & HTTP API)**: Extend `EntitiesCatalog` (`DefaultEntitiesCatalog` and `AuthorizedEntitiesCatalog`), `plugins/catalog-backend/src/schema/openapi.yaml`, generated OpenAPI server/router types, and `plugins/catalog-backend/src/service/createRouter.ts` with a read endpoint and service method to resolve a former entity ref (`kind`, `namespace`, `name`) to its current canonical target entity ref (or target entity), enforcing live-entity precedence, deterministic conflict handling, `catalogEntityReadPermission` (`catalog.entity.read`) authorization on the redirect target, and auditor logging (`entity-fetch` event).
4. **IS-4 (`packages/catalog-client`)**: Extend `CatalogApi`, `CatalogClient`, `InMemoryCatalogClient` (in `@backstage/catalog-client/testUtils`), and generated OpenAPI client code in `@backstage/catalog-client` with a typed method to query the catalog backend for the current entity reference corresponding to a former entity reference.
5. **IS-5 (`plugins/catalog` — Legacy & New Frontend System)**: Update catalog entity resolution (`useEntityFromUrl.ts`, `CatalogEntityPage`, `EntityLayout` in `plugins/catalog/src/components/**`, and `plugins/catalog/src/alpha/**`) so that when `getEntityByRef` returns `undefined` (404/not found) for `/catalog/:namespace/:kind/:name/*`, the page queries the former-name lookup via `catalogApi`, navigates (`replace: true`) to the renamed entity's catalog URL (preserving any active sub-route/tab path), and displays a user-visible notification/banner explaining that the entity was renamed from the old reference to the new reference.
6. **IS-6 (`plugins/techdocs` — Legacy & New Frontend System)**: Update TechDocs reader entity resolution (`TechDocsReaderPage`, `useExternalRedirect`, `useTechDocsReaderContentData`, `TechDocsNotFound` in `plugins/techdocs/src/**` and `plugins/techdocs/src/alpha/**`) so that when a documentation page's entity is not found at `/docs/:namespace/:kind/:name/*` (or when resolving entity redirects in the reader), the reader checks whether the entity was renamed via `catalogApi`:
   - If a renamed entity is found and its documentation is available, redirect to the new entity's TechDocs URL (preserving any sub-path `/*`) and notify the user of the rename.
   - If the entity was renamed or is missing and TechDocs documentation cannot be loaded for it, present a clear notification/link to the renamed catalog entity (if renamed) or an informative not-found state without throwing an unhandled crash.
7. **IS-7 (Repo Companions — API Reports, SQL Report, Documentation, Changesets)**:
   - Update API reports (`packages/catalog-model/report.api.md`, `packages/catalog-client/report.api.md`, `packages/catalog-client/report-testUtils.api.md`, `plugins/catalog-backend/report.api.md`, `plugins/catalog/report.api.md`, `plugins/catalog/report-alpha.api.md`, `plugins/techdocs/report.api.md`, `plugins/techdocs/report-alpha.api.md`).
   - Update the SQL report (`plugins/catalog-backend/report.sql.md`) to reflect any new/modified SQL queries in `plugins/catalog-backend`.
   - Document the new well-known annotation in `docs/features/software-catalog/well-known-annotations.md`, the HTTP endpoint in `docs/features/software-catalog/api.md`, and any new audit `queryType` metadata in `docs/features/software-catalog/audit-events.md` following `docs/contribute/doc-style-guide.md`.
   - Add changeset file(s) in `.changeset/*.md` with appropriate semver bump levels (`minor` for `@backstage/catalog-model` and `@backstage/catalog-client` and any other `>=1.0.0` package adding public APIs; `patch` where only internal implementation changes occur) per `CONTRIBUTING.md`.

---

## 2. Out of Scope

1. **OOS-1**: Rewriting or mutating relations, references, or YAML definitions in other catalog entities that still point to the old entity name (entities referencing the old name are not auto-rewritten).
2. **OOS-2**: Automatic detection of entity renames from Git move/rename history (`git mv`); renames are opt-in and explicitly declared by the entity owner in entity metadata via the well-known annotation.
3. **OOS-3**: Modifying existing migrations in `plugins/catalog-backend/migrations/` (only a new migration with timestamp after `20261007000000` is permitted).
4. **OOS-4**: Modifying off-limits packages, specifically `plugins/catalog-react`, `plugins/catalog-node`, `plugins/techdocs-backend`, `plugins/techdocs-react`, `plugins/search*`, `plugins/scaffolder*`, `plugins/permission*`, or `packages/core-*`.
5. **OOS-5**: Changing or slowing down the primary query path of `GET /entities/by-name/:kind/:namespace/:name` or `POST /entities/by-refs` (`DefaultEntitiesCatalog.entitiesBatch`) when an entity exists at the requested name.
6. **OOS-6**: Automatically migrating or copying built TechDocs static assets in object storage from the old entity triplet path to the new entity triplet path (`techdocs-backend` is out of scope; TechDocs redirects at the reader route level in `plugins/techdocs`).

---

## 3. Answers to the Brief's Four Design Questions (Proposed for Gate 1 Confirmation)

### DQ-1: Who may claim a former name?
- **Proposed Answer (confirm at Gate 1)**:
  - Any catalog entity may declare one or more former names/references via the well-known annotation `backstage.io/previous-names` (`ANNOTATION_PREVIOUS_NAMES` in `@backstage/catalog-model`) as a comma-separated list of entity names or entity references (whitespace around commas trimmed; empty entries ignored).
  - Each entry is parsed using `parseEntityRef(entry, { defaultKind: entity.kind, defaultNamespace: entity.metadata.namespace ?? DEFAULT_NAMESPACE })` and normalized via `stringifyEntityRef` (lowercase `kind:namespace/name`).
  - **Kind Scoping Constraint**: To prevent cross-kind spoofing (e.g., a `Template` or `User` claiming to be a former `Component`), a former entity ref's `kind` MUST match the declaring entity's own `kind` (case-insensitive); entries specifying a different `kind` (or malformed ref syntax) are ignored during stitching/extraction (and ignored by the helper unless valid). Cross-namespace claims within the same `kind` (e.g., `old-namespace/old-name` or `component:old-namespace/old-name` when an entity moved namespaces and/or renamed) are permitted. Self-references (where the normalized former ref equals the entity's own current `entity_ref`) are ignored.

### DQ-2: What happens when a new entity takes an old name (and when multiple entities claim the same former name)?
- **Proposed Answer (confirm at Gate 1)**:
  - **Live Entity Precedence (No Hijacking)**: An active entity in `final_entities` with `entity_ref = X` ALWAYS takes absolute precedence over any former-name claim for `X`.
    - Primary lookups (`GET /entities/by-name/:kind/:namespace/:name` and `POST /entities/by-refs`) query `final_entities` directly and return the live entity.
    - The former-name resolution query (`DefaultEntitiesCatalog`) explicitly verifies that no stitched live entity exists in `final_entities` with `entity_ref = X` (e.g. `NOT EXISTS (SELECT 1 FROM final_entities WHERE entity_ref = X)`), returning no redirect (`undefined` / HTTP `404`) if a live entity now occupies `X`.
  - **Competing Claims (Ambiguity Resolution)**: If two or more distinct live entities in `final_entities` both declare the same former `entity_ref = X` in their annotation:
    - The former-name resolution MUST NOT arbitrarily pick one depending on nondeterministic SQL row order.
    - **Rule**: If more than one distinct live entity claims `X` (or if the query finds `COUNT(*) > 1`), the resolution treats `X` as ambiguous and returns no redirect (`undefined` / HTTP `404`), preventing accidental misdirection across conflicting claimants. (Alternatively, if single-winner deterministic tie-breaking by `entity_id ASC` is preferred, this is flagged in Section 8 for HITL confirmation; default proposed behavior is **reject ambiguous multi-claimant redirects with 404**).
  - **Chained Renames (`A -> B -> C`)**: The annotation on `C` lists all former names (`backstage.io/previous-names: a, b`). Single-hop resolution from the indexed table resolves both `a -> c` and `b -> c` in a single query without recursive graph traversal or cycle risk.

### DQ-3: Permission checks on the redirect target
- **Proposed Answer (confirm at Gate 1)**:
  - Former-name resolution MUST enforce `catalogEntityReadPermission` (`catalog.entity.read`) against the **redirect target entity** (the current entity that claims the former name), using the caller's `BackstageCredentials` in `AuthorizedEntitiesCatalog`:
    - When `permissionApi.authorizeConditional` returns `AuthorizeResult.DENY`, the lookup immediately returns `undefined` (resulting in HTTP `404 Not Found`).
    - When `permissionApi.authorizeConditional` returns `AuthorizeResult.CONDITIONAL`, the conditional permission filter (`transformConditions` -> SQL `permissionPredicate` on the target entity in `final_entities` / `search`) is applied to the target entity query. If the target entity does not satisfy the permission predicate, the lookup returns `undefined` (HTTP `404 Not Found`).
    - Returning `404 Not Found` (rather than `403 Forbidden` with the target ref) ensures callers without read permission on the target entity cannot discover either that the former entity was renamed or what its new name is.

### DQ-4: Keeping existing lookups fast
- **Proposed Answer (confirm at Gate 1)**:
  - **Zero Modification to Existing By-Name / Batch Lookup Path**: `DefaultEntitiesCatalog.entitiesBatch` (which backs `GET /entities/by-name/:kind/:namespace/:name` and `POST /entities/by-refs`) is NOT modified. It continues to execute its single `SELECT final_entities.entity_ref, final_entities.final_entity FROM final_entities WHERE final_entities.entity_ref in (?)` query against the `final_entities_entity_ref_uniq` index.
  - **Dedicated Indexed Table for Former Names**: A new table `final_entity_previous_names` (with columns `entity_id` referencing `final_entities(entity_id) ON DELETE CASCADE`, and `previous_entity_ref` indexed via `final_entity_previous_names_ref_idx (previous_entity_ref)`) is populated during `performStitching` only for entities that actually have the annotation (zero extra rows for the 99%+ of entities without `backstage.io/previous-names`).
  - **Fallback-Only Execution**: The frontend (`plugins/catalog` and `plugins/techdocs`) only invokes the former-name resolution endpoint when `getEntityByRef` returns `undefined` (404). Thus, normal navigation to existing entities incurs 0 extra HTTP requests and 0 extra SQL joins/queries.

---

## 4. Functional Requirements per Module

### 4.1 `packages/catalog-model`

- **FR-1 (Well-Known Annotation Constant)**:
  - Define and export `ANNOTATION_PREVIOUS_NAMES = 'backstage.io/previous-names'` in `packages/catalog-model/src/entity/constants.ts`, re-exported through `packages/catalog-model/src/entity/index.ts` and `packages/catalog-model/src/index.ts`.
  - The annotation value is a comma-separated string of one or more entity names or entity references (e.g. `'old-service-name'` or `'legacy-ns/old-service-name, component:legacy-ns/very-old-name'`).

- **FR-2 (Former Entity Refs Parser/Extractor Helper)**:
  - Provide and export a pure helper function (e.g., `parseEntityPreviousNames(entity: Entity): string[]` or `getEntityPreviousNames(entity: Entity): CompoundEntityRef[]`) in `@backstage/catalog-model` (or `constants.ts` / `ref.ts`) that:
    1. Reads `entity.metadata.annotations?.[ANNOTATION_PREVIOUS_NAMES]`.
    2. Splits by `,`, trims whitespace, and ignores empty segments.
    3. Parses each segment with `parseEntityRef(segment, { defaultKind: entity.kind, defaultNamespace: entity.metadata.namespace || DEFAULT_NAMESPACE })`.
    4. Validates that the parsed `kind`, `namespace`, and `name` are valid and that the parsed `kind` matches `entity.kind` case-insensitively (ignoring invalid or cross-kind entries without throwing on malformed user annotations).
    5. Normalizes each valid entry via `stringifyEntityRef` (`kind:namespace/name` in lowercase), removes duplicates and any self-reference matching `stringifyEntityRef(entity)`, and returns the deduplicated array of normalized entity ref strings.

### 4.2 `plugins/catalog-backend`

- **FR-3 (Database Migration & Table Definition)**:
  - Add a new Knex migration file in `plugins/catalog-backend/migrations/` with a timestamp strictly greater than `20261007000000` (e.g., `20261104000000_previous_entity_names.js`) implementing both `exports.up` and `exports.down`:
    - `up`: Creates table `final_entity_previous_names` with:
      - `entity_id` (`string`, notNullable, foreign key referencing `final_entities.entity_id` with `ON DELETE CASCADE`)
      - `previous_entity_ref` (`string`, notNullable)
      - Composite primary key or unique constraint on `(entity_id, previous_entity_ref)`
      - Index on `previous_entity_ref` (`final_entity_previous_names_previous_entity_ref_idx`) and index on `entity_id` (`final_entity_previous_names_entity_id_idx`)
    - `down`: Drops table `final_entity_previous_names`.
  - Add the corresponding `DbFinalEntityPreviousNamesRow` type in `plugins/catalog-backend/src/database/tables.ts`.

- **FR-4 (Stitcher Synchronization)**:
  - Update `plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts` so that when `final_entities` is inserted or updated (and its `hash` changed):
    - Existing rows in `final_entity_previous_names` for `entityId` are deleted.
    - The stitched `entity`'s former entity refs are extracted using the `@backstage/catalog-model` helper (`FR-2`).
    - If one or more former entity refs are present, rows `{ entity_id: entityId, previous_entity_ref }` are inserted into `final_entity_previous_names`.
    - When an entity's annotation is removed or the entity is deleted from `final_entities`, its `final_entity_previous_names` rows are removed (`DELETE` during re-stitching or `ON DELETE CASCADE` on entity deletion).

- **FR-5 (`EntitiesCatalog` Interface & `DefaultEntitiesCatalog` Implementation)**:
  - Extend `EntitiesCatalog` in `plugins/catalog-backend/src/catalog/types.ts` with a method to resolve a former entity ref (e.g., `resolveEntityRedirect(request: ResolveEntityRedirectRequest): Promise<ResolveEntityRedirectResponse>` or `entityAncestry` / `entityByPreviousName`, matching the OpenAPI operation):
    - Input: `{ entityRef: string | CompoundEntityRef, credentials: BackstageCredentials, filter?: EntityFilter }`.
    - Output: `{ entityRef: string } | undefined` (or `{ targetEntityRef: string } | undefined`, returning the canonical `final_entities.entity_ref` of the current entity).
  - In `DefaultEntitiesCatalog` (`plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`):
    - Normalize the requested `entityRef` via `stringifyEntityRef(parseEntityRef(request.entityRef))`.
    - If a live stitched entity already exists in `final_entities` with `entity_ref = normalizedRef` and `final_entity IS NOT NULL`, return `undefined` (live entity precedence — `DQ-2`).
    - Query `final_entity_previous_names` joined with `final_entities` on `final_entity_previous_names.entity_id = final_entities.entity_id` where `previous_entity_ref = normalizedRef` and `final_entities.final_entity IS NOT NULL` (and applying `this.permissionPredicate(request.filter, query)` when `request.filter` is provided).
    - Select `final_entities.entity_ref` (ordered deterministically by `final_entities.entity_id ASC`, `LIMIT 2`).
    - If exactly 1 matching target entity is found, return `{ entityRef: rows[0].entity_ref }`.
    - If 0 rows are found, or if 2 rows are found (ambiguous competing claim by multiple live entities — `DQ-2`), return `undefined`.

- **FR-6 (`AuthorizedEntitiesCatalog` Permission Enforcement)**:
  - In `AuthorizedEntitiesCatalog` (`plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts`), implement the redirect resolution method:
    - Authorize `catalogEntityReadPermission` via `this.permissionApi.authorizeConditional([{ permission: catalogEntityReadPermission }], { credentials: request.credentials })`.
    - If the decision is `AuthorizeResult.DENY`, return `undefined`.
    - If the decision is `AuthorizeResult.CONDITIONAL`, transform conditions via `this.transformConditions(authorizeDecision.conditions)` and pass the resulting `EntityFilter` to `this.entitiesCatalog` so that only a target entity the caller is permitted to read can be resolved.

- **FR-7 (OpenAPI Schema & HTTP Endpoint in `createRouter.ts`)**:
  - Add the endpoint to `plugins/catalog-backend/src/schema/openapi.yaml` (e.g., `GET /entities/by-name/{kind}/{namespace}/{name}/redirect` or `GET /entities/by-previous-name/{kind}/{namespace}/{name}` — or the path generated with `yarn --cwd plugins/catalog-backend generate`) and regenerate the server & client OpenAPI definitions.
  - Wire the handler in `plugins/catalog-backend/src/service/createRouter.ts`:
    - Record an audit event via `auditor?.createEvent({ eventId: 'entity-fetch', request: req, meta: { queryType: 'by-previous-name', entityRef: stringifyEntityRef(req.params) } })` (and call `auditEvent.success()` / `auditEvent.fail({ error })`).
    - Call `entitiesCatalog` with the caller's credentials from `httpAuth.credentials(req)`.
    - If a target entity ref is resolved, respond with `200 OK` and JSON body `{ entityRef: string }` (or the schema-defined response object containing the target entity ref).
    - If no target entity ref is resolved (not found, live entity exists at that ref, ambiguous claim, or caller unauthorized to read target), throw `new NotFoundError(\`No entity redirect found for \${kind}:\${namespace}/\${name}\`)` (HTTP `404`).

### 4.3 `packages/catalog-client`

- **FR-8 (`CatalogApi` & `CatalogClient` Method)**:
  - Add a method to `CatalogApi` in `packages/catalog-client/src/types/api.ts` (and implement it on `CatalogClient` in `packages/catalog-client/src/CatalogClient.ts`):
    - Accepts `compoundEntityRef: EntityRef` (`string | CompoundEntityRef`) and optional `CatalogRequestOptions` (`{ token?: string }`).
    - Calls the new catalog-backend HTTP endpoint.
    - Returns `{ entityRef: string } | undefined` (returning `undefined` on HTTP `404`, and throwing `ResponseError` on other non-2xx statuses, matching `getEntityByRef` behavior).
- **FR-9 (`InMemoryCatalogClient` Implementation)**:
  - Implement the new `CatalogApi` method on `InMemoryCatalogClient` in `packages/catalog-client/src/testUtils/InMemoryCatalogClient.ts`:
    - Inspects in-memory `this.#entities`: if a live entity matches the queried `entityRef`, returns `undefined`.
    - Otherwise searches `this.#entities` using the `@backstage/catalog-model` former-names parser (`FR-2`); if a single matching entity claims the queried `entityRef`, returns `{ entityRef: stringifyEntityRef(matchingEntity) }`, else returns `undefined`.
    - This ensures unit and component tests in `plugins/catalog` and `plugins/techdocs` using `InMemoryCatalogClient` or `catalogApiMock` work seamlessly out of the box.

### 4.4 `plugins/catalog`

- **FR-10 (Catalog Entity URL Redirect & Sub-Route Preservation)**:
  - In `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` (used by both legacy `CatalogEntityPage` and `alpha` `CatalogEntityPage`):
    - When `catalogApi.getEntityByRef({ kind, namespace, name })` returns `undefined`:
      - Query the former-name redirect method on `catalogApi` (if available on the `catalogApi` instance, e.g. `catalogApi.getEntityRedirectByRef?.({ kind, namespace, name })` or equivalent method name from `FR-8`).
      - If a target `entityRef` is returned:
        - Parse the target `CompoundEntityRef` (`targetKind`, `targetNamespace`, `targetName`).
        - Navigate (`navigate(..., { replace: true })`) to the new entity's route, preserving any sub-path/tab segment after `/catalog/:namespace/:kind/:name` (e.g., `/ci-cd`, `/api`, `/definition`) and query string/hash.
        - Emit a user-visible notification via `alertApiRef` (`alertApi.post({ message: ..., severity: 'info', display: 'transient' })`) and/or pass rename redirect state so the user is clearly informed that the entity was renamed from `kind:namespace/name` to `targetKind:targetNamespace/targetName`.
      - If no redirect target is returned (or if the redirect target itself fails to load), fall through to the existing not-found state (`EntityNotFound`).
- **FR-11 (Support for Both Old and New Frontend Systems)**:
  - Verify that both:
    - Legacy `<CatalogEntityPage>` + `<EntityLayout>` (`plugins/catalog/src/components/**`)
    - New Frontend System (`alpha`) `catalogEntityPage` (`plugins/catalog/src/alpha/**`)
    automatically perform the former-name redirect and display the rename notification without duplicate alerts or infinite redirect loops.

### 4.5 `plugins/techdocs`

- **FR-12 (TechDocs Reader Redirect When Entity Was Renamed)**:
  - In `plugins/techdocs` (`useExternalRedirect.ts`, `TechDocsReaderPage.tsx`, `useTechDocsReaderContentData.ts`, and `src/alpha/components/TechDocsReaderPage.tsx`):
    - When a user visits `/docs/:namespace/:kind/:name/*` and the entity metadata lookup (`catalogApi.getEntityByRef` / `techdocsApi.getEntityMetadata`) indicates the entity does not exist at `kind:namespace/name`:
      - Query the former-name redirect method on `catalogApi`.
      - **Case A — Renamed entity found in catalog**:
        - Redirect (`navigate(..., { replace: true })`) to the renamed entity's TechDocs route (`/docs/:targetNamespace/:targetKind/:targetName/*`, preserving the sub-path `*`), and display a user-visible notification (e.g., via `TechDocsRedirectNotification` or `alertApiRef`) informing the user that the entity was renamed.
        - **Case B — Renamed entity has no built TechDocs (or TechDocs metadata returns 404 after redirect)**:
          - Ensure the reader does not crash or enter an infinite redirect loop; display a clear not-found state (with a link to the entity in the Software Catalog if the entity exists in the catalog without docs).
      - **Case C — No rename redirect found**:
        - Render the existing `TechDocsNotFound` page as before.
- **FR-13 (Support for Both Old and New Frontend Systems in TechDocs)**:
  - Ensure both the legacy `<TechDocsReaderPage>` (`plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx`) and the new frontend system (`alpha`) `techDocsReaderPage` (`plugins/techdocs/src/alpha/components/TechDocsReaderPage.tsx`) support the former-name redirect and notification behavior.

### 4.6 Repo Companions (API Reports, SQL Report, Documentation, Changesets)

- **FR-14 (API & SQL Reports)**:
  - Run `yarn build:api-reports` (or update the affected `report*.api.md` and `plugins/catalog-backend/report.sql.md` files) so that all public API surface additions in `catalog-model`, `catalog-client`, `catalog-backend`, `catalog`, and `techdocs`, as well as SQL queries in `catalog-backend`, match the committed report files with zero diff.
- **FR-15 (Documentation)**:
  - Update `docs/features/software-catalog/well-known-annotations.md` to document `backstage.io/previous-names` (purpose, syntax, examples, same-kind constraint, behavior when a new entity claims the old name).
  - Update `docs/features/software-catalog/api.md` to document the new former-name redirect resolution endpoint, request parameters, `200 OK` response body, and `404 Not Found` semantics.
  - Update `docs/features/software-catalog/audit-events.md` to include the new `queryType` under `entity-fetch` if a new `queryType` value is emitted.
  - Adhere to `docs/contribute/doc-style-guide.md` (sentence-case headings, active voice, valid Markdown).
- **FR-16 (Changesets & License Headers)**:
  - Add `.changeset/<name>.md` covering the modified packages (`@backstage/catalog-model`: `minor`, `@backstage/catalog-client`: `minor`, `@backstage/plugin-catalog-backend`: `minor` or `patch` per public API impact, `@backstage/plugin-catalog`: `patch`, `@backstage/plugin-techdocs`: `patch`).
  - Include the standard Backstage Apache 2.0 license header with year `2026` (`Copyright 2026 The Backstage Authors`) on all newly created source and migration files.

---

## 5. Non-Functional Requirements

- **NFR-1 (Zero Regression on Existing By-Name & Batch Lookups)**:
  - `DefaultEntitiesCatalog.entitiesBatch` (`GET /entities/by-name/:kind/:namespace/:name` and `POST /entities/by-refs`) MUST NOT add any SQL joins, subqueries, or fallback queries when resolving existing entities. Its SQL query shape in `plugins/catalog-backend/report.sql.md` and `plugins/catalog-backend/src/tests/performance/query-battery/queries.md` must remain identical to the baseline.
- **NFR-2 (Indexed O(log N) Former-Name Lookup)**:
  - Resolving a former entity ref MUST use the `final_entity_previous_names_previous_entity_ref_idx` B-tree index on `final_entity_previous_names(previous_entity_ref)` joined by primary key `final_entities(entity_id)`, avoiding full table scans on `final_entities` or JSON parsing of `final_entity`.
- **NFR-3 (Cross-Database Engine Compatibility)**:
  - All new migration DDL and Knex queries in `plugins/catalog-backend` MUST be compatible with both SQLite (`better-sqlite3`, used in unit/integration tests) and PostgreSQL (`pg`, used in production), using standard Knex query builder primitives.
- **NFR-4 (Loop & Cycle Safety)**:
  - Neither backend resolution nor frontend navigation may enter an infinite loop if two entities reference each other in `backstage.io/previous-names` or if a redirect target fails to load:
    - Backend live-entity check (`DQ-2`) ensures that if `B` exists, querying `B` returns `B` directly and never redirects.
    - Frontend navigation uses `{ replace: true }` so the browser Back button does not trap the user in a redirect loop, and guards against redirecting more than once per navigation attempt.
- **NFR-5 (Test & Static Analysis Verification)**:
  - All changes must pass `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all` with zero errors.
  - Frontend tests in `plugins/catalog` and `plugins/techdocs` must prefer `screen` and `findBy*` over `waitFor` and must not introduce new `data-testid` attributes.

---

## 6. PII Inventory

This feature processes only Software Catalog entity metadata (`kind`, `namespace`, `name` triplets and entity annotations) and standard Backstage authentication credentials. No new end-user PII fields are collected or stored.

| Field / Data Element | Sensitivity | Storage / Transit Location | Protection Mechanism |
| :--- | :--- | :--- | :--- |
| `previous_entity_ref` (`kind:namespace/name`) | Low (Internal Catalog Metadata; could be a User/Group entity ref if applied to organizational entities) | `final_entity_previous_names` DB table; HTTP request/response; audit log `meta.entityRef` | Access gated by `AuthorizedEntitiesCatalog` (`catalog.entity.read` permission on the target entity); returns HTTP `404` when caller lacks read permission on target. |
| `entity_ref` (Target `kind:namespace/name`) | Low (Internal Catalog Metadata) | `final_entities` DB table; HTTP `200` response body `{ entityRef }`; frontend URL / alert message | Returned ONLY after `AuthorizedEntitiesCatalog` verifies the caller's `BackstageCredentials` have `catalog.entity.read` permission on the target entity. |
| `BackstageCredentials` (Caller principal / token) | High (Authentication Credential) | In-memory request context (`httpAuth.credentials(req)`) | Handled strictly via `@backstage/backend-plugin-api` `HttpAuthService` and `PermissionsService`; never persisted in catalog tables or logged in plaintext. |

---

## 7. Role Matrix

Permission enforcement uses the Backstage Permission Framework (`catalogEntityReadPermission` / `catalog.entity.read`) in `AuthorizedEntitiesCatalog`.

| Role / Caller | Resource | Action | Permission Checked | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Unauthenticated Request** (without valid credentials when auth is required) | Former Entity Ref (`GET /entities/by-name/:kind/:namespace/:name/redirect` or equivalent) | Resolve former entity ref to target entity ref | `httpAuth.credentials(req)` | **Deny (`401 Unauthorized`)** before reaching catalog lookup. |
| **Authenticated User — Permitted on Target** (`ALLOW` or passes `CONDITIONAL` filter on target entity) | Former Entity Ref (`A`) -> Target Entity (`B`) | Resolve former entity ref `A` | `catalog.entity.read` evaluated against Target Entity `B` | **Allow (`200 OK`)**: Returns `{ entityRef: "component:default/b" }`. Frontend redirects to `B` and shows rename notice. |
| **Authenticated User — Denied on Target** (`DENY` or fails `CONDITIONAL` filter on target entity `B`) | Former Entity Ref (`A`) -> Target Entity (`B`) | Resolve former entity ref `A` | `catalog.entity.read` evaluated against Target Entity `B` | **Deny (`404 Not Found`)**: Returns `undefined` / HTTP `404`. Does NOT leak that `A` was renamed to `B`. Frontend shows standard Not Found page. |
| **Authenticated User — Live Entity Exists at `A`** | Entity Ref (`A`) where live entity `A` exists in `final_entities` | Fetch `A` (`GET /entities/by-name/...`) or resolve redirect for `A` | `catalog.entity.read` evaluated against Live Entity `A` | Primary lookup returns live entity `A` (if permitted to read `A`); redirect endpoint returns `404 Not Found` because `A` is currently a live entity. |
| **Entity Owner / Author** | Entity YAML (`metadata.annotations['backstage.io/previous-names']`) | Declare former entity ref(s) in same `kind` | Catalog ingestion / processor pipeline | **Allow**: Stitched into `final_entity_previous_names`. Cross-kind declarations are ignored (`FR-2`). |

---

## 8. Acceptance Criteria

Each acceptance criterion is numbered, executable under `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`, and traceable to the 10 acceptance criteria in `intent_brief.md`:

- **AC-1 (Traceable to Brief Criterion #1 — Well-known annotation in `catalog-model`)**:
  - *Given* `@backstage/catalog-model`,
  - *When* importing `ANNOTATION_PREVIOUS_NAMES` and the former-names parser helper (`parseEntityPreviousNames`),
  - *Then* single and comma-separated former names (e.g., `'old-name'`, `'old-ns/old-name, component:other-ns/older-name'`) are parsed and normalized into lowercase `kind:namespace/name` strings using the entity's own `kind` and `namespace` as defaults, while malformed refs, self-refs, and cross-kind refs are ignored.
  - *Verification*: Unit tests in `packages/catalog-model` (and `yarn tsc`).

- **AC-2 (Traceable to Brief Criterion #2 — Catalog backend resolves former ref to current entity)**:
  - *Given* an entity `component:default/new-service` stitched into `catalog-backend` with `metadata.annotations['backstage.io/previous-names'] = 'old-service, legacy/old-service'`,
  - *When* calling the catalog backend former-name resolution method/endpoint for `component:default/old-service` or `component:legacy/old-service`,
  - *Then* the backend responds with `200 OK` and `{ entityRef: 'component:default/new-service' }`; and when the annotation is removed or the entity is deleted and re-stitched, querying `component:default/old-service` responds with `404 Not Found`.
  - *Verification*: Integration tests in `plugins/catalog-backend` (`DefaultEntitiesCatalog.test.ts` and `createRouter.test.ts`).

- **AC-3 (Traceable to Brief Criterion #3 — Live entity precedence & conflict handling)**:
  - *Given* entity `component:default/new-service` claiming former name `old-service`,
  - *When* a live entity `component:default/old-service` is also present in `final_entities`,
  - *Then* `GET /entities/by-name/component/default/old-service` returns the live `component:default/old-service` entity, and the former-name redirect endpoint for `component:default/old-service` returns `404 Not Found` (`undefined`).
  - *And Given* two distinct live entities `component:default/service-1` and `component:default/service-2` both claiming `backstage.io/previous-names: shared-old-name`,
  - *When* querying the former-name redirect endpoint for `component:default/shared-old-name`,
  - *Then* the backend deterministically returns `404 Not Found` (`undefined`) rather than an arbitrary claimant.
  - *Verification*: Integration tests in `plugins/catalog-backend` (`DefaultEntitiesCatalog.test.ts`).

- **AC-4 (Traceable to Brief Criterion #4 — Permission enforcement on redirect target)**:
  - *Given* `AuthorizedEntitiesCatalog` configured with a permission policy on `catalogEntityReadPermission`, and `component:default/secret-new` claiming former name `component:default/public-old`,
  - *When* a caller whose permission decision for `component:default/secret-new` is `DENY` (or fails a `CONDITIONAL` entity filter) requests former-name resolution for `component:default/public-old`,
  - *Then* `AuthorizedEntitiesCatalog` returns `undefined` (and the HTTP endpoint returns `404 Not Found`), whereas an authorized caller receives `{ entityRef: 'component:default/secret-new' }`.
  - *Verification*: Unit/integration tests in `plugins/catalog-backend` (`AuthorizedEntitiesCatalog.test.ts` / `createRouter.test.ts`).

- **AC-5 (Traceable to Brief Criterion #5 — No regression on existing by-name lookups)**:
  - *Given* `DefaultEntitiesCatalog.entitiesBatch`,
  - *When* `GET /entities/by-name/:kind/:namespace/:name` or `POST /entities/by-refs` is called for existing entities,
  - *Then* the executed SQL query on `final_entities` is unchanged from baseline (no added joins or extra queries in `plugins/catalog-backend/report.sql.md` for `entitiesBatch`).
  - *Verification*: SQL report check (`plugins/catalog-backend/report.sql.md`) and `plugins/catalog-backend` test suite.

- **AC-6 (Traceable to Brief Criterion #6 — `catalog-client` exposes lookup)**:
  - *Given* `@backstage/catalog-client`'s `CatalogClient` and `InMemoryCatalogClient`,
  - *When* calling the former-name redirect lookup method with a former entity ref,
  - *Then* `CatalogClient` requests the new backend endpoint and returns `{ entityRef: 'component:default/new-service' }` on `200 OK` or `undefined` on `404 Not Found`, and `InMemoryCatalogClient` resolves the redirect from in-memory entities' `ANNOTATION_PREVIOUS_NAMES` annotations (respecting live-entity precedence and conflict rules).
  - *Verification*: Unit tests in `packages/catalog-client` and `yarn tsc`.

- **AC-7 (Traceable to Brief Criterion #7 — Catalog entity page redirects & notifies in both old and new frontend systems)**:
  - *Given* an entity renamed from `component:default/old-name` to `component:default/new-name`,
  - *When* a user visits `/catalog/default/component/old-name` (or `/catalog/default/component/old-name/ci-cd`) in either the legacy `<CatalogEntityPage>` or the `alpha` `catalogEntityPage`,
  - *Then* `getEntityByRef` returns `undefined`, the page resolves the redirect via `catalogApi`, navigates (`replace: true`) to `/catalog/default/component/new-name` (or `/catalog/default/component/new-name/ci-cd`), renders the renamed entity, and posts a notification informing the user of the rename.
  - *Verification*: Frontend component tests in `plugins/catalog/src/components/CatalogEntityPage/**` / `EntityLayout.test.tsx` and `plugins/catalog/src/alpha/pages.test.tsx`.

- **AC-8 (Traceable to Brief Criterion #8 — TechDocs reader handles renamed entities in both old and new frontend systems)**:
  - *Given* an entity renamed from `component:default/old-name` to `component:default/new-name`,
  - *When* a user visits `/docs/default/component/old-name` (or `/docs/default/component/old-name/subpath`) in either the legacy `<TechDocsReaderPage>` or the `alpha` `techDocsReaderPage`,
  - *Then* the reader detects the rename via `catalogApi`, redirects to `/docs/default/component/new-name` (preserving `/subpath`), and displays a rename notification; and if documentation is unavailable for the entity, displays a clear not-found state without crashing or looping.
  - *Verification*: Frontend component tests in `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.test.tsx`, `useExternalRedirect.test.tsx`, and `plugins/techdocs/src/alpha/components/TechDocsReaderPage.test.tsx`.

- **AC-9 (Traceable to Brief Criterion #9 — Documentation updated)**:
  - *Given* `docs/features/software-catalog/well-known-annotations.md`, `docs/features/software-catalog/api.md`, and `docs/features/software-catalog/audit-events.md`,
  - *When* inspecting the documentation changes,
  - *Then* the `backstage.io/previous-names` annotation, the redirect resolution HTTP endpoint, and the audit event metadata are clearly documented in compliance with `docs/contribute/doc-style-guide.md`.
  - *Verification*: Inspection and `yarn lint:all`.

- **AC-10 (Traceable to Brief Criterion #10 — Tests, TypeScript, Linter, API/SQL Reports, & Changesets)**:
  - *Given* the complete set of changes across the 5 in-scope packages and repo companions,
  - *When* running `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`,
  - *Then* all unit, integration, typecheck, and lint checks pass, `report*.api.md` and `plugins/catalog-backend/report.sql.md` are up to date, new files carry the 2026 Apache 2.0 header, and `.changeset/*.md` is present and valid.
  - *Verification*: Execution of `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`.

---

## 9. Open Questions for HITL (Gate 1 Confirmation)

All four design questions from the brief have concrete proposed answers in **Section 3 (DQ-1 through DQ-4)** so implementation can proceed immediately upon confirmation. Please confirm or adjust at Gate 1:

1. **OQ-1 (Annotation & API Naming)**:
   - Confirm annotation constant `ANNOTATION_PREVIOUS_NAMES = 'backstage.io/previous-names'` (vs. `ANNOTATION_FORMER_NAMES = 'backstage.io/former-names'`).
   - Confirm endpoint path `GET /entities/by-name/{kind}/{namespace}/{name}/redirect` or `GET /entities/by-previous-name/{kind}/{namespace}/{name}` (returning `{ entityRef: string }` on `200 OK` and `404 Not Found` when no redirect applies).
2. **OQ-2 (Claiming Scope — Confirming DQ-1)**:
   - Confirm the proposed rule in **DQ-1**: an entity can claim former names within the **same `kind`** across any namespace (defaulting `kind` and `namespace` to the declaring entity's own `kind` and `namespace`), while cross-kind claims are ignored.
3. **OQ-3 (Competing Claims Between Multiple Entities — Confirming DQ-2)**:
   - Confirm the proposed rule in **DQ-2**: live entities always win over former-name claims, and if two or more live entities claim the exact same former entity ref simultaneously, the backend treats the former ref as ambiguous and returns `404 Not Found` (rather than picking an arbitrary winner).
4. **OQ-4 (Target Permission Semantics — Confirming DQ-3)**:
   - Confirm the proposed rule in **DQ-3**: `AuthorizedEntitiesCatalog` checks `catalog.entity.read` on the redirect target entity and returns `404 Not Found` (not `403`) when the caller lacks permission to read the target entity.
