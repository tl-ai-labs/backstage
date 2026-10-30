# Intent Brief — feature-new — Entity former names with link redirects

## Context

A catalog entity's URL is built from its kind, namespace and name, so renaming a service (or moving
it to another namespace) breaks every bookmark, wiki link and chat message that pointed at it, and
the user just sees "Entity not found". Other plugins that key on the entity name, such as TechDocs
URLs, break the same way. Request open since 2021 (backstage/backstage#5231).

**Before:** opening an old link such as `/catalog/default/component/old-name` shows the "Entity not
found" page.
**After:** the same link lands on `/catalog/default/component/new-name` with a notice that the
entity was renamed from `old-name`.

There is no prior art in the repo — a search across `plugins/`, `packages/` and `docs/` for
`formerName` / `previousName` / entity-rename handling returns nothing. This is genuinely new.

Relevant existing surfaces found during discovery:

- `plugins/catalog-backend` — Express + knex + zod (`zod/v3` in `createRouter.ts`), timestamped CJS
  migrations under `migrations/`, must pass on both Postgres and SQLite.
- `plugins/catalog/src/components/EntityNotFound/` — the dead end a stale link currently reaches.
- `plugins/catalog-react/src/hooks/useEntity.tsx` — `useEntityFromUrl` / `AsyncEntityProvider`,
  where an unresolvable ref is detected.
- `plugins/techdocs/src/reader/components/TechDocsNotFound.tsx` and `Router.tsx` — the TechDocs
  equivalent, routed by `rootDocsRouteRef` (`params: ['namespace','kind','name']`).
- Both frontend systems are live: legacy `src/routes.ts` + `src/plugin.ts` **and** new-system
  blueprints under `src/alpha/`. A redirect landing in only one leaves the other broken.

## Goal

Remember an entity's former names (and former namespaces) in the catalog, and make old entity-page
and TechDocs links resolve to the renamed entity instead of dead-ending — showing the visitor a
notice that the entity was renamed, naming what it was called before.

Where the work lands:

1. **`packages/catalog-model`** — a way to declare former names, for example an annotation.
2. **`plugins/catalog-backend`** — index former refs; resolve them in lookups without letting one
   entity hijack another's name; handle conflicts.
3. **`packages/catalog-client`** — a lookup method.
4. **`plugins/catalog` and `plugins/techdocs`** — redirect from the not-found path with a "this
   entity was renamed" notice.

## Design questions to answer

These are the substance of the architecture phase; they are presented for approval at Gate 1.

- **Who may claim a former name** — what stops an unrelated entity from declaring someone else's
  name as its own former name and capturing their traffic.
- **What happens when a new entity takes an old name** — a live entity holding the name must always
  win over a former-name record pointing elsewhere.
- **Permission checks on the redirect target** — the redirect must not reveal the existence, name or
  location of an entity the visitor is not permitted to read.
- **Keeping existing lookups fast** — the former-name resolution must not slow the hot path of
  ordinary `getEntityByRef` lookups across a large catalog.

## Files in scope

Backend — index, resolve, conflict handling, persistence:

- `plugins/catalog-backend/src/**`
- `plugins/catalog-backend/migrations/**` (only if the design is schema-backed)
- `plugins/catalog-backend/report.api.md`, `report-alpha.api.md`, `report.sql.md`
- `plugins/catalog-backend/README.md`

Model — the former-name declaration:

- `packages/catalog-model/src/**`
- `packages/catalog-model/report.api.md`, `report-alpha.api.md`

Client — the lookup method:

- `packages/catalog-client/src/**`
- `packages/catalog-client/report.api.md`, `report-testUtils.api.md`

Frontend — redirect and notice, both frontend systems:

- `plugins/catalog-react/src/**`
- `plugins/catalog-react/report.api.md`, `report-alpha.api.md`, `report-testUtils.api.md`
- `plugins/catalog/src/**` (including `src/alpha/**`, `routes.ts`, `plugin.ts`)
- `plugins/catalog/report.api.md`, `report-alpha.api.md`, `README.md`
- `plugins/techdocs/src/**` (including `src/alpha/**`, `routes.ts`, `plugin.ts`)
- `plugins/techdocs/report.api.md`, `report-alpha.api.md`, `README.md`

Companion files — surfaces that list or are generated from the above:

- `docs/features/software-catalog/well-known-annotations.md` (if the design is annotation-driven)
- `docs/features/software-catalog/descriptor-format.md` (same condition)
- `.changeset/**` — mandatory: every package above is published and adopter-facing
- `.gitignore` — add a `.sdlc/` entry (confirmed at Gate 0)

Tests travel with their implementation (`*.test.ts` / `*.test.tsx` beside each changed file).

## Files off-limits

- `.env`, `.env.*`, `.envrc`, `.mcp.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`,
  `.sdlc/**`, `.git/**`
- **Existing AI setup** (off-limits by default): `.claude/CLAUDE.md`, `.claude/skills/**`,
  `.claude/settings.local.json`, `.cursor/rules/**`, `.github/copilot-instructions.md`
- `docs/releases/**` — these document past releases
- ESLint / Prettier / TypeScript configs, root `package.json`, `yarn.lock`
- `workspaces/ui/**`, `microsite/**`, `docs-ui/**` — separate nested installs, unrelated
- Every other workspace package not named in scope above (~225 of 236)

## Acceptance criteria

From the brief:

- **Backend tests** for former-name indexing, conflict handling, and permissioned lookup.
- **jsdom tests** for the redirect and notice on both the entity route and the docs route.
- `yarn tsc` passes at the repo root.
- `yarn lint --fix` leaves no errors in changed files.

Plus the repo's own release gates:

- `CI=1 yarn test <path>` passes for every changed package's test path.
- `yarn build:api-reports` produces no uncommitted diff — any public-API change is reflected in the
  `report*.api.md` files listed in scope.
- A changeset covers every published package changed, in adopter-facing language with no internal
  code symbols; breaking changes carry `major` (>= 1.0.0) or `minor` (< 1.0.0).
- If a migration is introduced, it has a working `down` and passes on both Postgres and SQLite.

Behavioural criteria:

- An old entity-page URL lands on the renamed entity with a notice naming the former name — in both
  the legacy and the new frontend system.
- An old TechDocs URL lands on the renamed entity's docs with the same notice.
- A live entity holding a name wins over any former-name record claiming it.
- The redirect reveals nothing about an entity the visitor may not read.
- An unknown ref still shows "Entity not found" rather than guessing.

## Non-goals

- No redirect for plugins beyond catalog and TechDocs (search, scaffolder, API docs, etc.).
- No automatic rename detection, and no bulk-rewriting of existing links in the codebase.
- No UI for editing or administering rename history.
- No change to entity naming rules, validation, or the ref format itself.
- No full-suite test run (236 workspaces; repo instructions forbid it), and no `yarn build`,
  `yarn changesets version`, or `yarn release`.
- No commit, push, or pull request — this run writes files only.
