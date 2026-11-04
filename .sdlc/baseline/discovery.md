# Discovery: 20261104-docs-catalog-model-tsdoc

Mode: first-time (full Tier 1 scan). Built 2026-11-04T09:12:19Z. Plugin mmo 0.10.1.
Intent (context): docs. Add TSDoc to undocumented exports of `packages/catalog-model`.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-DOC-04/argon4-plus-sonnet55`. The tree is clean.
- This folder is a git worktree. Its toplevel matches the cwd, so the precondition passed.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git and `upstream` https://github.com/backstage/backstage.git.
- `.gitignore` exists but does **not** cover `.sdlc/` (`gitignore_covers_sdlc: false`). However, `.sdlc/` **is** ignored locally through `.git/info/exclude` in the shared main repo (`/Users/apple/Documents/GitHub/backstage/.git/info/exclude`, line 7). `git check-ignore` confirms it, so `git add -A` will not stage run artifacts in this clone.

## Topology
- Top-level directories: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn beps contrib dist-types docs docs-ui microsite packages plugins scripts workspaces`.
- The repo tracks 12,364 files across 324 depth-2 directories. That is below the large-repo threshold, so the scan read everything and did not sample.
- Focus package: `packages/catalog-model` (`@backstage/catalog-model` 1.10.2, role `common-library`, 242 tracked files).
  - Public entry: `src/index.ts`. Alpha entry: `src/alpha.ts`.
  - API reports: `report.api.md` has 45 `(undocumented)` markers and `report-alpha.api.md` has 25. Use these markers as a rough worklist of undocumented public and alpha exports.
  - The root `build:api-reports` script passes `-o ae-undocumented`. As a result, the reports carry no `ae-undocumented` warnings. Only the `// (undocumented)` markers remain.

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| package.json | node-typescript (TS ~5.7, Node 22/24, Yarn 4.18.1 Berry) | Backstage (React frontend, Express backend), Jest 30, Storybook 10, Playwright |

There is no pre-authored adapter for this stack (the shipped adapters are generic, nest and python), so the Tier 2b adaptive profile triggered. The profile is at `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- Proposed test command: `CI=1 yarn test packages/catalog-model`. It comes from `package.json#scripts.test` (`backstage-cli repo test`) and the AGENTS.md rule "Use `CI=1 yarn test <path>`, always provide a path".
- Type check: `yarn tsc`, run from the repo root with no options.
- API reports: `yarn build:api-reports`. AGENTS.md requires running it before a PR that changes any package.
- Formatting: `yarn prettier --write <changed files>`.
- Forbidden: `yarn build`, `yarn changesets version` and `yarn release`.
- This scan did not run any tests. Tier 1 only reads files, so the current test baseline is unknown. `node_modules/` is present, which means installs have run.

## Docs present
- README.md, plus four translated READMEs.
- AGENTS.md. `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to it.
- CONTRIBUTING.md, STYLE.md, REVIEWING.md and SECURITY.md.
- ADRs in `docs/architecture-decisions/` (17 files).
- The doc style guide at `docs/contribute/doc-style-guide.md`.
- `packages/catalog-model/README.md`.

Rules from AGENTS.md that matter for this intent:
- Match the existing style of each package.
- Never update the copyright year on existing files.
- Changes to published packages need changeset coverage. Check `.changeset/` first. No existing changeset names catalog-model. Docs-only TSDoc changes may still warrant a patch changeset; decide at Gate 0.
- Never edit `docs/releases`.
- Never touch the ESLint, Prettier or TS configs.

## Detected AI/agent setup
- `.claude/` (Claude Code directory)
- `.claude/CLAUDE.md` (symlink to `../AGENTS.md`)
- `.claude/settings.local.json` (gitignored; contains an `env` block; values not read)
- `.claude/skills/` (catalog-db-performance.md, backstage-release-notes/)
- `.cursor/rules/` (backstage-project.mdc symlinks AGENTS.md; tests/test-utils.mdc, tests/backend-test-utils.mdc)
- `.github/copilot-instructions.md`
- `AGENTS.md`

None found: `.mcp.json`, Aider config, `.continue/`, `.roo/`, `.cursorrules`, `CLAUDE.local.md`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

## Env keys (names only)
- No `.env*` files exist at the repo root, and none are tracked.
- Code references many env names across the monorepo, such as GITHUB_TOKEN, AWS_*, AZURE_*, POSTGRES_*, BACKSTAGE_* and NODE_ENV. The full list is in baseline.json.
- `packages/catalog-model` references none.

## Monorepo, submodules, LFS
- Yarn workspaces (`packages/*`, `plugins/*`): 74 packages and 161 plugins. No nx, turbo, lerna, rush or pnpm.
- Per-package test command: `CI=1 yarn test <package-path>`.
- No submodules (no `.gitmodules`).
- No LFS (`.gitattributes` is absent).

## Infra hints
- `packages/backend/Dockerfile` and `.devcontainer/Dockerfile`.
- `docker-compose.deps.yml`.
- 49 GitHub workflows.
- Husky with lint-staged. The pre-commit hook runs eslint --fix, prettier and `check-docs-quality` on md files.
- None of: Terraform, GitLab CI, CircleCI, Jenkins.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy).

In Backstage this file is an open-source vulnerability-disclosure policy, not a compliance regime, so the signal is weak. CODEOWNERS has no security, compliance, privacy or legal teams, and the repo has no HIPAA, PCI, SOC2 or GDPR markers. The flag `regulated_repo_warning_required: true` is still set, as the rules require.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- You have GitHub Copilot instructions at `.github/copilot-instructions.md`. They stay untouched.
- `AGENTS.md` is the target of both `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`. Editing it changes the instructions for all three tools, so it is off-limits by default.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. *Mitigated locally:* `.git/info/exclude` already ignores `.sdlc/`. Editing `.gitignore` would add an unrelated diff to this upstream-bound docs change, so declining is reasonable.
- The Husky and lint-staged pre-commit hooks reformat files and run the docs-quality check on commit.

## Proposed off-limits
- `.git/**`, `.sdlc/**`
- `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`
- `.env`, `.env.*`, `.env.local`, `.envrc`
- `node_modules/**`, `**/dist/**`, `dist-types/**`, `dist-storybook/**`, `dist-workspace/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/**`, `yarn.lock`
- Generated reports: `**/report.api.md`, `**/report-*.api.md`, `**/knip-report.md`. Regenerate them with `yarn build:api-reports`; do not hand-edit them. If the run regenerates the catalog-model reports, Gate 0 may move them into scope.
- `docs/releases/**`, `**/CHANGELOG.md`
- ESLint, Prettier and TS configs: `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`
