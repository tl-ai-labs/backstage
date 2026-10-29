# Discovery - 20261029-120000-feature-new-notifications-home-card

Mode: first-time (full Tier 1 scan) plus Tier 2b stack profile. Intent: feature-new, a home-page card
that lists the signed-in user's latest unread notifications, updates live and deep-links to each one.

## Git state

- HEAD `fe6ace679f34` on `BS-NF-09/opus55-plus-sonnet55`. This is a git worktree, and its toplevel is the cwd.
- Dirty: only the untracked `.sdlc/`.
- Remotes: origin `https://github.com/tl-ai-labs/backstage.git`, upstream `https://github.com/backstage/backstage.git`.
- `.gitignore` does NOT cover `.sdlc/` (`gitignore_covers_sdlc: false`).

## Topology

- Yarn 4 workspaces (`packages/*`, `plugins/*`): 71 packages and 160 plugins. 12,247 tracked files. Other top-level folders: docs, docs-ui, microsite, beps, contrib, scripts, workspaces, .changeset, .patches.
- Entry points: `packages/app` (new frontend system), `packages/app-legacy` (old system), `packages/backend`.

## Detected stacks

- `package.json`: node-typescript, React, Backstage. Node 22 || 24, yarn@4.8.1. No pre-authored adapter fits, so the Tier 2b profile was written to `.sdlc/baseline/stack-profile.md`.

## Test / build

- Proposed test command: `CI=1 yarn test <path>`. Source: root `scripts.test` (`backstage-cli repo test`) and `.claude/CLAUDE.md`. Always pass a path.
- For this feature: `CI=1 yarn test plugins/notifications`.
- Type check: `yarn tsc` (root only). Format: `yarn prettier --write <files>`. Lint: `yarn lint --fix`. API reports: `yarn build:api-reports`.
- Never run `yarn build`, `yarn changesets version` or `yarn release`.

## Docs

README.md, `.claude/CLAUDE.md`, AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md,
`docs/architecture-decisions/` (ADRs: adr003 avoid default exports, adr006 avoid React.FC, adr007 use MSW),
`docs/contribute/doc-style-guide.md`, `docs/notifications/{index,usage,processors}.md` (plus `*--old.md`).

Project rules from CLAUDE.md that affect this feature:

- New source files need an Apache-2.0 header with the current year (2026).
- Write a changeset in `.changeset/` by hand. `@backstage/plugin-notifications` is at 0.5.x, so a new feature is a `patch`. Write it for adopters and name no internal symbols.
- Document the feature in TSDoc, the package README or `docs/notifications/`.
- Regenerate the API reports; do not hand-edit them.
- Tests: prefer fewer, thorough tests. Use `screen` with `findBy*`, avoid `waitFor`, add no test IDs.

## Detected AI/agent setup

- `.claude/` (CLAUDE.md, settings.local.json, skills/)
- `.cursor/rules/` (backstage-project.mdc, tests)
- `.github/copilot-instructions.md`
- None found: `.mcp.json`, Aider, `.continue`, `.roo`, `routing-policy.yaml`, gemini configs.

## Env keys

- No `.env*` files are present or tracked.
- The code references 134 distinct `process.env.*` names (names only, listed in baseline.json). None are notifications-specific.

## Monorepo / submodules / LFS / infra

- Yarn workspaces. No submodules, no LFS.
- Infra: `docker-compose.deps.yml` and `.github/workflows/` (49 files).

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md). This is a standard OSS disclosure policy, so the signal is weak. `regulated_repo_warning_required: true`.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- Copilot instructions (`.github/copilot-instructions.md`) and project Claude config (`.claude/`) are untouched.

## Proposed off-limits

