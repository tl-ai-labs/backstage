# Requirements — feature-new — Entity former names with link redirects

- **Run** `20261030-072000-feature-new-entity-former-names`
- **Intent** `feature-new`
- **Source brief** `.sdlc/runs/20261030-072000-feature-new-entity-former-names/intent_brief.md`
- **Baseline** HEAD `f20fd9b598285c88401406b3812fe00d7708136c`, clean tree

## In scope

1. A declarative way for an entity to record the refs it was previously known by, expressed in the
   entity descriptor and validated by the existing catalog-model rules.
2. Catalog-backend indexing of those former refs so a former ref can be resolved to the entity that
   now claims it, without changing the schema or cost of the existing `entity_ref` lookup.
3. Conflict resolution guaranteeing that a live entity holding a name always wins over a former-name
   record claiming the same name.
4. Permission-equivalent resolution: resolving a former ref reveals nothing the caller could not
   already learn by reading the target entity directly.
5. A frontend redirect from a stale entity-page URL to the renamed entity, with a visible notice
   naming the former ref, reaching **both** the legacy and the new frontend system.
6. The equivalent redirect for a stale TechDocs reader URL, in both frontend systems.
7. Documentation of the new declaration in the catalog docs, and changeset coverage for every
   published package changed.

## Out of scope

1. Redirects for any plugin other than `catalog` and `techdocs` (search, scaffolder, api-docs).
2. Automatic rename detection; bulk rewriting of existing links; any UI for administering rename
   history.
3. Any change to entity naming rules, ref parsing/validation, or the ref string format itself.
4. Any change to `getEntityByRef` / `getEntitiesByRefs` *semantics* for refs that resolve normally.
5. A full-suite test run, `yarn build`, `yarn changesets version`, `yarn release`, and any commit,
   push or pull request.
6. Migrating `plugins/catalog-node` or any consumer outside the frozen allowlist (see CON-1).

## Constraints that bound the design

These are established facts from this run's investigation, not preferences. They narrow the design
space before the architect starts, and two of them can invalidate an otherwise reasonable design.

- **CON-1 — `CatalogApi` cannot gain a required method under this run's write contract.**
  `CatalogApi` (`packages/catalog-client/src/types/api.ts`) is mirrored method-for-method by
  `CatalogService` and re-declared in full by `CatalogServiceMock`, both in
  `plugins/catalog-node/**`, which is **not** in the allowlist; `plugins/catalog-import/dev/index.tsx:184`
  casts an object literal directly `as CatalogApi` and would also fail. Since `yarn tsc` at the repo
  root is an acceptance criterion, a new **required** interface method would break the run on files it
  may not touch.
  **Resolved at Gate 1: option (a) — no new interface member at all**, required or optional.
  Resolution rides the existing filter-capable endpoints. `CatalogApi`, `CatalogService` and
  `CatalogServiceMock` are not to be edited, and scope is not to be widened.
- **CON-2 — annotation values are strings only.** `EntityMeta.schema.json` constrains annotation
  values to `type: string` and `KubernetesValidatorFunctions.isValidAnnotationValue` accepts only a
  string, so a multi-valued former-name list must either encode into one string or not be an
  annotation. Annotation *keys* are unconstrained in the schema (`additionalProperties: true`) and
  need only satisfy `isValidAnnotationKey` (DNS-subdomain prefix, `[A-Za-z0-9][-A-Za-z0-9_.]*`
  suffix ≤ 63 chars), so `backstage.io/<name>` is valid by construction.
  **Resolved at Gate 1: one annotation holding a delimited list** of refs. The architect picks and
  states the delimiter and the escaping/validation rule explicitly; a comma is the repo's precedent
  for delimited annotation values. Surrounding whitespace per entry is tolerated.
- **CON-3 — a new catalog route is expensive.** `createRouter` is an OpenAPI-validated router
  (`createOpenApiRouter`); routes are declared in the hand-edited
  `plugins/catalog-backend/src/schema/openapi.yaml` and enforced in tests via `wrapServer`. Adding a
  route requires regenerating `src/schema/openapi/generated/**` *and* the client, via the plugin's
  `generate` script — a tooling step. Reusing an existing route avoids this entirely.
