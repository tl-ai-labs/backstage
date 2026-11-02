# Requirements — Entity former names and rename redirects

Run: `20261102-feature-new-entity-former-names`. Job: `feature-new`. Upstream request: backstage/backstage#5231.
Source: `intent_brief.md`, `discovery.md`, and a spot check of the lookup and page code at `f20fd9b59828`.

## Summary

An entity declares the names it used to have. The catalog indexes those declarations and answers one new question:
"this ref does not exist, is it a former name of something?" The entity page and the TechDocs reader ask it only after
a normal lookup has found nothing, then redirect to the current entity and show a notice.

Existing lookups do not change. In particular, `GET /entities/by-name/...` keeps returning 404 for a former name,
which also avoids the loading trap in `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx`, where the page
reports `loading` when the fetched entity's ref differs from the route params.

## In scope

1. A declared, validated way for an entity to list its former names (`packages/catalog-model`).
2. A catalog index of valid claims, kept current as entities change or disappear (`plugins/catalog-backend`, including a migration).
3. One new permissioned catalog API operation that resolves a former ref, with regenerated OpenAPI code.
4. A client method for it (`packages/catalog-client`) and the same on the backend catalog service (`plugins/catalog-node`).
5. A shared frontend way to resolve a miss and to show the notice (`plugins/catalog-react`).
6. Redirect and notice on the entity page, in both the legacy and the new frontend system (`plugins/catalog`).
7. Redirect and notice on the TechDocs reader (`plugins/techdocs`).
8. Docs in `docs/features/software-catalog` and `docs/features/techdocs`, changesets, and regenerated API and SQL reports.

## Out of scope

1. Automatic rename detection. Former names are declared, never inferred.
2. Changing TechDocs backend routes, storage paths or search indexing. `plugins/techdocs-backend` is not touched, by the person's decision at Gate 0.
3. Rewriting stored references (relations, `spec.owner`, `spec.dependsOn`) that still use an old name.
4. Making `getEntityByRef`, `getEntitiesByRefs`, `queryEntities` or any other existing lookup return an entity under a former name.
5. Following a chain of renames across more than one lookup. An entity lists every former name it wants honoured.
6. Search results, deep links in other plugins, and any route other than the entity page and the TechDocs reader.
7. New app-config keys. `plugins/catalog-backend/config.d.ts` is outside the write contract.
8. New package dependencies. `package.json` files are outside the write contract.
9. Editing `docs/releases` or ESLint, Prettier or TypeScript configuration.
10. Running the `/catalog-db-performance` battery. No database replica details were supplied at Gate 0.

## Functional requirements

### Declaration (`packages/catalog-model`)

- **FR-1** The model exports a well-known annotation, `backstage.io/former-names`, as a public constant, whose value lists one or more former names of the entity.
- **FR-2** Each listed value is a name in the entity's own namespace, or a name in another namespace (`namespace/name`). A value may also be a full ref if its kind is the entity's own kind. The list's exact syntax is fixed in the change plan and documented.
- **FR-3** The model exports a parser that turns an entity into its normalized former refs, using the entity's own kind and namespace as defaults, so the backend and any other consumer read the annotation one way. Normalization matches how the catalog compares entity refs (lower-cased).

### Who may claim (design question 1)

- **FR-4** A claim is valid only when its kind equals the claiming entity's kind, and it is not the entity's own current ref. A rename never changes kind.
- **FR-5** An invalid entry in the list does not fail the entity's processing or discard its valid entries. It is skipped and reported through the catalog's normal entity processing error or warning surface, naming the entry and the reason.
- **FR-6** Any entity that passes FR-4 may claim a name in its own namespace or in another namespace, subject to FR-7 and FR-8. This is the proposed default: see Open question 1.

### Conflicts (design question 2)

- **FR-7** A live entity always wins. While any entity exists at a ref, including a new, unrelated entity that takes an old name and including an orphaned entity, normal lookup returns that entity and no redirect happens. The claim stays dormant and takes effect again if that entity later goes away. Docs state this, including what it means for a renamed entity's orphan.
- **FR-8** A contested name is never resolved by guessing. When two or more entities validly claim the same former ref, the resolver reports nothing for that ref, so the user sees the normal not-found page, and each claimant is told through the same surface as FR-5, naming the conflict without naming entities the reader may not be allowed to see. This is the proposed default: see Open question 2.
- **FR-9** The index reflects the current state. Editing the annotation, removing an entity or changing its name removes stale claims at the next stitch or deletion, without a manual step, and without a backfill for entities that never declared the annotation.

### Resolution API (`plugins/catalog-backend`, `packages/catalog-client`, `plugins/catalog-node`)

