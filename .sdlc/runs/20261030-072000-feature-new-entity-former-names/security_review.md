# Security Review — pass1

## Summary

Scope: the touched set listed in `provenance.json` (brownfield). The design holds on the
points that matter most: resolution runs through an ordinary permissioned `queryEntities`
with no service token or privilege bypass, the search key reaches SQL as a bound parameter
(`.where('search.key', key)` in `applyPredicateEntityFilterToQuery.ts`, no `knex.raw`), the
notice renders through React text interpolation with no `dangerouslySetInnerHTML`, the redirect
targets are built from route refs and can only yield in-app paths, no env key or runtime
dependency was added, and nothing secret is logged. Two issues break stated security
properties: the TechDocs call site never passes the already-fetched entity, so the
"live entity always wins" gate is absent there and live docs traffic can be captured; and the
two "independent structural gates" for `kind: User` are not independent — the write side gates
on the *claimant's* kind, not on the *ref's* kind, so a non-User entity does get a
`user:…` former-ref row indexed. Dependency check: no manifest or lockfile in the touched
set — recorded as unchanged, `npm audit` not re-run.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| High | Name-hijacking / live-entity gate missing | `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx:205` (hook at `useFormerRefRedirect.ts:39,55`) | The hook signature is `useFormerRefRedirect(entityRef, entity?)` and its only guard against resolving a live name is `if (entity) return undefined;`. The production call site passes **one** argument, so `entity` is always `undefined`: resolution runs on *every* TechDocs page view, including for entities that exist. `resolveFormerEntityRef` itself performs no "is this ref held by a live entity" check (by design — it documents that the caller must have missed first). Consequence: if any entity declares a live entity's ref as a former ref, visitors to the live entity's docs are redirected away to the claimant — traffic capture against a live name, which mitigation #2 is supposed to prevent. Also makes the extra catalog query unconditional rather than miss-only. | Pass the fetched entity (or an explicit existence check) at the call site; or move the "direct lookup missed" precondition inside the hook so the gate cannot be skipped by a caller omitting the argument. Make the parameter required. |
| Medium | Privacy / `User` exclusion not actually two gates | `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.ts:228` | The write-side gate is `if (entity.kind.toLowerCase() !== 'user')` — it tests the *claiming entity's* kind. A `Component` that declares `backstage.io/former-entity-refs: user:default/old-name` therefore **does** get the row `metadata.annotations.backstage.io/former-entity-refs.user:default/old-name` written to the `search` table. Read-side (`resolveFormerEntityRef.ts:72`, `formerEntityRefQuery.ts:42`) refuses `user:` refs, so no redirect happens; but the row is queryable through the ordinary filter API (`?filter=metadata.annotations.backstage.io/former-entity-refs.user:default/old-name`), giving a confirm-a-guessed-former-name oracle. Permissions still apply (confirmation requires read on the claiming entity, which also exposes the annotation verbatim), so this is not privilege escalation — but the documented "two independent structural gates" property does not hold. | In `buildEntitySearch`, also skip any parsed former ref whose own kind lowercases to `user`, not just entities whose kind is `user`. Consider dropping the `user:` entry in `parseFormerEntityRefs` so the exclusion is enforced once at the parse boundary. |
| Medium | Information disclosure boundary / ambiguity mitigation is viewer-relative | `packages/catalog-client/src/resolveFormerEntityRef.ts:80-99` | Both of the stated name-hijacking mitigations are evaluated **after** the permission filter, so they weaken per viewer. (a) Contest: `limit: 2` + `items.length === 1` detects ambiguity only among entities *this viewer can read*; if a hostile claim contests a ref whose other claimant the viewer cannot read, the viewer sees exactly one item and is redirected to the hostile entity. (b) Live holder: in `useEntityFromUrl.ts`, the miss that enables resolution is a permission-filtered 404 (`CatalogClient.requestOptional` maps the authz-filtered 404 to `undefined`), so for a viewer who lacks read on the real live holder the name looks unclaimed and the hijacker's claim resolves. Confidentiality is intact (no unreadable entity is revealed), but the anti-hijack guarantees are not. | Accept and document explicitly as a residual risk of the unpoliced-claim design, or resolve the contest/live-holder check server-side with a non-permissioned existence count whose result is only ever a boolean "ambiguous/claimed" (never an entity), so the gate is viewer-independent while still disclosing nothing. |
| Low | Silent truncation of long refs | `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.ts:158` (`MAX_KEY_LENGTH = 200`) | The key prefix is 53 chars, so any former ref longer than ~147 chars is silently dropped by `mapToRows` with no validation error and no row. The annotation appears accepted and the redirect simply never works. Not exploitable, but it is an undocumented failure mode that an adopter cannot debug. | Document the effective ref-length limit alongside the max-20 rule in `well-known-annotations.md`, or drop over-length refs in `parseFormerEntityRefs` so the behavior is visible at one place. |
| Low (advisory) | Repo hygiene | `.gitignore:193-195` | `.sdlc/` was added to `.gitignore`, but the run's artifacts under `.sdlc/runs/…` (logs, telemetry, briefs, packets) are already tracked at this branch HEAD; an ignore rule does not untrack them. They contain no credentials, but they ship repo-internal tooling output in the published history. | `git rm -r --cached .sdlc/` if the intent is for these never to be committed. |