- **CON-4 — one stitching choke point.** `final_entities` is written only by `performStitching`
  (`src/database/operations/stitcher/performStitching.ts`). Any per-entity index must be written
  inside that same `knex.transaction` block, immediately after `syncSearchRows` (L307); writing it
  anywhere else inherits a documented permanent-staleness bug, because the next stitch reads back the
  hash just written and returns `unchanged`.
- **CON-5 — the annotation is already indexed.** `buildEntitySearch` flattens entity metadata into
  the `search` table as `(entity_id, key, value)` rows with a unique index on `(entity_id, key, value)`
  and an index on `(key, value, entity_id)`. Annotations are therefore already queryable through the
  existing `FilterPredicate` path (`$all/$any/$not/$exists/$in/$contains/$hasPrefix`) with no schema
  change, and `applyEntityFilterToQuery` compiles a predicate to a correlated `EXISTS` over `search`.
- **CON-6 — `entityRouteRef` is one object shared by both frontend systems.** It is a
  `getOrCreateGlobalSingleton('catalog:entity-route-ref')` in `plugins/catalog-react/src/routes.ts`,
  and alpha reuses it through `convertLegacyRouteRef` (`plugins/catalog/src/alpha/pages.tsx:204`).
  `useEntityFromUrl` (`plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts`) is
  likewise imported by alpha across the boundary. So logic placed in the **hook** reaches both
  systems; logic placed in a **component** does not — legacy renders
  `components/EntityLayout/EntityLayout.tsx`, alpha renders
  `alpha/components/EntityLayout/{EntityLayout,EntityLayoutBui}.tsx`. There are two separate
  not-found decision sites, and a correct change covers both.
- **CON-7 — TechDocs never resolves the entity on the reader path.** A stale docs URL today yields
  `CONTENT_NOT_FOUND` from storage, indistinguishable from "docs not built". The existing precedent
  for a docs redirect is `useExternalRedirect`
  (`src/reader/components/TechDocsReaderPage/useExternalRedirect.ts`), which navigates with
  `{ replace: true }` and guards against remount flicker with a `checkedEntityRef` ref.
- **CON-8 — `EntityNotFound` is not the production not-found UI.** It has no render site and is
  absent from both catalog report files; the UI users actually see is the inline `WarningPanel` in
  legacy `EntityLayout` and an `@backstage/ui` `Alert` in alpha `EntityLayoutBui`. Exporting
  `EntityNotFound` would be a *new* public-API line.
  **Resolved at Gate 1: do not export or revive `EntityNotFound`.** The two real not-found sites are
  the `WarningPanel` at `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx:391` (legacy)
  and the `Alert` at `plugins/catalog/src/alpha/components/EntityLayout/EntityLayout.tsx:110` (alpha);
  the change targets those.
- **CON-9 — `zod` namespace is per layer.** `zod/v3` in `plugins/catalog-backend` (router, request
  parsers, permission rules; with `zod-validation-error/v3`); `zod/v4` in all new-frontend `alpha`
  source. Test files in the frontend packages import bare `zod`.
- **CON-10 — catalog-backend imposes its own DB workflow.** `plugins/catalog-backend/CLAUDE.md`
  requires `/catalog-db-performance` before and after a change to queries, indexes or schema, and
  updates to `src/tests/performance/query-battery/queries.md` when a query shape changes. A design
  that adds no query shape and no index avoids this obligation.

## Functional requirements per module

### `packages/catalog-model` — the declaration

- **FR-1** Declare a well-known former-names annotation constant alongside the existing
  `ANNOTATION_*` constants, exported from the package's public API, with its key satisfying
  `isValidAnnotationKey` and its value a string per CON-2.
- **FR-2** Register the annotation in the alpha model layer `wellKnownAnnotationsModel`
  (`src/kinds/annotations.ts`) with a description, as every other non-deprecated well-known
  annotation is registered.
