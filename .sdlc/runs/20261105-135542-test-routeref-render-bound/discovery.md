# Discovery — 20261105-135542-test-routeref-render-bound

Mode: refresh, decision **incremental**. The baseline was built at `2e8b882` for run `20261104-170616-bugfix-routeref-startup`. HEAD is now `73a1cbe`, one commit later. That commit adds the previous run's `.sdlc/` evidence (106 files), a changeset, two doc edits and a 4-file source fix. No stack manifest, AI config or policy file changed, so groups 3, 4 and 6 were not re-scanned. Only the git state and the intent focus were refreshed. Full details are in `.sdlc/baseline/discovery.md`, which still describes the repo correctly.

## Git state
- Branch `BS-BF-08/argon4-plus-flash38`, HEAD `73a1cbe3afaff5887e460837037a292bb55ba87d`, clean, in sync with `origin/BS-BF-08/argon4-plus-flash38` (`git@github.com:tl-ai-labs/backstage.git`).
- This is a git worktree of `/Users/macbook/Documents/GitHub/backstage`. Two other worktrees are active: `BS-RF-10` in the main clone and `BS-DOC-04`.
- `.gitignore` does not list `.sdlc/`. The shared `.git/info/exclude:7` does, so new `.sdlc/` files are ignored here.

## Delta since baseline (non-.sdlc)
- `.changeset/routeref-startup-resolution.md` (patch for `@backstage/frontend-app-api` and `@backstage/frontend-plugin-api`)
- `docs/frontend-system/architecture/36-routes.md`, `docs/frontend-system/building-apps/03-built-in-extensions.md`
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`, `packages/frontend-app-api/src/wiring/phaseApis.tsx`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`, `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`

## Detected stacks
Unchanged. There is one stack: node-typescript, using Yarn 4.18.0 workspaces over `packages/*` and `plugins/*` (233 packages) on Node 22 or 24. Frameworks: React, react-router-dom, the Backstage frontend and backend systems, Express, Jest, Storybook and Playwright.

## Test command
`CI=1 yarn test <path>`, from root `package.json#scripts.test` and `.claude/CLAUDE.md`. Always pass a path. For this run, use `CI=1 yarn test packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`. Gate 0 confirms the command.

## Intent focus (test)
- Target: the test `should resolve page route refs in app root elements after finalization without render loops`, at line 1915 of `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`. The previous run added it.
- Exact assertions to loosen: `expect(renderCount).toBe(1)` (line 1969) and `expect(renderCount).toBe(2)` (line 1977).
- The change is test-only, so no changeset is needed. Leave `.changeset/routeref-startup-resolution.md` unchanged.

## Detected AI/agent setup
Unchanged:
- `.claude/` holds `CLAUDE.md` (a symlink to `AGENTS.md`), `settings.local.json` and `skills/`.
- `AGENTS.md`.
- `.cursor/rules/` holds `backstage-project.mdc` (a symlink to `AGENTS.md`) and `tests/`.
- No `.mcp.json`, Aider, Continue, Roo or Copilot instructions, and no repo-local `routing-policy.yaml`.

## Env keys
There are no `.env*` files at the repo root. The list of env keys referenced in code is unchanged from the baseline (names only).

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md). This is the standard open-source vulnerability-disclosure policy. `regulated_repo_warning_required: true`.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- `.claude/settings.local.json` and the skills are left untouched.
- `.sdlc/` is not in `.gitignore`. `.git/info/exclude` covers it, but HEAD `73a1cbe` already **tracks 106 `.sdlc/` files**, including `baseline/current.json`, `ledger.json`, `ledger.md`, `project.json`, `local/write-contract.json` and the previous run's directory. Edits to those tracked files will show as modified in `git status`, and `git add -A` will stage them. New files under `.sdlc/runs/<this-run>/` stay ignored. This run's refresh rewrote `.sdlc/baseline/current.json`, so expect it to appear as modified.

## Proposed off-limits
Unchanged from the baseline (`off_limits_proposed` in `baseline.json`): `.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `routing-policy.yaml`, the build and generated dirs (`node_modules`, `dist`, `dist-types`, `build`, the OpenAPI `generated/` dirs), `.yarn/releases/**`, `.git/**`, `.sdlc/**`, `docs/releases/**`, and the ESLint, Prettier and TS configs. For this intent, `.changeset/**` and the non-test source files are also effectively out of scope.

## Stack profile
Reused: `.sdlc/baseline/stack-profile.md`, 1 run since it was built, under the 10-run bound. No manifest changed, so it was not rebuilt.