- **FR-10** A new read operation, documented in `src/schema/openapi.yaml` with generated server and client code regenerated by the `generate` script, takes a former ref's kind, namespace and name and returns the current entity's ref, or 404.
- **FR-11** The operation looks up the former-name index only. It does not recurse: a single call gives at most one hop.
- **FR-12** `CatalogApi` gains a method that returns the current ref or `undefined`, treating a 404 as `undefined`, as `getEntityByRef` does. A new method must not break the type check of any implementation outside the write contract, and a client talking to an older backend without the route gets `undefined`.
- **FR-13** The backend `CatalogService` in `plugins/catalog-node` exposes the same lookup with its usual credentials handling, and the in-repo test doubles (`catalogApiMock` and the in-memory client, and any catalog service mock) implement it.

### Permissions (design question 3)

- **FR-14** The operation authenticates callers exactly as `GET /entities/by-name/...` does, and passes the caller's credentials through to the authorization of the target.
- **FR-15** The target is returned only if the caller holds `catalog.entity.read` on the target entity, applying conditional decisions to that entity, the same as a normal read.
- **FR-16** When the target is denied, the response is byte-for-byte the same shape and status as an unknown former ref. Nothing in it reveals that a claim or a target exists.
- **FR-17** A contested or dormant ref is decided before any target is returned, and the audit surface treats this operation as a catalog read, matching how `by-name` reads are audited.

### Entity page (`plugins/catalog`, `plugins/catalog-react`)

- **FR-18** After `getEntityByRef` returns no entity for the route's ref, and only then, the entity page asks the resolver. A hit navigates to the current entity's URL. A miss, or any error from the resolver, shows the existing not-found state unchanged, with no error toast.
- **FR-19** The redirect uses history replace, so Back does not return to the old URL and loop. It preserves the sub-route (for example `/catalog/default/component/old-name/api` to `.../new-name/api`), the query string and the hash.
- **FR-20** Both `plugins/catalog/src/components/CatalogEntityPage` and `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx` behave this way. While a redirect is being resolved the page shows its loading state, not a flash of "Entity not found".
- **FR-21** The target page shows a notice that the entity was renamed from the old name. The notice can be dismissed, and follows the `Alert` pattern of `EntityOrphanWarning`.
- **FR-22** The notice comes from in-app navigation state, not from a URL parameter, so a crafted link cannot make an arbitrary entity page claim it was renamed. A reload does not need to keep it.
- **FR-23** The redirect target is built from the resolved ref through the catalog's route resolution and is always same-origin. No URL supplied by the request or by an annotation is ever navigated to.

### TechDocs reader (`plugins/techdocs`)

- **FR-24** When the reader's entity lookup finds nothing, the reader asks the resolver the same way, through the frontend catalog API only. A hit navigates, with history replace, to the current entity's docs URL, keeping the docs sub-path, query string and hash. A miss or error leaves today's not-found behaviour unchanged.
- **FR-25** The reader shows the same kind of renamed notice from navigation state.
- **FR-26** This works alongside `useExternalRedirect`, whose `backstage.io/techdocs-entity` handling is unchanged and which still treats a missing entity as no external redirect. No TechDocs backend route is called with a former name in order to find out it has moved.

### Docs, reports and release

- **FR-27** `docs/features/software-catalog` documents the annotation in `well-known-annotations.md` and the feature's rules (who may claim, conflicts, permissions, no chains, orphans) where they fit best. `docs/features/techdocs` states what happens to old docs links, including that the docs must already be published under the new name. All docs follow `docs/contribute/doc-style-guide.md`.
- **FR-28** Changesets in `.changeset/` cover every published package whose release this changes, with the bump levels `.claude/CLAUDE.md` requires, written for adopters.
- **FR-29** Generated OpenAPI code, `report*.api.md` and `report.sql.md` are regenerated with the repo's own commands and never typed by hand.

## Non-functional requirements