- **FR-3** Provide a single exported helper that parses the annotation's **delimited** string value
  into a normalized, de-duplicated, order-stable list of full entity refs, applying the same
  defaulting rules as `parseEntityRef` and canonicalizing through `stringifyEntityRef` (which is the
  only lowercasing function in the package). It MUST tolerate whitespace around each entry, and it
  MUST **fail closed**: a malformed value or entry yields no resolution candidate and never throws on
  the lookup or render path. One entity may declare several former refs, so an entity renamed twice,
  or renamed *and* moved to another namespace, keeps every old link working.

### `plugins/catalog-backend` — index, resolve, conflict

- **FR-4** Resolve a candidate former ref to at most one live entity, using the existing
  `search`-backed filter path per CON-5 unless the architect justifies otherwise.
- **FR-5** A live entity whose own ref equals the requested ref MUST always win: resolution is only
  attempted when no live entity holds the requested ref, and a former-name claim never shadows,
  replaces or reorders a direct hit.
- **FR-6** When two or more live entities claim the same former ref, resolution MUST be treated as
  ambiguous and resolve to nothing, rather than picking arbitrarily.
- **FR-7** An entity MUST NOT be able to claim a former ref that a live entity currently holds; such
  a claim is inert for resolution purposes.
- **FR-8** Resolution MUST apply exactly the permission filtering the existing read path applies, so
  a caller who may not read the target gets the same answer as for a ref that does not exist.
- **FR-9** Resolution MUST NOT alter the result, ordering, nullability or positional alignment of
  existing `entities`, `entitiesBatch`, `queryEntities` or `facets` responses for any ref that
  already resolves.

### `packages/catalog-client` — the lookup

- **FR-10** Expose the "what does this possibly-former ref resolve to now" lookup **without adding
  any member to `CatalogApi`** (CON-1, resolved at Gate 1): it is composed from the existing
  filter-capable endpoints, so every existing implementation and mock keeps compiling untouched. The
  result must distinguish *resolved to a different ref* from *unknown*, and must not fabricate an
  entity for an unknown ref.
- **FR-11** `CatalogApi`, `CatalogClient`, `CatalogService`, `CatalogServiceMock` and
  `InMemoryCatalogClient` MUST remain source-compatible: no member added, removed or re-typed. Any
  reusable query helper the frontend needs is a plain exported function, not an interface member. If
  the architecture cannot meet FR-10 under this restriction, stop and report at Gate 2 rather than
  widening the interface.

### `plugins/catalog` + `plugins/catalog-react` — entity-page redirect

- **FR-12** When a well-formed entity URL resolves to no entity, attempt former-ref resolution and,
  on success, navigate to the current entity's URL with `{ replace: true }`, **preserving the
  sub-path** — `/catalog/default/component/old-name/docs` MUST land on
  `/catalog/default/component/new-name/docs` — and preserving the query string and fragment where
  that falls out naturally. A link into a specific tab keeps working; that is the point of the
  feature.
- **FR-13** Display a notice on arrival stating the entity was renamed and naming the former ref.
- **FR-14** The redirect MUST reach both frontend systems. Per CON-6 the resolution logic belongs in
  the **hook path** (`useEntityFromUrl`), which alpha imports across the boundary via the
  `catalog:entity-route-ref` global singleton, so one implementation serves both. The *notice* still
  has to render at each of the two not-found sites named in CON-8, so AC-6 and AC-7 assert it
  independently per system: a hook-only test would not prove the notice renders in both. A change
  landing in only one system is a defect, not a partial success.
- **FR-15** An unknown ref MUST still end on the existing not-found UI. No redirect loop: the
  destination must never itself re-trigger resolution for the same ref.
- **FR-16** Resolution MUST NOT delay the common case; a URL that resolves normally must issue no
  additional request.

### `plugins/techdocs` — docs redirect

- **FR-17** When a docs reader URL's entity ref does not exist, attempt former-ref resolution and
  navigate to the renamed entity's docs URL with `{ replace: true }`, **preserving the sub-path**
  within the docs site (and query/fragment where natural), following the `useExternalRedirect`
  precedent including its stale-ref guard (CON-7).
- **FR-18** Show the same renamed notice, and leave genuine "docs not built" (`CONTENT_NOT_FOUND`
  for an entity that *does* exist) behaviour unchanged.

### Cross-cutting — privacy

