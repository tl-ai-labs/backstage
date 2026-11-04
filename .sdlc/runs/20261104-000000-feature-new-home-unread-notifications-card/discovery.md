# Discovery: backstage (first-time)

- Run id: `20261104-000000-feature-new-home-unread-notifications-card`
- Intent: feature-new. Add a home-page card listing the signed-in user's latest unread notifications, with live updates and a deep link to each notification.
- Mode: first-time (no prior `.sdlc/baseline/current.json`)
- Plugin: mmo 0.10.1

## Git state
- HEAD `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/argon4-plus-flash38`. Clean working tree.
- Remote: `origin git@github.com:tl-ai-labs/backstage.git`
- `.gitignore` does **not** list `.sdlc/`. `.sdlc/` is ignored only through `.git/info/exclude` (line 7). That works on this clone but is not committed (see Coexistence risks).

## Topology
Top-level dirs: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn beps contrib docs docs-ui microsite packages plugins scripts workspaces`. There are 12,247 tracked files, 74 packages and 160 plugins.
Entry points: `packages/app/src/App.tsx` (new frontend system), `packages/app-legacy/src/App.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks
- `package.json`: node-typescript. Backstage monorepo on Yarn 4.8.1 workspaces (`packages/*`, `plugins/*`), Node 22 or 24, React 18 types, Material UI v4 together with `@backstage/ui`, Jest 30 through `backstage-cli`, Playwright e2e, Storybook.
- No pre-authored adapter matches (only generic, nest and python ship), so the Tier 2b profile was built at `.sdlc/baseline/stack-profile.md`.

## Test / build commands (proposed; Gate 0 confirms)
- Test: `CI=1 yarn test <path>`. Source: `.claude/CLAUDE.md` Development Flow, which wraps root `scripts.test` (`backstage-cli repo test`). Always pass a path, for example `CI=1 yarn test plugins/notifications` or `CI=1 yarn test plugins/home`.
- Type check: `yarn tsc` (repo root only, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`. API reports: `yarn build:api-reports`.
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`.

## Docs
README.md (plus 4 translations), AGENTS.md (`.claude/CLAUDE.md` is a symlink to it), CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (17 entries), `docs/contribute/doc-style-guide.md`, `docs/notifications/{index,usage}.md`, and the READMEs for each package.
Rules from CLAUDE.md that bind this run:
- New source files need an Apache 2.0 header with the current year (2026). Leave existing years alone.
- Every published package under packages/ and plugins/ that changes needs a changeset, written directly as a file in `.changeset/`. For packages below 1.0.0, a new feature is a `patch` bump.
- Docs must be updated (TSDoc, README or `/docs`).
- Prefer fewer, thorough tests. Use RTL `screen` and `findBy*`. No test IDs.

## Detected AI/agent setup
- `.claude/` holds `CLAUDE.md` (a symlink to `../AGENTS.md`), `settings.local.json` (gitignored) and `skills/` (`backstage-release-notes/SKILL.md`, `catalog-db-performance.md`).
- `AGENTS.md`
- `.cursor/rules/` holds `backstage-project.mdc` (a symlink to `../../AGENTS.md`), `tests/test-utils.mdc` and `tests/backend-test-utils.mdc`.
- `.github/copilot-instructions.md`
- Not found: `.mcp.json`, `.cursorrules`, aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs, `CLAUDE.local.md`.

## Env keys (names only)
- No `.env*` files exist at any depth up to 4 outside node_modules. `.gitignore` covers `.env`, `.env.test` and `.envrc`.
- Code references 121 distinct `process.env.*` names repo-wide (listed in baseline.json). The target packages (notifications*, signals*, home*, app, app-legacy) reference none.

## Monorepo / submodules / LFS / infra
- Monorepo type is yarn-workspaces. Run tests per package with `CI=1 yarn test <pkg dir>`.
- No submodules (no `.gitmodules`). No LFS (no `.gitattributes`).
- Tracked symlinks: `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`, both pointing to AGENTS.md inside the repo.
- Infra: `.github/workflows` (49 workflows), `docker-compose.deps.yml`, `.devcontainer`, husky hooks. No Dockerfile at the root, no terraform.

## Where this job lands
- **Data:** `notificationsApiRef` in `plugins/notifications/src/api/NotificationsApi.ts`. It provides `getNotifications({ read: false, limit, sort: 'created', sortOrder: 'desc' })`, `getStatus()` and `updateNotifications({ ids, read })`. The hook `useNotificationsApi(f, deps)` wraps `useAsyncRetry`.
- **Live updates:** `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react`. The signal types are `new_notification` (with `notification_id`) and `notification_read` / `notification_unread` (with `notification_ids`); they live in `plugins/notifications-common/src/types.ts`. Working examples are `NotificationsSideBarItem.tsx` and `NotificationsPage.tsx`.
- **Deep link:** `notification.payload.link` is optional. When it is missing, fall back to the notifications `rootRouteRef` (`plugins/notifications/src/routes.ts`). `NotificationsTable` already supports `markAsReadOnLinkOpen`.
- **Card registration, legacy system:** `createCardExtension` from `@backstage/plugin-home-react`, exposed with `plugin.provide(...)` (see `plugins/home/src/plugin.ts`).
- **Card registration, new system:** `HomePageWidgetBlueprint.make` from `@backstage/plugin-home-react/alpha` (see `plugins/home/src/alpha.tsx`). A cross-plugin example is `plugins/search/src/alpha.tsx` with its `search-bar` widget.
- **Open placement question:** `plugins/notifications` does not depend on `@backstage/plugin-home-react` today. Putting the card there, as search does, means editing `plugins/notifications/package.json` and `yarn.lock`. Putting it in plugins/home would mean plugins/home depends on notifications and signals-react instead.
- **App wiring:** `packages/app/src/HomePage.tsx` (the `CustomHomepageGrid` defaultConfig), `packages/app/src/App.tsx`, and `packages/app-legacy/src/components/home/HomePage.tsx` / `CustomizableHomePage.tsx`.
- **Backend:** no change is expected. `plugins/notifications-backend` already supports read filtering and sorting, and sends signals.
- **Side effects:** a changeset for each published package touched. `report.api.md` / `report-alpha.api.md` change for new public exports. Translation keys go in `plugins/notifications/src/translation.ts`. `docs/notifications/usage.md` or the plugin README needs a docs update.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy). This is the standard OSS vulnerability-disclosure policy and a weak signal. No HIPAA, PCI, SOC2 or compliance folders were found, and CODEOWNERS has no security, compliance, privacy or legal team entries.
- `regulated_repo_warning_required: true` (the rule fires on any hit).

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions at `.github/copilot-instructions.md` and agent instructions at `AGENTS.md` stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. (On this clone `.git/info/exclude` already hides `.sdlc/`, so the risk today is low, but that exclusion is local only.)
- The husky pre-commit hooks run when commits are made.

## Proposed off-limits
`.git/**`, `.sdlc/**`, `.env`, `.env.*`, `.envrc`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `**/node_modules/**`, `**/dist/**`, `dist-types/**`, `**/build/**`, `.yarn/**`, `yarn.lock`, `docs/releases/**`, `**/report.api.md`, `**/report-alpha.api.md`, `**/knip-report.md`, `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`.
Gate 0 may need to move `yarn.lock` and the target packages' `report*.api.md` into scope, if the run adds a dependency or regenerates API reports.

## Notes
- Tier 1 ran no tests, so pre-existing failures are unknown. `node_modules` is installed. Yarn is 4.8.1, Node is v22.23.3.
- The scan finished well within the timebox. No sampling was needed.
