# Security Review — pass2

## Summary

All four pass 1 findings are closed: M1, L1, L2 and L3. The fixes introduced no new problem, and nothing blocks sign-off. This was a narrow re-check of the named files and the code they call, not a new review of the change. Sizes below are calculated from the code, not measured. Database tests ran on SQLite only, so all PostgreSQL behaviour here comes from reading the code. Two non-blocking NUL gaps remain, both on PostgreSQL. A NUL can still reach the `search` table through the raw annotation (pre-existing). A NUL in the new route's URL reaches its lookup.

## Pass 1 finding status

| Finding | Status | Evidence | Remaining limit |
|---|---|---|---|
| M1 (Medium), unbounded status and index growth | **Closed** | `parseEntityFormerRefs` reads the first 100 comma-separated parts, whatever the annotation's size. Each part gives at most one ref or one problem, and problems are deduplicated. Echoed entries stop at 64 characters plus `...`. All three callers use this output: `getFormerRefStatusItems` (`performStitching.ts:166`), the hash step (`DefaultCatalogProcessingEngine.ts:245`) and the row sync (`DefaultProcessingDatabase.ts:147-150`). | See worst case below. The bound is per entity, so totals still grow with the number of entities, as for any catalog row. The annotation is still stored at its own size, with no amplification. |
| L1 (Low), audit log on 404 | **Closed** | `success()` now runs after the `!currentRef` check (`createRouter.ts:518-526`), so a 404 logs `initiated` then `failed` only. A success records `meta.currentEntityRef`, and `DefaultAuditorService` merges it with `entityRef` and `queryType`, so those stay on the record. Tests assert both paths, and `audit-events.md:19` documents the field. | See "What recording the ref exposes" below. |
| L2 (Low), existence disclosure in `api.md` | **Closed** (accepted behaviour, docs corrected) | The text matches the code. The 404 body is built only from request params, the 200 versus 404 signal works as described, and the contested warning names no other entity. The old "cannot be told apart" claim is gone. A grep found no similar claim in `life-of-an-entity.md`, `FAQ.md`, `openapi.yaml`, `catalog-client/src/types/api.ts` or `catalog/types.ts`. | Two imprecisions, both overstating the leak, so no change is needed. A 404 alone can also mean contested, though the reader can separate that using the warning. Registering a claimant only helps someone who can also read it. Advisory: pass 1 also asked to document this in the trust model, and the `Permissions` bullet in `well-known-annotations.md` is true but does not mention it. A one-line link to `api.md` would close that. |
| L3 (Low), control characters | **Closed** | The `\p{Cc}` check (C0, DEL and C1) runs before the pattern and parse steps. The rejected entry never reaches `formerRefs`. `syncFormerEntityRefs` is the only writer of `former_entity_refs`, and it receives only parser output. Problem entries have control characters replaced with `?`, and contested messages use only refs that passed the check. The regex has no `g` flag, so it holds no state between tests. | Parser-level test only. Closing this does not depend on PostgreSQL, because the NUL no longer reaches this insert. The raw annotation is a separate path: see Noted. |
| Info, cross-namespace claim risk | **Unchanged** (accepted at Gate 1) | The mitigations are as pass 1 recorded. The L1 fix delivers the traceability pass 1 pointed to. | None. |

### M1 worst case

| Measure | Bound per entity |
|---|---|
| `former_entity_refs` rows | 100, with one primary key entry and one secondary index entry each |
| `former_entity_ref` value | 255 characters, checked after normalization, which fits the `varchar(255)` column |
| Former-ref data | About 25.5 KB ASCII, 76.5 KB at 3 bytes per character, before `entity_ref` and index overhead |
| Status items added | 101: 100 from the entries, plus one overflow item |
| Contested lookups | One query per pass and per stitch, since 100 refs fit the 200 batch size |
| Insert batches | 2 at most, with a batch size of 50 |

The largest status payload is 100 contested items of 255 characters each plus the overflow item, because contested refs are not truncated to 64 characters.

| Scenario | ASCII | Multi-byte (3 bytes per character) |
|---|---|---|
| All contested, needs a second claiming entity | About 79 KB (786 bytes per item) | About 174 KB (1,734 bytes per item) |
| All rejected, one entity is enough | About 42 KB (412 bytes per item) | About 67 KB (668 bytes per item) |

Pass 1 measured about 19 MB from a 100 KB annotation, with no upper limit. The ceiling now holds for any annotation value.

### What recording the ref exposes

- **Caller:** nothing. The audit record is not returned, and the response already holds this ref.
- **Unreadable targets:** `currentEntityRef` is written only after `AuthorizedEntitiesCatalog` has confirmed the caller may read the target. A 404 never records it, so a hidden target's ref stays out of the log.
- **Audit log readers:** they now see a lasting link from actor and former name to current entity. It is a ref, the same kind of data `by-name` already logs, but they may see refs they could not read in the catalog.
- **Personal names:** if someone records a person's past name on a `User` or `Group` despite the `Privacy` rule in `well-known-annotations.md`, each lookup keeps that old-to-new link in the audit log for as long as logs are retained, even after the annotation is removed. Operators with retention limits should know this. `audit-events.md` documents the field but not this consequence.
- **Investigation limit:** a 404 record does not say why it failed, so the log cannot separate an unknown name from an unreadable target.

## Findings

No finding from the fixes. One new observation on the same route, which the fixes did not cause.

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Info (not blocking) | Input validation | `plugins/catalog-backend/src/service/createRouter.ts:498-516`, `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts:793-810` | The L3 fix covers the annotation, not the URL. `GET /entities/by-former-name/k/ns/a%00b` passes a NUL to the `.where` lookup, which on PostgreSQL should raise an error and return a 500 instead of the uniform 404. It reveals nothing about entities, and `by-name` likely behaves the same. Confidence: medium, not run, and the OpenAPI validator was not checked. | Optional: return the normal not-found result when the ref holds a control character. |

## Passing checks

- New problems from the fixes: none. Dedup by truncated entry can merge two long entries into one warning, which is harmless and reduces output.
- Multi-line annotations still parse, because `trim()` removes surrounding newlines before the control check.
- Truncation can split a surrogate pair in a problem entry. `JSON.stringify` escapes it and `final_entity` is a text column, so this is cosmetic.
- `\p{Cc}` does not cover format characters such as U+202E. They do not affect the database, and status messages render as React text.
- `ENTRY_PATTERN` is unchanged, and the pass 1 backtracking result stands.
- Dependencies: no manifest or lockfile was reviewed in this pass, and pass 1 found none in the touched set.
- n/a, not in the touched set: PII fields, roles, JWT, password storage, `.env`, Helmet, auth rate limiting.

## Noted (pre-existing, out of scope)

- A NUL in any annotation value of 200 characters or fewer is written unchanged to `search.value` and `search.original_value` (`buildEntitySearch.ts:158-164`, then `syncSearchRows` at `performStitching.ts:311`). `isValidAnnotationValue` only checks that the value is a string, and this run did not change `buildEntitySearch.ts`. So a `backstage.io/former-names` value holding a NUL can no longer fail `former_entity_refs`, but it should still fail stitching for that entity on PostgreSQL, as any other annotation would. Impact is limited to the declaring entity. Confidence: medium, not run on PostgreSQL.
- `GET /entities/by-name/:kind/:namespace/:name` double logging, from pass 1, was not rechecked.

## Required fixes before sign-off

- None. The audit log note, the trust-model link and the Info row are optional.

Tool calls: 7
