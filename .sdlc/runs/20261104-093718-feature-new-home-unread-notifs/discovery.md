# Brownfield discovery: backstage

- Run: `20261104-093718-feature-new-home-unread-notifs` (mode: first-time, Tier 1, plus Tier 2b stack profile)
- Built at: 2026-11-04T04:09:24Z
- Intent hint: feature-new. Add a home-page card listing the signed-in user's latest unread notifications, updating live and deep-linking to each notification.
- Scan time: well within the timebox (12,247 tracked files; no sampling needed)

## 1. Git state
- HEAD `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/argon4-agsdk-only`. The working tree is clean.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git and `upstream` https://github.com/backstage/backstage.git
- `gitignore_covers_sdlc: false`. `.gitignore` has no `.sdlc` line. However, `.git/info/exclude` contains `.sdlc/`, so this clone already ignores it locally. The exclude file is not shared with other clones.

## 2. Topology
The repo is a Yarn 4 (berry) workspaces monorepo with the globs `packages/*` (74 dirs) and `plugins/*` (160 dirs). It has 230 workspace packages with manifests.
Top level: `.changeset/`, `.claude/`, `.cursor/`, `.devcontainer/`, `.github/`, `.husky/`, `.lighthouseci/`, `.patches/`, `.storybook/`, `.yarn/`, `beps/`, `contrib/`, `docs/`, `docs-ui/`, `microsite/`, `packages/`, `plugins/`, `scripts/`, `workspaces/` (`workspaces/ui` is a separate nested Yarn project with its own root `package.json`).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks
| Manifest | Stack | Frameworks |
|---|---|---|
| `package.json` (root + 230 workspaces) | node-typescript (TS ~5.7, Node 22/24, yarn@4.8.1) | Backstage frontend system (`@backstage/frontend-plugin-api`), legacy frontend (`@backstage/core-plugin-api`), Backstage backend system (`@backstage/backend-plugin-api`), React 18, Material UI v4 + `@backstage/ui`, Express, Knex, Jest 30 + React Testing Library, Playwright, Storybook 10, zod |

No other language manifests were found at the root. Of the pre-authored adapters (`generic`, `nest`, `python`), only `generic` applies, because NestJS is not used. **Tier 2b triggered.** The stack profile was written to `.sdlc/baseline/stack-profile.md`.