## Passing checks

- No privileged call path: resolution uses the frontend `catalogApiRef` / caller-supplied `CatalogApi` only — no service token, no `AuthorizeResult` bypass, no admin credential anywhere in the touched set.
- Uniform failure: `resolveFormerEntityRef` returns the single opaque `{ status: 'unknown' }` for no-claimant, unreadable-claimant, contested, malformed-ref and network/backend error; no distinct message or error object escapes to the UI.
- No SQL injection via the predicate path: the synthetic key is passed as a knex bind parameter; `$not` / `$all` compile to parameterised subqueries.
- No key-space collision or spoofing: keys are always `<fixed prefix><canonical lowercase ref>`; a crafted value cannot escape the prefix into `metadata.*`, and `isValidAnnotationKey` forbids `:` in real annotation keys so the synthetic key space cannot be reached by a hand-authored annotation. Rows are scoped by `entity_id`, so one entity cannot forge another's claim. The existing duplicate-casing `InputError` cannot be triggered by these keys (they are already lowercase).
- Bounded write amplification: ≤20 rows per entity, de-duplicated, `>20` yields an empty list.
- Index-backed read: exact `(key, value)` equality, covered by `search_key_value_idx`; not a scan.
- No XSS/markup injection: `EntityRenamedNotice.tsx` type-checks `location.state.formerEntityRef` as a non-empty string and renders it as MUI/BUI text; the value itself is a canonical ref produced by `stringifyEntityRef`.
- No open redirect: targets are `entityRoute(...)` / `docsRoute(...)` outputs plus a suffix sliced from `location.pathname` and the current `search`/`hash`; every result begins with the route-ref path, so no external origin or protocol-relative `//` form is reachable.
- Case-variation bypass of the `user` check: `toLowerCase()` on both sides covers `User`/`USER`; entity kinds are ASCII-validated, so no Unicode lookalike reaches a kind comparison.
- No new env key, no secret in code or docs examples, nothing sensitive logged (resolution errors are swallowed; the only `errorApi.post` is the pre-existing `'No name provided!'`).
- No new runtime dependency: no `package.json`/`yarn.lock` in the touched set; `@backstage/filter-predicates`, `@backstage/ui`, `@remixicon/react` and `@backstage/catalog-client` were already declared in the consuming packages.
- Test files and fixtures contain no real credentials; docs changes contain no secrets.
- n/a — not in the touched set: PII fields (`government_id`, `bank_account`, `salary_base`), encryption at rest, audit-table append-only/role rules, password hashing, JWT secret, helmet, rate limiting, global error filter, `.env.example`.

## Required fixes before sign-off

- Pass the fetched entity to `useFormerRefRedirect` (or enforce the "direct lookup missed" precondition inside it) so a live TechDocs name cannot be captured by a former-ref claim — `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx:205`.
- Exclude former refs whose own kind is `user` on the write side, not only entities of kind `User` — `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.ts:228`.
- Decide and record: either make the live-holder/contest gates viewer-independent, or document in `well-known-annotations.md` that both gates are evaluated against the viewer's visible set — `packages/catalog-client/src/resolveFormerEntityRef.ts:80-99`.

Tool calls: 18

---

## Re-review after remediation (2026-10-30)

