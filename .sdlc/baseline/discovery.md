# Discovery: Backstage monorepo (BS-BF-08 worktree)

Run: `20261109-123500-bugfix-routeref-app-root` · mode: first-time · plugin mmo 0.10.1
Intent (context): bugfix. In the new frontend system, app root elements that call `useRouteRef` during startup crash with "No path for routeRef".

## Git state

- HEAD `2e8b88268c8ad911d46ee3ad404162eddcc36c8c` on branch `BS-BF-08/opus55-plus-flash38-agsdk` (base master). Working tree clean.
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git`.
- This folder is a **git worktree**. Its git dir and stash stack are shared with `/Users/macbook/Documents/GitHub/backstage/.git`.
- `.gitignore` has no `.sdlc` entry (`gitignore_covers_sdlc: false`). However, `.sdlc/` is listed in the shared `info/exclude` (line 7), and `git check-ignore` confirms `.sdlc/` is ignored. Run artifacts will not be picked up by `git add -A`.

## Directory topology

Top level: `packages/` (74), `plugins/` (160), `docs/`, `docs-ui/`, `microsite/`, `beps/`, `contrib/`, `scripts/`, `workspaces/`, `.changeset/`, `.patches/`, `.github/`, `.storybook/`, `.devcontainer/`, `.yarn/`. 12,302 tracked files. Full scan, no sampling needed.
Entry points: `packages/app/src/index.tsx` and `App.tsx` (new frontend system), `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Detected stacks

- `package.json` -> **node-typescript**. Yarn 4.18.0 workspaces (`packages/*`, `plugins/*`), Node 22 or 24. React 17/18 plus react-router-dom 6 (peer deps of `@backstage/frontend-plugin-api`), and the Backstage frontend and backend systems.
- Adapter: no Tier 2b trigger (no flag, no custom framework declared). `generic.md` is the baseline.

## Test command

- **Proposed: `CI=1 yarn test <path>`**, run from the repo root. Source: `.claude/CLAUDE.md` Development Flow. `package.json#scripts.test` runs `backstage-cli repo test`, which uses Jest. Always pass a path and never run the full suite.
- Suggested for this run:
  - `CI=1 yarn test packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`
  - Wider check: `CI=1 yarn test packages/frontend-app-api/src packages/frontend-plugin-api/src/routing`
- Other checks: `yarn tsc` (root only, no options), `yarn prettier --write <changed files>`, `yarn lint --fix`. Do **not** run `yarn build`, `yarn changesets version` or `yarn release`.
- Prerequisite: `yarn install` at the root. `node_modules/` is present.

## Docs present

README.md (plus 4 translations), `.claude/CLAUDE.md`, AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADR 000-015; ADR003 avoid default exports; ADR006 avoid React.FC), `docs/frontend-system/`, `docs/contribute/doc-style-guide.md`.

Repo rules a bugfix must follow:

- New source files need an Apache 2.0 header with the current year. Do not change the year on existing files.
- Match the style of the package you edit.
- Tests: prefer fewer, thorough tests. With RTL, use `screen` and `findBy*` and do not add test IDs.
- A published package change needs a changeset. Write it directly in `/.changeset`, never through the CLI. Use a **patch** bump: all affected packages are below 1.0.0. The message should describe adopter-facing behavior and avoid internal symbol names.
- No existing changeset mentions `frontend-app-api`, `frontend-plugin-api` or `plugin-app` (79 files checked).
- Do not edit ESLint, Prettier or TS config, or `docs/releases/`.

## Detected AI/agent setup

