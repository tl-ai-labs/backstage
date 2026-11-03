# Requirements — Entity former names and rename redirects

- **Run ID:** `20261103-210033-feature-new-entity-rename-redirects`
- **Mode:** brownfield
- **Intent:** `feature-new`
- **Source brief:** `.sdlc/runs/20261103-210033-feature-new-entity-rename-redirects/intent_brief.md`

---

## In scope

1. **`@backstage/catalog-model` (`packages/catalog-model/src/**`):** Export a well-known annotation constant for declaring an entity's former entity references, together with validation logic for that annotation.
2. **`@backstage/plugin-catalog-backend` (`plugins/catalog-backend/src/**`, `plugins/catalog-backend/migrations/**`):** Index declared former entity references during processing or stitching, and resolve them in catalog lookups when a direct lookup misses, subject to anti-hijacking rules, deterministic conflict handling, and permission checks on the redirect target. Hand-edit `src/schema/openapi.yaml` as needed and regenerate `src/schema/openapi/generated/**`.
3. **`@backstage/catalog-client` (`packages/catalog-client/src/**`):** Provide a lookup method (and regenerated OpenAPI client where applicable) that resolves a possibly-former entity reference to the current entity or indicates that the reference was renamed and what target reference it now points to.
4. **`@backstage/plugin-catalog` (`plugins/catalog/src/**`, and `plugins/catalog-react/src/**` or `plugins/catalog-node/src/**` only if shared hooks/helpers/types are needed):** On both the legacy and the new frontend system (`alpha`) entity pages, fall back to the former-name lookup when the primary entity lookup misses; on a hit, redirect to the current entity's route and display a notice that the entity was renamed from the former reference.
5. **`@backstage/plugin-techdocs` (`plugins/techdocs/src/**`, and `plugins/techdocs-backend/src/**` only if metadata routes must resolve former names):** On the TechDocs reader route, when an entity/docs lookup for the requested entity reference misses, resolve via the former-name mechanism, redirect to the current entity's TechDocs route while preserving the sub-path within the docs, and display a rename notice.
6. **API reports (`packages/*/report*.api.md`, `plugins/*/report*.api.md`):** Regenerate API reports for touched packages via `yarn build:api-reports`.
7. **Documentation (`docs/features/software-catalog/**`, `docs/features/techdocs/**` allowlisted files):** Document the former-names annotation, the redirect behaviour in Catalog and TechDocs, and its limitations across the allowlisted documentation files.
8. **Changesets (`.changeset/*.md`):** Add new changeset file(s) for touched packages following repository version bump rules and adopter-facing messaging guidelines.

---

## Out of scope

1. Automatic rename detection (former names are explicitly declared by the entity owner, never inferred automatically).
2. Redirects for plugins other than the Catalog entity page and TechDocs.
3. Rewriting stored entity relations or other entities' references to point at the new entity name.
4. Backfilling former names for past renames.
5. Changes to the scaffolder, search indexing, or the catalog import flow.
6. Editing any file outside the Gate 0 allowlist (including `.git/**`, `.env*`, `.yarn/**`, `yarn.lock`, AI configs, `docs/releases/**`, `.eslintrc.js`, `.prettierignore`, `tsconfig.json`, `**/knip-report.md`, `.changeset/config.json`, `.changeset/pre.json`, and `README.md`).

---

## Functional requirements per module

### `catalog-model` (`packages/catalog-model`)

- **FR-1 (Former-names annotation constant):** `packages/catalog-model` MUST export a well-known annotation constant (e.g., `ANNOTATION_FORMER_NAMES` or equivalent `backstage.io/*` annotation constant in `src/entity/constants.ts` and re-exported from the package entrypoint) that allows an entity to declare one or more former entity references. *(Traces to Brief Goal 1)*
- **FR-2 (Former-names annotation validation):** `packages/catalog-model` MUST validate the value of the former-names annotation so that malformed or invalid entity references are rejected by entity/annotation validation, while valid entity references (or list of references, per the annotation format) pass validation. *(Traces to Brief Goal 1)*