`.env`, `.env.*`, `.mcp.json`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `node_modules/**`,
`dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `docs/releases/**`,
`**/CHANGELOG.md`, `**/knip-report.md`, ESLint/Prettier/TS configs.

`report*.api.md` files are generated: regenerate them with `yarn build:api-reports` and do not hand-edit them.

## Feature-relevant findings

### plugins/notifications (`@backstage/plugin-notifications` 0.5.21-next.2, frontend-plugin)

- `src/index.ts` is the public entry. It exports the plugin, NotificationsPage, `./api`, useNotificationsApi, `./components` and the translation ref.
- `src/plugin.ts` (old system): `createPlugin` with the notificationsApiRef factory, and NotificationsPage built with `createRoutableExtension`.
- `src/alpha.tsx` (new system): `createFrontendPlugin({ pluginId: 'notifications', extensions: [page, api] })`, using PageBlueprint at `/notifications` and ApiBlueprint. It has no home widget yet. A comment notes that the nav item must be installed manually.
- `src/routes.ts`: `rootRouteRef` (`createRouteRef({ id: 'notifications' })`).
- `src/api/NotificationsApi.ts`: `notificationsApiRef` (`plugin.notifications.service`).
  - `getNotifications(opts)`. Options are `search`, `read`, `saved`, `createdAfter`, `minimumSeverity`, `offset`, `limit`, `sort: 'created'|'topic'|'origin'`, `sortOrder: 'asc'|'desc'` and `topic`. It returns `{ notifications, totalCount }`.
  - Also: `getNotification`, `getStatus` (unread/read counts), `updateNotifications({ids, read, saved})`, settings and `getTopics`.
- `src/api/NotificationsClient.ts` (+ `.test.ts`, which uses MSW): the HTTP client.
- `src/hooks/useNotificationsApi.ts`: `useNotificationsApi(f, deps)` wraps `useAsyncRetry`. Other hooks: `useWebNotifications` and `useTitleCounter`.
- `src/components/`:
  - `NotificationsTable/` (NotificationsTable, NotificationIcon, SeverityIcon, NotificationDescription, BulkActions, SelectAll)
  - `NotificationsSideBarItem/` (exported as `NotificationsSidebarItem`)
  - `NotificationsPage/` (not exported from the barrel, only its props type)
  - `NotificationsFilters/`
  - `UserNotificationSettingsCard/`
  - Components are styled with CSS modules (`*.module.css`) and `@backstage/ui` (Flex, Text, ...). Links use `core-components` Link.
- Live updates: `useSignal<NotificationSignal>('notifications')` from `@backstage/plugin-signals-react`.
  - It returns `{ lastSignal, isSignalsAvailable }` and resolves `signalApiRef` through `useApiHolder`, so it works without signals installed.
  - NotificationsPage re-fetches when `lastSignal` changes. SideBarItem handles `new_notification`, `notification_read` and `notification_unread`.
  - The signal types live in `plugins/notifications-common/src/types.ts` (NewNotificationSignal, NotificationReadSignal).
- Deep links: `notification.payload.link?: string` (`notifications-common/src/types.ts:35`). NotificationsTable.tsx:208-221 renders a `<Link to={payload.link}>` around `payload.title` when a link is present, and marks the notification read on click if `markAsReadOnLinkOpen` is set. Without a link it renders plain text.
- Dependencies: core-components, core-plugin-api, frontend-plugin-api, notifications-common, signals-react, ui, @remixicon/react, react-use, lodash, notistack and react-relative-time. Dev dependencies: test-utils, plugin-signals, msw and testing-library.
  - It has NO dependency on `@backstage/plugin-home-react`. A home card will need one (search adds `"@backstage/plugin-home-react": "workspace:^"`).
- Tests: `src/plugin.test.ts`, `src/api/NotificationsClient.test.ts` and `src/components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx`. The last one shows the style to copy (`renderInTestApp` + `screen`). `src/setupTests.ts` loads jest-dom.
- `README.md` is short (getting started and real-time via signals) and would need a home-card section.
- `report.api.md` (public) and `report-alpha.api.md` (alpha plugin: `api:notifications`, `page:notifications`) are generated.
- `dev/index.tsx`: a createDevApp harness that registers the notifications and signals plugins.

### Home cards

- Old system: `createCardExtension<T>({ name, title, description, components, layout, settings })` in `plugins/home-react/src/extensions.tsx:85`, exported from `@backstage/plugin-home-react`.
  - ComponentParts are `{ Content, Actions?, Settings?, ContextProvider? }`.
  - Example: `plugins/home/src/plugin.ts:128` (HomePageRandomJoke) and `:160` (Toolkit), provided via `homePlugin.provide(...)`.
- New system: `HomePageWidgetBlueprint` in `plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx`, exported from `@backstage/plugin-home-react/alpha`.
  - kind `home-page-widget`, attached to `page:home` input `widgets`.
  - Params: `name`, `title`, `description`, `components`, `layout`, `settings`, `componentProps`.
- Cross-plugin example: `plugins/search/src/alpha.tsx:96`, the `homePageSearchBarWidget` built with `HomePageWidgetBlueprint.make({ name: 'search-bar', ... })` and added to the search plugin's extensions.
- More examples: `plugins/home/src/alpha.tsx` (toolkit via makeWithOverrides with configSchema, starred-entities) and `packages/app/src/modules/appModuleHome.tsx`.

### Example app wiring

- `packages/app` (new system): `@backstage/plugin-home/alpha` is installed, and `app-config.yaml` (around lines 68-100) enables and disables `home-page-widget:*` entries. Notifications is feature-discovered (`packages: all`).
  - A widget in `notifications/alpha` would show up as `home-page-widget:notifications/<name>`, and an `app-config.yaml` entry could enable it. This is the natural place.
- `packages/app-legacy`: `src/components/home/CustomizableHomePage.tsx` composes cards (HomePageRandomJoke etc.). It already depends on plugin-notifications and plugin-home-react, so a card can be added there.
