# Discovery — backstage (run 20261030-142814-feature-new-home-unread-notifications)

Mode: first-time (full Tier 1 scan). Built 2026-10-30. Plugin mmo 0.9.3.
Repo size: 12,248 tracked files, 234 workspace packages. No sampling needed; the scan finished within the timebox.

## Git state

- HEAD `8b5ba7f43173f12cb48c9755758a61ed46589589` on branch `BS-NF-09/opus55-plus-flash38` (study branch, not master).
- Working tree clean (`git_dirty: false`).
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git`.
- `gitignore_covers_sdlc: false`. `.gitignore` has no `.sdlc` entry. `.sdlc/` IS ignored locally via `.git/info/exclude` (line 7), so `git add -A` will not pick it up on this clone. That exclusion is not shared through the repo.

## Topology

Top-level folders: `packages/` (74 core packages), `plugins/` (160 plugins), `docs/`, `beps/`, `contrib/`, `microsite/`, `docs-ui/`, `workspaces/ui`, `scripts/`, `.changeset/`, `.patches/`, `.storybook/`, `.github/`, `.devcontainer/`, `dist-types/` (generated).
Example apps: `packages/app` (new frontend system), `packages/app-legacy` (old system), `packages/backend`.

## Detected stacks

- `package.json` -> **node-typescript** (TypeScript ~5.7, React 18, Node 22/24, Yarn 4.8.1 workspaces). Framework: **Backstage** (its own plugin framework: `@backstage/frontend-plugin-api` new system, `@backstage/core-plugin-api` old system), Material UI v4 + `@backstage/ui`, Jest 30 + React Testing Library, Storybook 10, Playwright e2e.
- No python, go, rust, or java manifests at root.
- **Tier 2b triggered**: there is no React/Backstage adapter (only `generic`, `nest`, `python` ship). The profile is at `.sdlc/baseline/stack-profile.md`.

## Test command

- Proposed: `CI=1 yarn test <path>`. Source: `package.json#scripts.test` (`backstage-cli repo test`) plus the project instruction in `.claude/CLAUDE.md`: "Always provide a path, avoid running all tests."
- Paths for this run: `plugins/notifications`, `plugins/home-react`, `plugins/home`.
- Other commands: `yarn tsc` (root only, no options), `yarn lint --fix`, `yarn prettier --write <changed files>`, `yarn build:api-reports`.
- **Forbidden by project rules:** `yarn build`, `yarn changesets version`, `yarn release`.
- Dependencies are installed (`node_modules/.yarn-state.yml` exists). I did not run any tests, so the baseline pass/fail state is unknown.

## Docs

`README.md` (plus 4 translations), `AGENTS.md` (`.claude/CLAUDE.md` is a symlink to it), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, ADRs in `docs/architecture-decisions/` (17), BEPs in `beps/` (including `0001-notifications-system`), doc style guide `docs/contribute/doc-style-guide.md`.
Docs relevant to this run: `docs/notifications/usage.md` (it has a `## Signals` section) and `docs/getting-started/homepage.md` (the only doc that mentions `HomePageWidgetBlueprint`).

Key project rules (from CLAUDE.md/AGENTS.md):

- New `.ts/.tsx` files need an Apache 2.0 header with the current year (2026). Don't change the year on existing files.
- Changesets go in `.changeset/*.md`, written by hand, one per package, aimed at adopters, with no internal symbol names. For packages below 1.0, a new feature is a `patch` and a breaking change is a `minor`.
- Features need docs (TSDoc, the package README, or `/docs`).
- Prefer fewer, thorough tests. With RTL, use `screen` and `findBy*`, avoid `waitFor`, and don't add test IDs.
- Don't touch the ESLint, Prettier, or TS configs, or `docs/releases`.

## Detected AI/agent setup

- `.claude/` (tracked): `CLAUDE.md` -> `../AGENTS.md` symlink, `settings.local.json` (sets the subagent model env), `skills/` (backstage-release-notes, catalog-db-performance).
- `AGENTS.md` at the repo root.
- `.cursor/rules/` (tracked): `backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`.
- Not present: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, aider, `.continue/`, `.roo/`, `.github/copilot-instructions.md`, `routing-policy.yaml`, `gemini*` configs.
- Existing `.sdlc/project.json` sets `default_policy: opus55-plus-flash38`.

## Env keys

- No `.env*` files in the repo (none on disk, none tracked).
- Env names referenced in code: 128 unique (mostly CLI/tooling and CI: `NODE_ENV`, `CI`, `BACKSTAGE_*`, `AWS_*`, `POSTGRES_*`, `GITHUB_*`, `YARN_*`). None are in the notifications, home, or signals plugins. I recorded names only, never values.

## Monorepo / submodules / LFS

- Monorepo type: **Yarn workspaces** (`packages/*`, `plugins/*`). There is no nx, turbo, lerna, or pnpm manifest. Per-package tests: `CI=1 yarn test <package-dir>`.
- Submodules: none (no `.gitmodules`).
- LFS: none (no `.gitattributes`).

## Infra hints

