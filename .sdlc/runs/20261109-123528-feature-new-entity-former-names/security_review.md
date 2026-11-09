# Security Review — pass1

Mode: brownfield, intent: feature-new, base `f20fd9b598`. Scope: the 140 paths in `provenance.json`. The OpenAPI codegen rewrote most `generated/models/*` files, but git shows no content change in them; only `router.ts`, `Api.server.ts` and `Api.client.ts` differ.

## Summary
The change adds a `backstage.io/former-refs` annotation, a `former_entity_refs` index table populated at stitch time, a `GET /entities/by-former-name/:kind/:namespace/:name` endpoint, and client-side redirects in the catalog entity page and the TechDocs reader. The posture is sound. The new route uses the same `httpAuth.credentials(req)` path and auditor `entity-fetch` event as `by-name`. Authorization goes through `AuthorizedEntitiesCatalog` (DENY returns null; CONDITIONAL applies the permission predicate to the resolved entity), so callers cannot learn the new name of an entity they cannot read. DB access uses Knex query builders with bound parameters, stitch writes happen in the same transaction as the published entity, and redirect targets are built from in-app route refs and passed to react-router `navigate`, so there is no external open redirect. The touched files add no secrets, credentials or headers/config changes. The findings below are design-level and Low severity. None blocks Gate 3.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | Authz / info disclosure | plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts:374-403 | The "live entity holds this ref" check and the "claimed by more than one entity" count run with no permission filter. Only the final resolved entity is filtered. A user who can register an entity can set `former-refs: component:default/<guess>` and then call `by-former-name`: getting back their own entity means no hidden entity with that ref exists, and a 404 means one does. This is an existence oracle for refs the caller cannot read, which `by-name` does not provide (it returns 404 in both cases). Confidence: high on the mechanism; impact depends on how freely users can register entities. | Either document this as an accepted trade-off (counting unreadable claimants is also what stops hijacking), or apply the read-permission predicate to the live-entity lookup. Decide this deliberately before release. |
| Low | Integrity / redirect hijack | packages/catalog-model/src/entity/formerRefs.ts:48-97; plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts; plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts | Any entity can claim a former ref in any namespace of its own kind (only the kind is checked). When the original entity was deleted, or renamed without the annotation, an unrelated entity can claim the old ref. Old bookmarks and TechDocs links then redirect to it, though a notice is shown. The redirect stays inside the app. | Consider limiting claims to the entity's own namespace (or making cross-namespace claims opt-in), and state the trust assumption in `well-known-annotations.md`. |
| Info | Logging | plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts:400 | `logger.debug` interpolates `request.formerRef`, which is built from URL path params. That is minor log-injection surface at debug level. | Pass the ref as a structured field, e.g. `logger.debug('...', { formerRef })`. |
| Info | Audit | plugins/catalog-backend/src/service/createRouter.ts:462-469 | The audit event records the requested former ref but not the entity it resolved to, so audit consumers cannot see which entity was disclosed. | Optionally add the resolved `entityRef` to the success metadata. |
| Info | Resource use | plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts:214-218 | Each ref is capped at 255 characters, but the number of refs per entity is not capped, so one large annotation produces many index rows per stitch. | Optionally cap the number of former refs per entity (e.g. 100). |

## Passing checks
- PII (government_id / bank_account / salary_base, masking): n/a, not in the touched set.
- Audit-before-read: `auditor.createEvent` runs before `entityByFormerRef`; `success()` and `fail()` are recorded (createRouter.ts).
- Audit table append-only and auditor-only reads: n/a, no audit table touched. The new `former_entity_refs` table is an index, not an audit log.
- Route guard: the new route resolves credentials through `httpAuth.credentials(req)` and adds no `addAuthPolicy` / unauthenticated allowance; the OpenAPI `security` matches sibling entity routes.
- Role and relationship checks: the permission framework is applied through `AuthorizedEntitiesCatalog.entityByFormerRef` (DENY → null, CONDITIONAL → predicate filter); covered by `AuthorizedEntitiesCatalog.test.ts`.
- JWT secret / password hashing: n/a, not in the touched set.
- SQL injection: Knex `.where` / `batchInsert` with bound values only. The migration uses a cascading FK and a unique index.
- XSS: the former ref in `location.state` is rendered as a React text child through the translation API. It can only be set by in-app navigation, not by a URL.
- Open redirect: catalog targets come from `entityRoute(entityRouteParams(..., { encodeParams: true }))`, and TechDocs targets come from `buildTechDocsURL` plus the `rootDocsRouteRef` route ref. Both stay in-app through react-router. Redirects follow one hop only (guarded by `renamedFromEntityRef`).
- Secrets grep (`api_key|secret|password|token = '...'`) over the new and changed source and test files: no matches. Test fixtures contain no real credentials.
- Docs (`api.md`, `audit-events.md`, `well-known-annotations.md`, `FAQ.md`) and the six `.changeset/*.md` files contain no secrets or credentials in examples.
- `.env.example` / `.env` gitignore, Helmet, rate limiting, global error filter: n/a, not in the touched set. The new route reuses the existing `writeSingleEntityResponse` / NotFound error path.
- Dependency risk: no manifest or lockfile in the touched set, so it is unchanged and `npm audit` was not run.

## Required fixes before sign-off
- None blocking. The Low finding on the existence oracle in `DefaultEntitiesCatalog.ts` needs an explicit accept-or-fix decision at Gate 3.

Tool calls: 7