### `catalog-backend` (`plugins/catalog-backend` & optional `plugins/catalog-node`)

- **FR-3 (Indexing former entity refs):** During entity processing or stitching, `catalog-backend` MUST extract and index the former entity references declared on an entity (normalised to full entity refs including default kind/namespace where omitted) and keep the index updated as entities are reprocessed, stitched, updated, or deleted. *(Traces to Brief Goal 2)*
- **FR-4 (Live entity precedence / anti-hijacking):** `catalog-backend` MUST never allow an entity's declared former name to hijack or shadow an existing live entity's reference. If a live entity exists at ref `R` (either already present or created later), lookups for `R` MUST always resolve to the live entity `R` rather than redirecting to another entity claiming `R` as a former name. *(Traces to Brief Goal 2 & Design Questions 1, 2)*
- **FR-5 (Deterministic conflict resolution):** When two or more distinct live entities claim the same former entity reference `R` (and no live entity exists at `R`), `catalog-backend` MUST resolve the conflict deterministically (for example, by a stable ordering or ownership/location rule, or by refusing ambiguous resolution deterministically) so that lookup outcomes do not depend on non-deterministic execution order. *(Traces to Brief Goal 2 & Design Question 1)*
- **FR-6 (Former-name lookup API & OpenAPI specification):** `catalog-backend` MUST expose former-name resolution in its HTTP API and `src/schema/openapi.yaml` (with `src/schema/openapi/generated/**` regenerated via tooling) so callers can resolve a possibly-former entity ref on a miss and learn the current target entity ref / entity. *(Traces to Brief Goal 2, Goal 3, Files in scope)*
- **FR-7 (Permission enforcement on redirect target):** When resolving a former entity ref `R` to a target entity `T`, `catalog-backend` MUST apply catalog permission checks (via `AuthorizedEntitiesCatalog` / permission integration) to the redirect target `T`. If the caller is not authorized to read `T`, the lookup MUST behave as not found (`404` / `undefined`) and MUST NOT leak `T`'s reference or metadata. *(Traces to Brief Goal 2, Design Question 3, Acceptance Criteria)*

### `catalog-client` (`packages/catalog-client`)

- **FR-8 (Client lookup method for former refs):** `packages/catalog-client` MUST provide a method on `CatalogApi` / `CatalogClient` (backed by the regenerated OpenAPI client where applicable) that resolves a possibly-former entity reference to the current entity or informs the caller that the reference was renamed and what current entity reference it now points to. *(Traces to Brief Goal 3)*

### `plugins/catalog` (and optional `plugins/catalog-react`)

- **FR-9 (Legacy entity page redirect and rename notice):** In `@backstage/plugin-catalog` (legacy frontend system entity page, e.g., via `useEntityFromUrl` / `EntityLayout`), when `getEntityByRef` for `/catalog/:namespace/:kind/:name` misses, the page MUST attempt the former-name lookup. If the former reference resolves to a current entity, the router MUST navigate/redirect to the current entity's catalog route and render a visible notice stating that the entity was renamed from the old name/ref. If the reference is unknown (neither a live entity nor a resolvable former ref), the page MUST continue to render the "Entity not found" view. *(Traces to Brief Context, Goal 4, Acceptance Criteria)*
- **FR-10 (New frontend system `alpha` entity page redirect and rename notice):** The new frontend system (`alpha`) entity page in `@backstage/plugin-catalog` MUST support the same fallback lookup, route redirect to the current entity URL, and renamed-from notice when visiting a former entity URL, while showing "Entity not found" for unknown refs. *(Traces to Brief Goal 4, Acceptance Criteria)*

### `plugins/techdocs` (and optional `plugins/techdocs-backend`)

