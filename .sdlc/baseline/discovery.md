# Discovery — run 20261109-123717-feature-new-home-unread-notifs

Mode: first-time (full Tier 1 scan) · intent hint: feature-new · built 2026-11-09 · plugin mmo 0.10.1
Scan took well under the 10 s budget. No sampling was needed (12,247 tracked files, about 30 top-level dirs).

## Git state
- HEAD `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/opus55-plus-flash38-agsdk`; working tree **clean**.
- This folder is a **git worktree** (toplevel = cwd, so the precondition passes). Common git dir: `/Users/macbook/Documents/GitHub/Google-Projects/backstage/.git`.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- `gitignore_covers_sdlc: false`. Repo `.gitignore` has no `.sdlc` entry, **but** `.git/info/exclude` in the main checkout (line 7: `.sdlc/`) ignores it. `git check-ignore` confirms that `.sdlc/` is ignored in practice.

## Directory topology
Top level: `.changeset/`, `.claude/`, `.cursor/`, `.devcontainer/`, `.github/`, `.husky/`, `.lighthouseci/`, `.patches/`, `.storybook/`, `.yarn/`, `beps/`, `contrib/`, `docs/`, `docs-ui/`, `microsite/`, `packages/` (71), `plugins/` (160), `scripts/`, `workspaces/ui/` (a separate yarn project with its own lockfile).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Detected stacks
- `package.json` (root, private): **node-typescript**, Yarn 4.8.1 workspaces (`packages/*`, `plugins/*`), Node `22 || 24`. Frameworks: Backstage (its own framework), React 18, react-router 6, Jest via `backstage-cli`, Storybook, Playwright e2e. Backend packages use Express.
- `workspaces/ui/package.json`: a nested, separate yarn project. Not relevant to this feature.
- No Python, Go, Rust, JVM, Ruby, PHP or Elixir manifests.
- **No pre-authored adapter matches** (shipped adapters: generic, nest, python), so Tier 2b ran: `.sdlc/baseline/stack-profile.md`.

## Test / build / run commands
- **Proposed test command:** `CI=1 yarn test plugins/notifications plugins/home-react`
  - Source: root `package.json#scripts.test` (`backstage-cli repo test`), plus `AGENTS.md`/`.claude/CLAUDE.md`: "Use `CI=1 yarn test <path>` … Always provide a path, avoid running all tests."
  - Caveat: `plugins/home-react` has **no tests and no `setupTests.ts`** today. That path contributes nothing until a test exists. Gate 0 must confirm the command.
