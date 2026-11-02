# Brownfield discovery — Backstage monorepo

Built from HEAD `f20fd9b59828` on branch `BS-NF-12/argon4-plus-sonnet55`. Mode: first-time, full Tier 1 scan, no sampling. The repo has 12,364 tracked files and 19 top-level directories, below the large-repo thresholds.

## Git state

- Head: `f20fd9b598285c88401406b3812fe00d7708136c`, 0 commits ahead of `master`. `origin/master` is at the same commit.
- Working tree: clean.
- This folder is a linked worktree of `/Users/apple/Documents/GitHub/backstage`, and it is the git toplevel.
- Remotes: `origin` is `tl-ai-labs/backstage`, `upstream` is `backstage/backstage`.
- `gitignore_covers_sdlc: false`. The tracked `.gitignore` has no `.sdlc` entry, but `.git/info/exclude` in the shared git dir does, so `.sdlc/` is ignored in practice.

## Topology

Visible top-level directories: `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`. Dot directories include `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`. An ignored `dist-types/` also exists at the root.

## Detected stacks

- `package.json`: node-typescript. The workspace manifests show React (62), Express (45) and Knex (17) on the Backstage plugin framework, with no NestJS. Node 22 or 24, TypeScript ~5.7, Yarn 4.18.1.
- `docs-ui/package.json`: Next.js and React. Separate private project with its own `yarn.lock`.
- `microsite/package.json`: Docusaurus and React. Separate private project with its own `yarn.lock`.
- `workspaces/ui/package.json`: separate project with its own `yarn.lock`.

No shipped adapter fits beyond `generic.md`, so Tier 2b ran and wrote `.sdlc/baseline/stack-profile.md`.

## Test, build and run scripts

- Proposed test command: `CI=1 yarn test <path>`, from `package.json#scripts.test` narrowed by `.claude/CLAUDE.md`. The bare `yarn test` is not proposed because the project says to always provide a path. Gate 0 needs to confirm this form and supply the paths.
- Type check: `yarn tsc`, from the root with no options.
- Lint: `yarn lint --fix`. The script compares against `origin/master`.
- Format: `yarn prettier --write <paths>`.
- API reports: `yarn build:api-reports`.
- Tests were not run. Tier 1 does not run them, so the baseline test health is unknown.

## Docs

Present: `README.md` and four translations, `AGENTS.md`, `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `plugins/catalog-backend/CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (17 entries), `beps/`, `docs/features/search/README.md`, `docs/features/techdocs/README.md`. There is no repo-root `CLAUDE.md`, no `ARCHITECTURE.md`, and none of `docs/adr/`, `docs/decisions/` or `adr/`.

## Detected AI/agent setup

- `.claude/`: `CLAUDE.md` symlink, gitignored `settings.local.json`, and `skills/`. There is no `.claude/settings.json`.
- `.cursor/rules/`: `backstage-project.mdc` (symlink to `AGENTS.md`) and two test `.mdc` files.
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `plugins/catalog-backend/CLAUDE.md`