- **FR-11 (TechDocs reader route redirect preserving sub-path and showing notice):** In `@backstage/plugin-techdocs` (and `@backstage/plugin-techdocs-backend` metadata routes if needed), when opening `/docs/:namespace/:kind/:name/*` for an entity ref that misses direct lookup, TechDocs MUST check whether the ref is a former entity name. On a hit, it MUST redirect to `/docs/<new-namespace>/<new-kind>/<new-name>/<sub-path>` preserving any sub-path within the documentation, and display a notice indicating that the entity was renamed from the former name. Unknown refs MUST continue to render the not-found state. *(Traces to Brief Context, Goal 5, Acceptance Criteria)*

### `docs`

- **FR-12 (Catalog and TechDocs documentation updates):** Update the allowlisted documentation files (`docs/features/software-catalog/well-known-annotations.md`, `life-of-an-entity.md`, `references.md`, `faq.md`, and `docs/features/techdocs/how-to-guides.md`, `FAQ.md` as applicable) to describe the former-names annotation, how entity and TechDocs URL redirects work on rename, and the feature's limits (conflict rules, live-entity precedence, non-goals). *(Traces to Brief Files in scope, Acceptance Criteria)*

### `changesets`

- **FR-13 (Adopter-facing changesets):** Create new `.changeset/*.md` file(s) covering every modified package, using `minor` for new public APIs in packages at version `>= 1.0.0` and `patch` for packages at version `< 1.0.0`, written for adopters without referencing internal symbol names. *(Traces to Brief Files in scope, Acceptance Criteria)*

---

## Non-functional requirements

- **NFR-1 (Unchanged primary lookup performance):** Direct lookups by entity reference (`getEntityByRef` / `GET /entities/by-name/:kind/:namespace/:name` and batch ref lookups) MUST remain as fast as they are today on a hit; the former-name resolution path MUST only be consulted on a miss (or via a dedicated endpoint/query invoked on a miss). *(Traces to Brief Goal 2 & Design Question 4)*
- **NFR-2 (Catalog DB performance guidance):** Any new or modified database tables, indexes, or queries in `plugins/catalog-backend` (and any migration under `plugins/catalog-backend/migrations/**`) MUST follow the repository's catalog database performance guidance (indexed lookup keys, portable Knex migrations across SQLite/PostgreSQL/MySQL, and compatibility with the query performance battery). *(Traces to Brief Design Question 4 & Discovery note)*
- **NFR-3 (Permission non-leakage):** Former-name lookup responses MUST NOT disclose the existence or new entity reference of a renamed entity to a principal who lacks read permission on the target entity; unauthorized targets MUST be indistinguishable from unknown references (`404 Not Found`). *(Traces to Brief Goal 2, Design Question 3, Acceptance Criteria)*
- **NFR-4 (License headers on new files):** Every newly created source file MUST carry the standard Backstage Apache 2.0 license header dated `2026`. Existing files MUST NOT have their license year modified. *(Traces to Brief Acceptance Criteria & Discovery rules)*
- **NFR-5 (No hand edits to generated artifacts):** `plugins/catalog-backend/src/schema/openapi/generated/**`, `packages/catalog-client` generated OpenAPI files, and `**/report*.api.md` files MUST only be updated via their respective codegen/API-report commands (`yarn build:api-reports`, OpenAPI generation tooling) and MUST NEVER be hand-edited. *(Traces to Brief Files in scope)*
- **NFR-6 (Static analysis and lint compliance):** All changes MUST pass `yarn tsc` and `yarn lint:all` (without running `--fix`). *(Traces to Brief Acceptance Criteria & Run settings)*

---

## PII inventory

This feature operates solely on Backstage catalog entity metadata (`kind`, `namespace`, `name`, entity annotations, and URL paths) and does not collect, store, or process end-user personal data.

