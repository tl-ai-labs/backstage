# Requirements — Entity former names and redirects

Run `20261031-181500-feature-new-entity-former-names`, job `feature-new`. Source: `intent_brief.md`, with the
stack profile and Gate 0 outcomes. Facts marked **(verified)** were read from the code at `f20fd9b59828`.

## Changes to the brief's proposals (for Gate 1)

The brief's design answers are proposals. Each row is a place these requirements differ from them or add to
them. Rows marked **decision** were decided at Gate 1 (see "Gate 1 decisions").

| # | Proposal | What these requirements do | Why | Status |
|---|---|---|---|---|
| C-1 | Bad former refs are "entity processing errors" that "do not stop the entity from being ingested" | Keeps the behaviour, but these errors cannot use the normal processor error path. A separate non-blocking path is required (FR-6) | **(verified)** `DefaultCatalogProcessingOrchestrator` sets `ok: false` on any emitted error, and `DefaultCatalogProcessingEngine` then stores only the errors: the entity is not updated, and a new entity never appears | Refinement |
| C-2 | Claim outcomes are reported on the claimant | Claim outcome must feed the processing result hash (FR-7) | **(verified)** the engine skips all writes when the entity's own output hash is unchanged, but a claim's outcome depends on other entities | Refinement |
| C-3 | A claim is honoured "only when nothing live holds that ref", so an entity "cannot take over another's name ... when that entity later disappears" | The two statements conflict: the claim would simply pass on the next processing run after the holder disappears. FR-4 makes the rejection persist | Without it, the protection the brief asks for does not exist | **decided: D2** |
| C-4 | "Earliest recorded claim wins", which "does not depend on processing order" | Keeps earliest-recorded, but the guarantee is reworded: once recorded, the winner is stable across reprocessing and restarts, and equal timestamps break on the claimant's ref. Which of two brand-new claims is recorded first still depends on processing order | Recording order is processing order; no earliest-recorded rule can avoid that | **decided: D3** |
| C-5 | "Rejected" (claim on a live entity) and "inactive" (new entity takes the old name) | Defined apart: a claim first seen while another source's entity holds the ref is **rejected**; a claim already recorded when a new entity takes the ref is **inactive**, with no error | The brief does not say what separates them, and they end differently | Refinement |
| C-6 | Live holder "shares the claimant's location key" | A missing location key never matches, including missing against missing | Fails closed: entities with no location key have no shared source to prove | Refinement |
| C-7 | Notice names the former name | The former name travels in navigation state, not in a query parameter | A query parameter would alter the kept query and let any link fake a "renamed" notice | Refinement |

## In scope

1. A well-known annotation in `packages/catalog-model` that declares an entity's former refs.
2. Backend validation, indexing and conflict handling for former-ref claims.
3. A permissioned lookup from a former ref to the current entity: OpenAPI route, regenerated server and client
   code, `CatalogApi` and `CatalogService` surface, `CatalogClient`, `InMemoryCatalogClient`, test mocks, and
   the two read-write-split contrib implementers.
4. Entity-page redirect with notice in the old and new frontend systems, covering all three layouts.
5. TechDocs reader redirect with notice.
6. Documentation, changesets and regenerated API reports.

## Out of scope

1. Automatic rename detection. Renames nobody declares do not redirect.
2. Redirects across kinds.
3. Rewriting relations or other stored refs that still point at a former ref.
4. Redirects in other plugins, including search results and scaffolder.
5. Moving or copying published TechDocs content. Docs are served from the new ref's own site.
6. Redirects from an orphan kept by `catalog.orphanStrategy: keep`. A kept orphan is live, so the exact lookup
   wins. This limitation is documented (FR-22).
7. Multi-hop resolution.
8. Any `package.json` or `yarn.lock` change. None is needed: `plugins/catalog` and `plugins/techdocs` already
   depend on `@backstage/catalog-client` and `@backstage/catalog-model` **(verified)**.

## Functional requirements

### catalog-model

- **FR-1** Export a well-known annotation constant holding comma-separated full entity refs
  (`kind:namespace/name`). Each ref is compared in lowercase, matching how `entity_ref` is stored.

### catalog-backend: claims

