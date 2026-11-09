# Brownfield discovery — 20261109-123528-feature-new-entity-former-names

Mode: first-time (full Tier 1 scan). Built 2026-11-09T07:07:05Z. Plugin mmo 0.10.1.
Intent hint: feature-new (remember an entity's former names in the catalog; redirect old entity-page and
TechDocs links to the renamed entity, with a notice).

## 1. Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` (committed 2026-10-27) on branch `BS-NF-12/opus55-plus-flash38-agsdk`.
- This folder is a git worktree (common dir `/Users/apple/bf/backstage/.git`) and is the git top level. Precondition passed.
- Remote: `origin` -> https://github.com/tl-ai-labs/backstage.git
- Dirty: only `.sdlc/` is untracked (this plugin's own state). No other changes.
- `.gitignore` does NOT cover `.sdlc/` (`gitignore_covers_sdlc: false`); not in `info/exclude` either.

## 2. Topology
12,364 tracked files, 324 dirs at depth 2. No sampling needed.
Top level: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn
beps contrib docs docs-ui microsite packages plugins scripts workspaces`.
Entry points: `packages/backend/src/index.ts`, `packages/app/src/index.tsx` (new frontend system),
`packages/app-legacy/src/index.tsx` (old frontend system).

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| `package.json` | node-typescript (Yarn 4.18.1, Node 22/24, TS ~5.7) | Backstage, React, Express, knex, Jest 30, React Testing Library, Storybook, Playwright, OpenAPI codegen |

No other language manifests at the root.

## 4. Test / build / run
- Proposed test command: **`CI=1 yarn test <path>`** (from AGENTS.md; `package.json#scripts.test` = `backstage-cli repo test`). Always pass a path, never run the whole suite.
  - For this intent: `CI=1 yarn test packages/catalog-model`, `plugins/catalog-backend`, `packages/catalog-client`, `plugins/catalog`, `plugins/techdocs`.
- Type check: `yarn tsc` at the root only, no options. Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`.
- API reports: `yarn build:api-reports` before PR when a package's public API changes.
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`, any changeset CLI.
- Gate 0 still confirms the command.

## 5. Docs
README.md (+ fr/ja/ko/zh translations), AGENTS.md (the real project instructions; `.claude/CLAUDE.md` is a
symlink to it), `plugins/catalog-backend/CLAUDE.md`, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md,
`docs/architecture-decisions/` (ADRs), `beps/` (enhancement proposals), `docs/contribute/doc-style-guide.md`,
`.github/PULL_REQUEST_TEMPLATE.md`. Docs sections relevant to this feature: `docs/features/` (software catalog, TechDocs).

## Detected AI/agent setup
| Path | Type |
|---|---|
| `.claude/` | Claude Code project dir |
| `.claude/CLAUDE.md` | symlink -> `../AGENTS.md` (in-repo target) |
| `.claude/settings.local.json` | gitignored local settings with an `env` block (key names: CLAUDE_CODE_SUBAGENT_MODEL, GOOGLE_CLOUD_PROJECT, CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT; values not read) |
| `.claude/skills/` | `catalog-db-performance.md`, `backstage-release-notes/SKILL.md` |
| `AGENTS.md` | agent instructions |
| `plugins/catalog-backend/CLAUDE.md` | package-level Claude instructions (DB performance battery) |
| `.cursor/rules/` | 3 Cursor `.mdc` rule files |
| `.github/copilot-instructions.md` | Copilot instructions |

Not present: `.claude/settings.json`, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

## 7. Env keys (names only)
No `.env*` files anywhere (depth 4, excluding node_modules/dist). `env_keys_all: []`.
Code references ~120 env names (mostly CI/tooling: `GITHUB_TOKEN`, `AWS_*`, `AZURE_*`, `POSTGRES_*`,
`BACKSTAGE_*`, `NODE_ENV`, ...). None look relevant to this feature. Full list in `baseline.json`.

## 8. Monorepo, submodules, LFS, infra
- Monorepo: Yarn workspaces `packages/*` (74 dirs) and `plugins/*` (162 dirs). `workspaces/ui` is a separate workspace root with its own lockfile.
- Intent-relevant packages all exist: `packages/catalog-model`, `packages/catalog-client`, `plugins/catalog-backend`, `plugins/catalog`, `plugins/catalog-react`, `plugins/techdocs`, `plugins/techdocs-backend`.
- Submodules: none. LFS: none (no `.gitattributes`).
- Infra: 49 GitHub workflows, `docker-compose.deps.yml`, Dockerfiles (`packages/backend`, `contrib/docker/*`, `.devcontainer`), Husky + lint-staged pre-commit hooks.
- Generated code: OpenAPI output under `**/src/schema/openapi/generated/**` (11 dirs). The catalog API spec is
  `plugins/catalog-backend/src/schema/openapi.yaml`; `yarn --cwd plugins/catalog-backend generate` rewrites both
  `plugins/catalog-backend/src/schema/openapi/generated/**` and `packages/catalog-client/src/schema/openapi/generated/**`.
- Tool-regenerated files: `report*.api.md`, `report.sql.md`, `knip-report.md`, per-package `catalog-info.yaml`, `CHANGELOG.md`.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy-file) at the repo root.