Not found: `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `CLAUDE.local.md`, `routing-policy.yaml`, `gemini*.yaml`, `gemini*.json`. Both symlinks stay inside the repo.

## Env keys

No `.env*` files are tracked or present to depth 3, so `env_keys_by_file` and `env_keys_all` are empty. The source references 132 distinct env var names, recorded in `baseline.json` as names only. Docs, markdown, `microsite/` and `.yarn/` were excluded from that grep.

## Source topology

- Monorepo: Yarn workspaces, 235 packages under `packages/*` and `plugins/*`, all listed in `baseline.json`. Per-package tests run with `CI=1 yarn test <package-root>` from the root.
- Submodules: none.
- Git LFS: none. There is no `.gitattributes`.
- Encrypted secrets: none found. No `.gpg`, `.enc`, `.sops.yaml`, git-crypt or key files are tracked.
- Entry points: `packages/backend/src/index.ts`, `packages/app/src/index.tsx`, `packages/app-legacy/src/index.tsx`.
- Infra: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `docker-compose.deps.yml`, `contrib/terraform/`, and 49 entries in `.github/workflows/`.

## Local install

`node_modules` is installed. `.yarn/install-state.gz` and `node_modules/.yarn-state.yml` are dated 30 Oct, newer than `yarn.lock`, and workspace symlinks resolve inside this worktree. Node is 24.22.1 and Yarn is 4.18.1, both matching the repo's requirements. `yarn install` was not re-run to verify this.

## Regulated-repo signals

- `security-policy-file`: `SECURITY.md`

This looks like the standard open source security policy, not a compliance marker, and `.github/CODEOWNERS` has no matching entries. The flag is set because the rule is presence-based, so Gate 0 prints its warning.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- Discovery correction to the note above: `.sdlc/` is already ignored through the shared `.git/info/exclude`, so `git add -A` skips it today in this worktree. The `.gitignore` edit is not needed for safety here.
- A husky pre-commit hook runs `yarn lint-staged`, so commits trigger eslint and prettier, and markdown commits also run the docs quality check.

## Proposed off-limits

- `.git/**`, `.env`, `.env.*`, `.env.local`
- `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`
- `node_modules/**`, `**/node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`
- `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`
- `**/report*.api.md`, `**/report.sql.md`, `**/knip-report.md`

`build/**` is anchored to the root on purpose, because `packages/cli-module-build/src/commands/package/build` is tracked source. Paths such as `.env` are listed as defaults although none exist today.

## Run context — entity former names and redirects

Job: remember an entity's former names in the catalog, and redirect old entity-page and TechDocs links to the renamed entity with a notice.

### Packages most likely involved

| Package | Version | Likely role |
| --- | --- | --- |
| `packages/catalog-model` | 1.10.2 | Field or annotation for former names, `EntityMeta.schema.json`, constants |
| `plugins/catalog-backend` | 4.0.3-next.0 | Persistence, lookup, `openapi.yaml`, migrations |
| `packages/catalog-client` | 1.16.3 | Client method and generated client |
| `plugins/catalog-node` | 2.2.7-next.0 | Backend catalog service surface, if the lookup is exposed there |
| `plugins/catalog-react` | 4.0.0-next.0 | Shared entity route helpers and hooks |
| `plugins/catalog` | 2.0.11-next.0 | Entity page redirect and notice, in both frontend systems |
| `plugins/techdocs` | 1.19.1-next.0 | Reader redirect and notice |
| `plugins/techdocs-backend` | 2.4.1-next.0 | Triplet-keyed API routes, if the backend must resolve old names |

Possibly involved: `plugins/techdocs-react` (`buildTechDocsURL`), `plugins/techdocs-common` (annotation constants), `plugins/techdocs-node` (storage paths), and `plugins/search-backend-module-catalog` and `plugins/search-backend-module-techdocs` if old search results matter.

### Existing rename, alias and redirect concepts

No entity-level rename, former-name or alias concept exists in these packages. Searches for former names, previous names, old names, entity renames and aliases found nothing relevant in the core catalog or TechDocs packages. The nearby concepts are below.

- **Location moves, not entity renames.** `plugins/catalog-node/src/scmEvents/types.ts` defines SCM events such as `location.moved`, and `plugins/catalog-backend/src/providers/DefaultLocationStore.ts` handles them. The Azure and GitHub provider modules also react to repository renames. These track where a file lives, not what an entity was called.
- **TechDocs external redirect.** `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` looks up the entity from the URL and calls `navigate(url, { replace: true })` when the `backstage.io/techdocs-entity` annotation points elsewhere. `TechDocsReaderPage.tsx` calls it and shows a spinner meanwhile. This is the closest pattern for the TechDocs half, but it discards lookup errors and treats a missing entity as "no redirect".
- **TechDocs in-page redirect notice.** `plugins/techdocs/src/reader/transformers/handleMetaRedirects.tsx` and `TechDocsRedirectNotification.tsx` show a snackbar and then redirect after 3 seconds.
- **Page-level docs redirects.** The `mkdocs-redirects` plugin handles moved pages inside one docs site, as described in `docs/features/techdocs/how-to-guides.md`.
- **Case-path redirect.** `plugins/techdocs-node/src/stages/publish/local.ts` sends a 301 to the lowercase entity path.
- **Catalog notice.** `plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.tsx` shows a `@backstage/ui` `Alert`, keyed on the `backstage.io/orphan` annotation. This is a good notice pattern for the entity page.
- **Unrelated name clashes.** Entity content group `aliases` (`plugins/catalog-react/src/alpha/blueprints/extensionData.tsx`) rename tab groups, not entities. `catalog:unregister-redirect` in `plugins/catalog/src/routes.ts` is a route used after unregistering.

### Findings that affect the design

- A rename is not linked to the old entity today. `refresh_state.entity_ref` is unique and `insertUnprocessedEntity` mints a fresh `entity_id`, so a new name gets a new row. The feature therefore needs an explicit source for the mapping, or a rule for detecting it.
- `useEntityFromUrl.ts` is shared by the legacy page and the new-system page, so it is one place to serve both.
- `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx` compares the fetched entity's ref to the route params and reports `loading` when they differ. If the by-name lookup starts returning the renamed entity for an old ref, this page would stay in a loading state unless it redirects first.
- `CatalogClient.getEntityByRef` returns `undefined` for a missing entity. Its 404 path is the current signal for "not found".
- TechDocs backend routes are keyed by `:namespace/:kind/:name`, and `CachedEntityLoader` caches lookups. Backend behavior for old names, and any cached results, need a decision.

### Generated and gated files for Gate 0

The defaults above make these off-limits, but this feature will probably need them regenerated, so Gate 0 should decide how to allow that.

- Changing `plugins/catalog-backend/src/schema/openapi.yaml` requires regenerating `plugins/catalog-backend/src/schema/openapi/generated/**` and `packages/catalog-client/src/schema/openapi/generated/**`, using the package's `generate` script.
- Public API changes require regenerating `report*.api.md` through `yarn build:api-reports`. Schema changes also update `plugins/catalog-backend/report.sql.md`.
- `plugins/catalog-backend/CLAUDE.md` says changes to queries, indexes or schema should run `/catalog-db-performance` before and after, and update `src/tests/performance/query-battery/queries.md` and `baseline.md` where they apply. Decide at Gate 0 whether that applies and whether it can run here.
- A new migration goes in `plugins/catalog-backend/migrations/`. The latest is `20261007000000_stitch_failure_count.js`.
- Docs likely to change: `docs/features/software-catalog/descriptor-format.md`, `well-known-annotations.md` and `life-of-an-entity.md`, plus TechDocs docs. Do not edit `docs/releases`.
- Changesets are required for published packages. `packages/catalog-model` and `packages/catalog-client` are at 1.x or above, so new APIs take a `minor` bump. Packages below 1.0.0, such as `plugins/techdocs-common`, take `patch`.

### Suggested test paths

`packages/catalog-model`, `packages/catalog-client`, `plugins/catalog-backend`, `plugins/catalog-react`, `plugins/catalog`, `plugins/techdocs`, `plugins/techdocs-backend`.
