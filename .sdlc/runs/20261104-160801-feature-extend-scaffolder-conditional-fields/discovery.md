# Brownfield discovery: Tier 1

- Run: `20261104-160801-feature-extend-scaffolder-conditional-fields`
- Mode: first-time (full scan)
- Built: 2026-11-04T10:40:10Z
- Plugin: mmo 0.10.1
- Intent hint: feature-extend

## Git state

- HEAD: `f20fd9b598285c88401406b3812fe00d7708136c`
- Branch: `BS-FE-08/argon4-agsdk-only` (a git worktree; the shared git dir is `/Users/macbook/Documents/GitHub/Google-Projects/backstage/.git`)
- Working tree: clean
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- Tracked files: 12,364
- `gitignore_covers_sdlc`: **false**. `.gitignore` has no `.sdlc` entry. However, `.sdlc/` is ignored through the shared `.git/info/exclude` (line 7, confirmed by `git check-ignore`), so in practice `git add -A` won't stage it in this checkout.

## Directory topology

The top-level folders are `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages` (74 packages), `plugins` (161 packages), `scripts` and `workspaces` (`workspaces/ui`).

Entry points:
- `packages/app/src/index.tsx` (example app, new frontend system)
- `packages/app-legacy/src/index.tsx` (old frontend system)
- `packages/backend/src/index.ts` (example backend)

## Detected stacks

| Manifest | Stack | Frameworks |
| --- | --- | --- |
| `package.json` | node-typescript | Backstage (Yarn 4.18.1 workspaces, Node 22 or 24), React, Express, Jest |
| `workspaces/ui/package.json` | node-typescript | A separate Yarn workspace with its own lockfile. Its README says it is a work in progress and not in use. |

There are no Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests at the repo root. `mkdocs.yml` is docs tooling only.

Scaffolder stack details:
- The frontend (`plugins/scaffolder`, `plugins/scaffolder-react`) uses React 17/18, `@material-ui/core` v4, `@backstage/ui`, `@rjsf/core` 5.24.13 with `@rjsf/validator-ajv8`, ajv 8 and zod.
- The backend (`plugins/scaffolder-backend`) uses express, knex and zod.

## Test command

- Proposed: `yarn test`, from `package.json#scripts.test`, which runs `NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`.
- Repo convention, from `.claude/CLAUDE.md` (which is `AGENTS.md`): run **`CI=1 yarn test <path>`** from the repo root with a file or folder path. Never run the whole suite.
- Type check: `yarn tsc` from the repo root, with no options.
- Never run `yarn build`, `yarn changesets version` or `yarn release`.
- **Gate 0 must confirm the exact command.**

## Docs present

- Readmes: `README.md`, plus `README-fr_FR.md`, `README-ja_JP.md`, `README-ko_kr.md` and `README-zh_Hans.md`
- Agent instructions: `AGENTS.md`, and `.claude/CLAUDE.md`, which is a symlink to `../AGENTS.md`
- Guides: `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md` (changesets) and `SECURITY.md`
- Design records:
  - `docs/architecture-decisions/`: 17 ADR entries
  - `beps/`: Backstage Enhancement Proposals, including `0010-scaffolder-templating-in-parameters`
- `docs/contribute/doc-style-guide.md` and `docs/contribute/project-structure.md`
- Package readmes: `plugins/scaffolder/README.md` and `plugins/scaffolder-react/README.md`

Rules from the project instructions that matter downstream:
- New source files need an Apache 2.0 header with the current year.
- Match each package's own style.
- Published package changes need changesets in `/.changeset`. Edit those files directly and never use the changeset CLI.
- New or changed features need docs.
- Don't touch ESLint, Prettier or TypeScript config.
- Don't touch `docs/releases`.
- Run `yarn build:api-reports` for package API changes.

## Detected AI/agent setup

| Path | Type |
| --- | --- |
| `.claude/` | Claude Code project dir |
| `.claude/CLAUDE.md` | Claude instructions (symlink to `AGENTS.md`) |
| `.claude/settings.local.json` | Claude Code local settings (presence only; not read) |
| `.claude/skills/` | Claude Code skills (`backstage-release-notes`, `catalog-db-performance.md`) |
| `AGENTS.md` | Agent instructions (target of the `.claude/CLAUDE.md` symlink) |
| `.cursor/rules/` | Cursor rules (`backstage-project.mdc`, `tests/backend-test-utils.mdc`, `tests/test-utils.mdc`) |
| `.github/copilot-instructions.md` | GitHub Copilot instructions |

Not present: `.claude/settings.json`, a root `CLAUDE.md`, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, any `routing-policy.yaml`, and `gemini*.yaml` or `gemini*.json`.

## Env keys (names only)