## 4. Test / build / run
- **Proposed test command:** `CI=1 yarn test <path>`. Source: `package.json#scripts.test` (`backstage-cli repo test`, Jest) and the "Development Flow" section of `.claude/CLAUDE.md`. Always pass a file or directory path and never run all tests. Gate 0 confirms this command.
- Type check: `yarn tsc` from the repo root only, with no options. Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>` (changed files only).
- **Forbidden by project rules:** `yarn build`, `yarn changesets version`, `yarn release`.
- Project rules also require:
  - a changeset for any published package change in `packages/` or `plugins/`, written directly in `.changeset/`
  - API report regeneration via `yarn build:api-reports`
  - docs updates for new features
  - Apache-2.0 headers with the current year on new source files

## 5. Docs
- READMEs: `README.md` and 4 translations
- Agent and contributor guides:
  - `AGENTS.md` (canonical agent instructions)
  - `.claude/CLAUDE.md` (symlink to `AGENTS.md`)
  - `plugins/catalog-backend/CLAUDE.md`
  - `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`
- ADRs: `docs/architecture-decisions/` (adr001–adr015). Enhancement proposals: `beps/` (`beps/0001-notifications-system` is relevant).
- Feature docs: `docs/notifications/` (`index.md`, `usage.md`, `processors.md`), `docs/frontend-system/`, `plugins/home/README.md`, `plugins/notifications/README.md`. Doc style guide: `docs/contribute/doc-style-guide.md`.

## Detected AI/agent setup
| Path | Type |
|---|---|
| `.claude/` | Claude Code project dir |
| `.claude/CLAUDE.md` | Claude instructions (symlink to `../AGENTS.md`) |
| `.claude/settings.local.json` | Claude Code local settings (gitignored; presence only, not read) |
| `.claude/skills/` | Claude Code skills (`backstage-release-notes/`, `catalog-db-performance.md`) |
| `.cursor/rules/` | Cursor rules |
| `.cursor/rules/backstage-project.mdc` | Cursor rule (symlink to `../../AGENTS.md`) |
| `.cursor/rules/tests/` | Cursor rules (`backend-test-utils.mdc`, `test-utils.mdc`) |
| `.github/copilot-instructions.md` | Copilot instructions |
| `AGENTS.md` | Agent instructions (target of both symlinks) |
| `plugins/catalog-backend/CLAUDE.md` | Package-scoped Claude instructions |

The scan found none of these: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

## 7. Env keys (names only)
- There are no `.env*` files in the repo. `.env`, `.env.test` and `.envrc` are gitignored, so `env_keys_by_file` is empty.
- Code references 134 distinct env var names through `process.env.*`. The full list is in `baseline.json`. Most are CI, tooling or test names, such as `NODE_ENV`, `BACKSTAGE_ENV`, `LOG_LEVEL`, `POSTGRES_*`, `AWS_*`, `AZURE_*` and `GITHUB_TOKEN`. There are no Python or Java env references.
- Backstage reads runtime config mainly from `app-config*.yaml` (with `${VAR}` substitution), not directly from env.

## 8. Monorepo / submodules / LFS / infra
- Monorepo: `yarn-workspaces` with 230 packages, listed in `baseline.json#monorepo.packages` with role and version. The per-package test is `CI=1 yarn test plugins/<name>`.
- Submodules: none (there is no `.gitmodules` and no gitlinks). LFS: none (there is no `.gitattributes`).
- Infra:
  - Dockerfiles: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*`
  - Compose: `docker-compose.deps.yml`
  - Terraform: `contrib/terraform/`
  - CI: 49 GitHub workflows
  - Git hooks: Husky + lint-staged

## Regulated-repo signals
- `SECURITY.md` (kind: `security-policy-file`) at the repo root. This is a standard open-source vulnerability-disclosure policy, and there are no HIPAA, PCI, SOC2 or compliance dirs or files. The repo has no CODEOWNERS security, compliance, privacy or legal team entries.
- `regulated_repo_warning_required: true`, because the rule flags any hit. This is low-signal here.

## Relevant locations for this intent (roles only, no design)
| Location | Role |
|---|---|
| `plugins/home` (`@backstage/plugin-home`, frontend-plugin, 0.9.x) | Home page plugin. Ships built-in cards in `src/homePageComponents/*` (each a folder with `Content.tsx` + `index.ts`). Legacy card exports via `createCardExtension` are in `src/plugin.ts`. New-system widgets via `HomePageWidgetBlueprint.make(...)` are in `src/alpha.tsx`. |
| `plugins/home-react` (`@backstage/plugin-home-react`, web-library) | Card building blocks: `createCardExtension` (`src/extensions.tsx`), plus the `HomePageWidgetBlueprint` and `HomePageLayoutBlueprint` blueprints (`src/alpha/blueprints/`). |
| `plugins/notifications` (`@backstage/plugin-notifications`, frontend-plugin, 0.5.x) | Notifications UI. Contains `NotificationsApi`/`notificationsApiRef` and `NotificationsClient` (`src/api/`), the `useNotificationsApi` hook, `NotificationsPage`/`NotificationsTable`, and `NotificationsSidebarItem`. The sidebar item already subscribes to the `notifications` signal channel for live unread counts. Its new-system entry is `src/alpha.tsx`. |
| `plugins/notifications-common` (common-library) | Shared types (`Notification`, `NotificationStatus`, `NotificationSignal`), filters, constants. |
| `plugins/notifications-node` / `plugins/notifications-backend` (+ `-module-email`, `-module-slack`) | Backend service and REST router (`src/service/router.ts`). Knex store (`src/database/`, `migrations/`). The backend publishes signals on new or updated notifications. |
| `plugins/signals` / `plugins/signals-react` | Frontend `SignalApi` client (WebSocket) and the `useSignal(channel)` hook (`signals-react/src/hooks/useSignal.ts`). The hook degrades gracefully when the signals API is absent and exposes `isSignalsAvailable`. |
| `plugins/signals-node` / `plugins/signals-backend` | Backend signal publishing service and the WebSocket endpoint. |
| `packages/app` (`example-app`, new frontend system) | `src/App.tsx` installs `homePlugin` from `@backstage/plugin-home/alpha` and the module `src/modules/appModuleHome.tsx`, which adds widgets with `HomePageWidgetBlueprint.make`. Notifications and signals are dependencies. `src/modules/appModuleNav.tsx` wires `NotificationsSidebarItem`. `src/HomePage.tsx` is not imported by `App.tsx` (it appears unused). |
| `packages/app-legacy` (`example-app-legacy`, old frontend system) | `src/App.tsx` routes `/home` to `HomepageCompositionRoot` with either `components/home/HomePage.tsx` (static MUI `Grid` of `HomePage*` cards) or `components/home/CustomizableHomePage.tsx` (feature flag `customizable-home-page-preview`). The notifications sidebar item is in `components/Root/Root.tsx`. |
| `packages/backend` | Installs `plugin-notifications-backend`, `plugin-signals-backend`, `plugin-scaffolder-backend-module-notifications`. |
| `docs/notifications/`, `beps/0001-notifications-system/` | Notifications docs and design proposal. |

## Coexistence risks
- **Cursor rules detected:** "You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **Copilot instructions** at `.github/copilot-instructions.md`. These are untouched and only affect Copilot PR reviews.
- **Shared agent instructions:** `AGENTS.md` is symlinked from `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`. Editing it changes all three, so it is off-limits by default.
- **`.sdlc/` not gitignored:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run."
  - Mitigation already in place: in this clone, `.git/info/exclude` lists `.sdlc/`, so `git add -A` will not stage it. Committing `.sdlc` checkpoints therefore needs `git add -f`. Adding `.sdlc/` to `.gitignore` would also change a shared upstream file, which is probably unwanted for an upstream-tracking repo.
- **Git hooks:** Husky + lint-staged on commit run `eslint --fix` and `prettier --write` on staged files. Changes to `package.json` also regenerate `catalog-info.yaml` files and auto-`git add` them.
- No Aider config, no `.mcp.json` and no repo-local `routing-policy.yaml` were found.

## Proposed off-limits
- **Secrets / local config:** `.env`, `.env.*`, `.envrc`, `*.local.yaml`, `*-credentials.yaml`. None are present now.
- **AI config:** `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`.
- **Build / generated:** `node_modules/**`, `**/dist/**`, `dist-types/**`, `build/**`, `dist-storybook/**`, `coverage/**`.
- **Generated reports:** `**/report*.api.md` (API Extractor output, "Do not edit this file"), `**/report.sql.md`, `**/knip-report.md`. These are hand-edit off-limits. Gate 0 may allow them if the run regenerates them with `yarn build:api-reports`.
- **Vendored yarn:** `.yarn/releases/**`, `.yarn/patches/**`.
- **Project rule:** `docs/releases/**` (never edit past release notes).
- `.git/**`

There are no submodule or LFS paths.

## Repo-state risks summary
- Working tree: clean. LFS: none. Submodules: none. Encrypted secrets (git-crypt, sops, `.gpg`, `.pem` and similar): none tracked.
- `.gitignore` uses broad bare-name patterns: `logs`, `site`, `coverage`, `dist`, `.cache`, `*.local.yaml`, `*-credentials.yaml`. New files under paths with those names would be silently ignored, so avoid those names for new source folders.
