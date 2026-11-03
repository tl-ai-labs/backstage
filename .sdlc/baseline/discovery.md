# Brownfield discovery: Tier 1

- Run: `20261103-210033-feature-new-entity-rename-redirects` (mode: first-time, intent hint: feature-new)
- Built: 2026-11-03T15:31:48Z, plugin mmo 0.10.0
- Repo: Backstage monorepo (git worktree), root `/Users/apple/Documents/GitHub/bs-cells/BS-NF-12-argon-attempt2`

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-NF-12/argon4-plus-sonnet55`. The tree is clean.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- This checkout is a git worktree. The stash stack is shared with other worktrees, so do not use bare `git stash`.
- `.gitignore` does not cover `.sdlc/` (`gitignore_covers_sdlc: false`). However `.git/info/exclude` (line 7, shared by all worktrees of this clone) ignores `.sdlc/`, so `git status` and `git add -A` already skip run artifacts here. The exclude is local and is not committed.

## Directory topology
- The tracked tree has 12,364 files: `packages/` (74 packages) and `plugins/` (162 plugins), both yarn workspaces.
- Other top-level directories: `docs/` (the docs site source, including `docs/architecture-decisions`), `docs-ui/`, `microsite/`, `beps/` (Backstage Enhancement Proposals), `contrib/`, `scripts/`, `workspaces/ui` (a separate yarn project), `.changeset/` (42 files), `.patches/`, `.github/` (49 workflows), `.storybook/`, `.devcontainer/`.
- Example apps are the entry points: `packages/app` (new frontend system), `packages/app-legacy` (old frontend system) and `packages/backend`.

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| `package.json` (root, private, yarn@4.18.1, TS ~5.7, node 22/24) | node-typescript | Backstage (React frontend plugins, Express + Knex backend plugins), Jest 30, Playwright, Storybook |

No Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests at the root.

## Test / build commands
- **Proposed test command:** `CI=1 yarn test <path>`. Source: `package.json#scripts.test` (`backstage-cli repo test`), with the path form taken from `.claude/CLAUDE.md`. Always pass a file or package path, and never run the full suite.
- Run `yarn install` at the root first.
- Type check: `yarn tsc` from the root, with no options. Lint: `yarn lint --fix`. API reports: `yarn build:api-reports` (required before a PR that changes any package).
- **Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`.
- Gate 0 should still confirm the test command with the user.

## Docs present
README.md (+4 translations), `.claude/CLAUDE.md`, AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs), `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `beps/`.

Key project rules from CLAUDE.md/AGENTS.md:
- New source files get an Apache 2.0 header with the current year. Do not bump the year on existing files.
- Match each package's existing style.
- Changesets go in `/.changeset`, edited directly and never through the CLI. A breaking change below 1.0 is a `minor` bump. A new feature at 1.0 or above is `minor`; below 1.0 it is `patch`.
- New behavior needs docs (TSDoc, README, or `/docs/features/...`) that follow the doc style guide.
- Tests: prefer fewer, thorough tests. With RTL, use `screen` and `findBy*`, and add no test IDs.
- Never edit ESLint, Prettier or TS config, or `docs/releases`.

## Detected AI/agent setup
| Path | Type |
|---|---|
| `.claude/` | Claude Code project config |
| `.claude/CLAUDE.md` | Claude instructions |
| `.claude/settings.local.json` | Claude local settings |
| `.claude/skills/` (`backstage-release-notes`, `catalog-db-performance.md`) | Claude skills |
| `.cursor/rules/` (`backstage-project.mdc`, `tests`) | Cursor rules |
| `AGENTS.md` | agents instructions (same content as CLAUDE.md) |
| `.github/copilot-instructions.md` | GitHub Copilot |

Not present: `.mcp.json`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

Note: `.claude/skills/catalog-db-performance.md` says to run the catalog query performance battery (`plugins/catalog-backend/src/tests/performance/query-battery/`) when catalog DB queries, indexes or schema change. That applies if this feature adds a table or migration.

