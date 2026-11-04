# Discovery — run 20261104-120000-bugfix-useroutref-startup

Mode: first-time (full Tier 1 scan, plus Tier 2b stack profile). Intent hint: bugfix.
Repo: Backstage monorepo (TypeScript, Yarn 4 workspaces), opened as a git worktree.

## Git state
- HEAD: `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` on branch `BS-BF-08/argon4-plus-sonnet55`. The working tree is clean.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- This folder is a **git worktree**. Its shared git dir is `/Users/apple/Documents/GitHub/backstage/.git`. That shared dir is also where the stash stack and `info/exclude` live.
- `.gitignore` does **not** list `.sdlc/` (`gitignore_covers_sdlc: false`). However, `.sdlc/` **is** ignored in practice, through line 7 of the shared `.git/info/exclude`. That rule applies to every worktree of this clone.

## Topology
Top-level dirs: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn beps contrib docs docs-ui microsite packages plugins scripts workspaces`.
Git tracks 12,302 files. `packages/` holds 74 packages and `plugins/` holds 160.
- Entry points: `packages/app` (the new frontend system), `packages/app-legacy` (the old frontend system) and `packages/backend` (the example backend).

## Detected stacks
- `package.json`: **node-typescript**. It uses Yarn 4.18.0 workspaces (`packages/*` and `plugins/*`), Node 22 or 24, and TypeScript ~5.7.
- Frameworks found: Backstage (its own plugin framework), React 18, react-router-dom, Express, Knex, Material UI v4 and MUI v5, Jest 30, Playwright and Storybook.
- None of the shipped adapters (generic, nest, python) matches this stack, so Tier 2b ran. The profile is at `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- Proposed test command: `CI=1 yarn test <path>`. Source: `package.json#scripts.test` (it runs `backstage-cli repo test`, on jest) and the project's AGENTS.md, which says to always pass a path and never run the whole suite.
- Type check: `yarn tsc`, run from the root with no options. Lint: `yarn lint --fix`. Format: `yarn prettier --write <paths>`. API reports: `yarn build:api-reports`.
- **Never run** `yarn build`, `yarn changesets version` or `yarn release`.
- Every command needs `yarn install` first. Gate 0 should check whether `node_modules/` is set up in this worktree. A `node_modules` entry exists at the root.
- Test targets that fit this intent: `packages/frontend-plugin-api/src/routing/` and `packages/core-plugin-api/src/routing/`. Both contain `useRouteRef.tsx` and `useRouteRef.test.tsx`.

## Docs present
README.md (plus fr/ja/ko/zh translations), AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADR 000-015), `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, and a package-level `plugins/catalog-backend/CLAUDE.md`.

Project rules from AGENTS.md that matter downstream:
- New source files need an Apache 2.0 header with the current year. Do not change the year on existing files.
- Match the style of the package you are editing.
- Changes to published packages need a changeset, written directly in `.changeset/` (never through the changeset CLI). Use patch for packages below 1.0 and minor for packages at 1.0 or above, unless the change is breaking.
- Prefer fewer, more thorough tests. With RTL, use `screen` and `findBy*`.
- Do not touch ESLint, Prettier or TypeScript configs, and do not touch `docs/releases`.

## Detected AI/agent setup
| Path | Type |
|---|---|
| `.claude/` | Claude Code project dir |
| `.claude/CLAUDE.md` | symlink to `../AGENTS.md` |
| `.claude/settings.local.json` | local settings. Its `env` block sets the keys CLAUDE_CODE_SUBAGENT_MODEL, GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION (values not read) |
| `.claude/skills/` | skills: catalog-db-performance, backstage-release-notes |
| `.cursor/rules/` | Cursor rules (`backstage-project.mdc` is a symlink to AGENTS.md, plus `tests/*.mdc`) |
| `.github/copilot-instructions.md` | Copilot instructions |
| `AGENTS.md` | agent instructions (target of two symlinks) |
| `plugins/catalog-backend/CLAUDE.md` | package-level Claude instructions |

None of these exist: `.mcp.json`, Aider config, `.continue/`, `.roo/`, `.cursorrules`, `CLAUDE.local.md`, a repo-local `routing-policy.yaml`, or `gemini*.{yaml,json}`.

## Env keys (names only)
- The repo root has no `.env*` files. `.gitignore` lists `.env`, `.env.test` and `.envrc`.
- `.claude/settings.local.json` sets env keys: CLAUDE_CODE_SUBAGENT_MODEL, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION.
- Code under `packages/` and `plugins/` references 111 distinct `process.env.*` names (full list in baseline.json). Examples: NODE_ENV, CI, BACKSTAGE_ENV, APP_CONFIG, AWS_*, AZURE_*, POSTGRES_*, YARN_*.

## Monorepo / submodules / LFS
- Monorepo type: Yarn workspaces (`packages/*`, `plugins/*`). There are also separate workspaces outside those globs: `docs-ui/`, `microsite/` and `workspaces/ui`.
- To test one package, run `CI=1 yarn test <package-dir>`.
- Submodules: none. Git LFS: none, because there is no `.gitattributes`.
- Generated code lives under `**/src/schema/openapi/generated/` (in 10 packages) and `plugins/events-node/src/generated/`. These are listed as off-limits.

## Infra hints
- `.github/workflows/` (49 workflows), `docker-compose.deps.yml`, `.devcontainer/` and husky with lint-staged.
- None of these exist: a Dockerfile at the root, terraform, GitLab CI, CircleCI or Jenkins.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md) at the repo root.

This file is the usual OSS vulnerability-disclosure policy. There are no HIPAA, PCI, SOC2 or GDPR files, no compliance folders, and no security, compliance or legal teams in CODEOWNERS. This is likely a false positive, but the flag is set (`regulated_repo_warning_required: true`), so Gate 0 will show the standard warning.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- You have GitHub Copilot instructions at `.github/copilot-instructions.md`. They stay untouched.
- `.claude/` (settings.local.json, skills, CLAUDE.md symlink) stays untouched. Note that `settings.local.json` sets a subagent model and Google Cloud env for this session.
- Your `.gitignore` doesn't cover `.sdlc/`. Here the shared `.git/info/exclude` already ignores it, so `git add -A` will **not** pick up run artifacts. Because of that exclude, adding `.gitignore` to the allowlist is optional for this repo. Keep in mind that the exclude is local to this clone and is not committed.
- The repo's husky pre-commit hook (lint-staged) runs `eslint --fix` and `prettier --write` on staged files. On `package.json` or CODEOWNERS changes it also regenerates `catalog-info.yaml` and runs `git add` on the result. Any commit made during the run will run these hooks.
- This folder is a worktree, and the git stash stack is shared with other worktrees. Use WIP commits or tagged stashes for rollback, never a bare `git stash pop`.

## Proposed off-limits
`.env`, `.env.*`, `.envrc`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `dist-workspace/**`, `dist-storybook/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `docs/releases/**`, and the 11 `**/generated/**` OpenAPI dirs (listed in baseline.json).

Also, do not edit ESLint, Prettier or TypeScript configs unless the user asks.
