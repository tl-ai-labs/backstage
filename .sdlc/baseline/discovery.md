# Brownfield discovery: backstage

Run `20261104-130720-feature-new-entity-rename-redirect`, mode `first-time`, intent hint `feature-new`.
Built 2026-11-04T07:39Z. Tier 1 scan plus Tier 2b stack profile (no shipped adapter matches this stack).

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` (committed 2026-10-27), branch `BS-NF-12/argon4-agsdk-only`, working tree clean.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- 12,364 tracked files (below the 100k sampling threshold, so this was a full scan).
- `.gitignore` does not list `.sdlc/`. `.sdlc/` is ignored only through `.git/info/exclude` (line 7), which is local to this clone.

## Directory topology
Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`,
`.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`, `docs`, `docs-ui`, `microsite`, `packages` (74),
`plugins` (162), `scripts`, `workspaces`.
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old
frontend system), `packages/backend/src/index.ts`.

### Areas the follow-up job touches
| Path | Package | Version | Role |
| --- | --- | --- | --- |
| plugins/catalog-backend | @backstage/plugin-catalog-backend | 4.0.3-next.0 | backend-plugin |
| plugins/catalog-node | @backstage/plugin-catalog-node | 2.2.7-next.0 | node-library |
| packages/catalog-client | @backstage/catalog-client | n/a | common client (OpenAPI-generated parts) |
| packages/catalog-model | @backstage/catalog-model | 1.10.2 | common-library |
| plugins/catalog-react | @backstage/plugin-catalog-react | 4.0.0-next.0 | web-library |
| plugins/catalog | @backstage/plugin-catalog | 2.0.11-next.0 | frontend-plugin |
| plugins/techdocs | @backstage/plugin-techdocs | 1.19.1-next.0 | frontend-plugin |
| plugins/techdocs-react | @backstage/plugin-techdocs-react | 1.4.1-next.0 | web-library |
| plugins/techdocs-backend | @backstage/plugin-techdocs-backend | 2.4.1-next.0 | backend-plugin |
| docs/features/software-catalog | docs | | life-of-an-entity, descriptor-format, configuration, faq, references, ... |
| docs/features/techdocs | docs | | how-to-guides, FAQ, configuration, troubleshooting, ... |

Relevant hooks found: catalog-backend serves `GET /entities/by-name/:kind/:namespace/:name`
(`src/service/createRouter.ts`), with knex migrations in `migrations/` (latest `20261007000000`). The entity page
loads through `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts`
(`catalogApi.getEntityByRef`). TechDocs already has a `TechDocsRedirectNotification` Snackbar
(`plugins/techdocs/src/reader/components/`). Details are in `.sdlc/baseline/stack-profile.md`.

## Detected stacks
- `package.json` -> **node-typescript** (Yarn 4.18.1 workspaces, Node 22 || 24, TypeScript ~5.7). Frameworks:
  Backstage (backend system, new and old frontend systems), React, react-router, Material UI v4, Express, knex,
  Jest 30, Testing Library, MSW, Storybook, Playwright, zod.
- No other stack manifests at root (no pyproject, go.mod, Cargo.toml, Gemfile, pom/gradle, composer, mix).

## Test command (proposed)
`CI=1 yarn test <path>`. Source: `package.json#scripts.test` (`backstage-cli repo test`) together with the repo's
`AGENTS.md`, which says to always pass a path and never run the whole suite. Per area:
`CI=1 yarn test plugins/catalog-backend`, `... plugins/catalog-react`, `... plugins/catalog`, `... plugins/techdocs`,
`... packages/catalog-model`. Gate 0 must confirm this.
Other repo rules: typecheck with `yarn tsc` (root, no options), format changed files with `yarn prettier --write <paths>`,
`yarn lint --fix`, `yarn build:api-reports` for public API changes. Never run `yarn build`, `yarn changesets version`,
`yarn release` or the changeset CLI. `node_modules` is installed.

