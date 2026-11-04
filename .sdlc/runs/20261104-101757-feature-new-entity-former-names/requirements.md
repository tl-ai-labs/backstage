# Requirements — Entity Former Names and Rename Redirects

## 1. In scope

1. **Former-name declaration (`@backstage/catalog-model`)**: Define and export a well-known annotation constant (and optional validation policy) allowing an entity descriptor to declare one or more former entity names or references that previously identified the entity before a rename or namespace move.
2. **Former-reference indexing (`@backstage/plugin-catalog-backend`)**: Index an entity's declared former references at stitch time (via `performStitching` / search index or dedicated table) and clean up indexed former references when entities are updated or deleted (`removeEntityByUid`, `deleteOrphanedEntities`).
3. **Conflict and precedence resolution (`@backstage/plugin-catalog-backend`)**: Resolve lookups of unknown entity references against indexed former references only after a direct lookup misses, ensuring that:
   - A live entity with the exact `kind:namespace/name` reference always takes precedence over any former-name claim.
   - Conflicting claims (multiple live entities claiming the same former reference) have a deterministic, non-hijacking outcome.
4. **Permission-checked former-reference resolution (`@backstage/plugin-catalog-backend`)**: Enforce `catalogEntityReadPermission` (including conditional permission filters in `AuthorizedEntitiesCatalog`) on the target entity when resolving a former reference so that unauthorized entities are never leaked or disclosed as redirect targets.
5. **Catalog HTTP API & OpenAPI specification (`@backstage/plugin-catalog-backend`)**: Expose former-reference resolution in `createRouter.ts` and `plugins/catalog-backend/src/schema/openapi.yaml`, and regenerate the OpenAPI router/client artifacts via the `catalog-backend` `generate` script.
6. **Catalog client & test utilities (`@backstage/catalog-client`, `@backstage/plugin-catalog-react`)**: Expose the lookup capability on `CatalogApi` and `CatalogClient`, and implement matching support in `InMemoryCatalogClient` (`@backstage/catalog-client/testUtils`) and `catalogApiMock` (`@backstage/plugin-catalog-react/testUtils`).
7. **Catalog entity page redirect and rename notice (`@backstage/plugin-catalog`)**: When navigating to `/catalog/:namespace/:kind/:name` for an entity reference that is not found directly but resolves as a former reference of a readable live entity, replace-navigate to the renamed entity's route (preserving any sub-route/query as applicable) and display a dismissible notice indicating the entity was renamed from the former reference, in both the legacy (`EntityLayout`) and new (`alpha` `CatalogEntityPage` / `EntityLayout` / `EntityLayoutBui`) frontend systems.
8. **TechDocs reader redirect and rename notice (`@backstage/plugin-techdocs`)**: When opening `/docs/:namespace/:kind/:name/*` for an entity reference that is not found directly but resolves as a former reference of a readable live entity, replace-navigate to the renamed entity's TechDocs URL while preserving the documentation sub-path, and show a rename notification in both legacy and alpha TechDocs reader pages.
9. **Documentation, API reports, and changesets**: Document the new annotation and redirect behavior in `docs/features/software-catalog/well-known-annotations.md` (and companion docs as needed), update package `report*.api.md` / `report.sql.md` files, and add hand-written changesets in `.changeset/*.md` for all affected published packages.

---

## 2. Out of scope

1. Automatic rename detection from Git history, location history, or catalog processing history without an explicit declaration on the entity descriptor.
2. Redirecting entity-keyed routes in plugins other than `@backstage/plugin-catalog` and `@backstage/plugin-techdocs`.
3. Automatically rewriting existing entity relations (`relations`) or references in other entity descriptors that still point at a former entity reference.
4. Migrating, copying, or republishing built TechDocs static assets in storage from the old entity name to the new entity name.
5. Modifying `techdocs-backend` HTTP routes (TechDocs redirects are resolved on the frontend before backend documentation fetches occur).

---

## 3. Functional requirements per module

### Module 1: `@backstage/catalog-model`

