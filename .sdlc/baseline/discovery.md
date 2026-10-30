# Brownfield discovery: backstage

Run: `20261029-feature-new-entity-former-names` | Mode: first-time (full scan) | Built: 2026-10-29T06:21:23Z | Plugin: mmo 0.9.3

## Git state

- HEAD `cb8b07905b900ecb57e5c4b77fe299ff5b83de43` on branch `BS-NF-12/opus55-plus-flash38` (not master).
- Working tree **clean**.
- Remote `origin` -> `git@github.com:tl-ai-labs/backstage.git`.
- 12,365 tracked files. Large, but under the 100k sampling threshold, so this was a full scan.
- `.gitignore` does **not** list `.sdlc/`. `.git/info/exclude` does (`.sdlc/`), so in this clone `git add -A` already ignores run artifacts. The exclude file is local-only and does not travel with the repo.

## Topology

Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`, `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (162), `scripts`, `workspaces`.
Entry points: `packages/backend/src/index.ts`, `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system).

## Detected stacks

- `package.json` -> **node-typescript**: a Yarn 4.18.1 workspaces monorepo (`packages/*`, `plugins/*`) on TypeScript ~5.7 and Node 22 || 24. Frameworks: Backstage's own backend system (`createBackendPlugin`, Express routers, Knex), a React 18 frontend (old `core-*` and new `frontend-*` systems, MUI v4 and `@backstage/ui`), and Jest 30 via `backstage-cli`.
- No Python, Go, JVM, Ruby, PHP or Rust manifests.
- No shipped mmo adapter matches (generic/nest/python), so Tier 2b ran. See `.sdlc/baseline/stack-profile.md`.

## Test command

- Proposed: **`CI=1 yarn test <path>`**, from the root, always with a file or package path, never the full suite. Source: `.claude/CLAUDE.md` Development Flow. Root `scripts.test` is `backstage-cli repo test`.
- Related: `yarn tsc` (root, no options), `yarn lint --fix`, `yarn prettier --write <files>`, `yarn build:api-reports`. Forbidden: `yarn build`, `yarn changesets version`, `yarn release`.
- Requires `yarn install` first. `node_modules/` exists.

## Docs present

README.md (+4 translations), `.claude/CLAUDE.md`, `AGENTS.md` (same text as CLAUDE.md), `plugins/catalog-backend/CLAUDE.md`, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs), `beps/` (enhancement proposals), `docs/contribute/doc-style-guide.md`.

## Detected AI/agent setup

| Path                                                                                                           | Type                              |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `.claude/` (CLAUDE.md, settings.local.json, skills/catalog-db-performance.md, skills/backstage-release-notes/) | Claude Code project config        |
| `plugins/catalog-backend/CLAUDE.md`                                                                            | Package-level Claude instructions |
| `.cursor/rules/` (backstage-project.mdc, tests/test-utils.mdc, tests/backend-test-utils.mdc)                   | Cursor rules                      |
| `.github/copilot-instructions.md`                                                                              | Copilot instructions              |
| `AGENTS.md`                                                                                                    | Agents instructions               |

None found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, Continue, Roo, `routing-policy.yaml`, gemini configs.

## Env keys (names only)

- No `.env*` at the repo root. `.devcontainer/devcontainer.env` has key `NODE_OPTIONS`.
- 113 distinct `process.env.*` names in `packages/` and `plugins/` (e.g. NODE_ENV, CI, LOG_LEVEL, APP_CONFIG, AWS_REGION). All are runtime/tooling names, and none relate to this job.

## Monorepo / submodules / LFS

- Yarn workspaces, 236 packages. Per-package tests: `CI=1 yarn test <package path>`.
- Submodules: none. Git-LFS: none (no `.gitattributes`).
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, `.devcontainer/`, and 49 GitHub workflows. No terraform, GitLab CI or CircleCI.
- The husky + lint-staged pre-commit runs eslint/prettier/docs-quality and regenerates catalog-info.

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md). This is a standard OSS vulnerability-disclosure policy, not a compliance regime. There are no HIPAA, PCI, SOC2 or compliance folders, and CODEOWNERS names no security, compliance, privacy or legal teams. `regulated_repo_warning_required: true` is set per the rule, but the signal is weak.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- You have Claude Code project config at `.claude/` and package instructions at `plugins/catalog-backend/CLAUDE.md`. The latter says DB query, index or schema changes in catalog-backend must be checked against `src/tests/performance/query-battery/` (`/catalog-db-performance` skill), with `queries.md` and `baseline.md` updated.
- You have `.github/copilot-instructions.md` and `AGENTS.md`. Both stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. _Mitigation already in place locally: `.git/info/exclude` lists `.sdlc/`, so this clone is safe without touching `.gitignore`._
- Pre-commit hooks (husky/lint-staged) rewrite staged files and `catalog-info.yaml`.

## Proposed off-limits

`.git/**`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.env`, `.env.*`, `.devcontainer/devcontainer.env`, `**/node_modules/**`, `**/dist/**`, `dist-types/**`, `**/build/**`, `.yarn/**`, `.sdlc/**`, `docs/releases/**` (CLAUDE.md rule), `**/CHANGELOG.md` (release-generated), `**/report*.api.md` and `**/report*.sql.md` (generated by `yarn build:api-reports`, 316 tracked), plus ESLint, Prettier and TS config (CLAUDE.md rule).

## Job-relevant paths (feature-new: entity former names + redirects)

No existing "former name" or alias concept was found in catalog-model, catalog, techdocs or the catalog docs. The only hits are unrelated provider rename handling in the github, azure and msgraph modules.

**Catalog model (`@backstage/catalog-model` 1.10.2)**

- `packages/catalog-model/src/entity/Entity.ts`: EntityMeta types. A metadata field would go here.
- `packages/catalog-model/src/schema/EntityMeta.schema.json`: metadata JSON schema. A new field must be added or validation rejects it.
- `packages/catalog-model/src/entity/constants.ts`: well-known annotation constants. Home for an annotation-based design.
- `packages/catalog-model/src/kinds/annotations.ts`: `wellKnownAnnotationsModel` layer with annotation descriptions.
- `packages/catalog-model/src/entity/ref.ts`: parse/stringify entity refs.
- `packages/catalog-model/src/entity/policies/` and `src/validation/`: field and name validators.

**Catalog backend (`plugin-catalog-backend` 4.0.3-next.0, `plugin-catalog-node` 2.2.7-next.0, `catalog-client` 1.16.3)**

- `plugins/catalog-backend/src/service/createRouter.ts`: `GET /entities/by-name/:kind/:namespace/:name` (~line 423). The natural fallback lookup point.
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`: entitiesBatch/query implementation.
- `plugins/catalog-backend/src/service/response/`: single-entity 404 response writer.
- `plugins/catalog-backend/src/database/` + `migrations/` + `src/stitching/`: tables, search index and Knex migrations. Any change here triggers the perf-battery rule.
- `plugins/catalog-node/src/processing/`: processor types.
- `packages/catalog-client/src/CatalogClient.ts`: `getEntityByRef` used by the frontend.

