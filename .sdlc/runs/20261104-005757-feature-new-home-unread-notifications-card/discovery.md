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

## Intent-relevant surface (feature-new: home card of latest unread notifications, live, deep-linked)

### Notifications packages
- **Client API**: `plugins/notifications/src/api/NotificationsApi.ts`.
  - `notificationsApiRef` (id `plugin.notifications.service`).
  - `getNotifications(options?: GetNotificationsOptions)` takes `read?: boolean` (`read: false` returns unread), `limit`, `offset`, `sort: 'created'|'topic'|'origin'`, `sortOrder`, `minimumSeverity`, `search`, `saved`, `createdAfter` and `topic`. It returns `{ notifications, totalCount }`.
  - Also available: `getStatus()` returning `{ unread, read }`, `getNotification(id)`, `updateNotifications({ ids, read?, saved? })`, plus settings and topics calls.
  - The client is `NotificationsClient.ts`, tested in `NotificationsClient.test.ts` with msw.
- **Hook**: `useNotificationsApi(fn, deps)` in `src/hooks/useNotificationsApi.ts` wraps `useAsyncRetry` and is public. `useWebNotifications` and `useTitleCounter` exist in `src/hooks/` but are not exported from `src/index.ts`.
- **Live updates**: use `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react`.
  - `useSignal` reads `signalApiRef` through `useApiHolder`, so it is safe when signals are absent. It returns `{ lastSignal, isSignalsAvailable }`.
  - The backend publishes on channel `'notifications'` (`plugins/notifications-backend/src/service/router.ts` ~L592-602) with `new_notification` (`notification_id`) and `notification_read`/`notification_unread` (`notification_ids`).
  - The types are `NewNotificationSignal`, `NotificationReadSignal` and `NotificationSignal` in `plugins/notifications-common/src/types.ts`.
  - Pattern to mirror: `NotificationsPage.tsx` (~L84 and L143-159). It calls `useSignal('notifications')`, then a lodash `throttle`d `setRefresh` flag, then `retry()`.
  - `NotificationsSideBarItem.tsx` (~L177, L248-266) fetches `getNotification(signal.notification_id)` on `new_notification`.
- **Deep link**: `Notification.payload.link?: string` (optional, can be relative or absolute). The fallback is the plugin root route (`rootRouteRef`, id `notifications`, mounted at `/notifications`).
  - `NotificationsTable.tsx` (~L208-218) renders a `Link` from `@backstage/core-components` with `to={notification.payload.link}`. With `markAsReadOnLinkOpen` set, it calls `updateNotifications({ids, read:true})` on click.
  - The sidebar snackbar uses `window.open(link, '_blank')` and falls back to `useRouteRef(rootRouteRef)`.
- **Exports**:
  - Legacy `src/index.ts`: `notificationsPlugin`, `NotificationsPage`, `* from './api'`, `useNotificationsApi`, `* from './components'` (NotificationsSidebarItem, NotificationsTable, UserNotificationSettingsCard, `NotificationsPageProps` type) and `notificationsTranslationRef`.
  - New system `src/alpha.tsx`: the default `createFrontendPlugin({ pluginId: 'notifications', extensions: [page, api] })`. It has no home widget.
- **Translations**: `plugins/notifications/src/translation.ts` (`notificationsTranslationRef`). Use it for card strings.
- **Dependencies**: `@backstage/plugin-notifications` depends on `plugin-notifications-common`, `plugin-signals-react`, `core-components`, `core-plugin-api`, `frontend-plugin-api`, `@backstage/ui`, `react-use` and `lodash`.
  - It does not depend on `@backstage/plugin-home-react`. Contributing a card or widget from the notifications plugin needs that dependency added to `plugins/notifications/package.json` (`workspace:^`), as `plugins/search` does.
  - No dependency cycle results, because home-react depends only on core/frontend APIs, MUI and rjsf.
- `notifications-node` and `notifications-backend` (backend side) need no change for this intent. The API already supports `read=false` with `limit` and `sort=created`.

### Home packages (card authoring)
- **Old system**: `createCardExtension<T>({ name, title, description?, components: () => import('./X'), layout?, settings? })` from `@backstage/plugin-home-react` (`plugins/home-react/src/extensions.tsx`). It is provided through the plugin, as `export const X = somePlugin.provide(createCardExtension({...}))`.
  - Example: `HomePageStarredEntities` in `plugins/home/src/plugin.ts` L172-178. Its content module is `plugins/home/src/homePageComponents/StarredEntities/{index.ts,Content.tsx}`, which exports `Content` and optionally `Actions`, `Settings` and `ContextProvider`.