## Env keys (names only)
- No `.env*` files at the repo root.
- Names referenced in code include `APP_CONFIG`, `BACKSTAGE_ENV`, `POSTGRES_HOST`/`PORT`/`USER`/`PASSWORD`, `MYSQL_CONNECTION`, `GITHUB_TOKEN`, `AWS_*`, `AZURE_*`, `NODE_ENV` and `LOG_LEVEL`, plus about 90 CI and tooling names. None of them is relevant to this intent.

## Monorepo / submodules / LFS
- Yarn workspaces (`packages/*`, `plugins/*`), 235 packages. Per-package tests: `CI=1 yarn test plugins/<pkg>`.
- `workspaces/ui` is a separate yarn project with its own lockfile.
- No submodules and no git-LFS.

## Infra hints
`docker-compose.deps.yml`, `.github/workflows/` (49), `.devcontainer/`, and `contrib/terraform` (examples). There is no root Dockerfile.
Husky and lint-staged run on commit: eslint/prettier, catalog-info regeneration when `package.json` changes, and the docs quality check on `*.md`.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md). This is a standard open-source vulnerability-disclosure policy.
- There are no HIPAA/PCI/SOC2/compliance directories and no security, compliance or legal CODEOWNERS teams. Confidence that this repo is regulated is low.
- `regulated_repo_warning_required: true`, as the rule requires. Gate 0 prints the standard notice.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. **Mitigated in this clone:** `.git/info/exclude` already ignores `.sdlc/`, so a `.gitignore` edit is optional and would show up as an unrelated diff in an upstream-bound PR.
- Claude Code project config (`.claude/`) and Copilot instructions (`.github/copilot-instructions.md`) are present. They stay untouched.
- Husky pre-commit hooks rewrite files (prettier/eslint `--fix`, and `catalog-info.yaml` regeneration when `package.json` changes). Expect those side edits during commits.
- This checkout is a git worktree with a shared stash stack.

## Proposed off-limits
`.git/**`, `.env`, `.env.*`, `.claude/**`, `.cursor/**`, `.mcp.json`, `.github/copilot-instructions.md`, `AGENTS.md`, `routing-policy.yaml`, `**/node_modules/**`, `**/dist/**`, `**/dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/**`, `yarn.lock`, `**/src/schema/openapi/generated/**` (generated from `openapi.yaml`), `**/report*.api.md` and `**/knip-report.md` (regenerated by repo-tools), `docs/releases/**`, and the ESLint/Prettier/TS config files (`.eslintrc.js`, `.prettierignore`, `tsconfig.json`).

## Tier 2b: adaptive stack profile
**Triggered, not yet run.** The primary stack is Backstage: React frontend plugins and Express/Knex backend plugins. The shipped adapters (`generic.md`, `nest.md`, `python.md`) do not match it. No `.sdlc/baseline/stack-profile.md` exists. This repo is a mix of old and new frontend systems with styles that differ per package, so a profile that samples the catalog and techdocs packages is recommended.

## Relevant code locations for this intent
Intent: remember an entity's former names in the catalog, and redirect old entity-page and TechDocs links to the renamed entity with a notice.

