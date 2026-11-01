# Brownfield discovery - Backstage monorepo

Built 2026-11-01 by the Tier 1 scan (first-time, full). Commit `2e8b88268c8a`, branch `BS-BF-08/opus55-only`. The repo has 12,302 tracked files, so the very-large-repo sampling path was not needed.

## Git state

- Head: `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` on `BS-BF-08/opus55-only`.
- Dirty: yes, but the only change is the untracked `.sdlc/`.
- Remotes: `origin` is `https://github.com/tl-ai-labs/backstage.git`, `upstream` is `https://github.com/backstage/backstage.git`.
- This folder is a linked git worktree. `.git` is a file; the common dir is `/Users/apple/Documents/GitHub/backstage/.git`. There are 7 worktrees, and they share the stash stack (currently empty).
- HEAD is 402 commits behind `origin/master` and 462 behind `upstream/master`, with 0 commits of its own. HEAD's commit date is 2026-10-07; `origin/master`'s is 2026-10-27.
- `gitignore_covers_sdlc`: false.
- Hooks: `core.hooksPath` is `.husky/_`. The pre-commit hook runs `yarn lint-staged` (eslint and prettier on code, plus a docs-quality check on staged `.md`).

## Directory topology

Top-level source folders: `packages/` (74), `plugins/` (159), `docs/`, `docs-ui/`, `microsite/`, `contrib/`, `scripts/`, `beps/`, `workspaces/ui/`. `dist-types/` is gitignored tsc output, last written 2026-11-01 13:11.

Language mix by tracked file count: 5,555 `.ts`, 1,857 `.tsx`, 1,977 `.md`, 698 `.yaml`, 436 `.js`.

## Detected stacks

| Manifest | Stack | Frameworks |
| --- | --- | --- |
| `package.json` | node-typescript | backstage, react, express |

The root manifest declares no framework dependencies. The frameworks come from workspace packages: react in 60, express in 45, knex in 17, zod in 66, `@material-ui/core` in 39, `@backstage/ui` in 24. Toolchain: TypeScript `~5.7.0`, Node `22 || 24` (local v24.22.1), Yarn 4.18.0 with the node-modules linker, Jest 30, Playwright for e2e.

Three independent projects have their own `yarn.lock` and sit outside the root workspace: `docs-ui` (Next.js), `microsite` (Docusaurus), `workspaces/ui`.

No pre-authored adapter matches this stack (the plugin ships `generic.md`, `nest.md`, `python.md`), so the Tier 2b trigger fired. See `.sdlc/baseline/stack-profile.md`.

## Test, build, and run commands

- Proposed test command: `CI=1 yarn test <path>`. Source: `package.json#scripts.test` (`yarn.lock` selects yarn), with the path-scoped form required by `AGENTS.md`. Always pass a path. The command was not executed during discovery; Gate 0 confirms it.
- Type check: `yarn tsc`, from the repo root, with no options.
- Format: `yarn prettier --write <paths>`, on named files only.
- Lint: `yarn lint --fix`. This runs `backstage-cli repo lint --since origin/master`. With HEAD 402 commits behind `origin/master`, its file selection may be wider than this run's changes. That was not verified, so check the scope before relying on it.
- API reports: `yarn build:api-reports` before a PR that changes a package.
- Forbidden by project rules: `yarn build`, `yarn changesets version`, `yarn release`, and any use of the changeset CLI.

## Docs

`README.md` and four translations, `AGENTS.md`, `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (17 entries), `docs/contribute/doc-style-guide.md`, `docs/features/search/README.md`, `docs/features/techdocs/README.md`. There is no root `CLAUDE.md` and no `ARCHITECTURE.md`.

`CONTRIBUTING.md` has an AI use policy: a contributor must personally understand and test an AI-generated PR, and a largely AI-generated PR must be marked as such in its description.

## Detected AI/agent setup

- `.claude/` with `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `.claude/settings.local.json` (gitignored; presence only), and `.claude/skills/` (2 skills).
- `.cursor/rules/` with 3 tracked rules; `backstage-project.mdc` is a symlink to `AGENTS.md`.
- `.github/copilot-instructions.md`.
- `AGENTS.md`, the shared target of both symlinks. Editing it changes the Claude and Cursor instructions too.

Not found: `.claude/settings.json`, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, any `.aider*`, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

## Env keys

No `.env` or `.env.*` files exist (searched to depth 5), so no env file was read. 130 distinct env var names are referenced in code; the list is in `env_keys_referenced_in_code`. Names only.

## Monorepo, submodules, LFS, encrypted files

- Monorepo: Yarn workspaces over `packages/*` and `plugins/*`, 233 packages. The package list is in `baseline.json`.
- Submodules: none (no `.gitmodules`, no gitlinks).
- LFS: not used. There is no `.gitattributes`. The `filter.lfs.*` settings in git config are machine setup and match no repo pattern.
- Encrypted secrets: none found. No sops, git-crypt, Ansible Vault, or PGP markers, and no `.gpg`, `.enc`, `.pem`, `.key` or keystore files are tracked.
- Private-key headers appear in 10 tracked files, all tests or docs except `plugins/kubernetes-backend/src/auth/GoogleServiceAccountStrategy.ts`, where line 36 is a doc-comment placeholder. The test and docs files were listed by name only and not opened. `plugins/kubernetes-react/src/__fixtures__/{1,2}-secrets.json` are test fixtures by location and were not opened.
- Tracked symlinks: 2, both pointing inside the repo at `AGENTS.md`.
- Entry points: `packages/app/src/index.tsx`, `packages/app/src/App.tsx`, `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.
- Infra: `.github/workflows/` (49 files), `docker-compose.deps.yml`, `contrib/terraform/`, `.devcontainer/`, `packages/backend/Dockerfile`.

## Regulated-repo signals

- `SECURITY.md` at the repo root (kind: `security-policy-file`).

This file is a vulnerability-reporting policy, a common fixture in open source projects, so it is weak evidence of regulation. The flag is still set as the rule requires. No HIPAA, PCI, SOC2, regulated, or compliance folders were found to depth 3, and `.github/CODEOWNERS` has no security, compliance, privacy, or legal entries.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits

Secrets and env: `.env`, `.env.*`, `.env.local`.

AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`.

Build and generated: `**/node_modules/**`, `dist/**`, `dist-types/**`, `packages/*/dist/**`, `plugins/*/dist/**`, `build/**`, `.next/**`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`.

Git and harness: `.git`, `.git/**`, `.sdlc/**`.

Project rules from `AGENTS.md`: `docs/releases/**`, `.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`, `**/CHANGELOG.md`.

Keep `dist` and `build` anchored as written. Tracked source folders with those names exist deeper in the tree (for example under `packages/cli-module-build/src/`), so a blanket `**/build/**` would block real code.

These are produced by tooling and should only change by regenerating them, so they are not hard off-limits: `**/report*.api.md`, `**/*.sql.md`, `**/knip-report.md`, `{packages,plugins}/*/catalog-info.yaml`.