- There are no `.env`, `.env.*` or `.env.local` files. `.env`, `.env.test` and `.envrc` are gitignored. So `env_keys_by_file` is `{}` and `env_keys_all` is `[]`.
- Code references 135 distinct env var names (full list in `baseline.json`). Most belong to CLI, CI, cloud SDK and Yarn tooling.
- The scaffolder packages reference only `LOG_LEVEL` and `NODE_ENV`.

## Monorepo, submodules, LFS

- Monorepo: Yarn workspaces with globs `packages/*` and `plugins/*`, 235 packages in total. `workspaces/ui` is a separate, nested workspace.
- Per-package tests: `CI=1 yarn test <package-or-file-path>` from the repo root.
- Scaffolder-related packages:
  - `plugins/scaffolder`: `@backstage/plugin-scaffolder` (frontend-plugin)
  - `plugins/scaffolder-react`: `@backstage/plugin-scaffolder-react` (web-library)
  - `plugins/scaffolder-common`: `@backstage/plugin-scaffolder-common` (common-library)
  - `plugins/scaffolder-node`: `@backstage/plugin-scaffolder-node` (node-library)
  - `plugins/scaffolder-node-test-utils`: `@backstage/plugin-scaffolder-node-test-utils` (node-library)
  - `plugins/scaffolder-backend`: `@backstage/plugin-scaffolder-backend` (backend-plugin)
  - `plugins/scaffolder-backend-module-*`: 15 modules (azure, bitbucket-cloud, bitbucket-server, confluence-to-markdown, cookiecutter, gcp, gerrit, gitea, github, gitlab, notifications, rails, sentry, workspace-database, yeoman)
  - `packages/cli-module-scaffolder`: `@backstage/cli-module-scaffolder` (cli-module)
  - `packages/scaffolder-internal`: `@internal/scaffolder` (private web-library)
- Submodules: none (there is no `.gitmodules`).
- LFS: none (there is no `.gitattributes`).

## Infra hints

- Dockerfile: `packages/backend/Dockerfile` (none at the root)
- Docker Compose: `docker-compose.deps.yml`
- Terraform: `contrib/terraform`
- GitHub Actions: 49 workflows
- Devcontainer: `.devcontainer`
- Husky pre-commit hook: runs `yarn lint-staged`
- Not present: GitLab CI, CircleCI, Jenkins

## Regulated-repo signals

- `SECURITY.md` (kind: `SECURITY.md`)

This is the standard open-source vulnerability-disclosure policy. Nothing else matched: there are no HIPAA, PCI, SOC2 or compliance paths, and `.github/CODEOWNERS` names no security, compliance, privacy or legal teams. It is probably a false positive, but `regulated_repo_warning_required: true` per policy.

## Coexistence risks

- **Cursor rules:** You have Cursor rules at `.cursor/rules/`. The plugin will never touch them. But if Cursor's auto-lint runs on save, changes we make may trigger it.
- **Copilot instructions:** `.github/copilot-instructions.md` exists. It is untouched by default.
- **Claude Code project config:** `.claude/` holds `settings.local.json`, `skills/` and `CLAUDE.md`. `CLAUDE.md` is a symlink to `AGENTS.md`, so `AGENTS.md` is off-limits too. All of these are untouched by default.
- **`.sdlc/` not gitignored:** Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
  - Mitigation already in place: `.sdlc/` is ignored through the shared `.git/info/exclude`, so `git add -A` won't stage it in this checkout. A fresh clone would not have that exclude.
- **Pre-commit hook:** Husky runs `yarn lint-staged` on every commit.
- Not found: `.mcp.json`, Aider config, a repo-local `routing-policy.yaml`.

## Proposed off-limits

- AI/agent config:
  - `.claude/**`
  - `AGENTS.md`
  - `.cursor/**`
  - `.github/copilot-instructions.md`
- Env files (none present):
  - `.env`
  - `.env.*`
  - `.env.local`
  - `.envrc`
- Build output, dependencies and vendored Yarn:
  - `node_modules/**`
  - `dist/**`
  - `dist-types/**`
  - `dist-storybook/**`
  - `build/**`
  - `coverage/**`
  - `.yarn/**`
- Generated reports (316 and 221 tracked files). Regenerate them with `yarn build:api-reports` instead of editing by hand:
  - `**/report*.api.md`
  - `**/knip-report.md`
- Tooling state:
  - `.sdlc/**`
  - `.git/**`

Also suggested by the project instructions, for Gate 0 to confirm:
- `docs/releases/**`
- ESLint, Prettier and TypeScript config files (`.eslintrc.js`, `.prettierignore`, `tsconfig.json`, and so on)

## Tier 2b

This step ran. The primary stack is TypeScript, React and Backstage, and none of the shipped adapters (`generic`, `nest`, `python`) fits it. The profile is at `.sdlc/baseline/stack-profile.md` and covers the scaffolder frontend packages.

## Scan notes

- The scan finished well inside the timebox. The repo is below the 100k-file sampling threshold.