`.github/workflows/` (49 workflows), `docker-compose.deps.yml`, `contrib/docker`, `contrib/terraform`, `contrib/kubernetes`, `.devcontainer/`, Husky `pre-commit` (lint-staged: eslint --fix, prettier, docs quality check). There is no root `Dockerfile`.

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md) at the repo root. This is a standard OSS vulnerability-disclosure policy. I found no HIPAA, PCI, SOC2, or compliance folders, and no security, compliance, privacy, or legal team owners in CODEOWNERS.
- `regulated_repo_warning_required: true` (per the rule). It is most likely a false positive for an OSS project.

## Run-relevant findings (feature: home-page unread-notifications card)

- **`plugins/notifications`** (`@backstage/plugin-notifications` 0.5.21-next.2, frontend-plugin)
  - `src/alpha.tsx`: the new-system plugin registers only `page` (PageBlueprint at `/notifications`) and `api` (ApiBlueprint). It has no home widget yet. There is a TODO saying the nav item needs manual install.
  - `src/api/NotificationsApi.ts`: `getNotifications({ read, limit, offset, sort, sortOrder, ... })`, `getStatus()` -> `{ unread, read }`, `updateNotifications({ ids, read })`.
  - `src/hooks/useNotificationsApi.ts`: wraps `useAsyncRetry` (react-use) around `notificationsApiRef`.
  - Signals: `NotificationsSideBarItem.tsx` and `NotificationsPage.tsx` use `useSignal<NotificationSignal>('notifications')`. The sidebar has `// TODO: Do we want to add long polling in case signals are not available`. `NotificationSignal` (new_notification / notification_read / notification_unread) lives in `plugins/notifications-common/src/types.ts`.
  - **Deep link:** `NotificationsPage` does not read an `?id=` query param today (no `useSearchParams` anywhere in the plugin). `/notifications?id=` needs page support, or will just land on the list.
  - **Dependency gap:** this plugin does not depend on `@backstage/plugin-home-react`. A widget registered from here needs a `package.json` dependency and a `yarn.lock` change. `@backstage/plugin-signals` is already a devDependency, and `@backstage/plugin-signals-react` is a runtime dependency.
  - Translations live in `src/translation.ts` (`notificationsTranslationRef`, `plugin.notifications`). New UI strings should be added there.
  - Companion files: `report.api.md`, `report-alpha.api.md` (generated, regenerate with `yarn build:api-reports`), `README.md` (it has a "Real-time notifications" section), `dev/index.tsx`.
- **`plugins/home-react`** (`@backstage/plugin-home-react` 0.1.42-next.1, web-library)
  - `src/extensions.tsx`: `CardExtension` calls `useApp()` from `@backstage/core-plugin-api` to get `Progress` as the Suspense fallback. **This is the app-context dependency the "render without app context" change targets.** It also uses `useTranslationRef` (frontend-plugin-api), `InfoCard`, and `SettingsModal`.
  - `src/alpha/blueprints/HomePageWidgetBlueprint.tsx`: kind `home-page-widget`, attaches to `page:home` input `widgets`, and wraps `CardExtension` in `lazy()` and `ExtensionBoundary`.
  - Exports: `.` (createCardExtension, types, components, translation) and `./alpha` (blueprints, dataRefs).
  - Companion files: `report.api.md`, `report-alpha.api.md`, `README.md` (minimal).
- **`plugins/home`** (0.9.10-next.2): `src/alpha.tsx` holds the reference widgets (`HomePageWidgetBlueprint.make({ name: 'starred-entities', params: { name, title, description, components: () => import(...).then(m => ({ Content: m.Content })) } })`). Each widget lives in its own `src/homePageComponents/<Name>/` folder with `Content.tsx`, `index.ts`, and `Content.test.tsx`.
- **`plugins/signals-react`** (0.0.26-next.0): `useSignal(channel)` returns `{ lastSignal, isSignalsAvailable }`. It reads through `useApiHolder().get(signalApiRef)` so it works when signals aren't installed. `isSignalsAvailable` is the documented hook for falling back to polling.
- **Example app:** `packages/app/src/modules/appModuleHome.tsx` shows how a module registers a widget with `createFrontendModule` and `HomePageWidgetBlueprint`.
- **Changesets:** 163 pending. Existing related one: `.changeset/neat-notification-context.md` (notifications patch). This run needs new changesets for `plugin-notifications` and `plugin-home-react`.

## Coexistence risks

- **Cursor rules detected:** "You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **`.sdlc/` not gitignored:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run." Note: on this clone `.git/info/exclude` already hides `.sdlc/`, so the risk is limited to other clones. Changing the upstream `.gitignore` in a study branch is probably not wanted.
- **Husky pre-commit:** lint-staged runs `eslint --fix` and `prettier` on staged files, and its `package.json` hook regenerates `catalog-info.yaml`. Commits may rewrite files.
- **Tracked `.claude/settings.local.json`:** it pins `CLAUDE_CODE_SUBAGENT_MODEL`. Leave it untouched.

## Proposed off-limits

`.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `yarn.lock`_, `**/report.api.md`_, `**/report-alpha.api.md`_, `**/knip-report.md`, `**/CHANGELOG.md`, `docs/releases/**`, ESLint/Prettier/TS configs, `.git/**`, `.sdlc/**`.
(_) The run will probably need `yarn.lock` (a new home-react dependency in notifications) and the API reports for notifications and home-react to be regenerated. If so, move those specific files into scope at Gate 0.
