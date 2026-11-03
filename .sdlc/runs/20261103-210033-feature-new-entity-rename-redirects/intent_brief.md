# Intent Brief — feature-new — Entity former names and rename redirects

## Context

A catalog entity's URL is built from its kind, namespace and name. Renaming a service, or moving it to
another namespace, breaks every bookmark, wiki link and chat message that pointed at it, and the user sees
"Entity not found". Plugins that key on the entity name break the same way, TechDocs URLs among them. The
request has been open since 2021 (backstage/backstage#5231).

Discovery found no existing concept of former names or aliases in the catalog or TechDocs source.
Related prior art: the TechDocs redirect notification
(`plugins/techdocs/src/reader/components/TechDocsRedirectNotification/`), the entity orphan warning banner
(`plugins/catalog/src/components/EntityOrphanWarning/`), and the `location.moved` / `repository.moved` SCM
events in `plugins/catalog-node`.

- Before: opening `/catalog/default/component/old-name` shows the "Entity not found" page.
- After: the same link lands on `/catalog/default/component/new-name`, with a notice that the entity was
  renamed from `old-name`. The TechDocs route `/docs/default/component/old-name` behaves the same way.

## Goal

1. **catalog-model:** a way to declare an entity's former names, for example a well-known annotation that
   lists former entity refs. It is validated, with a constant exported from the package.
2. **catalog-backend:** index former refs during processing or stitching, and resolve them in lookups.
   - Never let one entity hijack another's name.
   - Handle conflicts deterministically.
   - Apply permission checks to the redirect target.
   - Keep existing lookups by ref as fast as they are today. The former-name path is only consulted on a
     miss.
3. **catalog-client:** a lookup method that resolves a possibly-former ref to the current entity, or tells
   the caller the ref was renamed and what it now points to.
4. **plugins/catalog:** when the entity page's lookup misses, try the former-name lookup. On a hit,
   redirect to the current entity's route and show a "this entity was renamed from X" notice. Cover both
   the legacy and the new frontend system entity page.
5. **plugins/techdocs:** the same redirect and notice on the docs reader route, preserving the sub-path
   within the docs.

**Design questions the architect must answer in the change plan:**

- Who may claim a former name? For example, only a ref that no longer exists as a live entity, possibly
  restricted to the same source location or owner.
- What happens when a new entity later takes an old name? A live entity should always win over a former
  name.
- How are permission checks applied to the redirect target? A user who cannot read the target must get
  "not found", with no leak of the new name.
- How do existing lookups stay fast? Covers index and table design, and whether a migration is needed. If
  catalog DB queries or schema change, the catalog DB performance guidance in the repo applies.

## Files in scope

Proposed allowlist (globs):

- `packages/catalog-model/src/**`
- `plugins/catalog-backend/src/**`, `plugins/catalog-backend/migrations/**`
  - `src/schema/openapi.yaml` is edited by hand.
  - `src/schema/openapi/generated/**` is regenerated only, never hand-edited.
- `packages/catalog-client/src/**` (the generated OpenAPI client is regenerated only)
- `plugins/catalog/src/**`
- `plugins/catalog-react/src/**`, only if a shared hook or route helper is needed
- `plugins/techdocs/src/**`
- `plugins/techdocs-backend/src/**`, only if the metadata routes need to resolve former names
- `plugins/catalog-node/src/**`, only if a shared type must move there
- API reports for the touched packages (`packages/*/report*.api.md`, `plugins/*/report*.api.md`),
  regenerated via `yarn build:api-reports` only, never hand-edited
- Docs:
  - `docs/features/software-catalog/well-known-annotations.md`
  - `docs/features/software-catalog/life-of-an-entity.md`
  - `docs/features/software-catalog/references.md`
  - `docs/features/software-catalog/faq.md`
  - `docs/features/techdocs/how-to-guides.md`
  - `docs/features/techdocs/FAQ.md`
- Changesets: new files under `.changeset/`. No existing changeset covers this feature.

## Files off-limits

- `.git/**`, `.env`, `.env.*`, `.yarn/**`, `yarn.lock`, `**/node_modules/**`, `**/dist/**`,
  `**/dist-types/**`
- AI configs:
  - `.claude/**`, `.cursor/**`
  - `.mcp.json`, `AGENTS.md`, `.github/copilot-instructions.md`
  - `routing-policy.yaml`
- `docs/releases/**`
- ESLint, Prettier and TypeScript config files: `.eslintrc.js`, `.prettierignore`, `tsconfig.json`
- `**/knip-report.md`
- Everything not listed in the allowlist

## Acceptance criteria

- Backend tests cover:
  - former-name indexing
  - conflict handling: two entities claiming the same former name, and a live entity taking a former name
  - permissioned lookup: a target the user cannot read resolves as not found
- jsdom tests cover:
  - the entity route: an old URL redirects to the new URL and shows the renamed notice
  - the docs route: same, with the sub-path preserved
  - an unknown ref still shows "Entity not found"
- `yarn tsc` and `yarn lint` pass.
- New source files carry the Apache 2.0 header for 2026.
- Changesets:
  - Bump levels follow the repo's rules: `minor` for new APIs in packages at version 1.0.0 or higher,
    `patch` below 1.0.0.
  - Messages are written for adopters, with no internal symbol names.
- Docs describe the annotation, the redirect behaviour and its limits.

## Non-goals

- Automatic rename detection. Former names are declared by the entity owner, not inferred.
- Redirects for plugins other than the catalog entity page and TechDocs.
- Rewriting stored relations or other entities' refs to point at the new name.
- Backfilling former names for past renames.
- Changes to the scaffolder, search indexing or the catalog import flow.

## Run settings (Gate 0 revision 1)

- Test command, used verbatim for the whole run:
  `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`
- Never run lint with `--fix`.
- Continue regardless of any open upstream PRs; do not read them.
- Auth mode: vendor.
- Policy: argon4-plus-sonnet55. Its endpoints (Vertex AI in project temp-genmedia-study, and Anthropic) are
  confirmed acceptable for this repo.

## Final scope

Approved at Gate 0 on 2026-11-03. The write contract is frozen with the allowlist and off-limits above.
API reports are allowlisted per touched package. `.changeset/config.json`, `pre.json` and `README.md` stay
off-limits.
