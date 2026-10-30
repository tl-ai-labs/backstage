# Brownfield discovery — Backstage

- **Run** `20261030-072000-feature-new-entity-former-names`
- **Mode** `first-time` (full Tier 1 scan + Tier 2b stack profile)
- **Built** 2026-10-30T07:21:29Z · plugin 0.9.3
- **Repo root** `/Users/macbook/Documents/GitHub/Google-Projects/backstage`

> Scale note: 12,364 git-tracked files, 324 directories at depth 2, 236 workspaces
> (74 under `packages/`, 162 under `plugins/`). This snapshot is deliberately
> pointer-based — it names directories and representative files, not every file.

## Git state

| field | value |
| --- | --- |
| HEAD | `f20fd9b598285c88401406b3812fe00d7708136c` |
| branch | `BS-NF-12/flash-agsdk-only-v38` |
| dirty | **no** — clean tree, valid rollback anchor |
| origin | `https://github.com/tl-ai-labs/backstage.git` (fork) |
| upstream | `https://github.com/backstage/backstage.git` |
| `.sdlc/` gitignored | **no** |

## Directory topology

Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`,
`.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`,
`docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`.

Entry points: `packages/app/src/index.tsx` (example app, new frontend system),
`packages/backend/src/index.ts` (example backend).

## Detected stacks

Primary: **node-typescript, Yarn Berry workspaces** (`yarn@4.18.1`, `nodeLinker: node-modules`,
TypeScript `~5.7`, engines `node 22 || 24`). Root `package.json` is private, named `root`, version `1.57.0-next.0`.

| manifest | stack | frameworks |
| --- | --- | --- |
| `package.json` | node-typescript | yarn-berry-workspaces, backstage, react, jest, playwright, storybook |
| `plugins/catalog-backend/package.json` | node-typescript | express, knex, zod, backend-plugin-api |
| `plugins/catalog/package.json` | node-typescript-react | react, material-ui v4, core-plugin-api, frontend-plugin-api |
| `docs-ui/package.json` | node-typescript-react | next, mdx, base-ui (separate install) |
| `microsite/package.json` | node-typescript-react | docusaurus (separate install) |
| `workspaces/ui/package.json` | node-typescript | nested independent workspace root, own `yarn.lock` |
| `mkdocs.yml` | docs | mkdocs — no python package manifest at root |

No Go, Rust, Java, Ruby, PHP or Elixir manifests. No root `pyproject.toml`/`requirements.txt`.

## Test / build commands

**Proposed test command:** `CI=1 yarn test <path>` — source: `package.json#scripts.test`
(`NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`), corroborated by
`.claude/CLAUDE.md` → Development Flow.

Probed live on one small file and it **passed**:

```
CI=1 NODE_OPTIONS='--experimental-vm-modules' yarn test plugins/catalog-backend/src/database/conversion.test.ts
→ 1 suite passed, 3 tests passed, 2.2s
```

A **path argument is mandatory** — repo instructions say never run the whole suite, and on a
236-workspace monorepo a full run is not a usable gate.

