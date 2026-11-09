# Discovery - run 20261109-123841-refactor-react18-only

Mode: first-time. Built 2026-11-09T07:12:58Z by mmo 0.10.1 discovery (Tier 1 + Tier 2b profile). Repo: /Users/macbook/Documents/GitHub/bf-agy/BS-RF-10.

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` ("Merge pull request #36296 ... Version Packages", 2026-10-27), branch `BS-RF-10/opus55-plus-flash38-agsdk`, working tree clean.
- Remote `origin` = `git@github.com:tl-ai-labs/backstage.git`.
- This folder is a **git worktree**; common git dir is `/Users/macbook/Documents/GitHub/backstage/.git`. Sibling worktrees: main clone (`BS-RF-10/argon4-plus-flash38`), `bf-agy/BS-BF-08`, `bs-cells/BS-BF-08`, `bs-cells/BS-DOC-04`. The stash stack is shared.
- `.gitignore` does **not** list `.sdlc/`. `.sdlc/` is ignored only through the shared `.git/info/exclude` (line 7), so it is ignored in practice but not by a committed file.

## Topology

Yarn 4.18.1 workspaces monorepo (`packages/*` = 74 dirs, `plugins/*` = 162 dirs, 235 workspace package.json files, about 12.4k tracked files). Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces` (`workspaces/ui` is a separate nested Yarn workspace with its own lockfile).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`, `packages/techdocs-cli-embedded-app/src/index.tsx`.

## Detected stacks

- `package.json` -> node-typescript (TypeScript ~5.7, Node 22 || 24). Frameworks: React (installed 18.3.1, `@types/react` 18.3.23, root `resolutions` pin `@types/react` / `@types/react-dom` to `^18.0.0`), react-router-dom 6, Backstage frontend and backend systems, Express, MUI v4 plus `@backstage/ui`, Jest 30, `@testing-library/react` ^16, Storybook 10, Playwright.
- No pre-authored adapter matches (the plugin ships generic, nest, python), so Tier 2b ran: `.sdlc/baseline/stack-profile.md`.

## Commands

- Test: `CI=1 yarn test <path>` (root `scripts.test` = `backstage-cli repo test`; CLAUDE.md says always pass a path). Gate 0 should confirm.
- Type check: `yarn tsc` from the repo root only, no options (CI runs `yarn tsc:full`).
- Lint: `yarn lint --fix` (repo lint `--since origin/master`). Peer-range check: `yarn lint:peer-deps` (CI step, `backstage-repo-tools peer-deps`).
- Format: `yarn prettier --write <changed files>` (explicit file paths only).
- API reports: `yarn build:api-reports` before a PR when public API changes (CI runs `build:api-reports:only --ci --docs`).
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`, any changeset CLI use. Edit `.changeset/*.md` directly.
- `node_modules` is present (install done).

## Docs

`README.md` (+ 4 translations), `AGENTS.md` (also `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`, both symlinks), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (ADR 000-015), `docs/contribute/project-structure.md`, `docs/contribute/doc-style-guide.md`, `beps/`.

## Detected AI/agent setup

- `.claude/` (CLAUDE.md symlink to AGENTS.md, `skills/`)
- `AGENTS.md`
- `.cursor/rules/` (`backstage-project.mdc` symlink to AGENTS.md, `tests/*.mdc`)
- None found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `.github/copilot-instructions.md`, repo-local `routing-policy.yaml`, gemini configs.

## Env keys

No `.env*` files in the repo. Env names read in code (names only): APP*CONFIG, BACKSTAGE_ENV, BACKSTAGE_CLI*_, BUILD*INFO, CI, GITHUB_TOKEN, HAS_REACT_DOM_CLIENT, LEGACY_WEBPACK_BUILD, LOG_LEVEL, NODE_ENV, NODE_OPTIONS, POSTGRES*_, MYSQL_CONNECTION, PORT and others (full list in baseline.json).

## Monorepo / submodules / LFS / infra

- Monorepo: yarn-workspaces (`packages/*`, `plugins/*`); nested `workspaces/ui`.
- Submodules: none. LFS: none (no `.gitattributes`).
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, `.devcontainer/`, 49 GitHub workflows (`ci.yml` runs lint:peer-deps, tsc:full, api-reports, prettier:check).

## Regulated-repo signals

- `SECURITY.md` (repo root). This is a standard OSS security-reporting policy, not evidence of regulated data. The flag is set, so Gate 0 prints its standard prompt.

## Coexistence risks

- **Cursor rules detected:** "You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **`.sdlc/` not gitignored:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run." Note: in this worktree the shared `.git/info/exclude` already ignores `.sdlc/`, so `git add -A` will not pick it up here. Editing `.gitignore` is optional and would add an unrelated change to a Backstage PR.
- Husky pre-commit with lint-staged runs `eslint --fix`, `prettier`, catalog-info generation and `sort-package-json` on staged files. Commits of package.json files will be reformatted.
- Shared git dir with 4 other worktrees, including concurrent runs. Never use bare `git stash`.

## Proposed off-limits

`.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.mcp.json`, `node_modules/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.yarn/releases/**`, `.yarn/patches/**`, `packages/create-app/templates/*/.yarn/releases/**`, `yarn.lock`, `workspaces/*/yarn.lock`, `docs/releases/**`, `**/CHANGELOG.md`, ESLint/Prettier/TS configs (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`), `.git/**`, `.sdlc/**`.