- **FR-2** Each processing run of an entity that declares the annotation validates each value. A value is
  invalid when it is not a full entity ref, has a different kind from the entity, or is the entity's own ref.
  An invalid value is ignored and reported (FR-6). *(Gate 3, S5.)* At most 20 distinct refs are read per annotation;
  the rest are ignored and reported through the same non-blocking path, and an echoed invalid value is truncated.
- **FR-3** Valid former refs are recorded in a dedicated indexed table added by a new migration, whose filename
  sorts after `20261007000000_stitch_failure_count.js`, with a working `down`. A claim's recorded time does not
  change while the claim stands, so reprocessing never moves it. A claim is removed when the claimant stops
  declaring that ref or is deleted.
- **FR-4** A claim on a ref held by a live entity:
  - with the same location key as the claimant (the rename-in-flight case; see C-6 for a missing key) is recorded
    and takes effect once the holder is gone;
  - from another source is **rejected** and reported. The rejection is recorded and stays in force after the holder
    disappears, until the claimant stops declaring that ref (D2). The error tells the author how to clear it: remove
    the value, then add it back once the old entity is gone.
- **FR-5** When several claims target one ref, the earliest recorded wins and each other claimant gets a
  reported error. Equal times break on the claimant's ref, so the winner is stable across reprocessing and
  restarts. When the winning claim is removed, the next-earliest takes over with no re-ingestion (D3).
- **FR-6** Invalid values, rejected claims and lost competing claims are reported as entity processing errors
  visible on the entity (in `status.items`, like other processing errors), and never prevent the entity from being
  ingested, updated or stitched.
- **FR-7** A change in a claim's outcome reaches the claimant's reported errors on its next processing run, even
  when the entity's own output has not changed.
- **FR-8** *(Changed at Gate 3, S1.)* A recorded claim on a ref that a live entity later takes:
  - from the same source becomes **inactive** with no error, and takes effect again, with no re-ingestion, if that
    entity goes away;
  - from another source is **rejected** on the claimant's next processing run, and stays rejected as in FR-4.

### catalog-backend: lookup

- **FR-9** Add a lookup from a former ref to the current entity to `src/schema/openapi.yaml`, beside the by-name
  route, and implement it in the router. Generated folders change only through the package's `generate` command.
- **FR-10** It returns a single entity, or not found. Resolution is one hop.
- **FR-11** It resolves only through normal `catalog.entity.read` checks, including conditional decisions, through
  the same `Authorized*` layer as the existing reads.
- **FR-12** No resolvable claim, a rejected, lost or inactive claim, a former ref held by a live entity (visible
  to the caller or not), and a denied target all return the same not-found response: same status, same message,
  and no field that names or hints at a target.
- **FR-13** The route emits an audit event following the by-name route's pattern, except that (Gate 3, S3 and S4) a
  success names the returned entity's ref, as `by-uid` does, and is logged only after the response is written, so a miss
  logs failure only.

### Client surface

- **FR-14** `packages/catalog-client` exposes the lookup on `CatalogApi`, implemented in `CatalogClient` and
  `InMemoryCatalogClient`. `CatalogService` in `plugins/catalog-node` exposes it too, implemented in its default
  service. `catalogApiMock` and `catalogServiceMock` support it, as do both read-write-split contrib classes.
  The method is **optional** on `CatalogApi` and `CatalogService` (D1); every caller treats a missing method as not
  found. `catalog-client` and `catalog-node` take a `minor`.

### Entity page

- **FR-15** After the exact lookup returns not found, and only then, the page calls the lookup. A hit replaces the
  history entry (`replace: true`) with the renamed entity's URL, keeping sub-route, query and hash, so Back does
  not loop.
- **FR-16** The target URL is built from the returned entity's kind, namespace and name through the existing route
  ref, so a custom mount path works. It is never built from text in a response beyond those fields.
- **FR-17** The renamed entity's page shows a notice naming the former ref, in the alpha
  `EntityLayout`, alpha `EntityLayoutBui` and legacy `EntityLayout`. Text goes through `catalogTranslationRef`.
