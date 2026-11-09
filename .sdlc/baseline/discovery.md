# Discovery - project baseline

Built 2026-11-09T07:12:58Z (run 20261109-123841-refactor-react18-only) by mmo 0.10.1 discovery. Repo: /Users/macbook/Documents/GitHub/bf-agy/BS-RF-10.

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` ("Merge pull request #36296 ... Version Packages", 2026-10-27), branch `BS-RF-10/opus55-plus-flash38-agsdk`, working tree clean.
- Remote `origin` = `git@github.com:tl-ai-labs/backstage.git`.
- This folder is a **git worktree**; common git dir is `/Users/macbook/Documents/GitHub/backstage/.git`. Sibling worktrees: main clone (`BS-RF-10/argon4-plus-flash38`), `bf-agy/BS-BF-08`, `bs-cells/BS-BF-08`, `bs-cells/BS-DOC-04`. The stash stack is shared.
- `.gitignore` does **not** list `.sdlc/`. `.sdlc/` is ignored only through the shared `.git/info/exclude` (line 7), so it is ignored in practice but not by a committed file.

## Topology

Yarn 4.18.1 workspaces monorepo (`packages/*` = 74 dirs, `plugins/*` = 162 dirs, 235 workspace package.json files, about 12.4k tracked files). Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces` (`workspaces/ui` is a separate nested Yarn workspace with its own lockfile).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`, `packages/techdocs-cli-embedded-app/src/index.tsx`.

## Detected stacks

- `package.json` -> node-typescript (TypeScript ~5.7, Node 22 || 24). Frameworks: React (installed 18.3.1, `@types/react` 18.3.23, root `resolutions` pin `@types/react` / `@types/react-dom` to `^18.0.0`), react-router-dom 6, Backstage frontend and backend systems, Express, MUI v4 plus `@backstage/ui`, Jest 30, `@testing-library/react` ^16, Storybook 10, Playwright.
- No pre-authored adapter matches (the plugin ships generic, nest, python), so Tier 2b ran: `.sdlc/baseline/stack-profile.md`.

## Commands

- Test: `CI=1 yarn test <path>` (root `scripts.test` = `backstage-cli repo test`; CLAUDE.md says always pass a path). Gate 0 should confirm.
- Type check: `yarn tsc` from the repo root only, no options (CI runs `yarn tsc:full`).
- Lint: `yarn lint --fix` (repo lint `--since origin/master`). Peer-range check: `yarn lint:peer-deps` (CI step, `backstage-repo-tools peer-deps`).
- Format: `yarn prettier --write <changed files>` (explicit file paths only).
- API reports: `yarn build:api-reports` before a PR when public API changes (CI runs `build:api-reports:only --ci --docs`).
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`, any changeset CLI use. Edit `.changeset/*.md` directly.
- `node_modules` is present (install done).

## Docs

`README.md` (+ 4 translations), `AGENTS.md` (also `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`, both symlinks), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (ADR 000-015), `docs/contribute/project-structure.md`, `docs/contribute/doc-style-guide.md`, `beps/`.

## Detected AI/agent setup

- `.claude/` (CLAUDE.md symlink to AGENTS.md, `skills/`)
- `AGENTS.md`
- `.cursor/rules/` (`backstage-project.mdc` symlink to AGENTS.md, `tests/*.mdc`)
- None found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `.github/copilot-instructions.md`, repo-local `routing-policy.yaml`, gemini configs.

## Env keys

No `.env*` files in the repo. Env names read in code (names only): APP*CONFIG, BACKSTAGE_ENV, BACKSTAGE_CLI*_, BUILD*INFO, CI, GITHUB_TOKEN, HAS_REACT_DOM_CLIENT, LEGACY_WEBPACK_BUILD, LOG_LEVEL, NODE_ENV, NODE_OPTIONS, POSTGRES*_, MYSQL_CONNECTION, PORT and others (full list in baseline.json).

## Monorepo / submodules / LFS / infra

- Monorepo: yarn-workspaces (`packages/*`, `plugins/*`); nested `workspaces/ui`.
- Submodules: none. LFS: none (no `.gitattributes`).
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, `.devcontainer/`, 49 GitHub workflows (`ci.yml` runs lint:peer-deps, tsc:full, api-reports, prettier:check).

## Regulated-repo signals

- `SECURITY.md` (repo root). This is a standard OSS security-reporting policy, not evidence of regulated data. The flag is set, so Gate 0 prints its standard prompt.

## Coexistence risks

- **Cursor rules detected:** "You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **`.sdlc/` not gitignored:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run." Note: in this worktree the shared `.git/info/exclude` already ignores `.sdlc/`, so `git add -A` will not pick it up here. Editing `.gitignore` is optional and would add an unrelated change to a Backstage PR.
- Husky pre-commit with lint-staged runs `eslint --fix`, `prettier`, catalog-info generation and `sort-package-json` on staged files. Commits of package.json files will be reformatted.
- Shared git dir with 4 other worktrees, including concurrent runs. Never use bare `git stash`.

## Proposed off-limits

`.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `node_modules/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.yarn/releases/**`, `.yarn/patches/**`, `packages/create-app/templates/*/.yarn/releases/**`, `yarn.lock`, `workspaces/*/yarn.lock`, `docs/releases/**`, `**/CHANGELOG.md`, ESLint/Prettier/TS configs (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`), `.git/**`, `.sdlc/**`.
