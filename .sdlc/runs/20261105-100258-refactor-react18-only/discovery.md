# Discovery — 20261105-100258-refactor-react18-only

Mode: first-time (full Tier 1 scan). Built 2026-11-05T04:36:05Z by mmo 0.10.1.
Intent (context): refactor — require React 18 across Backstage packages and remove React 17 shims, legacy render paths and peer ranges.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-RF-10/argon4-plus-flash38` (clean working tree).
- Remote: `origin` → `git@github.com:tl-ai-labs/backstage.git`.
- `.gitignore` has **no** `.sdlc` entry (`gitignore_covers_sdlc: false`). `.git/info/exclude` does list `.sdlc/`, so it is ignored on this clone only.

## Topology
Yarn 4.18.1 workspaces monorepo (`packages/*`, `plugins/*`): 74 dirs in `packages/`, 162 in `plugins/`, 235 workspace `package.json` files, ~12.4k tracked files.
Top-level dirs: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types` (generated), `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces` (`workspaces/ui` is a separate Yarn project with its own lockfile).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old system), `packages/backend/src/index.ts`, `packages/techdocs-cli-embedded-app/src/index.tsx`.

## Detected stacks
- `package.json` → **node-typescript** (TypeScript ~5.7, Node 22 || 24). Frameworks: React (installed react/react-dom 18.3.1, @types/react 18.3.23; root `resolutions` pins @types/react(-dom) to ^18), react-router-dom 6, Material UI v4 + `@backstage/ui`, Express-based backend system, Jest 30 + @testing-library/react 16, Playwright e2e, Storybook 10, webpack/rspack bundling via `@backstage/cli`.
- No pre-authored adapter matches (shipped: generic, nest, python), so the Tier 2b stack profile was built: `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- Test (proposed): `CI=1 yarn test <path>` — always scoped to a file or package dir (per `.claude/CLAUDE.md`; root `scripts.test` = `backstage-cli repo test`). Never run unscoped.
- Type check: `yarn tsc` (root only, no options).
- Lint: `yarn lint --fix`. Peer-dependency policy check: `yarn lint:peer-deps` (runs in CI, `.github/workflows/ci.yml:111`).
- API reports: `yarn build:api-reports` (needed when public API changes, e.g. `@backstage/test-utils`).
- Forbidden by project rules: `yarn build`, `yarn changesets version`, `yarn release`.
- Gate 0 still confirms these.

## Docs
README.md (+4 translations), `.claude/CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, ADRs at `docs/architecture-decisions/` (adr000–adr015), `docs/contribute/project-structure.md`, `docs/contribute/doc-style-guide.md`, `beps/`.
Project rules that matter for this intent: changesets needed for non-private packages under `packages/` and `plugins/` (edit `.changeset/*.md` directly; breaking = minor for <1.0.0, major for >=1.0.0); docs updates for behaviour changes; never edit `docs/releases/`; never touch ESLint/Prettier/TS config; do not bump copyright years on existing files.

## Detected AI/agent setup
- `.claude/` — `CLAUDE.md`, `settings.local.json`, `skills/` (backstage-release-notes, catalog-db-performance.md)
- `.cursor/rules/` — `backstage-project.mdc`, `tests`
- `.github/copilot-instructions.md`
- `AGENTS.md`
- Not present: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env keys (names only)
No `.env*` files at the repo root or tracked. 75 env names referenced in code (e.g. `HAS_REACT_DOM_CLIENT`, `NODE_ENV`, `BACKSTAGE_ENV`, `GITHUB_TOKEN`, `POSTGRES_*`, `AWS_*`, `AZURE_*`). Full list in `baseline.json`. **`HAS_REACT_DOM_CLIENT` exists only to support React 17.**

## Monorepo, submodules, LFS, infra
- Yarn workspaces, 235 packages; per-package test is `CI=1 yarn test <pkg-dir>`.
- Separate installs: `workspaces/ui`, `docs-ui`, `microsite`.
- No submodules, no Git LFS.
- Infra: `docker-compose.deps.yml`, `.devcontainer/`, 49 GitHub workflows (incl. e2e linux/windows/techdocs, chromatic, accessibility), no Dockerfile at root, no Terraform.

## Regulated-repo signals
- `SECURITY.md` (repo root). This is the standard OSS vulnerability-disclosure policy. There are no HIPAA/PCI/SOC2/compliance directories and no security, compliance or legal teams in CODEOWNERS. `regulated_repo_warning_required: true` (per the rule), but the signal is very likely harmless.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Claude Code project config (`.claude/`), `.github/copilot-instructions.md` and `AGENTS.md` stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. (Mitigation already present: `.git/info/exclude` lists `.sdlc/` on this clone.)
- lint-staged hooks (husky) run eslint/prettier, `generate-catalog-info` and `sort-package-json` on commit for `package.json` edits.

## Proposed off-limits
`.env`, `.env.*`, `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.git/**`, `.sdlc/**`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `dist-storybook/**`, `.yarn/**` (incl. vendored yarn in `packages/create-app/templates/*/.yarn/`), `docs/releases/**`, `**/CHANGELOG.md`, generated `**/report*.api.md` and `**/knip-report.md` (regenerate, don't hand-edit), `yarn.lock` (regenerate via `yarn install`), ESLint/Prettier/TS config files (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`).

