# Security Review — pass1

## Summary

The new `GET /entities/by-former-name/{kind}/{namespace}/{name}` endpoint is sound on authorization. It goes through `AuthorizedEntitiesCatalog`, checks `catalogEntityReadPermission` on the target, and uses parameterized SQL. Frontend redirects stay inside the app, and the touched set has no secrets and no manifest changes. One Medium finding needs a fix: the `backstage.io/former-names` parser has no cap on entries, so a small annotation can inflate the stitched entity and the claim table. Three Low findings do not block. The cross-namespace claim risk was accepted at Gate 1, and its agreed mitigations are in place. This review is from reading the code, so nothing was exercised, and database tests ran on SQLite only.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Medium | Surface (resource exhaustion) | `packages/catalog-model/src/entity/formerNames.ts:56-59`, `plugins/catalog-backend/src/database/operations/formerRefs/formerEntityRefs.ts:127`, `plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts:165` | The entry count is unlimited and problems are not deduplicated. Annotation values are only checked to be strings, and a grep of `plugins/catalog-backend/src` found no entity size cap. Each `,` adds one "it is empty" problem, which becomes a status item of roughly 190 bytes, so a 100 KB annotation stitches about 19 MB into `final_entity`, served to every reader of that entity. Short valid entries instead add about one `former_entity_refs` row per few bytes, plus the matching contested lookups on each processing pass and stitch. Rejected entries are also echoed in full, twice per item. Anyone who can register a location can do this. Confidence: high that no cap exists, medium on impact, since an upstream reader or proxy limit could reduce it. | Cap the entries parsed (for example 100) and report the excess as one problem. Collapse empty entries into one problem and truncate `entry` in messages. Add tests for both. |
| Low | Audit log integrity | `plugins/catalog-backend/src/service/createRouter.ts:518-520` | `auditorEvent.success()` runs before the `!currentRef` check, and the `NotFoundError` is thrown inside the `try`. A 404, including a target the caller may not read, therefore logs `initiated`, `succeeded` and `failed` for one request. A success also omits the resolved ref, so the log cannot show where a former name led, which matters for investigating a false claim (see Info row). `createRouter.test.ts:619` covers the success call only. Confidence: high. | Move `success()` after the check, pass `meta: { currentEntityRef: currentRef }`, and add a test that a 404 logs `fail` only. |
| Low | Authz (information disclosure) | `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts:800`, `plugins/catalog-backend/src/database/operations/formerRefs/formerEntityRefs.ts:130-134` | The live-entity and contested checks count all entities, while authorization covers only the target. A caller who owns a readable claimant can list any ref of that kind in the annotation, then read 200 versus 404 to learn whether a hidden entity sits at that ref. The contested warning likewise reveals that a hidden entity claims the same name. This contradicts "These cases cannot be told apart" in `docs/features/software-catalog/api.md`. It needs location registration rights and exposes existence only. Confidence: high. | Accept and document this in the trust model, and narrow the `api.md` sentence. Removing it would need permission-aware checks, which would reintroduce redirects that hide real entities. |
| Low | Input validation | `packages/catalog-model/src/entity/formerNames.ts:21` | `ENTRY_PATTERN` and `parseEntityRef` accept control characters, including NUL, because `\s` does not match it and names are not validated against the entity name rules. On PostgreSQL a NUL in `former_entity_ref` should fail the insert and so the whole `updateProcessedEntity` transaction, leaving that entity unable to update. The impact is limited to the entity declaring it. Confidence: medium, not run because database tests were SQLite only. | Reject entries containing control characters, or validate kind, namespace and name with the existing catalog-model validators, and report them as a normal problem. |
| Info (accepted at Gate 1, not blocking) | Authz (trust model) | `packages/catalog-model/src/entity/formerNames.ts`, `docs/features/software-catalog/well-known-annotations.md` | Anyone who can register a location can claim a retired name in any namespace, so old entity and TechDocs links can lead to content they authored, and can block a real redirect by contesting it. The agreed mitigations are all present: live entity wins, contested means no redirect, kind must match, a notice is shown, and the docs state the trust model. | No change for this run. The Low audit fix above makes false claims traceable. |

## Passing checks

- Route guard: the new route sits in the existing router with credentials from `httpAuth`, and its OpenAPI `security` block matches the `by-name` route.
- Authorization: `CatalogBuilder.ts:446,539` passes `AuthorizedEntitiesCatalog` to the router. DENY and CONDITIONAL are both honored through `entitiesBatch`, using the caller's credentials.
- Uniform response: unknown, in use, contested and unreadable all return the same 404 message.
- SQL injection: lookups are parameterized, and the one `whereRaw` is a static string.
- `catalogService` forwards credentials through `#getOptions`.
- Redirects: `to` always starts with the output of `routeFunc`, so there is no open redirect. Entity refs come from the backend and the remaining parts come from the current location.
- XSS: `entityRenamedFrom` is type-checked and rendered as React text. Status messages are plain strings.
- Audit timing: `createEvent` writes `initiated` before the read. Actor and request details come from the shared auditor service. The change adds no audit table or mutation path.
- Migration: `former_entity_refs` holds refs only and cascades on delete from `refresh_state`.
- `ENTRY_PATTERN` has no catastrophic backtracking, because its character classes exclude the delimiters.
- Secrets: a scan of all 185 touched files found only `const token = 'fake-token'` in `packages/catalog-client/src/CatalogClient.test.ts:30`, which is not a real credential. Docs and changesets have none.
- Dependencies: unchanged, no manifest or lockfile in the touched set, so `npm audit` was not run.
- n/a, not in the touched set: PII field encryption and masking, roles and `reports_to`, JWT secret, password storage, `.env` handling, Helmet, auth endpoint rate limiting, global error filter. The new route throws through the existing error handling, like its siblings.

## Noted (pre-existing, out of scope)

- `GET /entities/by-name/:kind/:namespace/:name` (`createRouter.ts:442-448`) also calls `success()` before its not-found handling, so it likely double-logs 404s too. The `writeSingleEntityResponse` helper was not opened to confirm this.

## Required fixes before sign-off

- Cap former-name entries, collapse empty entries and truncate echoed entries (Medium finding, `packages/catalog-model/src/entity/formerNames.ts`).
- The Low findings do not block. The audit fix in `plugins/catalog-backend/src/service/createRouter.ts` is small and worth taking in the same pass.

Tool calls: 10