- **FR-1.1 (Former names annotation constant)**: `packages/catalog-model/src/entity/constants.ts` (re-exported through `src/entity/index.ts` and `src/index.ts`) MUST define and export a `@public` annotation constant for declaring an entity's former names/references, with TSDoc explaining the accepted format (e.g., comma-separated entity names or refs, defaulting to the declaring entity's kind and namespace when omitted).
- **FR-1.2 (Annotation format & parsing/validation)**: Well-formed values MUST resolve to normalized lowercase entity references (`kind:namespace/name`) using the declaring entity's own `kind` (and `metadata.namespace` or `default`) as defaults when only a name or `namespace/name` is given. Malformed or self-referencing entries MUST either be rejected by policy validation or safely ignored during indexing without crashing processing or stitching.

### Module 2: `@backstage/plugin-catalog-backend`

- **FR-2.1 (Indexing former references at stitch time)**: During `performStitching`, the stitcher MUST extract declared former references from the entity's annotation and index them (either as dedicated search keys via `buildEntitySearch`/`syncSearchRows` or in a dedicated table synced inside the stitch publication transaction) so they stay consistent with `final_entities`.
- **FR-2.2 (Orphan & deletion cleanup)**: When an entity is deleted via `removeEntityByUid` or `deleteOrphanedEntities`, or when an entity updates its annotation to remove a former name, its previously indexed former-reference entries MUST be removed automatically so stale redirects cannot persist.
- **FR-2.3 (Live entity precedence)**: When resolving an entity reference, if a live stitched entity exists with that exact `entity_ref` in `final_entities`, the live entity MUST always win over any former-reference claim by another entity.
- **FR-2.4 (Conflict handling / anti-hijacking)**: When multiple live entities claim the same former entity reference (or when a claim violates ownership/kind constraints), the backend MUST follow a deterministic conflict policy (e.g., refusing ambiguous redirects when more than one entity claims the same former ref, and restricting cross-kind claims if only same-kind renames are allowed) so one entity cannot arbitrarily hijack another entity's former name.
- **FR-2.5 (Permission enforcement on redirect target)**: `AuthorizedEntitiesCatalog` MUST enforce `catalogEntityReadPermission` (both unconditional `DENY` and `CONDITIONAL` filter predicates) against the target entity of a former-reference lookup. If the caller is not authorized to read the target entity, the lookup MUST behave identically to a non-existent entity (no leak of existence or new name).
- **FR-2.6 (OpenAPI & router endpoint)**: `plugins/catalog-backend/src/schema/openapi.yaml` and `createRouter.ts` MUST expose the lookup mechanism, and generated OpenAPI server/client files under `plugins/catalog-backend/src/schema/openapi/generated/**` and `packages/catalog-client/src/schema/openapi/generated/**` MUST be updated strictly via the `catalog-backend` `generate` script, with `auditor` events recorded consistently with other entity fetch endpoints.

### Module 3: `@backstage/catalog-client` & `@backstage/plugin-catalog-react`

- **FR-3.1 (`CatalogApi` & `CatalogClient` method)**: `packages/catalog-client/src/types/api.ts` and `CatalogClient.ts` MUST expose a `@public` lookup method (or response metadata) to resolve an entity or its renamed target by ref, accepting `string | CompoundEntityRef` and `CatalogRequestOptions`.
- **FR-3.2 (`InMemoryCatalogClient` & `catalogApiMock` support)**: `InMemoryCatalogClient` in `packages/catalog-client/src/testUtils/InMemoryCatalogClient.ts` MUST implement the same former-name resolution semantics (live entity precedence, conflict handling), and `catalogApiMock.mock` in `plugins/catalog-react/src/testUtils/catalogApiMock.ts` MUST include a `jest.fn()` stub for any new `CatalogApi` method.

### Module 4: `@backstage/plugin-catalog`

- **FR-4.1 (Catalog entity route redirect)**: When `useEntityFromUrl` (or the entity page loader) looks up `{ kind, namespace, name }` and no live entity exists at that exact ref, it MUST check whether the ref resolves as a former reference of a live entity. If resolved, it MUST navigate (`replace: true`) to the target entity's catalog route (preserving any sub-tab path when applicable) and pass or record the former reference so the destination page can display a rename notice.
- **FR-4.2 (Entity renamed notice in legacy and alpha layouts)**: Both the legacy `EntityLayout` (`plugins/catalog/src/components/EntityLayout/EntityLayout.tsx`) and the new frontend system layouts (`plugins/catalog/src/alpha/components/CatalogEntityPage.tsx`, `EntityLayout.tsx`, `EntityLayoutBui.tsx`) MUST render a visible, dismissible notice (`EntityRenamedNotice`) informing the user that the entity was renamed from `<old-name>` (or `<old-ref>`), using i18n keys registered in `catalogTranslationRef`.