| Field | Sensitivity | Protection |
|---|---|---|
| Entity reference (`kind:namespace/name`) & former entity references in annotation / DB index | Internal metadata (Non-PII; may reflect internal service or team names) | Protected by Backstage catalog permission framework; target entity read permissions are enforced before returning any redirect target (NFR-3). |
| Request credentials / Backstage principal token | Confidential (Auth credential) | Handled by existing `@backstage/backend-plugin-api` `httpAuth` / `permissions` services; never logged or persisted by former-name lookup logic. |

---

## Role matrix

| Role | Resource | Action | Expected Outcome |
|---|---|---|---|
| Entity Owner / Author | `catalog-info.yaml` (former-names annotation) | Declare former entity ref(s) on an entity | Annotation is validated (`FR-2`) and indexed by `catalog-backend` (`FR-3`), provided no live entity holds that ref (`FR-4`). |
| Anonymous or Authenticated User **with** `catalog.entity.read` permission on target entity | Catalog Backend API / Catalog Entity Page (`/catalog/:ns/:kind/:old`) | Look up or navigate to former entity ref | Resolves former ref to target entity; UI redirects to `/catalog/:ns/:kind/:new` and shows rename notice (`FR-7`, `FR-9`, `FR-10`). |
| Anonymous or Authenticated User **with** `catalog.entity.read` permission on target entity | TechDocs Reader (`/docs/:ns/:kind/:old[/sub/path]`) | Navigate to former entity's TechDocs URL | Redirects to `/docs/:ns/:kind/:new[/sub/path]` preserving sub-path and shows rename notice (`FR-11`). |
| Anonymous or Authenticated User **without** `catalog.entity.read` permission on target entity | Catalog Backend API / Catalog Entity Page / TechDocs Reader | Look up or navigate to former entity ref whose target they cannot read | Receives Not Found (`404` / "Entity not found"); target entity ref and metadata are NOT revealed (`FR-7`, `NFR-3`). |
| Any User | Catalog Backend API / Catalog Entity Page / TechDocs Reader | Look up or navigate to a ref that matches both a live entity and another entity's former-name annotation | Resolves to the live entity; no redirect occurs (`FR-4`). |
| Any User | Catalog Backend API / Catalog Entity Page / TechDocs Reader | Look up or navigate to an unknown ref (neither live nor indexed former ref) | Receives Not Found (`404` / "Entity not found") (`FR-9`, `FR-10`, `FR-11`). |

---

## Acceptance criteria