- **NFR-1 (lookup cost, design question 4)** `by-name`, `by-refs`, `by-uid`, `by-query` and entity listing run exactly the queries they run today. No hit path gains a query, a join or a client round trip.
- **NFR-2** A resolver call runs one indexed lookup plus the permission check, and reads no unindexed column. It is called only after a miss.
- **NFR-3** Stitching an entity with no `backstage.io/former-names` annotation does no extra write. The change plan states the write cost for entities that have one.
- **NFR-4** The migration is additive and reversible, works on PostgreSQL, MySQL and SQLite as the existing migrations do, and needs no backfill. It removes a claim automatically when its entity is deleted.
- **NFR-5** Safe with several catalog replicas stitching at once: no lost update, and no duplicate-key failure that could fail a stitch.
- **NFR-6** Backwards compatible: no change to any existing response, and no removed or altered public API.
- **NFR-7** Every new source file carries the Apache 2.0 header with the current year. Existing headers are left alone. Each package's own style is followed.
- **NFR-8** The new query is added to `plugins/catalog-backend/src/tests/performance/query-battery/queries.md` where that file's rules ask for it. `baseline.md` is not edited, since no measurement was run.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| `backstage.io/former-names` annotation values | Low for most kinds. Medium on `User` and `Group` entities, where a former name can be a person's past name | Already readable by anyone who can read the entity. Nothing beyond the entity's normal read permission exposes it. Docs advise against using it to record a person's past name |
| Former-ref index rows | Same as above | Served only through the permissioned operation, which returns the current ref and never lists claims. Not written to logs at info level |
| Notice text (old name) | Low | Taken from the URL the user already opened, rendered as text only |

No new credentials, secrets or env vars are read.

## Role matrix

| Role | Declare a former name | Resolve a former ref | See the redirect target |
|---|---|---|---|
| Entity author (controls the descriptor) | Yes, through the descriptor, subject to FR-4, FR-7 and FR-8 | As any reader | As any reader |
| Signed-in reader with `catalog.entity.read` on the target | No | Yes | Yes |
| Signed-in reader denied on the target | No | Yes, receives the not-found response | No, indistinguishable from unknown (FR-16) |
| Unauthenticated caller | No | As for `GET /entities/by-name/...` | As for `GET /entities/by-name/...` |
| Backend service principal | No | Yes, through `CatalogService` with its credentials | Per the same permission decision |
| Catalog admin | Through the descriptor only. No admin override in this change | Yes | Yes |

## Acceptance criteria

- **AC-1** Model tests: the parser accepts every documented form, normalizes case, defaults kind and namespace, and reports each invalid form.
- **AC-2** Backend tests (indexing): a stitched entity with the annotation yields index rows. Editing the annotation, renaming, or deleting the entity removes stale rows. An entity with no annotation does no index write. An invalid entry surfaces a warning while valid entries still index.
- **AC-3** Backend tests (conflict): a live entity at the ref wins over a claim, a dormant claim resolves again once the live entity goes, a kind-changing claim is refused, and two claimants resolve to nothing with both told.
- **AC-4** Backend tests (permission): an allowed caller gets the current ref. A denied caller, a caller denied by a conditional decision, and an unknown ref get the same 404.
- **AC-5** Migration test: up and down run on the database engines the package's migration tests cover.
- **AC-6** Client tests: `200`, `404` as `undefined`, and a route-absent backend as `undefined`. Catalog service test: credentials are passed through.
- **AC-7** A test proves `by-name` still returns 404 for a former name.
- **AC-8** jsdom tests (entity page, both systems): an old URL redirects with replace, keeps sub-route, query and hash, and the target shows the notice. A miss and a resolver error both show the existing not-found state. No resolver call happens when the entity is found.
- **AC-9** jsdom tests (TechDocs reader): an old URL redirects with replace, keeps the docs sub-path, and shows the notice. A miss or error leaves current behaviour. `useExternalRedirect` still works for an entity with the external-docs annotation.
- **AC-10** `yarn tsc` and `yarn lint:all` pass, and every affected package's tests pass, including `packages/catalog-model`, `packages/catalog-client`, `plugins/catalog-node` and `plugins/catalog-react`, compared to the baseline taken before the first change.
- **AC-11** The rendered change plan explicitly answers all four design questions: who may claim, what happens when a new entity takes an old name, permission checks on the target, and how lookups stay fast.

## Open questions for HITL

Each has a proposed default that the requirements above already use. Replying `approved` accepts them.

1. **Who may claim across namespaces?** The brief wants a namespace move to redirect, so FR-6 allows a claim on a name in another namespace. Since Backstage cannot prove that an entity once held a name after that name's entity is gone, and by default anyone who can register a location can declare a claim, an unrelated entity could claim a retired name. It cannot take a live name (FR-7), and it cannot take a contested name (FR-8), and the notice shows the rename. The stricter alternative is same-namespace claims only, which drops the namespace-move case from the brief. **Proposed: allow cross-namespace claims, and document the trust model.**
2. **Two entities claim one name: no redirect, or first claim wins?** First-claim-wins keeps a redirect working, but rewards whoever claims first, including a squatter, and needs the claim's age tracked. No redirect means a second claim can disable a real redirect until someone fixes it, but it never sends a user to the wrong entity. **Proposed: no redirect, with both claimants told (FR-8).**
</content>