**Catalog frontend (`plugin-catalog` 2.0.11-next.0, `plugin-catalog-react` 4.0.0-next.0)**

- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts`: loads the entity from route params. Has no fallback today.
- `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx`: new-frontend-system entity page.
- `plugins/catalog/src/components/EntityNotFound/EntityNotFound.tsx`: current not-found UI.
- `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx`, `src/alpha/components/EntityLayout/EntityLayoutBui.tsx`: layouts that branch to not-found.
- `plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.tsx`: banner pattern to copy for the notice.
- `plugins/catalog/src/alpha/translation.ts`: catalog translation strings.
- `plugins/catalog-react/src/hooks/useEntity.tsx`, `src/routes.ts`: EntityProvider / loading contract and `entityRouteRef`.

**TechDocs (`plugin-techdocs` 1.19.1-next.0, `techdocs-react` 1.4.1-next.0, `techdocs-backend` 2.4.1-next.0)**

- `plugins/techdocs/src/Router.tsx`: routes `/:namespace/:kind/:name/*`.
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx` + `useExternalRedirect.ts`: reader page and an existing redirect hook.
- `plugins/techdocs/src/reader/components/TechDocsRedirectNotification/TechDocsRedirectNotification.tsx`: existing redirect Snackbar notice.
- `plugins/techdocs/src/reader/components/TechDocsNotFound.tsx`, `TechDocsReaderPageContent/`: not-found handling.
- `plugins/techdocs/src/alpha/components/TechDocsReaderPage.tsx`, `TechDocsReaderContent.tsx`: new-frontend-system reader.
- `plugins/techdocs/src/client.ts`, `src/translation.ts`: metadata client and `redirectNotification` strings.
- `plugins/techdocs-react/src/context.tsx`: `TechDocsReaderPageProvider` loads entity metadata by ref.
- `plugins/techdocs-backend/src/service/router.ts`, `CachedEntityLoader.ts`: `/metadata/entity/:namespace/:kind/:name`, backend entity loading.

**Docs and release**

- `docs/features/software-catalog/well-known-annotations.md`: annotation docs.
- `docs/features/software-catalog/descriptor-format.md`: metadata field docs.
- `docs/features/techdocs/`: TechDocs how-tos and FAQ.
- `.changeset/`: 42 pending entries. Edit these files directly and never use the changeset CLI.

## Notes

- Scan completed within the timebox. Env values were never read.