**Existing related concepts.** There is no "previous name", "alias" or "formerly" concept in catalog or techdocs source today. The closest prior art:
- `plugins/catalog-node/src/scmEvents/types.ts` defines the SCM events `location.moved` and `repository.moved` (lines ~141-198).
- `plugins/techdocs/src/reader/components/TechDocsRedirectNotification/` is an existing redirect-notice UI.
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` handles TechDocs redirects.
- `plugins/techdocs/src/reader/transformers/handleMetaRedirects.tsx` handles mkdocs meta-refresh redirects inside docs.
- `plugins/catalog/src/components/EntityOrphanWarning/` is a prior-art warning banner on the entity page.

**Catalog model (`packages/catalog-model`)**
- `src/entity/constants.ts` holds the `ANNOTATION_*` constants (`backstage.io/view-url`, `edit-url`, ...).
- `src/location/annotation.ts` holds the location annotations.
- `src/entity/ref.ts` handles entity ref parse/stringify.
- `src/entity/Entity.ts`, `src/schema/`, `src/validation/`.

**Catalog backend (`plugins/catalog-backend`)**
- Processing: `src/processing/DefaultCatalogProcessingEngine.ts`, `DefaultCatalogProcessingOrchestrator.ts`, `ProcessorOutputCollector.ts`.
- Stitching: `src/stitching/DefaultStitcher.ts`, `src/database/operations/stitcher/performStitching.ts`, `buildEntitySearch.ts`.
- DB: `src/database/tables.ts` (refresh_state, refresh_keys, relations, final_entities, search, stitch queue), `DefaultProcessingDatabase.ts`, `DefaultCatalogDatabase.ts`, `operations/refreshState/*`, and `operations/util/deleteOrphanedEntities.ts`, which matters because a rename normally orphans the old ref.
- Migrations: `plugins/catalog-backend/migrations/`. The latest is `20261007000000_stitch_failure_count.js`.
- API: `src/service/createRouter.ts` (`GET /entities/by-name/:kind/:namespace/:name` at ~L423, `/ancestry`, `/entities/by-uid/:uid`, `POST /entities/by-refs`), `src/service/DefaultEntitiesCatalog.ts`, `AuthorizedEntitiesCatalog.ts`.
- OpenAPI: `src/schema/openapi.yaml`. Its `generated/` output is regenerated by tooling, not edited by hand.
- Performance battery: `src/tests/performance/query-battery/`.

**Catalog client (`packages/catalog-client`)**
- `src/CatalogClient.ts`: `getEntityByRef` at ~L468.
- `src/types/` holds the CatalogApi types.

**Catalog frontend**
- `plugins/catalog-react/src/routes.ts`: `entityRouteRef` (`/catalog/:namespace/:kind/:name`).
- `plugins/catalog-react/src/components/EntityRefLink/`.
- `plugins/catalog-react/src/hooks/` (`useAsyncEntity`, `useEntityListProvider`).
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` calls `catalogApi.getEntityByRef(...)` and is the natural redirect hook point.
- `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx`: not-found branch at ~L386, `NotFoundComponent` prop.
- `plugins/catalog/src/components/EntityNotFound/`.
- New frontend system: `plugins/catalog/src/alpha/pages.tsx`, `alpha/components/EntityLayout`, `alpha/components/CatalogEntityPage.tsx`, `alpha/translation.ts`.

**TechDocs**
- `plugins/techdocs/src/routes.ts`: `rootDocsRouteRef` (`/docs/:namespace/:kind/:name`), `rootCatalogDocsRouteRef`.
- `src/Router.tsx` and `src/client.ts`: `getTechDocsMetadata` and `getEntityMetadata` (`/metadata/{techdocs,entity}/:namespace/:kind/:name`).
- Reader: `src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx`, `TechDocsNotFound.tsx`, `useReaderState.ts`, `TechDocsReaderProvider.tsx`.
- `plugins/techdocs-react/src/` (`context.tsx`, `api.ts`, `hooks.ts`).
- `plugins/techdocs-backend/src/service/router.ts` (metadata routes ~L159/L193), `CachedEntityLoader.ts`, `DocsSynchronizer.ts`.

**Docs**
- `docs/features/software-catalog/`: `well-known-annotations.md`, `descriptor-format.md`, `life-of-an-entity.md` (orphaning and deletion), `references.md`, `entity-presentation.md`, `configuration.md`, `faq.md`.
- `docs/features/techdocs/`: `how-to-guides.md`, `FAQ.md`, `troubleshooting.md`, `architecture.md`.