- `.claude/` (CLAUDE.md, `skills/backstage-release-notes`, `skills/catalog-db-performance.md`)
- `.cursor/rules/` (`backstage-project.mdc`, `tests/backend-test-utils.mdc`, `tests/test-utils.mdc`)
- `.github/copilot-instructions.md`
- `AGENTS.md`
- Absent: `.mcp.json`, `.claude/settings*.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, any `routing-policy.yaml` or `gemini*` config.

## Env keys (names only)

- There are no `.env*` files in the repo, so `env_keys_by_file` is empty.
- In the bug scope (frontend-app-api, frontend-plugin-api, frontend-defaults, plugins/app), code references only `APP_CONFIG` and `NODE_ENV`.
- The repo-wide list (about 120 names, mostly CLI, CI, AWS/Azure and Postgres) is in `baseline.json`.

## Monorepo / submodules / LFS / infra

- Monorepo: Yarn workspaces. Packages relevant to this run:
  - `@backstage/frontend-app-api` 0.16.9-next.0
  - `@backstage/frontend-plugin-api` 0.18.2-next.0
  - `@backstage/plugin-app` 0.5.4-next.0
  - `@backstage/frontend-defaults`
- Submodules: none. LFS: none.
- Infra: `.github/workflows/` (CI), `docker-compose.deps.yml`, `.devcontainer/`. No Dockerfile at root, no Terraform.

## Regulated-repo signals

- `SECURITY.md` (kind: security-policy). This is the standard open-source vulnerability-disclosure policy. There are no HIPAA, PCI, SOC2 or compliance folders and no compliance teams in CODEOWNERS. `regulated_repo_warning_required: true` is set because the rule requires it, but this is a low-weight signal.

## Files most relevant to this bug

How the code fits together, from a read of the code:

- `prepareSpecializedApp` first builds a **bootstrap** app. `createBootstrapApp` in `treeLifecycle.tsx` calls `instantiateAndInitializePhaseTree` with `stopAtAttachment` at `app/root.children` (`isSessionBoundaryAttachment`). So the page and route subtree under `children` is not instantiated in the bootstrap phase.
- `app/root.elements` _are_ instantiated at bootstrap. Only predicate-gated ones are deferred, by `classifyBootstrapTree`. They also keep their bootstrap instances across finalization (`treeLifecycle.tsx`, around line 183).
- After instantiation, `instantiateAndInitializePhaseTree` (`phaseApis.tsx`, around lines 241-279) runs `extractRouteInfoFromAppNode(tree.root)` and calls `RouteResolutionApiProxy.initialize(...)`.
- In the bootstrap phase, that route info covers only the bootstrap-visible tree. An app root element that calls `useRouteRef(someRouteRef)` therefore reaches a `RouteResolver` that has no entry for routes under `children`.
- The resolver then throws `No path for ${ref}` (`RouteResolver.ts:153`, in the `diffPaths` map) instead of returning `undefined`.
- The proxy itself throws a different message ("You can't access the RouteResolver during initialization…") when it has not been initialized. This fits the reported crash coming from a resolver that was initialized with incomplete bootstrap route info.
- This is a hypothesis for the architect to confirm.

Source:

- `packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx`: bootstrap, finalize and session flow (`createBootstrapApp` around line 517, `finalizeFromSessionState` around 636 and 689, `finalizeFromBootstrapError` around 723 and 758).
- `packages/frontend-app-api/src/wiring/treeLifecycle.tsx`: `createBootstrapApp`, `classifyBootstrapTree`, `isSessionBoundaryAttachment`, and the logic that clears and keeps instances at finalization.
- `packages/frontend-app-api/src/wiring/phaseApis.tsx`: `RouteResolutionApiProxy` (line 113), `createPhaseApis`, `instantiateAndInitializePhaseTree`.
- `packages/frontend-app-api/src/wiring/createSpecializedApp.tsx`.
- `packages/frontend-app-api/src/routing/RouteResolver.ts`: the `No path for` throw (line 153), `resolve()` (line 193).
- `packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts`, `collectRouteIds.ts`, `RouteAliasResolver.ts`.
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: calls `routeResolutionApi.resolve` in a `useMemo` keyed on the API, the ref and the pathname. It does not re-resolve when the delegate changes at finalization.
- `packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.tsx`.
- `plugins/app/src/extensions/AppRoot.tsx`: the `elements` input (line 80), rendered as `extraElements` (line 136).

Tests next to the code:

- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`: the main suite. It includes `describe('prepareSpecializedApp')` (line 1023), "should defer conditional app root elements until finalize" (line 1660), and a `useRouteRef` route-binding test (line 670). This is the most likely place for a regression test.
- `packages/frontend-app-api/src/routing/RouteResolver.test.ts`, `extractRouteInfoFromAppNode.test.ts`.
- `packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`, `packages/frontend-plugin-api/src/blueprints/AppRootElementBlueprint.test.tsx`.
- `packages/frontend-defaults/src/createApp.test.tsx`.

Not in scope (old frontend system, same error string): `packages/core-app-api/src/routing/RouteResolver.ts`, `packages/core-plugin-api/src/routing/useRouteRef.tsx`.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions (`.github/copilot-instructions.md`) and the project `.claude/` folder are present. They will not be touched.
- `.gitignore` does not list `.sdlc/`, but the shared git `info/exclude` already ignores it. You do not need to add `.gitignore` to the allowlist. If you want the ignore rule inside the repo itself, you can opt in at Gate 0.
- This folder is a worktree that shares its stash with the main clone and with other worktrees (`bs-cells/*`). Do not use bare `git stash` in rollback.

## Proposed off-limits

`.env`, `.env.*`, `.env.local`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`, `routing-policy.yaml`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `dist-types/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `**/report.api.md`, `**/report-*.api.md`, `**/knip-report.md` (all generated), `docs/releases/**`, `.eslintrc.js`, `tsconfig.json`, `.prettierignore` (repo rules forbid editing these).

## Notes

- The Tier 1 scan finished well inside the timebox. The Tier 2b adaptive profile was not triggered.