- **FR-18** While the lookup is pending the page stays in its loading state, so the not-found page does not flash
  before a redirect. A missing method, a not-found or any failure leads to the existing not-found page unchanged.

- **FR-27** `useEntityFromUrl` must not throw when `entityRouteRef` is not bound or cannot be resolved, in either
  frontend system. It resolves the route without throwing and obeys the rules of hooks (no conditional hook call; a
  try/catch around a hook only if it is genuinely safe). When the route cannot be resolved it skips the redirect and
  the existing not-found page renders. A jsdom test renders the entity page with `entityRouteRef` unbound, in the case
  that actually throws today, and expects the not-found page, not an error. (Gate 2 revision.)

### TechDocs

- **FR-19** The standalone reader, after its exact entity lookup returns not found, and only then, calls the
  lookup. A hit replaces the history entry with the new ref's docs URL, keeping docs sub-path, query and hash,
  following `useExternalRedirect.ts`. Existing external-redirect behaviour is unchanged.
- **FR-20** The reader shows a notice naming the former ref, with text through the TechDocs translation ref.
- **FR-21** A missing method, a not-found or any failure leaves the existing TechDocs not-found behaviour unchanged.
  Docs embedded in an entity page are covered by the entity-page redirect, which keeps the `docs` sub-route.

### Documentation and release

- **FR-22** Document the annotation in `docs/features/software-catalog/well-known-annotations.md`, the lookup in
  `docs/features/software-catalog/api.md`, any new audit event in `audit-events.md`, and the behaviour, conflict
  rules and limits (single hop, same kind, kept orphans, no relation rewrite, no docs copying) in the catalog and
  TechDocs docs, following `docs/contribute/doc-style-guide.md`.
- **FR-23** Changesets cover every affected published package, written for adopters, with no internal symbols.
  Bumps follow `.claude/CLAUDE.md`; existing changesets are inspected first.
- **FR-25** Add a `.sdlc/` line to the root `.gitignore`, and change nothing else in that file (D5).
- **FR-26** API reports are regenerated for every affected package without writing
  `plugins/catalog-backend/report.sql.md` (D4). `yarn build:api-reports` always passes `--sql-reports`, so it cannot be
  run as is. The report step runs the same `backstage-repo-tools api-reports` command with the same flags less
  `--sql-reports`. The file is never written and restored afterwards.
- **FR-24** `queries.md` and `baseline.md` change only if a tested query changes shape. No baseline number is
  invented. *(Expected: neither changes, since no existing query is touched.)*

## Non-functional requirements

- **NFR-1** The existing by-name, by-refs and query paths are unchanged and gain no joins.
- **NFR-2** Entities that do not declare the annotation gain no database query during processing.
- **NFR-3** Claim rows are written only when they change, not on every processing run.
- **NFR-4** All queries and the migration work on Postgres, MySQL and SQLite. Database tests use
  `TestDatabases.eachSupportedId()`.
- **NFR-5** The frontend makes no former-name request for an entity found by exact lookup.
- **NFR-6** The notice cannot be triggered by a crafted link, and no link can redirect anywhere other than an
  entity route or docs route of the current app.
- **NFR-7** A frontend on an older backend, and a third-party implementer that lacks the method, behave exactly as
  today.
- **NFR-8** New source files carry the Apache 2.0 header dated 2026; each file matches its package's style; each
  file's Zod import stays as it is; tests prefer fewer thorough cases, `screen` and `findBy*`, with no new test IDs.
- **NFR-9** `report*.api.md` changes only through `yarn build:api-reports`. `yarn build`, `yarn changesets version`
  and `yarn release` are never run, and the changeset CLI is never used.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| Former refs in the annotation | Low: entity identifiers. Medium if declared on a `User`, where a former name may be a person's former name | Opt-in by the entity's author; readable only by those who can read the entity |
| Former refs in the claim table | As above | Never returned directly; used only to resolve under `catalog.entity.read` |
| Former ref in the notice | As above | Shown only to a viewer who can read the target and who opened that ref's own URL |
| Claim errors in `status.items` | Low. Must name only the ref the claimant declared, with no detail about the live holder or its source | Readable by those who can read the claimant |

## Role matrix