- **FR-22** Former-name resolution MUST refuse `kind: User` **structurally**, not by documentation:
  a former-name claim naming a User entity never resolves, and a User entity's own former-name
  declaration never produces a redirect. Rationale: a former user name can disclose a legal name
  change (marriage, gender transition) to everyone permitted to read the entity, which the PII
  inventory rates **High**. The exclusion is enforced in the resolution path so that no adopter
  misconfiguration, and no later caller, can re-enable it. Documenting the privacy reasoning
  (FR-19) is **in addition to** the structural exclusion, never instead of it.

### Docs and release

- **FR-19** Document the annotation in `docs/features/software-catalog/well-known-annotations.md`
  and, if the design is annotation-driven, in `descriptor-format.md`, per the doc style guide.
- **FR-20** Add changeset(s) under `.changeset/` covering every published package changed, in
  adopter-facing language with no internal code symbols, at the correct bump level (`minor` for a
  new feature at >= 1.0.0). Written by hand; the changeset CLI is forbidden.
- **FR-21** Add a `.sdlc/` entry to `.gitignore` (approved at Gate 0).

## Non-functional requirements

- **NFR-1 — hot path untouched.** Ordinary `getEntityByRef` / `entitiesBatch` lookups must add no
  SQL, no extra round trip and no extra index maintenance on the success path. A former-ref lookup
  is permitted only after a miss.
- **NFR-2 — index-backed resolution.** Former-ref resolution must be an index-backed lookup, not a
  scan over entities or a JSON scan over `final_entity`.
- **NFR-3 — no new migration.** Decided at Gate 1: former-name resolution rides the existing
  `search` table indexes (CON-5) as a second conditional query. **If the architecture starts to need
  a migration, stop and report it at Gate 2 rather than introducing one silently** — it would also
  pull in the `/catalog-db-performance` obligation (CON-10). If a table is ever approved, it must be
  a timestamped CJS migration under `plugins/catalog-backend/migrations/` with `// @ts-check`, the
  `/** @param {import('knex').Knex} knex */` JSDoc, named `async function up/down`, a working `down`,
  passing on both Postgres and SQLite, FK'd to `final_entities(entity_id) ON DELETE CASCADE`, and
  written inside the `performStitching` transaction per CON-4.
- **NFR-4 — no information leak.** The redirect must not disclose the existence, name or location of
  an entity the viewer may not read, including via timing-insensitive channels such as a distinct
  error message or a redirect to a URL the viewer cannot load.
- **NFR-5 — bounded claims.** The number of former refs one entity may claim must be bounded so the
  annotation cannot be used to flood the index.
- **NFR-6 — style parity.** Backend `zod/v3`, alpha `zod/v4` (CON-9); legacy UI
  `@material-ui/core` deep default imports, alpha UI `@backstage/ui` named imports (`status=` not
  `severity=`); Apache 2.0 header dated 2026 on new files only.
- **NFR-7 — public API reports regenerated.** `yarn build:api-reports` must leave no diff.
- **NFR-8 — tests follow repo convention.** Fewer, thorough, multi-assertion tests; RTL via `screen`
  and `findBy*`; no test IDs added to implementations; `mountedRoutes` for route-ref binding, with
  `convertLegacyRouteRef` in alpha tests.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Entity ref (kind/namespace/name) of a non-User entity | Low — already public to any reader of the entity | Existing catalog read permission; no new exposure |
| **Former ref of a `User` entity** | **High** — a previous user name can disclose a legal name change (marriage, gender transition) to everyone who can read the entity | **Eliminated structurally (FR-22):** `kind: User` is excluded from former-name resolution entirely, so no User former name is ever resolved or surfaced by this feature. The docs additionally warn against recording personal former names (FR-19). Asserted by AC-17 |
| Former ref of an entity the viewer may not read | Medium — existence/location disclosure | FR-8, NFR-4: same answer as a non-existent ref |
| Rename notice text rendered in the browser | Low | Contains only the former ref the viewer already supplied in the URL, plus the target the viewer is permitted to read |

No new credential, token or secret is introduced; no new env key is read (so the Phase 7 env mini-gate is not expected to fire).

## Role matrix