## Intent-relevant surface

### A. peerDependencies that accept React 17 — **56 package.json files** (54 published, 2 private)
Every hit has the same three entries: `"react": "^17.0.0 || ^18.0.0"`, `"react-dom": "^17.0.0 || ^18.0.0"`, `"@types/react": "^17.0.0 || ^18.0.0"`. In each, `@types/react` is marked optional in `peerDependenciesMeta`. No `@types/react-dom` peers. 18 hits are under `packages/` and 38 under `plugins/`.
Already React-18-only: `packages/ui/package.json` (`^18.0.0` ×3). The other 178 workspace packages have no React peers.
devDependencies `@types/react(-dom): "*"` in `packages/app`, `packages/app-legacy` and `packages/techdocs-cli-embedded-app`. All are private apps and the root resolution forces ^18, so they're harmless.

- `packages/app-defaults/package.json` — 1.7.14-next.0
- `packages/app-example-plugin/package.json` (private) — 0.0.41-next.0
- `packages/core-app-api/package.json` — 1.20.7-next.0
- `packages/core-compat-api/package.json` — 0.5.17-next.0
- `packages/core-components/package.json` — 0.18.16-next.0
- `packages/core-plugin-api/package.json` — 1.12.12-next.0
- `packages/dev-utils/package.json` — 1.1.29-next.0
- `packages/frontend-app-api/package.json` — 0.16.10-next.0
- `packages/frontend-defaults/package.json` — 0.5.8-next.0
- `packages/frontend-dev-utils/package.json` — 0.1.8-next.0
- `packages/frontend-dynamic-feature-loader/package.json` — 0.1.18-next.0
- `packages/frontend-plugin-api/package.json` — 0.18.3-next.0
- `packages/frontend-test-utils/package.json` — 0.7.0-next.0
- `packages/integration-react/package.json` — 1.2.24-next.0
- `packages/module-federation-common/package.json` — 0.1.6
- `packages/test-utils/package.json` — 1.7.24-next.0
- `packages/theme/package.json` — 0.7.3
- `packages/version-bridge/package.json` — 1.0.12
- `plugins/api-docs/package.json` — 0.14.7-next.0
- `plugins/api-docs-module-protoc-gen-doc/package.json` — 0.1.11
- `plugins/app/package.json` — 0.5.5-next.0
- `plugins/app-react/package.json` — 0.2.9-next.0
- `plugins/app-visualizer/package.json` — 0.2.10-next.0
- `plugins/auth/package.json` — 0.1.14-next.0
- `plugins/auth-react/package.json` — 0.1.33-next.0
- `plugins/catalog/package.json` — 2.0.11-next.0
- `plugins/catalog-graph/package.json` — 0.6.10-next.0
- `plugins/catalog-import/package.json` — 0.13.20-next.0
- `plugins/catalog-react/package.json` — 4.0.0-next.0
- `plugins/catalog-unprocessed-entities/package.json` — 0.2.37-next.0
- `plugins/config-schema/package.json` — 0.1.86-next.0
- `plugins/devtools/package.json` — 0.1.45-next.0
- `plugins/devtools-react/package.json` — 0.2.8-next.0
- `plugins/example-todo-list/package.json` (private) — 1.0.57-next.0
- `plugins/home/package.json` — 0.9.12-next.0
- `plugins/home-react/package.json` — 0.1.44-next.0
- `plugins/kubernetes/package.json` — 0.12.25-next.0
- `plugins/kubernetes-cluster/package.json` — 0.0.43-next.0
- `plugins/kubernetes-react/package.json` — 0.6.2-next.0
- `plugins/mui-to-bui/package.json` — 0.2.13-next.0
- `plugins/notifications/package.json` — 0.6.2-next.0
- `plugins/org/package.json` — 0.8.1-next.0
- `plugins/org-react/package.json` — 0.1.56-next.0
- `plugins/permission-react/package.json` — 0.5.7-next.0
- `plugins/scaffolder/package.json` — 1.41.0-next.0
- `plugins/scaffolder-node-test-utils/package.json` — 0.3.17-next.0
- `plugins/scaffolder-react/package.json` — 3.0.0-next.0
- `plugins/search/package.json` — 1.7.10-next.0
- `plugins/search-react/package.json` — 1.11.10-next.0
- `plugins/signals/package.json` — 0.0.37-next.0
- `plugins/signals-react/package.json` — 0.0.28-next.0
- `plugins/techdocs/package.json` — 1.19.1-next.0
- `plugins/techdocs-addons-test-utils/package.json` — 2.0.11-next.0
- `plugins/techdocs-module-addons-contrib/package.json` — 1.1.42-next.0
- `plugins/techdocs-react/package.json` — 1.4.1-next.0
- `plugins/user-settings/package.json` — 0.9.9-next.0