| Role | Resource | Action | Result |
|---|---|---|---|
| Viewer with `catalog.entity.read` on the target | Former-ref lookup, redirect, notice | Open old link | Redirected, notice shown |
| Viewer denied on the target, by plain or conditional decision | Former-ref lookup | Open old link | Same not-found as a missing claim |
| Service principal | Former-ref lookup | Call the API | Same `catalog.entity.read` rules |
| Entity author (data source) | Annotation | Declare former refs | Claim recorded, or error on the claimant; never blocks ingestion |
| Author of a claim on another source's live entity | Claim table | Declare that ref | Rejected and reported; no redirect is ever created by that claim while it stays declared (D2) |

## Acceptance criteria

Numbered to match the brief.

- **AC-1** An entity can declare former refs through the new annotation, documented with the well-known annotations.
- **AC-2** Backend tests on every supported database cover former-name indexing, invalid values, conflict handling
  (competing claims, a claim on a live entity, a new entity taking the old name, a rejection staying in force after
  the holder goes) and permissioned lookup (a denied target is indistinguishable from a missing one).
- **AC-3** `packages/catalog-client` exposes the lookup, implemented in `CatalogClient`, `InMemoryCatalogClient` and
  the test mocks.
- **AC-4** Opening `/catalog/<namespace>/<kind>/<old-name>` lands on the renamed entity's page with a notice naming
  the former name, in both frontend systems, keeping sub-route, query and hash. The redirect replaces the history
  entry, so Back does not loop.
- **AC-5** Opening an old TechDocs URL lands on the renamed entity's docs with a notice, keeping docs sub-path, query
  and hash.
- **AC-6** When no claim resolves, or the viewer may not read the target, the existing not-found pages render
  unchanged.
- **AC-7** jsdom tests cover the redirect and notice on the entity and docs routes.
- **AC-8** `yarn tsc` and `yarn lint` pass, API reports are regenerated (except `plugins/catalog-backend/report.sql.md`,
  per D4), and changesets cover every affected published package.
- **AC-9** `queries.md` and `baseline.md` are updated where the change affects a tested query. The
  `/catalog-db-performance` battery did not run (no database connection details), and the final report says so.

## Gate 1 decisions

The person approved these requirements at Gate 1.

- **D1. `CatalogApi` compatibility:** optional method on `CatalogApi` and `CatalogService`; `catalog-client` and
  `catalog-node` take a `minor`.
- **D2. Rejected claims:** a rejected claim stays rejected until the claimant stops declaring that ref.
- **D3. Competing claims:** keep earliest-recorded with the reworded guarantee. Once recorded, the winner is stable
  across reprocessing and restarts, and equal timestamps break on the claimant's ref.
- **D4. `plugins/catalog-backend/report.sql.md`:** left out of this run. It is not written, and the contract is not
  worked around (FR-26). The final report names it as needing regeneration; it is regenerated after the run closes,
  when the contract is off.
- **D5. `.gitignore`:** add a `.sdlc/` line (FR-25).

## Gate 2 revision

The person answered `revise` at Gate 2 on one item: the unconditional route resolution in `useEntityFromUrl` (FR-27).
Every other unit and decision stands as planned.

## Gate 3 decisions

- **S1, fix:** every sync re-checks holders for declared refs that are not rejected, and rejects a claim whose ref another
  source holds. This changes C-5 and FR-8: such a claim stays rejected for good; same-source holders behave as before.
- **S2, accept:** any author can claim any dead ref of the same kind. The trust model is stated in `life-of-an-entity.md`.
  No config flag.
- **S3, fix:** a successful lookup's audit event logs the returned entity's ref, as `by-uid` does.
- **S4, fix in the new route only:** success is logged after the response. `by-name` is unchanged.
- **S5, fix:** the annotation is capped at 20 refs, and an echoed invalid value is truncated.
- The three reordered reports stay for the post-run `yarn build:api-reports`.

## Carried from Gate 0

- The `/catalog-db-performance` battery is not run, before or after; see AC-9.
- `package.json` and `yarn.lock` are off-limits, and this plan needs no dependency change.
- No baseline test run exists. The project checks run once before the first packet, so existing failures are not
  attributed to this change.
