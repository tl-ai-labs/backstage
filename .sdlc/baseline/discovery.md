# Discovery — Backstage monorepo

- Run: `20261031-120000-bugfix-approot-routeref` (mode: first-time, Tier 1)
- Intent hint: bugfix: in the new frontend system, app root elements that call `useRouteRef` during startup crash with "No path for routeRef".
- Built: 2026-10-31. The scan finished well within the timebox, and no sampling was needed (12,302 tracked files, 19 top-level dirs).

## Git state
- HEAD: `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` (committed 2026-10-07)
- Branch: `BS-BF-08/flash-agsdk-only-v38`. Working tree: **clean**.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- `gitignore_covers_sdlc: false`. However, `.sdlc/` is listed in `.git/info/exclude`, and `git status --ignored` shows `.sdlc/` as ignored, so `git add -A` will **not** pick it up. Adding it to `.gitignore` isn't needed.

## Directory topology
Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`.
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app/src/App.tsx`, `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| `package.json` (root, yarn@4.18.0, node 22 \|\| 24) | node-typescript | Backstage (in-house framework: new and legacy frontend systems plus backend system), React, Jest (via `backstage-cli repo test`), Storybook, Playwright |
| `docs-ui/package.json` | node-typescript | Next.js (separate yarn project) |
| `microsite/package.json` | node-typescript | Docusaurus (separate yarn project) |
| `workspaces/ui/package.json` | node-typescript | separate yarn project |

There are no Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests.

**Adapter match:** none. The shipped adapters are `generic`, `nest` and `python`, so Tier 2b (adaptive stack profile) **triggers** on "no matching adapter". It has not been run yet, and `.sdlc/baseline/stack-profile.md` does not exist.

## Test / build commands
- **Proposed test command: `CI=1 yarn test <path>`**. Source: `.claude/CLAUDE.md` (a symlink to `AGENTS.md`), which wraps `package.json#scripts.test` (`backstage-cli repo test`). Always pass a path. Gate 0 must confirm it.
- Likely path for this bug: `packages/frontend-app-api`. The error string lives in `packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts` and is exercised in `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`.
- Type check: `yarn tsc` (repo root, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <files>`.
- Forbidden by repo policy: `yarn build`, `yarn changesets version`, `yarn release`.
- `node_modules/` is present: `backstage-cli` and `jest` binaries resolve, and the local node is v24.18.0.
- Pre-existing test failures: **not known**. Tier 1 runs no tests, and the pre-check `test_command_probe` was skipped.

## Docs present
README.md (plus 4 translations), AGENTS.md, `.claude/CLAUDE.md` (symlink to AGENTS.md), `plugins/catalog-backend/CLAUDE.md`, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs 000-015 plus index), `docs/contribute/doc-style-guide.md`, `docs/frontend-system/`.

## Detected AI/agent setup
- `.claude/`: `CLAUDE.md` (symlink to `../AGENTS.md`), `skills/` (backstage-release-notes, catalog-db-performance.md), `settings.local.json` (gitignored; only an `env` key)
- `AGENTS.md`
- `plugins/catalog-backend/CLAUDE.md`
- `.cursor/rules/`: `backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`
- `.github/copilot-instructions.md`
- Not present: `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `CLAUDE.local.md`, `.claude/settings.json`, `routing-policy.yaml`, `gemini*.{yaml,json}`

## Env keys (names only)
- No `.env*` files exist (`.env`, `.env.test` and `.envrc` are gitignored, and none are present).
- 118 distinct `process.env.*` names are referenced in `packages/`, `plugins/` and `scripts/`, mostly runtime/CI/tooling (`NODE_ENV`, `CI`, `APP_CONFIG`, `LOG_LEVEL`, `GITHUB_TOKEN`, `KUBERNETES_SERVICE_HOST`, `YARN_*`, and so on). The full list is in `baseline.json`. None relate to the frontend routing area of this bug.

## Monorepo, submodules, LFS
- **Yarn workspaces** (`packages/*`, `plugins/*`): 233 workspace packages, 18 of them private. Per-package test: `CI=1 yarn test <package-root>`. `docs-ui/`, `microsite/` and `workspaces/ui/` are separate yarn projects with their own lockfiles.
- Submodules: none (no `.gitmodules`).
- Git-LFS: none (no `.gitattributes` with lfs filters).
- Encrypted secrets: none detected (no git-crypt, sops, `.gpg`, `.enc`, `.pem` or `.key` files tracked).

## Infra hints
Dockerfiles (`packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*`), `docker-compose.deps.yml`, 49 GitHub workflows, a devcontainer, and Husky git hooks. No Terraform, GitLab CI, CircleCI or Jenkins.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy). This is a **weak signal**: it is the standard open-source vulnerability-disclosure policy. There are no compliance directories, and `.github/CODEOWNERS` has no security, compliance, privacy or legal team entries.
- `regulated_repo_warning_required: true`. Gate 0 prints the standard warning.

## Repo policy constraints (from AGENTS.md)
- New `.ts/.tsx/.js/.jsx` files need an Apache 2.0 header with the current year. Never change the year on existing files.
- Adopter-facing changes to non-private `packages/` or `plugins/` need changeset coverage in `.changeset/`. Edit those files directly and never use the changeset CLI. Check existing changesets first. `@backstage/frontend-app-api` is published, so a fix there likely needs a `patch` changeset.
- Never edit ESLint, Prettier or TypeScript config, and never edit `docs/releases/**`.
- API reports (`report*.api.md`) are generated by `yarn build:api-reports`, so they should not be edited by hand.
- Tests: prefer fewer, thorough tests. With React Testing Library, use `screen` and `findBy*`, and don't add test IDs.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/` (3 `.mdc` files, `alwaysApply: true`). The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions are at `.github/copilot-instructions.md`, and Claude Code project config is at `.claude/` (`CLAUDE.md` is a symlink to `AGENTS.md`, plus skills). All are left untouched.
- Husky git hooks are installed (`.husky/`, with lint-staged). Any commit made during the run will run pre-commit hooks.
- `.gitignore` doesn't cover `.sdlc/`, but `.git/info/exclude` does, so run artifacts are already ignored by git. No `.gitignore` change is needed. Note that `.git/info/exclude` is local to this clone.
- `.gitignore` itself is not aggressive. It ignores only standard build and cache output, plus `.env`, `.envrc`, `*.local.yaml` and `*-credentials.yaml`. No tracked source is hidden.

## Proposed off-limits
`.env`, `.env.*`, `.envrc`, `*-credentials.yaml`, `*.local.yaml`, `.claude/**`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.cursor/**`, `.github/copilot-instructions.md`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `dist-workspace/**`, `build/**`, `.next/**`, `dist-storybook/**`, `.yarn/releases/**`, `.yarn/plugins/**`, `.yarn/patches/**`, `yarn.lock`, `**/src/schema/openapi/generated/**`, `**/report*.api.md`, `**/knip-report.md`, `**/report*.sql.md`, `docs/releases/**`, `docs/reference/**`, `.git/**`, `.sdlc/**`
