# Discovery — Backstage monorepo (BS-BF-08)

- Run: `20261029-bugfix-userouteref-startup` (intent: bugfix)
- Mode: first-time (full Tier 1 scan), built 2026-10-29T12:52:52Z
- Plugin: mmo 0.9.3
- Machine-readable: `.sdlc/runs/20261029-bugfix-userouteref-startup/baseline.json`

## Git state

- HEAD `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` on branch `BS-BF-08/opus55-plus-sonnet55` (git worktree; repo root = cwd).
- Working tree: the only untracked path is `.sdlc/`, which the plugin owns. No modified or untracked source files.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- `.gitignore` covers `.sdlc/`: **no**.

## Directory topology

Top level: `packages/` (74 dirs), `plugins/` (160 dirs), `docs/`, `docs-ui/`, `microsite/`, `workspaces/ui`, `beps/`, `contrib/`, `scripts/`, `.changeset/`, `.patches/`, `.yarn/`, `.github/`, `.devcontainer/`, `.storybook/`, `.husky/`, `dist-types/` (gitignored build output), `node_modules/`.
12,302 tracked files.

Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks

| Manifest                                    | Stack                                    | Frameworks                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` (root, Yarn 4.18 workspaces) | node-typescript (TS ~5.7, Node 22 or 24) | Backstage (in-house plugin framework), React 18, react-router, Express, Knex, Jest 30, Testing Library, MUI v4 and v5, Zod, Storybook, Playwright |
| `docs-ui/package.json`                      | node-typescript                          | Next.js (separate docs site, not a workspace)                                                                                                     |
| `microsite/package.json`                    | node-javascript                          | Docusaurus (separate site, not a workspace)                                                                                                       |

No pre-authored adapter matches (`generic`, `nest`, `python` are shipped). Tier 2b ran, and the learned profile is at `.sdlc/baseline/stack-profile.md`.

## Test / build commands

- **Proposed test command:** `CI=1 yarn test <path>`. It comes from `package.json#scripts.test` (`backstage-cli repo test`) and the "Development Flow" section of AGENTS.md. Always give a file or directory path, and never run the whole suite.
  - Example for this bugfix: `CI=1 yarn test packages/frontend-plugin-api/src/routing`
- Type check: `yarn tsc` (repo root, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`.
- **Forbidden by project rules:** `yarn build`, `yarn changesets version`, `yarn release`.
- The command was not executed during discovery; Gate 0 confirms it. `node_modules/` is present.

## Docs present

README.md (+4 translations), AGENTS.md (with `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` as symlinks to it), CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, ADRs in `docs/architecture-decisions/`, `docs/contribute/project-structure.md`, `docs/contribute/doc-style-guide.md`, `beps/`.

Key project rules (from AGENTS.md):

- New source files need the Apache 2.0 header with the current year. Do not bump the year on existing files.
- Match each package's local style.
- Prefer fewer, thorough tests. Use RTL `screen` and `findBy*` rather than `waitFor`, and do not add test IDs.
- Changes to published `packages/`/`plugins/` need changeset coverage. Edit `.changeset/*.md` directly and never use the changeset CLI.
- Public API changes need `yarn build:api-reports`. 314 `report*.api.md` files are generated.
- Do not edit ESLint, Prettier or TS config, or `docs/releases/`.

## Detected AI/agent setup

| Path                                                                         | Type                       |
| ---------------------------------------------------------------------------- | -------------------------- |
| `.claude/` (`settings.local.json`, `skills/`, `CLAUDE.md` -> `../AGENTS.md`) | Claude Code project config |
| `AGENTS.md`                                                                  | agent instructions         |
| `.cursor/rules/` (`backstage-project.mdc` -> AGENTS.md, `tests/*.mdc`)       | Cursor rules               |
| `.github/copilot-instructions.md`                                            | GitHub Copilot             |

Not found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env keys (names only)

- No `.env*` files at the repo root. `.gitignore` already ignores `.env`, `.env.test` and `.envrc`.
- `.devcontainer/devcontainer.env`: `NODE_OPTIONS`
- 135 distinct `process.env.*` names are referenced in tracked code (full list in baseline.json). Examples: `NODE_ENV`, `CI`, `GITHUB_TOKEN`, `AWS_*`, `AZURE_*`, `POSTGRES_*`, `BACKSTAGE_*`, `YARN_*`.

## Monorepo, submodules, LFS

- Yarn workspaces over `packages/*` and `plugins/*`: 233 packages (list with `backstage.role` in baseline.json).
- `docs-ui/`, `microsite/` and `workspaces/ui` are separate projects, each with its own `yarn.lock`.
- Submodules: none. Git-LFS: none.

## Infra hints

Dockerfiles (`packages/backend/Dockerfile`, `.devcontainer/`, `contrib/docker/*`), `docker-compose.deps.yml`, `contrib/terraform/`, 49 GitHub workflows, devcontainer. No GitLab, CircleCI or Jenkins.

## Regulated-repo signals

- `SECURITY.md` (repo root)

This is almost certainly the open-source vulnerability-disclosure policy, not a compliance marker. There are no HIPAA, PCI, SOC2 or GDPR files or folders, and no security, compliance, privacy or legal teams in CODEOWNERS. `regulated_repo_warning_required` is still set to `true` as the spec requires, so Gate 0 prints the standard notice.

## Coexistence risks

- **Cursor rules:** "You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **Claude Code / Copilot config:** `.claude/` and `.github/copilot-instructions.md` stay untouched. `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` both symlink to `AGENTS.md`, so editing AGENTS.md changes all three.
- **`.sdlc/` not gitignored:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run."
- **Git hooks:** Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files at commit time. They also regenerate `catalog-info.yaml` when `package.json` or `.github/CODEOWNERS` is staged.
- No custom MCP servers, Aider config or repo-local routing-policy.yaml.

## Proposed off-limits

`.env`, `.env.*`, `.envrc`, `.devcontainer/devcontainer.env`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `dist-storybook/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/**`, `yarn.lock`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `docs/releases/**`, `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`, `.git/**`, `.sdlc/**`.

## Bugfix orientation (hint only)

The run id mentions useRouteRef at startup. The relevant files are:

- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (51 lines) and its test
- `packages/core-plugin-api/src/routing/useRouteRef.tsx` (150 lines) and its test
- Route resolution in `packages/frontend-app-api/src/routing/` (`RouteResolver.ts`, `extractRouteInfoFromAppNode.ts`, `resolveRouteBindings.ts`) and `packages/core-app-api/src/routing/`

Both API packages are published `web-library` packages, so a fix needs a changeset.

## Notes

- The scan took about 15 seconds. No sampling was needed: 233 workspace packages and 12.3k files are within bounds.
- Symlinks inside `.claude/` and `.cursor/` resolve inside the repo, so no symlink points outside the repo root.
