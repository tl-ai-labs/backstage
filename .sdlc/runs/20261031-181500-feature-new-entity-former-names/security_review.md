# Security Review — pass1

Scope: brownfield, 79 touched files from `provenance.json`, diffed against `f20fd9b59828`. Source files and new files were read in full. Edited tests, API reports and generated clients, and the tail of the `how-to-guides.md` diff, were checked by credential grep, not line by line. Generated `router.ts` and `Api.*.ts` were checked for the new route's security block.

## Summary

The read path is sound. `GET /entities/by-former-name` goes through `AuthorizedEntitiesCatalog` with conditional decisions, every miss gives the same 404, and redirects stay inside the app. The weak spot is claim ownership. A claim is checked against a live holder only when it is first recorded, so an author can claim a name before it exists and take it when the real owner renames it. Nothing proves an author ever owned a dead ref. The audit event also names only the former ref, not the entity actually returned. No Critical or High findings. Three Medium findings need a decision or a fix.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Medium | Authz (claim integrity) | `plugins/catalog-backend/src/database/operations/formerEntityRefs/syncFormerEntityRefClaims.ts:80` | The holder check runs for `newRefs` only. An author claims `component:default/foo` before it exists, and the row is stored with `rejected_at` null. The real owner later registers `foo`, so the claim goes inactive with no error. When the owner renames `foo` and declares it, the attacker's older claim wins on earliest-recorded, and the redirect goes to the attacker's entity. This defeats the brief's aim (C-3, D2) that an entity cannot take over another's name when it disappears. Evidence is the code path plus the "takes effect again" rule in C-5. Confidence high. | On each sync, check live holders for all declared refs that are not rejected, and set `rejected_at` when the holder has a different location key. This changes C-5 and the "existing rows are never updated" contract, so the person must decide. Add a test for the pre-claim sequence. |
| Medium | Authz (claim integrity) | `plugins/catalog-backend/src/database/operations/formerEntityRefs/resolveFormerEntityRef.ts:45`; `plugins/catalog-backend/src/processing/formerEntityRefs.ts` | Any author can claim any dead ref of the same kind, in any namespace, with no proof of past ownership. Bookmarks and runbook links to a removed service then open the attacker's entity and TechDocs, under a notice saying the entity "was renamed from" the old ref, which lends it credibility. The real owner gets only a "lost" error, and operators have no way to turn the feature off or restrict it. Spoofing an owner this way grants no permissions, because former refs are not used for relations or ownership. | Decide: accept this and state the trust model in `life-of-an-entity.md`, or restrict it, for example with a config flag or allow-list, or by recording the location key of removed entities so that only the same source can claim. |
| Medium | Audit integrity | `plugins/catalog-backend/src/service/createRouter.ts:477` | The audit event records only the requested former ref. The entity actually returned is never logged, so "who read entity X" misses every read through this route. `by-name` gets away with this because the requested ref is the returned entity; `by-uid` already logs the resolved refs on success. FR-13 was followed literally, but the rename makes the target differ. | Call `success` after the response and include the returned entity's ref in `meta`, as `by-uid` does. Assert it in `createRouter.test.ts`. |
| Low | Audit integrity | `plugins/catalog-backend/src/service/createRouter.ts:477` | `success()` runs before `writeSingleEntityResponse`, which throws `NotFoundError` on a miss, so a miss logs both success and failure. That includes a permission denial. This is copied from `by-name`, which has the same behaviour. The new test covers only the hit path. | Fixed by the reorder above. Assert `success` is not called on a miss. |
| Low | Resource use | `plugins/catalog-backend/src/processing/formerEntityRefs.ts:69` | The number of refs in the annotation is uncapped, and each invalid piece echoes its raw `trimmed` value into an error (line 81). One entity can stake many claims in one edit and fill its own status with errors. A very large list could exceed bind limits in the `whereIn`, but that would hurt only that entity. I did not check whether entity size limits apply elsewhere. | Cap refs per annotation, reporting the excess as a processing error, and truncate the echoed value. |

## Passing checks

- Route guard: the new route uses `httpAuth.credentials`, the default auth policy applies, and the OpenAPI `security` block matches `by-name`.
- Authorization: `authorizeConditional` handles DENY, CONDITIONAL and ALLOW; the filter reaches the `final_entities` query in `entitiesBatch`; `CatalogBuilder` wraps the catalog in `AuthorizedEntitiesCatalog`.
- No existence oracle over HTTP: a ref held by a live entity, a denied read and an unclaimed ref all give the same 404, so a hidden live entity is not revealed.
- Claim cleanup is scoped by `claimant_entity_id`, so one entity cannot delete another's claims.
- SQL: all new queries use Knex bindings, and refs are validated per segment before storage.
- Redirects: targets come from `entityRoute` or `viewTechdocLink` with server-returned entities, so they are in-app paths and no open redirect exists; `formerEntityRef` from `location.state` is type-checked and rendered as React text.
- Token handling: `CatalogClient`, `DefaultCatalogService` and the contrib read-write split forward credentials like their `getEntityByRef` neighbours.
- Audit timing: `createEvent` runs before the read.
- Secrets: the checklist regex finds nothing in touched source; fixtures use `mockCredentials` only; doc examples hold no secrets; `.gitignore` adds `.sdlc/`.
- Global error handling: the 404 reflects only the normalized ref through the standard JSON error path.
- PII encryption, role masking, audit-table mutation, JWT secret, password storage, helmet, rate limiting: n/a — not in the touched set.
- Dependencies: no manifest or lockfile in the touched set, so unchanged; `npm audit` not run.

## Required fixes before sign-off

- `plugins/catalog-backend/src/database/operations/formerEntityRefs/syncFormerEntityRefClaims.ts`: close the pre-claim takeover, or record an explicit decision to accept it.
- `plugins/catalog-backend/src/database/operations/formerEntityRefs/resolveFormerEntityRef.ts`: accept and document the dead-ref claim trust model, or restrict who can claim.
- `plugins/catalog-backend/src/service/createRouter.ts`: log the returned entity's ref on success and stop logging success on a miss.

Tool calls: 10