### Module 5: `@backstage/plugin-techdocs`

- **FR-5.1 (TechDocs route redirect preserving sub-path)**: When opening a TechDocs URL (`/docs/:namespace/:kind/:name/*`) where the requested entity ref is a former name of a live entity, `TechDocsReaderPage` (in both legacy `plugins/techdocs/src/reader/components/TechDocsReaderPage` and `plugins/techdocs/src/alpha/components/TechDocsReaderPage.tsx`) MUST navigate (`replace: true`) to the renamed entity's TechDocs route while preserving the trailing documentation sub-path (`*`).
- **FR-5.2 (TechDocs rename notification)**: After redirecting from a former entity ref to the new entity's TechDocs route, the reader page MUST display a notification (`TechDocsRedirectNotification` or equivalent banner/snackbar) stating that the entity was renamed from the former name, using i18n keys registered in `techdocsTranslationRef`.

### Module 6: Companion Documentation & Release Artifacts

- **FR-6.1 (Documentation)**: `docs/features/software-catalog/well-known-annotations.md` (and any relevant catalog/TechDocs docs in scope) MUST document the new former-names annotation, its syntax, precedence rules, and redirect behavior.
- **FR-6.2 (API reports & changesets)**: All modified packages' API reports (`report.api.md`, `report-alpha.api.md`, `report-testUtils.api.md`, `report.sql.md` if applicable) MUST be updated, and hand-written changeset files MUST be added in `.changeset/*.md` for every affected published package.

---

## 4. Non-functional requirements

- **NFR-1 (Zero extra query cost on direct hits)**: Direct lookups (`getEntityByRef` / `/entities/by-name/:kind/:namespace/:name`) that match a live entity MUST NOT incur any extra database query or join; former-reference resolution MUST only run on a miss or via a dedicated fallback lookup.
- **NFR-2 (Indexed former-reference lookup)**: Former-reference lookups in `catalog-backend` MUST use an indexed database column/table (e.g., the indexed `search` table `(key, value)` or a dedicated indexed table) and MUST NOT scan or parse `final_entity` JSON blobs across the table.
- **NFR-3 (Cross-database compatibility)**: All SQL queries and any schema migrations in `plugins/catalog-backend` MUST work across PostgreSQL, MySQL, and SQLite, adhering to existing Knex patterns in `DefaultEntitiesCatalog` and `performStitching`.
- **NFR-4 (No unauthorized information disclosure)**: Former-reference resolution MUST NOT reveal the existence or new name of an entity to a caller who lacks `catalogEntityReadPermission` on the target entity, nor allow an entity to shadow a live entity or hijack another entity's former name when multiple entities claim the same former ref.
- **NFR-5 (License headers & repo conventions)**: Every newly created source file MUST begin with the 2026 Apache-2.0 copyright header (`Copyright 2026 The Backstage Authors`). OpenAPI generated files MUST only be produced by running the `catalog-backend` `generate` script.

---

## 5. PII inventory

This feature operates solely on software catalog entity identifiers (`kind`, `namespace`, `name`) and entity metadata already stored in the catalog. No new personal data or user PII fields are collected, stored, or processed.

| Field                                                                 | Sensitivity                                                                                                     | Protection                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Former entity reference (`kind:namespace/name` in annotation / index) | Low (Catalog metadata; may rarely contain `User` or `Group` entity names if applied to organizational entities) | Protected by `catalogEntityReadPermission` via `AuthorizedEntitiesCatalog` before any redirect target or entity payload is returned to the caller; audited via `auditor` service (`entity-fetch`).               |
| Redirect target entity (`Entity` payload / `entityRef`)               | Low–Medium (Catalog entity metadata)                                                                            | Enforced via `PermissionsService.authorizeConditional` / `authorize` with `catalogEntityReadPermission`; unauthorized targets return `404 NotFound` / `null` so neither target existence nor new name is leaked. |

---