## Intent focus: React 18 only (refactor)

### 1. Peer ranges that allow React 17

56 workspace packages declare `peerDependencies` `"@types/react": "^17.0.0 || ^18.0.0"`, `"react": "^17.0.0 || ^18.0.0"`, `"react-dom": "^17.0.0 || ^18.0.0"` (plus `"react-router-dom": "^6.30.2"`, and `peerDependenciesMeta["@types/react"].optional = true`). 54 are published and 2 are private. The block is the same in every file.

| package.json                                            | name                                             | version        | status    |
| ------------------------------------------------------- | ------------------------------------------------ | -------------- | --------- |
| `packages/app-defaults/package.json`                    | @backstage/app-defaults                          | 1.7.14-next.0  | published |
| `packages/app-example-plugin/package.json`              | app-example-plugin                               | 0.0.41-next.0  | private   |
| `packages/core-app-api/package.json`                    | @backstage/core-app-api                          | 1.20.7-next.0  | published |
| `packages/core-compat-api/package.json`                 | @backstage/core-compat-api                       | 0.5.17-next.0  | published |
| `packages/core-components/package.json`                 | @backstage/core-components                       | 0.18.16-next.0 | published |
| `packages/core-plugin-api/package.json`                 | @backstage/core-plugin-api                       | 1.12.12-next.0 | published |
| `packages/dev-utils/package.json`                       | @backstage/dev-utils                             | 1.1.29-next.0  | published |
| `packages/frontend-app-api/package.json`                | @backstage/frontend-app-api                      | 0.16.10-next.0 | published |
| `packages/frontend-defaults/package.json`               | @backstage/frontend-defaults                     | 0.5.8-next.0   | published |
| `packages/frontend-dev-utils/package.json`              | @backstage/frontend-dev-utils                    | 0.1.8-next.0   | published |
| `packages/frontend-dynamic-feature-loader/package.json` | @backstage/frontend-dynamic-feature-loader       | 0.1.18-next.0  | published |
| `packages/frontend-plugin-api/package.json`             | @backstage/frontend-plugin-api                   | 0.18.3-next.0  | published |
| `packages/frontend-test-utils/package.json`             | @backstage/frontend-test-utils                   | 0.7.0-next.0   | published |
| `packages/integration-react/package.json`               | @backstage/integration-react                     | 1.2.24-next.0  | published |
| `packages/module-federation-common/package.json`        | @backstage/module-federation-common              | 0.1.6          | published |
| `packages/test-utils/package.json`                      | @backstage/test-utils                            | 1.7.24-next.0  | published |
| `packages/theme/package.json`                           | @backstage/theme                                 | 0.7.3          | published |
| `packages/version-bridge/package.json`                  | @backstage/version-bridge                        | 1.0.12         | published |
| `plugins/api-docs/package.json`                         | @backstage/plugin-api-docs                       | 0.14.7-next.0  | published |
| `plugins/api-docs-module-protoc-gen-doc/package.json`   | @backstage/plugin-api-docs-module-protoc-gen-doc | 0.1.11         | published |
| `plugins/app/package.json`                              | @backstage/plugin-app                            | 0.5.5-next.0   | published |
| `plugins/app-react/package.json`                        | @backstage/plugin-app-react                      | 0.2.9-next.0   | published |
| `plugins/app-visualizer/package.json`                   | @backstage/plugin-app-visualizer                 | 0.2.10-next.0  | published |
| `plugins/auth/package.json`                             | @backstage/plugin-auth                           | 0.1.14-next.0  | published |
| `plugins/auth-react/package.json`                       | @backstage/plugin-auth-react                     | 0.1.33-next.0  | published |
| `plugins/catalog/package.json`                          | @backstage/plugin-catalog                        | 2.0.11-next.0  | published |
| `plugins/catalog-graph/package.json`                    | @backstage/plugin-catalog-graph                  | 0.6.10-next.0  | published |
| `plugins/catalog-import/package.json`                   | @backstage/plugin-catalog-import                 | 0.13.20-next.0 | published |
| `plugins/catalog-react/package.json`                    | @backstage/plugin-catalog-react                  | 4.0.0-next.0   | published |
| `plugins/catalog-unprocessed-entities/package.json`     | @backstage/plugin-catalog-unprocessed-entities   | 0.2.37-next.0  | published |
| `plugins/config-schema/package.json`                    | @backstage/plugin-config-schema                  | 0.1.86-next.0  | published |
| `plugins/devtools/package.json`                         | @backstage/plugin-devtools                       | 0.1.45-next.0  | published |
| `plugins/devtools-react/package.json`                   | @backstage/plugin-devtools-react                 | 0.2.8-next.0   | published |
| `plugins/example-todo-list/package.json`                | @internal/plugin-todo-list                       | 1.0.57-next.0  | private   |
| `plugins/home/package.json`                             | @backstage/plugin-home                           | 0.9.12-next.0  | published |
| `plugins/home-react/package.json`                       | @backstage/plugin-home-react                     | 0.1.44-next.0  | published |
| `plugins/kubernetes/package.json`                       | @backstage/plugin-kubernetes                     | 0.12.25-next.0 | published |
| `plugins/kubernetes-cluster/package.json`               | @backstage/plugin-kubernetes-cluster             | 0.0.43-next.0  | published |
| `plugins/kubernetes-react/package.json`                 | @backstage/plugin-kubernetes-react               | 0.6.2-next.0   | published |
| `plugins/mui-to-bui/package.json`                       | @backstage/plugin-mui-to-bui                     | 0.2.13-next.0  | published |
| `plugins/notifications/package.json`                    | @backstage/plugin-notifications                  | 0.6.2-next.0   | published |
| `plugins/org/package.json`                              | @backstage/plugin-org                            | 0.8.1-next.0   | published |
| `plugins/org-react/package.json`                        | @backstage/plugin-org-react                      | 0.1.56-next.0  | published |
| `plugins/permission-react/package.json`                 | @backstage/plugin-permission-react               | 0.5.7-next.0   | published |
| `plugins/scaffolder/package.json`                       | @backstage/plugin-scaffolder                     | 1.41.0-next.0  | published |
| `plugins/scaffolder-node-test-utils/package.json`       | @backstage/plugin-scaffolder-node-test-utils     | 0.3.17-next.0  | published |
| `plugins/scaffolder-react/package.json`                 | @backstage/plugin-scaffolder-react               | 3.0.0-next.0   | published |
| `plugins/search/package.json`                           | @backstage/plugin-search                         | 1.7.10-next.0  | published |
| `plugins/search-react/package.json`                     | @backstage/plugin-search-react                   | 1.11.10-next.0 | published |
| `plugins/signals/package.json`                          | @backstage/plugin-signals                        | 0.0.37-next.0  | published |
| `plugins/signals-react/package.json`                    | @backstage/plugin-signals-react                  | 0.0.28-next.0  | published |
| `plugins/techdocs/package.json`                         | @backstage/plugin-techdocs                       | 1.19.1-next.0  | published |
| `plugins/techdocs-addons-test-utils/package.json`       | @backstage/plugin-techdocs-addons-test-utils     | 2.0.11-next.0  | published |
| `plugins/techdocs-module-addons-contrib/package.json`   | @backstage/plugin-techdocs-module-addons-contrib | 1.1.42-next.0  | published |
| `plugins/techdocs-react/package.json`                   | @backstage/plugin-techdocs-react                 | 1.4.1-next.0   | published |
| `plugins/user-settings/package.json`                    | @backstage/plugin-user-settings                  | 0.9.9-next.0   | published |