**The rule that enforces these ranges** is `packages/repo-tools/src/commands/peer-deps/peer-deps.ts:35-47`. Its `peerDependencies` constant is `^17.0.0 || ^18.0.0`, `peerDependenciesReact18Only` is `^18.0.0`, and `react18OnlyPackages = new Set(['@backstage/ui'])`. CI runs `yarn lint:peer-deps`, so this file has to change along with the 56 manifests or CI fails. Note that `peerDependenciesReact18Only` uses `^18.0.0`, not `^18.0.2`.
Lockfiles: `yarn.lock` repeats the workspace peer ranges (65 `react: ^17.0.0 || ^18.0.0` lines, 62 for `@types/react`, including some third-party ones). `workspaces/ui/yarn.lock:958-960` also has them. Run `yarn install` after editing the manifests; don't hand-edit the lockfiles.

### B. Source shims and legacy render paths (path:line)
Runtime:
- `packages/frontend-dev-utils/src/createDevApp.tsx:24` `import 'react-dom';` · `:43-50` picks `react-dom/client` or `react-dom` based on `HAS_REACT_DOM_CLIENT` · `:119-123` `if ('createRoot' in ReactDOM) … else ReactDOM.render(rootNode, rootElement)`. The commit `a67b79bb21 "Support React 17 rendering in createDevApp"` added this fallback.
- `packages/dev-utils/src/devApp/render.tsx:53` `import 'react-dom';` · `:58-65` the same `HAS_REACT_DOM_CLIENT` dynamic import · `:320-327` `createRoot` feature detection with a `ReactDOM.render(<DevApp />, …)` fallback.
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts:17-35` the same switch plus a `ReactDOM.render(element, root)` fallback. Callers: `addGitFeedbackLink.ts`, `addSidebarToggle.ts`, `copyToClipboard.tsx`, `handleMetaRedirects.tsx` in the same folder.
- `packages/cli-module-build/src/lib/bundler/config.ts:272-285` DefinePlugin injects `process.env.HAS_REACT_DOM_CLIENT` (in both the webpack and rspack branches).
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts:19-29` checks whether `react-dom/client` can be resolved. Used by `config.ts` and `startFrontend.ts`.
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts:44-48` prints the "React 17 is now deprecated!" warning when `react-dom/client` is missing.
- `packages/cli-module-build/src/lib/bundler/server.ts:54` calls `checkReactVersion()`, defined at `:269-290`. It checks `react/package.json` for version `16.` and tells users to "upgrade to React 17". This is stale; it should check for <18 or be removed.
- `packages/cli-module-test-jest/config/jest.js:52-59` sets `process.env.HAS_REACT_DOM_CLIENT` for Jest when `react-dom/client` can be resolved.
- `packages/test-utils/src/testUtils/testingLibrary.ts:26-30` adds the public type `LegacyRootOption = { legacyRoot?: boolean }` (doc: "Mock this option while we're working against React 17 or lower") · `:46` `renderWithEffects` options · `packages/test-utils/src/testUtils/appWrappers.tsx:257,265,269` `renderInTestApp` passes `legacyRoot` through. This is public API (`packages/test-utils/report.api.md:74`), so removing it is breaking (test-utils 1.7.x needs a major bump) or calls for a deprecation instead. Gate 0 / the architect decides.

Tests:
- `packages/frontend-dev-utils/src/createDevApp.test.tsx:150-152` test "should fall back to legacy react-dom rendering when createRoot is unavailable" (it deletes `HAS_REACT_DOM_CLIENT` and mocks `react-dom.render`). Remove it along with the shim.
- `act` imported from `react-dom/test-utils` (deprecated in React 18.3) in 4 files: `packages/core-components/src/components/AutoLogout/disconnectedUsers.test.ts:17`, `plugins/scaffolder-react/src/next/components/TemplateOutputs/DefaultTemplateOutputs.test.tsx:20`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/BitbucketRepoPicker.test.tsx:24`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/RepoUrlPickerRepoName.test.tsx:19`. Optional cleanup.
- `packages/ui/src/**/*.test.tsx` (Link, List, Row, TagGroup, useNavigation) mock `react-dom` and `react-dom/client` for shared-module isolation. These are not React 17 shims; leave them alone.

React 17 compatibility libraries (these are React-18-native in practice):
- `use-sync-external-store/shim` in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx:18` and `packages/ui/src/hooks/useBreakpoint.ts:17`. Dependency also declared in `plugins/app/package.json:78`, which knip flags as unused. With React 18 only, these can import `useSyncExternalStore` from `react`. This is optional scope.