## 6. Role matrix

| Role / Caller                                                                                                               | Resource                                                                                 | Action                                                                    | Expected Outcome                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated request                                                                                                     | Catalog HTTP API (`/entities/by-name/...` or former-ref lookup)                          | Read / Resolve former ref                                                 | Rejected with `401 Unauthorized` by `httpAuth.credentials(req)` unless guest/unauthenticated access is configured.            |
| Authenticated user **with** `catalog.entity.read` on target entity                                                          | Live entity claiming former ref `oldRef`                                                 | Resolve `oldRef` / Open `/catalog/.../old-name` or `/docs/.../old-name/*` | Resolves to target entity; frontend replace-navigates to new entity URL and displays the renamed notice.                      |
| Authenticated user **without** `catalog.entity.read` on target entity (unconditional `DENY` or conditional filter mismatch) | Live entity claiming former ref `oldRef`                                                 | Resolve `oldRef` / Open `/catalog/.../old-name` or `/docs/.../old-name/*` | Returns not found (`undefined` / `404`); no redirect occurs and target entity's new name is not disclosed.                    |
| Authenticated user **with** `catalog.entity.read` on live entity at `exactRef`                                              | Live entity at `exactRef` (while another entity also claims `exactRef` as a former name) | Read / Resolve `exactRef`                                                 | Live entity at `exactRef` is returned directly without redirect or rename notice.                                             |
| Authenticated user **with** `catalog.entity.read`                                                                           | Ambiguous former ref `sharedOldRef` claimed by multiple live entities                    | Resolve `sharedOldRef`                                                    | Conflict policy prevents hijacking; returns not found (`undefined` / `404`) rather than redirecting to an arbitrary claimant. |

---

## 7. Acceptance criteria

- **AC-1 (Model & annotation tests)**: Running `CI=1 yarn test packages/catalog-model` passes, verifying the new former-names annotation constant export and any associated validation/parsing behavior.
- **AC-2 (Backend indexing, precedence, conflict, and permission tests)**: Running `CI=1 yarn test plugins/catalog-backend/src/database/operations/stitcher/performStitching.test.ts plugins/catalog-backend/src/service/DefaultEntitiesCatalog.test.ts plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.test.ts plugins/catalog-backend/src/service/createRouter.test.ts` passes, verifying:
  - indexing of declared former refs at stitch time and cleanup on entity update/deletion;
  - live entity with the exact ref always winning over a former-name claim;
  - deterministic non-hijacking behavior when multiple entities claim the same former ref;
  - `catalogEntityReadPermission` (allow, deny, conditional) enforced on the resolved target entity with zero leakage;
  - zero extra queries on direct hits.
- **AC-3 (Catalog client & mock tests)**: Running `CI=1 yarn test packages/catalog-client plugins/catalog-react/src/testUtils/catalogApiMock.test.ts` passes, verifying `CatalogClient` and `InMemoryCatalogClient` former-name lookup behavior and OpenAPI client agreement.
- **AC-4 (Catalog entity page redirect & notice tests — legacy and alpha)**: Running `CI=1 yarn test plugins/catalog/src/components/EntityLayout/EntityLayout.test.tsx plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.test.tsx` (and any new `CatalogEntityPage` / `EntityRenamedNotice` tests in `plugins/catalog`) passes in jsdom, verifying replace-navigation from `/catalog/<ns>/<kind>/<old-name>` to the new entity route and rendering of the "renamed from" notice in both legacy and alpha frontend systems.
- **AC-5 (TechDocs redirect & notice tests)**: Running `CI=1 yarn test plugins/techdocs/src/reader/components/TechDocsReaderPage` passes in jsdom, verifying replace-navigation from `/docs/<ns>/<kind>/<old-name>/sub/path` to `/docs/<ns>/<kind>/<new-name>/sub/path` and rendering of the rename notification.
- **AC-6 (Typecheck)**: Running `yarn tsc` from the repository root passes with zero errors across all packages.

---

## 8. Open questions for HITL

None. All scope boundaries and acceptance criteria were approved at Gate 0, and the four technical design choices (annotation syntax/claim scope, conflict resolution semantics, permission check integration, and search-table vs. dedicated-table indexing) are explicitly delegated by the intent brief to the architecture phase.