Already React 18 only: `packages/ui/package.json` (`@backstage/ui`, peer `^18.0.0`).

**Enforcer, which must change together with the manifests:** `packages/repo-tools/src/commands/peer-deps/peer-deps.ts:35-50`. It holds a `peerDependencies` const with `^17.0.0 || ^18.0.0`, a `peerDependenciesReact18Only` const, and `react18OnlyPackages = new Set(['@backstage/ui'])`. CI runs `yarn lint:peer-deps`. Once everything is 18-only, the two consts collapse into one and the set goes away.

No `dependencies` or `devDependencies` pin React 17 anywhere. Example apps and create-app templates already use `react`/`react-dom` `^18.0.2` and `@types/react` `^18`.

### 2. Code shims and legacy render paths

- **Build-time flag `process.env.HAS_REACT_DOM_CLIENT`:**
  - `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`: `require.resolve('react-dom/client')` probe.
  - `packages/cli-module-build/src/lib/bundler/config.ts:272-286`: DefinePlugin injects the flag in both the webpack and rspack branches.
  - `packages/cli-module-test-jest/config/jest.js:52-58`: sets the flag for Jest.
- **Runtime fallbacks:** each does a conditional `import('react-dom/client')` vs `import('react-dom')`, then `'createRoot' in ReactDOM` ? `createRoot().render` : `ReactDOM.render`.
  - `packages/dev-utils/src/devApp/render.tsx:58-65, 320-327`
  - `packages/frontend-dev-utils/src/createDevApp.tsx:43-50, 119-123`. Its test `packages/frontend-dev-utils/src/createDevApp.test.tsx` (around line 146, "should fall back to legacy react-dom rendering when createRoot is unavailable", which deletes `HAS_REACT_DOM_CLIENT`) must be removed or rewritten.
  - `plugins/techdocs/src/reader/transformers/renderReactElement.ts:17-34` (`@internal`)