Not found anywhere in `packages/` or `plugins/` src: `unmountComponentAtNode`, `ReactDOM.hydrate`/`hydrate(`, `React.version` checks, `useId` feature detection, `@testing-library/react-hooks` imports. Only `packages/core-app-api/knip-report.md:13` mentions react-hooks, as an unused dep. The real app entry points (`packages/app`, `app-legacy`, `techdocs-cli-embedded-app`, create-app templates, `plugins/home/dev`, `plugins/auth/dev`) already use `react-dom/client` `createRoot`. `app.createRoot()` / `createRootContext` hits are Backstage API names, not ReactDOM.

### C. Tooling, templates and docs that encode React 17 support
- `yarn new` templates in `packages/cli-module-new/templates/`:
  - `frontend-plugin/package.json.hbs:30,41` — `react` `'^16.13.1 || ^17.0.0 || ^18.0.0'` (peer + dev)
  - `legacy-frontend-plugin/package.json.hbs:34,35,47,48` — react/react-dom `'^16.13.1 || ^17.0.0 || ^18.0.0'` (peer + dev)
  - `plugin-web-library/package.json.hbs:31,38` — react `'^16.13.1 || ^17.0.0 || ^18.0.0'`
  - `scaffolder-field-extension-module/package.json.hbs:35` — peer `"react": "^17.0.0 || ^18.0.0"`
  - Template snapshot tests in `packages/cli-module-new` may need updating if any exist.
