# Discovery — `20261101-102810-feature-new-home-notifications-card`

Mode: first-time. Intent: feature-new. Job: add a home-page card listing the signed-in user's latest unread
notifications, updating live and deep-linking to each notification.

Scan note: the whole pass took roughly 4.5 minutes, well over the 30-second timebox, because it included the job
context reads and the Tier 2b profile. Nothing was skipped because of it.

## Git state
- HEAD `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on `BS-NF-09/opus55-only`. No tracked changes; only `.sdlc/` is untracked.
- Remotes: `origin` is `tl-ai-labs/backstage`, `upstream` is `backstage/backstage`.
- Linked worktree of `/Users/apple/Documents/GitHub/backstage`, one of seven sharing that git directory and stash.
- HEAD is 952 commits behind `origin/master`, with none ahead. `yarn lint` runs with `--since origin/master`, so its
  base is wide here.
- `gitignore_covers_sdlc: false`.

## Directory topology
TypeScript monorepo. 71 directories under `packages/`, 160 under `plugins/`, plus `docs/`, `docs-ui/`, `microsite/`,
`beps/`, `contrib/`, `scripts/` and `workspaces/ui/`.

## Detected stacks
- `package.json`: node-typescript. Backstage, React (60 workspace packages), Express (45). Yarn 4.8.1, Node 22 or 24
  (local Node is v24.22.1).
- `docs-ui/package.json`: Next.js and React, outside the root workspaces.
- `microsite/package.json`: Docusaurus and React, outside the root workspaces.
- No pre-authored adapter fits, so the Tier 2b profile was built at `.sdlc/baseline/stack-profile.md`.

## Test command
Proposed `CI=1 yarn test <path>`, for example `CI=1 yarn test plugins/notifications`. Source: `package.json#scripts.test`,
with the path-scoped form required by `.claude/CLAUDE.md`. Not run during discovery; Gate 0 should confirm it.

## Docs
`README.md` and four translations, `AGENTS.md` (the canonical instructions), `.claude/CLAUDE.md` (symlink to it),
`CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/`.

## Detected AI/agent setup
- `.claude/`, `.claude/skills/`, `.claude/settings.local.json` (gitignored)
- `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`, both symlinks to `AGENTS.md` inside the repo
- `.cursor/`, `.cursor/rules/` (including `tests/*.mdc`)
- `.github/copilot-instructions.md`
- `plugins/catalog-backend/CLAUDE.md`
- Not found: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*` config

## Env files
No `.env*` files exist anywhere outside ignored build and dependency folders, so `env_keys_by_file` is empty. 71
env variable names are referenced in code, names only, recorded in `baseline.json`.

## Monorepo, submodules, LFS
- Yarn workspaces `packages/*` and `plugins/*`: 230 packages. `docs-ui`, `microsite` and `workspaces/ui` sit outside.
- Submodules: none. LFS: none in the repo (no `.gitattributes`). The `filter.lfs.*` settings come from git config, not
  from repo patterns.
- Encrypted secrets: none found. No `.gitattributes`, no git-crypt or SOPS markers, no tracked key or vault files. Name
  matches were limited to `plugins/kubernetes-react/src/__fixtures__/{1,2}-secrets.json`, which were not opened.
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, `contrib/terraform`, 49 GitHub workflow entries.

## .gitignore review
Conventional, not aggressive for this work. No nested `.gitignore` in the home, notifications or signals plugins.
Broad patterns to keep in mind when naming new paths: `logs`, `site`, `dist`, `coverage`, `.cache`, `typings/`,
`docs.json`, `knip.json`, `*.local.yaml`, `*-credentials.yaml`, `docs/**/sidebar.ts`, `docs/reference`. Two tracked
files match ignore rules, both ESLint fixtures under `packages/eslint-plugin/src/__fixtures__/`.

## Other repo-state notes
- `node_modules` was installed 2026-10-29, while `yarn.lock` was last written 2026-11-01. The lockfile matches HEAD, but
  whether the install is current was not verified.
- `dist-types/` at the root is ignored output from 2026-10-29.
- The commit hook is `yarn lint-staged`, through `core.hooksPath` `.husky/_`. It can rewrite staged files, regenerate
  `catalog-info.yaml` and sort `package.json`.
- `.changeset/pre.json` is present with mode `exit` and tag `next`.

## Regulated-repo signals
- `security-policy-doc`: `SECURITY.md`. It is a vulnerability-reporting policy, not evidence of regulation, but the flag
  is set by rule. No other signals were found, and CODEOWNERS has no matching teams.

## Job context
Notifications:
- `plugins/notifications` (`@backstage/plugin-notifications` 0.5.21-next.2), `plugins/notifications-common`,
  `plugins/notifications-backend`, `plugins/notifications-node`
- Signals: `plugins/signals-react`, `plugins/signals`, `plugins/signals-node`, `plugins/signals-backend`

Home:
- `plugins/home` (`@backstage/plugin-home` 0.9.10-next.2), `plugins/home-react` (`@backstage/plugin-home-react` 0.1.42-next.1)

Home-card conventions:
- New system: `HomePageWidgetBlueprint` in `plugins/home-react/src/alpha/blueprints/HomePageWidgetBlueprint.tsx`, used in
  `plugins/home/src/alpha.tsx`.
- Legacy: `createCardExtension` in `plugins/home-react/src/extensions.tsx`, used in `plugins/home/src/plugin.ts`.
- Cross-plugin precedent: `plugins/search/src/alpha.tsx`, with `@backstage/plugin-home-react` as a dependency.
- App-level example: `packages/app/src/modules/appModuleHome.tsx`. Default layout: `page:home` in `app-config.yaml`.
- Card parts live in `plugins/home/src/homePageComponents/<Name>/`.
- Docs: `docs/getting-started/homepage.md`, `docs/notifications/usage.md`.

Existing building blocks:
- `getNotifications` takes `read`, `limit`, `sort` and `sortOrder`. `useNotificationsApi` is public.
- `useSignal('notifications')` with `NotificationSignal` gives live updates. `NotificationsPage.tsx` shows the throttled
  refresh pattern. There is no polling fallback when signals are unavailable (a TODO in `NotificationsSideBarItem.tsx`).

Points for Gate 0 or the architect:
- No home card for notifications exists at HEAD, and no dependency links the notifications and home plugins yet.
- There is no per-notification route. `rootRouteRef` is the only route, and `NotificationsPage` reads no URL parameters
  for a specific item. "Deep-link" can only mean `payload.link` today, and `link` is optional, so notifications without
  one need a decision (the snackbar falls back to the notifications page).
- Styling differs by package: `plugins/notifications` uses `@backstage/ui` and CSS modules, `plugins/home` uses Material UI v4.
- Whether `origin/master` already contains a similar card was not checked.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits
`.env`, `.env.*`, `.env.local`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`,
`plugins/catalog-backend/CLAUDE.md`, `node_modules/**`, `packages/*/node_modules/**`, `plugins/*/node_modules/**`,
`dist/**`, `packages/*/dist/**`, `plugins/*/dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`,
`third_party/**`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `.git/**`.

Patterns are anchored because `dist` and `build` also appear as tracked fixture and source folders, such as
`packages/cli-module-build/src/commands/package/build`. `AGENTS.md` is included because two AI config files link to it.
`report*.api.md` is left out because `yarn build:api-reports` must regenerate it.

Also from `.claude/CLAUDE.md`, recorded in `project_write_constraints`: do not change `docs/releases/**` or ESLint,
Prettier and TypeScript config unless asked.