- **CLI warnings:**
  - `packages/cli-module-build/src/commands/package/start/startFrontend.ts:45-49`: "React 17 is now deprecated!" warning when `react-dom/client` is missing. It could become a hard error or be removed.
  - `packages/cli-module-build/src/lib/bundler/server.ts:54, 269-292`: `checkReactVersion()` reads `react/package.json`, warns on 16.x and tells users to "upgrade to React 17". This is stale.
- **Test-utils legacy root (public API):**
  - `packages/test-utils/src/testUtils/testingLibrary.ts:25-30, 46`: `LegacyRootOption` ("Mock this option while we're working against React 17 or lower").
  - `packages/test-utils/src/testUtils/appWrappers.tsx:38, 257-270`: passes `legacyRoot` through.
  - Exported in `packages/test-utils/report.api.md:73-74, 323, 329`. Removing it is breaking for `@backstage/test-utils` (1.x, so a major bump), or keep it and deprecate. Scope decision for Gate 0 / architect.
- **useSyncExternalStore polyfill (React 18 has it built in):**
  - `packages/frontend-plugin-api/src/routing/useRouteRef.tsx:18` imports from `use-sync-external-store/shim`. The deps `use-sync-external-store` and `@types/use-sync-external-store` are in `packages/frontend-plugin-api/package.json:53,64`.
  - `packages/ui/src/hooks/useBreakpoint.ts:17`, same pattern. Deps in `packages/ui/package.json:59,70`.
  - `plugins/app/package.json:78` declares `use-sync-external-store`, but the code already uses React's built-in one (`DefaultPluginWrapperApi.tsx:29`). `plugins/app/knip-report.md:8` flags it as unused.
  - Removing these deps changes `yarn.lock`. That needs a `yarn install`, and `yarn.lock` is on the proposed off-limits list.