- **New system**: `HomePageWidgetBlueprint` from `@backstage/plugin-home-react/alpha` (`plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx`). Its kind is `home-page-widget` and it attaches to `page:home` input `widgets`. The params are `{ name?, title?, description?, components, layout?, settings?, componentProps? }`.
  - The best example from another plugin is `plugins/search/src/alpha.tsx` L96-113 (`homePageSearchBarWidget`, added to `extensions: [...]` of the plugin's `createFrontendPlugin`).
  - In-plugin examples are in `plugins/home/src/alpha.tsx` (toolkit, starred entities and others, using `makeWithOverrides` + zod config).
- Home page host: `plugins/home/src/alpha.tsx` defines `PageBlueprint` `/home` with input `widgets`.

### Example apps
- **`packages/app`** (new system): `src/App.tsx` installs `homePlugin` from `@backstage/plugin-home/alpha` and `appModuleHome` (`src/modules/appModuleHome.tsx`, a `getting-started` widget via `HomePageWidgetBlueprint`).
  - Widgets contributed by an installed plugin (for example search) appear automatically.
  - Notifications are used only for `NotificationsSidebarItem` in `src/modules/appModuleNav.tsx`.
  - `packages/app/src/HomePage.tsx` is an old-style `CustomHomepageGrid` page that nothing seems to import (likely dead code).
- **`packages/app-legacy`** (old system): `src/App.tsx` L111-118 routes `/home` to `CustomizableHomePage` (behind feature flag `customizable-home-page-preview`) or to `HomePage`. The files are `src/components/home/{HomePage.tsx,CustomizableHomePage.tsx}`. Notifications appear only as `NotificationsPage` and `NotificationsSidebarItem`.
- **The notifications plugin does not yet contribute a home widget or card anywhere.** There is no reference to it in home, the apps or create-app templates.
- Both apps already depend on `plugin-home`, `plugin-home-react`, `plugin-notifications` and `plugin-signals`.

### Tests, changesets, API reports, versions
- Tests sit next to the source as `*.test.ts(x)`. Setup is in `src/setupTests.ts` (`@testing-library/jest-dom`). Each package's test script is `backstage-cli package test`.
  - Use `renderInTestApp` and `TestApiProvider` from `@backstage/test-utils`, with `screen` from `@testing-library/react`. Examples: `plugins/notifications/src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx` and `plugins/home/src/homePageComponents/StarredEntities/Content.test.tsx`.
  - Prefer `findBy*` over `waitFor` and avoid test IDs (CLAUDE.md).
  - Root jest config has `rejectFrontendNetworkRequests: true`, so mock the API rather than calling the network.
- Test commands: `CI=1 yarn test plugins/notifications` (and `plugins/home-react` or `plugins/home` if those are touched).
- Changesets go in `.changeset/*.md`, written by hand (never the CLI). `.changeset/pre.json` has mode `exit`.
  - Frontmatter is `'@backstage/plugin-notifications': patch`. All relevant packages are below 1.0, so a new feature or API is a `patch` (a breaking change would be `minor`).
- API reports that would change:
  - `plugins/notifications/report.api.md` (legacy card export).
  - `plugins/notifications/report-alpha.api.md` (new widget extension in the alpha plugin).
  - If home-react is touched: `plugins/home-react/report.api.md` and `report-alpha.api.md`.
  - Also `plugins/notifications/knip-report.md` if dependencies change. Regenerate with `yarn build:api-reports`.
- Package versions:
  | Package | Version |
  | --- | --- |
  | notifications | 0.5.21-next.2 |
  | notifications-common | 0.2.4-next.0 |
  | notifications-node | 0.2.30-next.1 |
  | notifications-backend | 0.6.9-next.1 |
  | home | 0.9.10-next.2 |
  | home-react | 0.1.42-next.1 |
  | signals | 0.0.35-next.1 |
  | signals-react | 0.0.26-next.0 |
- Docs to update: `plugins/notifications/README.md` and `docs/notifications/usage.md` (plus `usage--old.md` for the legacy system).
- Dev harness: `plugins/notifications/dev/index.tsx` (`createDevApp` with `signalsPlugin`).