- create-app templates (`packages/create-app/templates/{default-app,legacy-app}`) already use React ^18.0.2, `@types/react ^18` and `react-dom/client`. Nothing to change.
- Peer-deps policy: `packages/repo-tools/src/commands/peer-deps/peer-deps.ts:35-47` (see A).
- CLI bundler and Jest: `hasReactDomClient.ts`, `config.ts`, `startFrontend.ts`, `server.ts`, `cli-module-test-jest/config/jest.js` (see B).
- test-utils: `LegacyRootOption` / `legacyRoot` (see B).
- e2e (`packages/e2e-test`, `packages/e2e-test-utils`, `playwright.config.ts`), `.github/workflows`, `.storybook`, `scripts/` have no React 17 references.
- Docs:
  - `docs/tutorials/react18-migration.md:13` says "compatible with all versions of React from v17 to v18…" and needs rewording. `:81-105` show the `^17.0.0 || ^18.0.0` peer ranges as the target. `:68` (`ReactDOM.render` "before" example) and `:125` ("while still staying on React 17") are migration guidance and can stay as history.
  - `docs/tutorials/migrate-to-mui5.md:48-49,69` give `^17.0.0 || ^18.0.0` peer ranges and "^17.0.0 (or newer)".
  - `docs/tutorials/jsx-transform-migration.md:61` says "once React 17 is fully deprecated".
  - `packages/eslint-plugin/docs/rules/no-undeclared-imports.md:35` uses `"react": "^17.0.0"` only as an example. Optional.
- Leave untouched (history or fixtures): `docs/releases/**`, `**/CHANGELOG.md`, `docs-ui/src/utils/changelogs/*.ts`, `packages/cli-node/src/monorepo/Lockfile.test.ts:336-392` (lockfile-parser fixture data).
- No pending `.changeset/*.md` mentions React 17/18 or these packages' shims. New changesets will be needed: 54 published packages for the peer-range change (all `-next`; breaking under pre-1.0 = minor and ≥1.0 = major per CLAUDE.md, unless maintainers treat a peer-range narrowing differently), plus `@backstage/cli-module-build`, `@backstage/cli-module-test-jest`, `@backstage/cli-module-new`, `@backstage/repo-tools`, `@backstage/test-utils`, `@backstage/dev-utils`, `@backstage/frontend-dev-utils`, `@backstage/plugin-techdocs` for the code changes. Several overlap with the 56.

### D. Commands for this run
- Test (scoped): `CI=1 yarn test <path>`, e.g. `CI=1 yarn test packages/frontend-dev-utils`, `CI=1 yarn test packages/dev-utils`, `CI=1 yarn test plugins/techdocs/src/reader/transformers`, `CI=1 yarn test packages/test-utils`, `CI=1 yarn test packages/cli-module-build/src/lib/bundler`, `CI=1 yarn test packages/repo-tools/src/commands/peer-deps`, `CI=1 yarn test packages/cli-module-new`.
- Type check: `yarn tsc` (root).
- Peer-range check: `yarn lint:peer-deps`.
- After API change: `yarn build:api-reports`.

## Stack profile
Tier 2b ran (no shipped adapter for TypeScript/React). Profile: `.sdlc/baseline/stack-profile.md`. Key finding: the peer ranges are driven by `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`, and `yarn backstage-repo-tools peer-deps --fix` rewrites all manifests to match. That is the consistent way to update the 56 package.json files, and Gate 0 should confirm it.