- Type check: `yarn tsc` (repo root, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`.
- API reports: `yarn build:api-reports`. From earlier runs: if CI fails on key order, use `yarn tsc:full` then `yarn build:api-reports:only`.
- **Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`.
- Dependencies are installed (`node_modules/.bin/backstage-cli` exists).

## Docs present
`README.md` (+ 4 translations), `AGENTS.md` (`.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to it), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, ADRs in `docs/architecture-decisions/` (adr000–adr015; relevant: adr003 no default exports, adr006 avoid React.FC, adr007 msw for request mocks), `docs/contribute/doc-style-guide.md`, `docs/notifications/` (index.md, usage.md and older versions), `beps/0001-notifications-system/`.

Key AGENTS.md rules for this run:
- New `.ts/.tsx` files need an Apache-2.0 header with the current year (2026). Leave the year on existing files alone.
- Match each package's own style.
- Tests: write fewer, more thorough tests. Use RTL `screen` + `findBy*`. Add no test IDs.
- Published `/plugins` changes need a changeset, written by hand in `.changeset/`, aimed at adopters, with no internal symbol names. Both target packages are below 1.0.0, so a new feature takes a `patch` bump. Write one changeset per package.
- New features need docs (TSDoc, package README, or `/docs`).
- Never touch ESLint, Prettier or TS config, or `docs/releases`.

## Feature-relevant package notes (requested)

### plugins/notifications — `@backstage/plugin-notifications` 0.5.21-next.2, role `frontend-plugin`, public (non-private)
- Exports: `.` → `src/index.ts` (legacy system: `createPlugin`, `createRoutableExtension`), `./alpha` → `src/alpha.tsx` (NFS: `createFrontendPlugin` with `PageBlueprint` + `ApiBlueprint`, default export).
- src tree: `api/` (NotificationsApi.ts, NotificationsClient.ts + `.test.ts`), `components/` (NotificationsFilters, NotificationsPage, NotificationsSideBarItem, NotificationsTable, UserNotificationSettingsCard, `index.ts` barrel), `hooks/` (useNotificationsApi, useTitleCounter, useWebNotifications), `plugin.ts` (+ `plugin.test.ts`), `routes.ts`, `translation.ts` (`notificationsTranslationRef`, id `plugin.notifications`, already has `unread` strings), `setupTests.ts`, `alpha.tsx`, `index.ts`. There is also a `dev/index.tsx` dev app that registers `signalsPlugin`.
- `src/setupTests.ts` exists and only imports `@testing-library/jest-dom`.
- Existing tests: `api/NotificationsClient.test.ts`, `plugin.test.ts`, `components/UserNotificationSettingsCard/UserNotificationSettingsPanel.test.tsx` (uses `renderInTestApp` from `@backstage/test-utils` + `screen`).
- Test devDependencies: `@backstage/test-utils`, `@testing-library/react` ^16, `@testing-library/jest-dom` ^6, `@testing-library/dom` ^10, `msw` ^2, `@backstage/plugin-signals`, `@backstage/dev-utils`, `@backstage/cli`. React 18 and react-router-dom 6.30.2 are dev deps; React is a peer dep.
- **Already depends on `@backstage/plugin-signals-react`: YES** (`dependencies`, `workspace:^`). `NotificationsSideBarItem.tsx` uses `useSignal<NotificationSignal>('notifications')` together with `useNotificationsApi(api => api.getStatus())` to keep an unread count. This is the pattern an unread card can reuse.
- **Depends on `@backstage/plugin-home-react`: NO.** Adding it means a `package.json` dependency edit (and `yarn install` to refresh `yarn.lock`).
- Other runtime deps: core-components, core-plugin-api, frontend-plugin-api, errors, plugin-notifications-common, theme, `@backstage/ui`, `@remixicon/react`, lodash, notistack, react-aria-components, react-relative-time, react-use.
- `NotificationsApi.getStatus(): Promise<NotificationStatus>` gives the unread count. `getNotifications(...)` lists notifications.
- API reports: `plugins/notifications/report.api.md`, `plugins/notifications/report-alpha.api.md`. Both are generated ("Do not edit").
- README: `plugins/notifications/README.md` (short: Getting started, Real-time notifications). Fuller docs live in `docs/notifications/usage.md`.
- Also present: `knip-report.md` (generated), `CHANGELOG.md`, `catalog-info.yaml`, `.eslintrc.js` (forbids top-level MUI4 imports).

### plugins/home-react — `@backstage/plugin-home-react` 0.1.42-next.1, role `web-library`, public (non-private)
- Exports: `.` → `src/index.ts` (`createCardExtension`, card types, components, overridable components, `homeReactTranslationRef`), `./alpha` → `src/alpha.ts` (`HomePageWidgetBlueprint`, `HomePageLayoutBlueprint`, data refs, card types).
- src tree: `alpha.ts`, `alpha/blueprints/HomePageWidgetBlueprint.tsx`, `alpha/blueprints/HomePageLayoutBlueprint.tsx`, `alpha/dataRefs.ts`, `components/` (ContentModal.tsx, SettingsModal.tsx, index.ts), `extensions.tsx` (`createCardExtension`, `CardExtension`, types `ComponentParts`, `CardLayout`, `CardSettings`, `CardConfig`, `RendererProps`), `index.ts`, `overridableComponents.ts`, `translation.ts`.
- **No `setupTests.ts` and no test files.** devDependencies hold only `@backstage/cli`, `@types/react`, `@types/react-grid-layout`, react, react-dom and react-router-dom. There are **no** `@testing-library/*` or `@backstage/test-utils` packages. Adding tests here means new devDependencies plus a `src/setupTests.ts`.
- Runtime deps: core-compat-api, core-components, core-plugin-api, frontend-plugin-api, `@material-ui/core`, `@material-ui/icons`, `@rjsf/utils`.
- API reports: `plugins/home-react/report.api.md`, `plugins/home-react/report-alpha.api.md` (generated).
- README: `plugins/home-react/README.md` (two lines only).
- Existing `HomePageWidgetBlueprint` consumers: `plugins/home/src/alpha.tsx` and `plugins/search/src/alpha.tsx` (`homePageSearchBarWidget`). Legacy `createCardExtension` consumers: `plugins/home/src/plugin.ts`. Card component modules follow the `homePageComponents/<Name>/{Content,Actions,Settings,Context}.tsx + index.ts` shape (see `plugins/home/src/homePageComponents/RandomJoke`).

## Detected AI/agent setup
- `.claude/` (dir): `.claude/CLAUDE.md` (symlink → `../AGENTS.md`), `.claude/skills/` (`backstage-release-notes/SKILL.md`, `catalog-db-performance.md`), `.claude/settings.local.json` (gitignored)
- `.cursor/rules/`: `backstage-project.mdc` (symlink → `../../AGENTS.md`), `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`
- `.github/copilot-instructions.md`
- `AGENTS.md`
- Not present: `CLAUDE.md` at root, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`

## Env keys
- No `.env*` files exist anywhere in the repo (depth ≤ 3, and none tracked). `env_keys_by_file: {}`.
- 134 distinct `process.env.*` names are referenced in code. Names only; the list is in `baseline.json`. No Python or Java env reads. None are relevant to this frontend-only feature.

## Monorepo / submodules / LFS
- Monorepo: **yarn-workspaces**, 269 packages under `packages/*` and `plugins/*` (full list in `baseline.json`). Per-package test: `CI=1 yarn test <package-root>`.
- Submodules: none (no `.gitmodules`).
- Git-LFS: none (no `filter=lfs` in any `.gitattributes`).
- Encrypted secrets: none found (no git-crypt, sops, `.gpg`, `.enc` or `.age`).

## Infra hints
`packages/backend/Dockerfile`, `docker-compose.deps.yml`, `contrib/terraform/techdocs-s3-storage`, about 50 `.github/workflows/*` files (ci.yml, api-breaking-changes.yml and others), `.husky/` pre-commit hooks with lint-staged, `.devcontainer/`.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md). This is a standard OSS vulnerability-disclosure policy. No HIPAA, PCI, SOC2 or GDPR files or dirs. CODEOWNERS has no security, compliance, privacy or legal team entries.
- `regulated_repo_warning_required: true` (set by rule; in substance the signal is weak).

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
  - *Note:* in this worktree `.sdlc/` is **already ignored** through the main checkout's `.git/info/exclude`, so `git add -A` will not stage it. Editing `.gitignore` is unnecessary and would add an unrelated diff to an upstream-style PR.
- Claude Code project config (`.claude/`) and Copilot instructions (`.github/copilot-instructions.md`) stay untouched.
- Husky and lint-staged run on commit and may reformat staged files.

## Proposed off-limits
`.env`, `.env.*`, `.envrc`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `node_modules/**`, `**/dist/**`, `**/dist-types/**`, `build/**`, `.next/**`, `.yarn/releases/**`, `.git/**`, `**/report*.api.md` and `**/knip-report.md` (generated: regenerate with `yarn build:api-reports`, never hand-edit), `docs/releases/**`, `.eslintrc.js` / `**/.eslintrc.js` / `.prettierignore` / `tsconfig.json` (AGENTS.md: never edit configs unless asked).

Files a run like this typically needs in scope (for Gate 0; this is not a plan): `plugins/notifications/{src/**,package.json,README.md,report*.api.md}`, `plugins/home-react/{src/**,package.json,report*.api.md}`, `.changeset/*.md`, possibly `docs/notifications/usage.md` and `yarn.lock` (if a dependency is added).