Supporting commands: `yarn tsc` (typecheck, root only, no options), `yarn lint --fix`,
`yarn prettier --write <paths>`, `yarn build:api-reports` (required before a PR that touches a
workspace package's public API), `yarn test:e2e` (Playwright).

**Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`, and the changeset CLI
(even for inspection — edit `.changeset/*.md` by hand).

`node_modules/` is installed and `node_modules/.bin/backstage-cli` resolves, so no `yarn install`
is needed before the gate runs.

## Docs

Present: `README.md` (+ fr/ja/ko/zh translations), `AGENTS.md`, `.claude/CLAUDE.md`,
`CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
`docs/architecture-decisions/` (ADRs), `beps/` (Backstage Enhancement Proposals),
`docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `mkdocs.yml`,
`.changeset/README.md`.

Absent: `ARCHITECTURE.md`; there is no repo-root `CLAUDE.md` — the project instructions live at
`.claude/CLAUDE.md` and are mirrored in `AGENTS.md`, `.cursor/rules/backstage-project.mdc` and
`.github/copilot-instructions.md`.

## Detected AI/agent setup

| path | type |
| --- | --- |
| `.claude/` | Claude Code project config |
| `.claude/CLAUDE.md` | project instructions |
| `.claude/settings.local.json` | local settings — sets `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` |
| `.claude/skills/catalog-db-performance.md` | Claude skill |
| `.claude/skills/backstage-release-notes/SKILL.md` | Claude skill |
| `.cursor/rules/backstage-project.mdc` | Cursor rule (`alwaysApply: true`) |
| `.cursor/rules/tests/test-utils.mdc` | Cursor rule |
| `.cursor/rules/tests/backend-test-utils.mdc` | Cursor rule |
| `.github/copilot-instructions.md` | Copilot instructions |
| `.sdlc/project.json` | mmo project config — `default_policy: flash-agsdk-only-v38` |

Absent: `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, `.aider.conf.*`, `.continue/`, `.roo/`,
any `routing-policy.yaml`, any `gemini*.{yaml,json}`.

## Env keys

**No `.env` file of any kind exists** in the working tree or in git. `env_keys_by_file` is empty.
`.gitignore` already ignores `.env`, `.env.test`, `.envrc` (lines 103-105).

41 env var **names** were found referenced in source (names only, no values ever read) — mostly
cloud-integration and CI names: `APP_CONFIG`, `AWS_*`, `AZURE_*`, `BACKSTAGE_*`, `CI`,
`GITHUB_TOKEN`, `KUBERNETES_*`, `POSTGRES_*`, `MYSQL_CONNECTION`, `LOG_LEVEL`, `NODE_ENV`,
`PORT`, `PLAYWRIGHT_URL`, `TECHDOCS_TEST_SECRET`, `FOSSA_API_KEY`. Full list in `baseline.json`.

## Monorepo, submodules, LFS

- **Yarn Berry workspaces**, globs `packages/*` and `plugins/*` — 74 + 162 = 236 packages, not enumerated.
- Nested **independent** installs outside the root workspace: `workspaces/ui` (own `yarn.lock`), `microsite`, `docs-ui`.
- **Submodules:** none (`.gitmodules` absent).
- **Git-LFS:** none (`.gitattributes` absent).
- Per-package testing: `CI=1 yarn test <path-under-package>`.

## Infra

`packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*`;
`docker-compose.deps.yml`; **49** GitHub Actions workflows; Husky hooks + lint-staged.
No Terraform, GitLab CI, CircleCI or Jenkins.

## Regulated-repo signals

One weak signal only: a standard OSS `SECURITY.md`. No `HIPAA/`, `PCI/`, `SOC2/`, `GDPR`,
`compliance/` or `regulated/` paths; no CODEOWNERS entries for security-team, compliance-team,
privacy-team or legal. **Not** flagged as a regulated repo — `regulated_repo_warning_required: false`.

## Coexistence risks

- **Cursor rules detected** at `.cursor/rules/backstage-project.mdc` (`alwaysApply: true`) plus two
  rules under `.cursor/rules/tests/`. The plugin will never touch them, but if you have Cursor's
  auto-lint running on save, changes we make may trigger it.
- **Copilot instructions detected** at `.github/copilot-instructions.md`. Untouched by default.
- **Claude Code project config detected** (`.claude/CLAUDE.md`, `.claude/skills/`,
  `.claude/settings.local.json`). Untouched by default. Note that `.claude/settings.local.json`
  exports `GOOGLE_CLOUD_PROJECT=temp-genmedia-study` and `GOOGLE_CLOUD_LOCATION=global` into the
  environment, which the model-dispatch MCP server inherits — expect Vertex-backed Gemini auth here.
- **No custom `.mcp.json`** — no repo-level MCP servers registered.
- **No repo-local `routing-policy.yaml`.** `.sdlc/project.json` pins `default_policy:
  flash-agsdk-only-v38`; pass `--policy <name>` to override.
- **`.sdlc/` is not gitignored.** Run artifacts under `.sdlc/` (packets, backups, telemetry) will be
  untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing,
  append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- **Husky + lint-staged are active.** Any commit the plugin makes gets rewritten by `eslint --fix`
  and `prettier --write` on staged files, and may regenerate `catalog-info.yaml` files.
- **Fork + feature branch.** HEAD is `BS-NF-12/flash-agsdk-only-v38` on fork `tl-ai-labs/backstage`,
  not `master` on upstream. PRs default to the fork.

## Repo hard rules downstream phases must honor

1. Every new `.ts/.tsx/.js/.jsx` file needs an Apache 2.0 header with the **current** year; never
   bump the year on existing files.
2. Published changes under `/packages` or `/plugins` need **changeset coverage** in `.changeset/*.md`,
   hand-edited. Breaking → minor for <1.0.0 / major for ≥1.0.0; feature → minor for ≥1.0.0 / patch for <1.0.0.
3. Match the **individual package's** style; per-package consistency beats repo-wide consistency.
4. Tests: fewer, thorough, multi-assertion. RTL → `screen` + `findBy*`, no test IDs in implementation.
5. Behavior changes need docs; feature guides belong in `/docs`, not package READMEs.
6. Run `yarn build:api-reports` before a PR that changes a package's public API.
7. Never touch ESLint / Prettier / TypeScript config, `docs/releases/**`, or `CHANGELOG.md` files.

## Proposed off-limits

```
.git/**                    .sdlc/**                 .env  .env.*  .envrc
.claude/**                 .cursor/**               .github/copilot-instructions.md
.mcp.json                  routing-policy.yaml
node_modules/**            **/node_modules/**       .yarn/**
dist/**  **/dist/**        dist-types/**            dist-workspace/**  dist-storybook/**
build/**                   .next/**                 coverage/**        **/__snapshots__/**
yarn.lock                  workspaces/ui/yarn.lock
**/report*.api.md          packages/*/report*.api.md  plugins/*/report*.api.md
**/src/schema/openapi/generated/**   **/*.generated.ts   **/catalog-info.yaml
.patches/**                microsite/**             docs-ui/**         contrib/**
docs/releases/**
```

Rationale for the less obvious entries: `report*.api.md` and `catalog-info.yaml` and the OpenAPI
`generated/` trees are **tool-generated**; `docs/releases/**` is protected by repo instruction;
`microsite/`, `docs-ui/` and `contrib/` are separate installs irrelevant to a catalog capability —
re-include them at Gate 0 if you disagree.

## Areas relevant to the planned work

Pointers only, recorded so later phases do not have to re-scan. This is **not** a scope decision.

- **Entity model / refs** — `packages/catalog-model/src/entity/` (`Entity.ts`, `ref.ts`),
  `packages/catalog-model/src/schema/`
- **Catalog backend** — `plugins/catalog-backend/src/service/createRouter.ts`,
  `DefaultEntitiesCatalog.ts`, `CatalogPlugin.ts`, `src/database/`, `src/stitching/`,
  `src/schema/openapi/`, `migrations/`, `config.d.ts`
- **Catalog client** — `packages/catalog-client`
- **Catalog frontend** — `plugins/catalog/src/routes.ts`, `plugins/catalog/src/plugin.ts`,
  `plugins/catalog/src/alpha/`, `plugins/catalog-react`
- **TechDocs** — `plugins/techdocs/src/routes.ts`, `src/Router.tsx`, `src/reader/`, `src/alpha/`,
  `plugins/techdocs-backend`, `plugins/techdocs-node`
- **Docs + changeset** — `docs/features/software-catalog`, `docs/features/techdocs`, `docs/conf`, `.changeset/`

Two shape constraints worth knowing up front: (a) both frontend systems are live — legacy
`core-plugin-api` route refs in `src/routes.ts`/`src/plugin.ts` **and** the new
`frontend-plugin-api` blueprints in `src/alpha/` — so a routing/redirect change likely needs both
paths; (b) persisting former names implies a **knex migration** under
`plugins/catalog-backend/migrations/` which must work on both Postgres and SQLite.

## Stack profile

Tier 2b triggered: the dominant stack (Backstage monorepo — React + Express/knex, with its own
plugin/blueprint wiring) has no pre-authored adapter (shipped: `generic.md`, `nest.md`, `python.md`).
Learned conventions written to `.sdlc/baseline/stack-profile.md`.
