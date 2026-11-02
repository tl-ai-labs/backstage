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