- No `React.version` checks, `useId` polyfills, `unstable_batchedUpdates`, or `unmountComponentAtNode` in source.
- Optional / adjacent: `act` from `react-dom/test-utils` (deprecated in 18.3) in `packages/core-components/src/components/AutoLogout/disconnectedUsers.test.ts:17`, `plugins/scaffolder-react/src/next/components/TemplateOutputs/DefaultTemplateOutputs.test.tsx:20`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/BitbucketRepoPicker.test.tsx:24`, `RepoUrlPickerRepoName.test.tsx:19`. `plugins/catalog-react/package.json:111` has devDep `react-test-renderer: ^16.13.1`, flagged unused by knip.

### 3. CLI templates (`yarn new`)

- `packages/cli-module-new/templates/frontend-plugin/package.json.hbs:30,41`: `versionQuery 'react' '^16.13.1 || ^17.0.0 || ^18.0.0'`
- `packages/cli-module-new/templates/legacy-frontend-plugin/package.json.hbs:34-35,47-48`: react + react-dom, same range
- `packages/cli-module-new/templates/plugin-web-library/package.json.hbs:31,38`: same
- `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs:35`: `"react": "^17.0.0 || ^18.0.0"`
- `packages/cli-module-new/src/lib/version.test.ts` parses `versionQuery` usages, so check that it still passes.
- create-app templates are already React 18.

### 4. Docs mentioning React 17

- `docs/tutorials/react18-migration.md`: the migration guide. It shows `^17.0.0 || ^18.0.0` as the target range, and the CLI warning links to it. It may need a note that React 17 is no longer supported.
- `docs/tutorials/migrate-to-mui5.md:43-69`: recommends `"react": "^17.0.0 || ^18.0.0"` peers.
- `docs/tutorials/jsx-transform-migration.md:61`: "once React 17 is fully deprecated".
- `packages/eslint-plugin/docs/rules/no-undeclared-imports.md:35`: example `"react": "^17.0.0"`. This is only an illustration and probably fine as is.
- Do not touch `docs/releases/**` or `**/CHANGELOG.md`. `docs-ui/src/utils/changelogs/*` are historical too.

### 5. Test fixtures

- `packages/cli-node/src/monorepo/Lockfile.test.ts:336-392`: lockfile fixture strings with `^16.13.1 || ^17.0.0`. This is test data for lockfile parsing, so leave it.

### 6. Changesets and release notes

- 42 entries in `.changeset/`; none mention React 17 or 18. The refactor needs new changesets. A peer-range narrowing is breaking for adopters, so it needs a `minor` bump for 0.x packages and a `major` for 1.x packages (for example core-plugin-api 1.12, core-app-api 1.20, test-utils 1.7, plugin-catalog 2.0, plugin-scaffolder 1.41, plugin-techdocs 1.19, version-bridge 1.0, app-defaults 1.7, dev-utils 1.1, integration-react 1.2, plugin-search 1.7, plugin-search-react 1.11, plugin-techdocs-react 1.4, plugin-techdocs-module-addons-contrib 1.1, plugin-techdocs-addons-test-utils 2.0). That is a big release-policy decision, and Gate 0 should confirm it with the user (upstream Backstage might treat this differently). Several packages are already on `-next` majors (`plugin-catalog-react 4.0.0-next.0`, `plugin-scaffolder-react 3.0.0-next.0`).
- Packages with API reports that may change: `packages/test-utils/report.api.md` (LegacyRootOption). `dev-utils`, `frontend-dev-utils` and `techdocs` reports probably do not change, since the shims are internal.

### Repo-state risks

- The worktree shares its git dir and stash with 4 other worktrees, including a parallel BS-RF-10 run in the main clone on `BS-RF-10/argon4-plus-flash38`. Do not use bare `git stash`, and do not check out branches that other worktrees hold.
- Dropping the `use-sync-external-store` deps requires `yarn.lock` changes and a `yarn install`. Decide whether `yarn.lock` is in scope.
- The husky/lint-staged pre-commit reformats and sorts `package.json` and regenerates `catalog-info.yaml` on commit.
- `yarn lint` is `--since origin/master`, and `origin` is the tl-ai-labs fork. `origin/master` resolves locally (checked).
- The change touches 56+ manifests across `packages/` and `plugins/`. `yarn tsc` from the root is slow (8 GB heap) but required.
- CLAUDE.md forbids builds and releases and editing ESLint/Prettier/TS configs. It also requires changesets for published packages, and docs updates for behavior changes.