| Role | Resource | Action | Outcome |
|---|---|---|---|
| Unauthenticated / unauthorized viewer | former ref → entity they may not read | resolve | Indistinguishable from unknown ref (FR-8, NFR-4) |
| Authenticated viewer, permitted to read target | former ref | resolve | Redirect + renamed notice |
| Authenticated viewer, target does not exist | unknown ref | resolve | Existing not-found UI (FR-15) |
| Entity author (owns the descriptor) | own entity's former-names declaration | declare | Permitted; inert where it collides with a live entity (FR-7) |
| Entity author | another entity's current name | claim as former | Inert for resolution (FR-7); cannot capture traffic |
| Catalog admin | rename history | administer via UI | Out of scope |

## The user's four design questions — framing and proposed answers

These four questions were put to the user and **answered at Gate 1** (see "Decisions taken at Gate 1"
below). What follows is the requirement-level framing and the answer the established facts pointed to;
the user accepted all four as the binding design direction, so the architecture implements them rather
than revisiting them. Each is now codified in the FR/AC ids named at the end of its bullet.

- **Q1 — Who may claim a former name?** *Proposed:* whoever controls the entity descriptor, with the
  claim made inert rather than policed. The catalog has no notion of name ownership and adding one is
  out of scope, so enforcement comes from FR-7 (a claim on a live entity's ref never resolves) and
  FR-6 (a contested claim resolves to nothing). The practical guard is that hijacking requires the
  victim's name to be *unused*, and the victim can reclaim it simply by existing. Codified as FR-6,
  FR-7, NFR-5.
- **Q2 — What happens when a new entity takes an old name?** *Proposed:* the live entity wins,
  unconditionally, because resolution is only attempted after a direct lookup misses — the former-name
  path is never consulted when the name is live. This is FR-5 and FR-9, and it is also what keeps
  NFR-1 true.
- **Q3 — Permission checks on the redirect target.** *Proposed:* resolution runs through the same
  authorization the existing read path runs through, which already has the right shape:
  `AuthorizedEntitiesCatalog` converts a `CONDITIONAL` decision into a predicate and ANDs it as
  `{ $all: [permissionFilter, requestFilter] }`, and `entitiesBatch` already returns `null` —
  positionally aligned, never an error — for both "does not exist" and "may not read". Reusing that
  path means the two cases stay indistinguishable by construction. FR-8, NFR-4.
- **Q4 — Keeping ordinary `getEntityByRef` lookups fast.** *Proposed:* do not touch the hot path at
  all. `final_entities.entity_ref` is unique-indexed and `entitiesBatch` resolves refs through it in
  one query (`= ANY(?::text[])` on Postgres, chunked `whereIn` elsewhere); former-name resolution is a
  second, conditional query that only runs after a miss, served by the existing
  `search_key_value_entity_idx` because annotations are already flattened into `search` (CON-5). No
  new table, no migration, no change to the stitcher, and `/catalog-db-performance` is not triggered
  (CON-10). FR-4, FR-16, NFR-1, NFR-2, NFR-3.

## Acceptance criteria

- **AC-1** A former ref resolves to the entity now claiming it, verified against a real database
  across every engine `TestDatabases.create()` supports.
- **AC-2** A live entity holding a name wins over any former-name record claiming it.
- **AC-3** Two live entities claiming the same former ref resolve to nothing.
- **AC-4** A caller not permitted to read the target gets the same result as for a non-existent ref,
  under both `DENY` and `CONDITIONAL` decisions.
- **AC-5** Existing `entities` / `entitiesBatch` / `queryEntities` / `facets` behaviour is unchanged
  for refs that already resolve, including positional `null` alignment in `entitiesBatch`.
- **AC-6** jsdom: a stale entity URL lands on the renamed entity with a notice naming the former ref,
  asserted in the **legacy** system.
- **AC-7** jsdom: the same, asserted in the **new (alpha)** system.
- **AC-8** jsdom: a stale TechDocs URL lands on the renamed entity's docs with the same notice.
- **AC-9** jsdom: an unknown ref still reaches the existing not-found UI and issues no redirect.
- **AC-10** The former-names value parser handles the empty, single, multiple, duplicate,
  whitespace-padded and malformed cases deterministically.
- **AC-11** `yarn tsc` passes at the repo root.
- **AC-12** `CI=1 yarn test <path>` passes for every changed package path, with no regression against
  this run's recorded baseline (all five in-scope paths green at HEAD `f20fd9b5`).
- **AC-13** `yarn build:api-reports` leaves no uncommitted diff.
- **AC-14** `yarn lint --fix` reports no errors in changed files.
- **AC-15** A changeset exists covering every published package changed, adopter-facing, no internal
  code symbols, correct bump level.
- **AC-16** If a migration is introduced, its up/down round-trip passes on both Postgres and SQLite
  using the existing `src/tests/migrations.test.ts` harness.
- **AC-17** A former-name claim naming a `User` entity does **not** resolve, and a `User` entity's
  own former-name declaration produces no redirect (FR-22), asserted in the backend.
- **AC-18** An entity declaring **several** former refs resolves each of them, including a former ref
  that differs only by namespace (a namespace move) and an entity renamed twice.
- **AC-19** A stale URL with a sub-path redirects to the same sub-path on the new ref
  (`.../old-name/docs` -> `.../new-name/docs`), asserted for the entity page and for TechDocs.
- **AC-20** A malformed annotation value resolves nothing and throws nothing, on both the backend
  lookup path and the frontend render path (fail closed, FR-3).
- **AC-21** `CatalogApi` and its implementations/mocks are source-unchanged: no member added or
  re-typed (FR-11), and `plugins/catalog-node` and `plugins/catalog-import` are untouched.

## Decisions taken at Gate 1

All four open questions were answered by the user and are now binding. Recorded here so the
architecture phase does not re-litigate them.

- **D-1 (was OQ-1) — no new `CatalogApi` member.** Option (a): resolve through the existing
  filter-capable endpoints. Neither a required nor an optional member is to be added; scope stays
  frozen and `plugins/catalog-node` / `plugins/catalog-import` stay untouched. Codified as FR-10,
  FR-11, AC-21, CON-1.
- **D-2 (was OQ-2) — `User` entities excluded entirely, structurally.** Not a documentation warning:
  the resolution path itself refuses `kind: User`. Codified as FR-22, AC-17, and the PII inventory.
  The privacy rationale is still documented (FR-19) in addition.
- **D-3 (was OQ-3) — a delimited list, multiple former refs.** An entity renamed twice, or renamed
  and moved namespace, keeps all its old links working. The architect states the delimiter and the
  escaping/validation rule explicitly; malformed values **fail closed** (resolve nothing, never
  throw); surrounding whitespace is tolerated. Codified as FR-3, AC-18, AC-20, CON-2.
- **D-4 (was OQ-4) — preserve the sub-path.** `/catalog/default/component/old-name/docs` lands on
  `/catalog/default/component/new-name/docs`, with query string and fragment preserved where that
  falls out naturally; the same principle applies to the TechDocs redirect. Codified as FR-12,
  FR-17, AC-19.

Two corrections to the intent brief, confirmed by the user, also bind the architecture:

- **D-5 — `EntityNotFound` is dead code and stays that way.** The intent brief pointed at
  `plugins/catalog/src/components/EntityNotFound/`, which has no production render site and appears
  in neither catalog report file. The real sites are the legacy `WarningPanel` at
  `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx:391` and the alpha `Alert` at
  `plugins/catalog/src/alpha/components/EntityLayout/EntityLayout.tsx:110`. Do **not** export
  `EntityNotFound` to make it reachable — that adds a public-API line for no benefit. See CON-8.
- **D-6 — resolution lives in the hook, assertions stay per-system.** `useEntityFromUrl` is imported
  by alpha across the boundary, so hook-level logic serves both systems; but the two not-found
  component sites are separate, so AC-6 and AC-7 each assert the notice in their own system. See
  CON-6, FR-14.

The design direction from Phase 1's Q1-Q4 answers is accepted as binding: inert-not-policed claims,
live entity wins unconditionally via a post-miss lookup, reuse of `AuthorizedEntitiesCatalog` and
`entitiesBatch` positional `null` so "absent" and "forbidden" are indistinguishable by construction,
and no new table or migration.