- **AC-1 (Backend test — former-name indexing):** Automated tests in `plugins/catalog-backend` verify that an entity declaring the former-names annotation has its former reference(s) indexed during processing/stitching and that looking up a former reference resolves to the renamed entity. *(Traces to Brief Acceptance Criteria 1a)*
- **AC-2 (Backend test — conflict handling):** Automated tests in `plugins/catalog-backend` verify both conflict scenarios: (a) when two entities claim the same former name, resolution is deterministic and does not fail unpredictably; and (b) when a live entity exists at or later takes a former name, the live entity always wins over the former-name claim. *(Traces to Brief Acceptance Criteria 1b)*
- **AC-3 (Backend test — permissioned lookup):** Automated tests in `plugins/catalog-backend` verify that when a user lacks permission to read the redirect target entity, looking up the former name resolves as not found and leaks no information about the target entity. *(Traces to Brief Acceptance Criteria 1c)*
- **AC-4 (Frontend jsdom test — catalog entity route redirect & notice):** Automated jsdom tests in `plugins/catalog` verify (for both legacy and new frontend system entity pages) that visiting an old entity URL (`/catalog/:namespace/:kind/:old-name`) redirects to the new entity URL (`/catalog/:namespace/:kind/:new-name`) and renders the "renamed from" notice. *(Traces to Brief Acceptance Criteria 2a & Goal 4)*
- **AC-5 (Frontend jsdom test — TechDocs route redirect with sub-path preserved & notice):** Automated jsdom tests in `plugins/techdocs` verify that visiting an old TechDocs URL with a sub-path (`/docs/:namespace/:kind/:old-name/sub/path`) redirects to the new entity's TechDocs URL with the sub-path preserved (`/docs/:namespace/:kind/:new-name/sub/path`) and renders the renamed notice. *(Traces to Brief Acceptance Criteria 2b & Goal 5)*
- **AC-6 (Frontend jsdom test — unknown ref shows Entity not found):** Automated jsdom tests in `plugins/catalog` (and `plugins/techdocs` where applicable) verify that visiting an unknown entity reference that is neither a live entity nor a known former name still renders "Entity not found". *(Traces to Brief Acceptance Criteria 2c)*
- **AC-7 (Test suite, typecheck, and lint execution):** The Gate 0 verification command `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all` passes with zero errors, and `yarn build:api-reports` produces clean, up-to-date API reports for all touched packages. *(Traces to Brief Acceptance Criteria 3, Files in scope, Run settings)*
- **AC-8 (Apache 2.0 2026 header check):** Every newly added source file contains the Apache 2.0 license header for year `2026`. *(Traces to Brief Acceptance Criteria 4)*
- **AC-9 (Changeset validation):** New changeset file(s) under `.changeset/` use `minor` bump level for packages `>= 1.0.0` with new public APIs and `patch` for packages `< 1.0.0`, with adopter-focused descriptions containing no internal symbol names. *(Traces to Brief Acceptance Criteria 5)*
- **AC-10 (Documentation completeness):** Allowlisted documentation files in `docs/features/software-catalog/` and `docs/features/techdocs/` accurately document the former-names annotation, the redirect behaviour in Catalog and TechDocs, and its limitations. *(Traces to Brief Acceptance Criteria 6)*

---

## Open questions for HITL

The intent brief identifies four design questions that the architect must answer in the change plan. Recommended defaults are provided below so the run can proceed autonomously without blocking on human input:

1. **Who may claim a former name?**
   - *Question:* May any entity claim any non-existent ref as a former name, or should claims be restricted (e.g., to the same source location or owner)?
   - *Recommended default:* Allow any valid entity to declare former entity refs via the annotation (since renames across namespaces, kinds, or moved repositories/locations are common use cases mentioned in the brief), while strictly enforcing that a former-name claim is ignored whenever a live entity exists at that ref, and resolving multi-claimant conflicts deterministically (e.g., ordered by `entity_id` / `entity_ref` or first-registered).
2. **What happens when a new entity later takes an old name?**
   - *Question:* How should the system behave when a live entity is registered with a ref that another entity lists as a former name?
   - *Recommended default:* **A live entity always wins over a former name.** Because primary entity lookups only consult the former-name path on a miss, and even direct former-name resolution checks against `final_entities` / `refresh_state`, any live entity with that ref takes unconditional precedence.
3. **How are permission checks applied to the redirect target?**
   - *Question:* How should authorization be evaluated when resolving a former ref to its target entity?
   - *Recommended default:* **A user who cannot read the redirect target must get "not found", with no leak of the new name.** Apply the same `AuthorizedEntitiesCatalog` / permission filter used for standard entity lookups to the target entity before returning the redirect response; if unauthorized, return `404 Not Found` (`undefined` in client).
4. **How do existing lookups stay fast?**
   - *Question:* What index/table design should be used, is a DB migration needed, and how does it comply with the catalog DB performance guidance?
   - *Recommended default:* Keep `GET /entities/by-name/:kind/:namespace/:name` untouched on the hot path so live hits execute the exact same query as today. Index former refs either as dedicated rows/keys in the existing `search` table (e.g., a dedicated search key such as `metadata.annotations.<former-names>` or special key already indexed on `(key, value)`) or a small indexed table, and consult that index only when the primary lookup misses (or via a dedicated endpoint/parameter called on miss). If a schema or query change is introduced, verify against `.claude/skills/catalog-db-performance.md`.
