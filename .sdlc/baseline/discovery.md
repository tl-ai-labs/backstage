# Discovery: Backstage monorepo (brownfield baseline)

Built 2026-11-03T19:30:32Z (UTC) by run `20261104-005757-feature-new-home-unread-notifications-card`, mode `first-time`, Tier 1 scan.

## Git state
- HEAD: `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/argon4-plus-sonnet55`. The working tree is clean.
- This checkout is a git worktree. The shared git dir is `/Users/apple/Documents/GitHub/backstage/.git`.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- `.gitignore` has no `.sdlc/` entry, so `gitignore_covers_sdlc` is false. However, `.sdlc/` is in the shared `.git/info/exclude` (line 7), so git already ignores it.

## Topology
Top-level folders: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages` (71), `plugins` (160), `scripts`, `workspaces` (`ui`).
Entry points: `packages/app/src/index.tsx` (example app, new frontend system), `packages/backend/src/index.ts` (example backend). The legacy example app is `packages/app-legacy`.
Git tracks 12,247 files, so no sampling was needed.

## Detected stacks
- `package.json`: node-typescript. Uses Yarn 4.8.1 workspaces (`packages/*`, `plugins/*`), TypeScript ~5.7, React 17/18, Node 22 or 24, Jest 30, Storybook 10 and Playwright.
- The frontend has two plugin systems: the old one (`core-*`, `createPlugin`/`createCardExtension`) and the new one (`frontend-*`, blueprints exported from `alpha`). The backend uses the Backstage backend system.
- No pre-authored adapter fits. The shipped adapters are generic, nest and python, so Tier 2b ran and wrote `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- Proposed test command: `CI=1 yarn test <path>`. Sources: `package.json#scripts.test` (`backstage-cli repo test`) and `.claude/CLAUDE.md`. Always pass a path.
- Type check: `yarn tsc`, run from the root with no options. Lint: `yarn lint --fix`. Format: `yarn prettier --write <files>`. API reports: `yarn build:api-reports`.
- Never run `yarn build`, `yarn changesets version` or `yarn release`, as `.claude/CLAUDE.md` forbids them.
- Tests were not run during discovery, so the baseline pass/fail state is unknown.

## Docs
README.md (plus 4 translations), `.claude/CLAUDE.md`, AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs), `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `docs/notifications/`, `beps/`.

## Detected AI/agent setup
- `.claude/`: contains `CLAUDE.md` (binding project rules), `settings.local.json` and `skills/` (`catalog-db-performance.md`, `backstage-release-notes/`).
- `.cursor/rules/`: `backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`.
- `.github/copilot-instructions.md`
- `AGENTS.md`: the same rules as CLAUDE.md, with Cursor `alwaysApply` frontmatter.
- Not present: `.mcp.json`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env files
There are no `.env*` files at the repo root or within 3 levels. Code references many `process.env` names, mostly for tooling, CI and tests. The full list of names (no values) is in `baseline.json`.

## Monorepo / submodules / LFS
- Yarn workspaces with 231 packages. Run tests per package with `CI=1 yarn test plugins/<name>`.
- No `.gitmodules` file, so no submodules. No `.gitattributes`, so no LFS.
- Infra: `docker-compose.deps.yml`, `.devcontainer/`, 49 GitHub workflows. No root Dockerfile, Terraform or GitLab CI.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md). This is a standard open-source vulnerability-disclosure policy and is probably a false positive. The `regulated_repo_warning_required` flag is still set to true, as the rules require. CODEOWNERS has no security, compliance, privacy or legal team entries.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- `.claude/CLAUDE.md` and `AGENTS.md` contain repo rules that generated code must follow:
  - Apache-2.0 header with the current year on new `.ts`/`.tsx` files.
  - Changesets are required for published packages under `packages/` and `plugins/`.
  - Docs updates are required for features.
  - Never touch ESLint, Prettier or TS config.
  - Never edit `docs/releases`.
- The Husky pre-commit hook (`.husky/`) runs lint-staged (eslint --fix and prettier) on commit.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) would normally be untracked but visible to `git add -A`. Here they are already excluded by the shared `.git/info/exclude` (`.sdlc/`), so the risk is low. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits
`.git/**`, `.env`, `.env.*`, `.env.local`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`, `routing-policy.yaml`, `**/node_modules/**`, `**/dist/**`, `build/**`, `**/dist-types/**`, `dist-storybook/**`, `.yarn/**`, `yarn.lock`, `**/CHANGELOG.md` (generated at release), `docs/releases/**`, ESLint/Prettier/TS config files, `.changeset/pre.json`, `.changeset/config.json`.
Note: `report*.api.md` and `knip-report.md` are generated by `yarn build:api-reports` and `yarn build:knip-reports`. Regenerate them rather than editing them by hand.