This is Backstage's standard open-source vulnerability disclosure policy. No HIPAA/PCI/SOC2/GDPR files,
no compliance dirs, no security/compliance/privacy/legal teams in CODEOWNERS. The flag is set
(`regulated_repo_warning_required: true`) because the rule matches, but it is very likely a false positive.

## Existing code relevant to the intent
- TechDocs already has redirect handling and a notice: `plugins/techdocs/src/reader/components/TechDocsRedirectNotification/`,
  `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts`,
  `plugins/techdocs/src/reader/transformers/handleMetaRedirects.tsx`.
- Entity-page notice pattern: `plugins/catalog/src/components/EntityOrphanWarning/`; not-found page: `plugins/catalog/src/components/EntityNotFound/`.
- Entity lookup by name: `GET /entities/by-name/:kind/:namespace/:name` in `plugins/catalog-backend/src/service/createRouter.ts`.
- DB migrations: `plugins/catalog-backend/migrations/` (latest `20261007000000_stitch_failure_count.js`).
- Entity metadata schema: `packages/catalog-model/src/schema/EntityMeta.schema.json`; annotations in `packages/catalog-model/src/entity/constants.ts`.
- The entity page exists in both frontend systems (`plugins/catalog/src/components/` + `routes.ts` and `plugins/catalog/src/alpha/pages.tsx`).

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- `.claude/` holds project Claude Code config (AGENTS.md symlink, two skills, a gitignored `settings.local.json` with an env block). Untouched by the plugin. `plugins/catalog-backend/CLAUDE.md` asks for the `/catalog-db-performance` battery before and after any catalog DB query, index or schema change; this feature probably adds one.
- `.github/copilot-instructions.md` present. Untouched.
- Husky + lint-staged run `eslint --fix`, `prettier`, `generate-catalog-info` and package.json sorting at commit time, so commits may rewrite staged files.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- If the feature changes the catalog REST API, the OpenAPI generated dirs (proposed off-limits) must be moved into scope at Gate 0 so the generator output can land.
- No `.mcp.json`, no Aider config, no repo-local `routing-policy.yaml`.

## Proposed off-limits
- `.git/**`
- `.env`, `.env.*`, `.env.local` (none exist; kept as a guard)
- `.claude/**`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.cursor/**`, `.github/copilot-instructions.md`
- `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `dist-storybook/**`, `build/**`, `**/build/**`
- `.yarn/**` (vendored yarn release, patches, install state)
- `**/schema/openapi/generated/**`, `plugins/events-node/src/generated/**` (autogenerated)
- `docs/releases/**` (AGENTS.md: never edit release notes unless asked)
- `**/CHANGELOG.md` (release workflow writes these; use `.changeset/*.md`)
- `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `.eslintignore`, `tsconfig.json` (AGENTS.md: never edit lint/format/TS config unless asked)

Not off-limits but tool-owned (regenerate rather than hand-edit): `report*.api.md`, `report.sql.md`, `knip-report.md`, per-package `catalog-info.yaml`.

## Stack profile (Tier 2b)
Built: `.sdlc/baseline/stack-profile.md`. Trigger: node-typescript Backstage (React + Express + knex) has no
pre-authored adapter (shipped: generic, nest, python). Sampled 11 files across the intent packages.