Re-reviewed by the orchestrator after the Gate 3 `revise` round and the Gate 4 `reject` round. Both
originally-blocking findings are **closed**; verification evidence is the item-8 combined check
(`CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`)
exiting **0**, plus `CI=true yarn test packages/catalog-model packages/catalog-client` exiting 0.

### HIGH — TechDocs live-entity gate — CLOSED (fixed structurally)

Was: `useFormerRefRedirect(entityRef, entity?)` carried its only live-holder guard on an optional
second parameter that the sole production call site never passed, so the guard was dead code — a
hostile descriptor could capture a live entity's docs traffic, and the resolution query fired on
every docs page view.

Now: the optional parameter is **removed**. The hook performs the direct lookup itself
(`catalogApi.getEntityByRef(entityRef)`) inside its own async body and returns early when an entity
is found, mirroring its sibling `useExternalRedirect`. The gate can no longer be omitted by a
caller, which is what was asked for in preference to call-site discipline.

Follow-up hardening from the Gate 4 round: a direct lookup that **throws** now also returns early
and does **not** fall through to resolution. A thrown lookup is not a proven miss (transient backend
error, network failure, permission error), so treating it as "absent" could have redirected a ref
that is in fact live.

Covered by tests asserting (a) a live entity holding the ref produces no navigation **and** no
resolution query — the second assertion is what proves the hot-path promise for the docs route — and
(b) a rejecting lookup produces neither.

### MEDIUM — `User` gates not independent — CLOSED

Was: `buildEntitySearch` gated only on the **claimant's** kind, so a `Component` declaring
`user:default/old-name` still had that synthetic row written and queryable through the ordinary
filter API — a confirm-a-guessed-former-username oracle.

Now: both directions are gated. The claimant-side skip is retained, and each **claimed ref** whose
kind lowercases to `user` is additionally skipped inside the loop, case-insensitively and without
introducing a throw on the stitching path. Covered by a test asserting a `Component` claiming
`user:default/old-name` produces no synthetic row for it, while a non-user former ref declared
alongside it is still indexed.

### MEDIUM — viewer-relative anti-hijack — ACCEPTED, NOT FIXED (by decision)

The live-entity and contested checks only consider entities the viewer may read, so a viewer who
cannot read the true holder of a name may be redirected by another entity's claim on it. Accepted
by the user as a deliberate trade: closing it would require a privileged lookup, and the absence of
any privileged path is what makes the confidentiality property hold. Confidentiality is unaffected;
only the anti-hijack guarantee degrades per viewer. **Now also documented for adopters** in
`docs/features/software-catalog/well-known-annotations.md`.

### LOW — silent drop of over-long refs — DOCUMENTED

Refs longer than roughly 147 characters exceed the 200-character search-key bound and are dropped
without a signal. No logger is in scope at that point in the stitcher, so adding one would have
required changing a function signature; the behaviour is instead documented for adopters in
`well-known-annotations.md`. Fail-closed semantics unchanged.

### LOW — `.gitignore` / tracked run artifacts — REVERSED BY DECISION

The `.sdlc/` entry added earlier in the run was **removed** at the user's instruction; `.gitignore`
is byte-identical to its pre-run state. No git index operation was performed by this run.

### Additional coverage added in the Gate 4 round

- **Permission enforcement against the real authorization path.** `AuthorizedEntitiesCatalog`'s
  `queryEntities` block now covers a former-ref query under both `DENY` and `CONDITIONAL`
  decisions, so AC-4 no longer rests on a mocked client alone.
- **The real predicate exercised against a real database.** A test now captures the query that
  `resolveFormerEntityRef` actually sends through a stub `CatalogApi` and runs that exact filter
  against the test database, closing the gap where the production predicate had never been
  exercised through the code path that uses it.
- **TechDocs rename notice.** `EntityRenamedNotice` now renders in the TechDocs reader content, with
  a jsdom test — FR-18 and AC-8 were genuinely unmet before this round.
- **Entity-page not-found flash.** `useEntityFromUrl` now holds `loading` through resolution and
  navigation, releasing it when resolution settles unresolved, with tests asserting the forbidden
  `{loading: false, no entity, no error}` state never occurs for a resolvable stale ref and that an
  unknown ref still releases loading.

No new finding was identified in the re-review. No new env key, credential, runtime dependency,
manifest or lockfile change was introduced at any point in this run.