## Docs present
README.md (+4 translations), AGENTS.md (the target of `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` symlinks),
CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, ADRs in `docs/architecture-decisions/` (adr000-adr015),
`docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `.github/PULL_REQUEST_TEMPLATE.md`.

## Detected AI/agent setup
- `.claude/` (Claude Code project dir): `CLAUDE.md` (symlink to `../AGENTS.md`), `settings.local.json` (gitignored), `skills/` (`backstage-release-notes/SKILL.md`, `catalog-db-performance.md`)
- `.cursor/rules/`: `backstage-project.mdc` (symlink to `../../AGENTS.md`), `tests/backend-test-utils.mdc`, `tests/test-utils.mdc`
- `.github/copilot-instructions.md`
- `AGENTS.md`
- Not present: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `CLAUDE.local.md`, `routing-policy.yaml`, `gemini*.yaml/json`.

## Env keys (names only)
- No `.env*` files exist (none tracked, none on disk to depth 4).
- About 85 env var names are referenced in code via `process.env.*` (for example `NODE_ENV`, `LOG_LEVEL`, `BACKSTAGE_ENV`,
  `APP_CONFIG`, `POSTGRES_HOST/PORT/USER/PASSWORD`, `GITHUB_TOKEN`, `AWS_*`, `AZURE_*`). The full list is in baseline.json.
  None are specific to the catalog-rename feature.

## Monorepo, submodules, LFS
- Monorepo: Yarn workspaces (`packages/*`, `plugins/*`); 74 packages + 162 plugins. `workspaces/ui` is a separate workspace dir outside the root globs.
- Submodules: none (no `.gitmodules`).
- Git LFS: none (no `.gitattributes`).
- Encrypted secrets (git-crypt, sops, .gpg/.age/.enc): none found.

## Infra hints
`packages/backend/Dockerfile`, `docker-compose.deps.yml`, `.devcontainer/`, 49 GitHub workflows in `.github/workflows/`.
No Terraform, GitLab CI, CircleCI or Jenkins. Husky `pre-commit` runs `yarn lint-staged`.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy-file) at repo root.

This is the standard open-source vulnerability-disclosure policy. There are no HIPAA, PCI, SOC2 or GDPR files or folders,
and no security, compliance, privacy or legal teams in CODEOWNERS. The rule still sets `regulated_repo_warning_required: true`,
so Gate 0 prints the standard warning.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. (In this clone `.sdlc/` is already hidden through `.git/info/exclude`, so `git add -A` skips it here; the gap only matters for other clones.)
- Claude Code project config (`.claude/`) and GitHub Copilot instructions are present. They stay untouched and off-limits.
- Husky pre-commit runs lint-staged (`eslint --fix`, `prettier --write`, docs-quality check, `generate-catalog-info`, `sort-package-json`) on every commit, so commits can rewrite staged files.
- No custom `.mcp.json`, no Aider config, no repo-local `routing-policy.yaml`.

## Proposed off-limits
- AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`
- Env: `.env`, `.env.*`, `.env.local`
- Build/generated: `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `docs/reference/**`, `**/src/schema/openapi/generated/**` (catalog-backend and catalog-client generated OpenAPI code)
- Tooling and lockfile: `.yarn/releases/**`, `.yarn/plugins/**`, `.yarn/patches/**`, `yarn.lock`
- Repo rules (AGENTS.md): `docs/releases/**`, ESLint, Prettier and TypeScript config (`.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`)
- `.git/**`, `.sdlc/**` (the plugin's own area is auto-allowlisted)
- Submodules and LFS: none

Tool-maintained, not hand-edited: `**/report*.api.md` (regenerated by `yarn build:api-reports` when public APIs change).

## Notes
- Pre-existing test health was not measured. Tier 1 does not run tests, and Gate 0 or Phase 7 should get a baseline for the touched packages before any change.
- `.sdlc/pre-check-status.json` shows `ok: false` only because `discovery_smoke` is still pending (the orchestrator records it) and the test-command probe was skipped.
