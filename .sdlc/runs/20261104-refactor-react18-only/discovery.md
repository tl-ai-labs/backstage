# Discovery — run 20261104-refactor-react18-only

Mode: first-time (Tier 1). Built 2026-11-04. Plugin mmo 0.10.1.
Intent: refactor — require React 18 across Backstage packages; remove React 17 shims, legacy render paths and peer ranges.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-RF-10/argon4-plus-sonnet55`, clean working tree.
- Git worktree of `/Users/apple/Documents/GitHub/backstage` (gitdir `.git/worktrees/BS-RF-10`). 12,364 tracked files.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- `gitignore_covers_sdlc: false`, but `.sdlc/` is already excluded through the shared `.git/info/exclude` (line 7), so `git add -A` will not pick it up here.

## Topology
Top-level directories: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types` (ignored tsc output), `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (161), `scripts`, `workspaces`.
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (old frontend system), `packages/backend/src/index.ts`.

## Detected stacks
- Root `package.json`: node-typescript, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`), TypeScript ~5.7, Node 22 || 24. The root `resolutions` pin `@types/react` and `@types/react-dom` to `^18.0.0`. React and react-dom 18.3.1 are installed.
- Separate projects outside the root workspaces: `microsite/` (Docusaurus, React 19), `docs-ui/` (Next, React 19), `workspaces/ui/` (has its own yarn.lock).
- Frameworks: React, the Backstage frontend system (old and new), the Backstage backend system, Jest 30, Storybook 10, Playwright.

## Test / build commands
- Proposed test command: `CI=1 yarn test <path>`. Source: `package.json#scripts.test` and AGENTS.md (always pass a path). Gate 0 must confirm it.
- Type check: `yarn tsc`, run from the root with no options. Lint: `yarn lint --fix`. Peer-dependency lint: `yarn lint:peer-deps`. API reports: `yarn build:api-reports`.
- AGENTS.md forbids `yarn build`, `changesets version` and `release`.

## Docs present
README.md (and 4 translations), AGENTS.md (`.claude/CLAUDE.md` is a symlink to it), CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (adr000–adr015), `docs/contribute/doc-style-guide.md`, `beps/`.
Constraints from AGENTS.md that affect this intent:
- Published packages under `packages/` and `plugins/` need changeset coverage. This is a breaking change: `minor` for packages below 1.0, `major` for packages at 1.0 or above.
- Edit `.changeset/` directly. Never use the changeset CLI.
- Do not edit `docs/releases/`.
- Do not change ESLint, Prettier or TS config unless asked.
- New source files need an Apache 2.0 header.

## Detected AI/agent setup
- `.claude/`: `CLAUDE.md` (symlink to `../AGENTS.md`), `settings.local.json`, `skills/`
- `.cursor/rules/`: `backstage-project.mdc` (symlink to AGENTS.md), `tests/`
- `.github/copilot-instructions.md`
- Not present: `.mcp.json`, `.cursorrules`, aider, `.continue`, `.roo`, `routing-policy.yaml`, gemini configs.

## Env keys
No `.env*` files exist. The code references 122 env-var names (names only, recorded in baseline.json). One of them matters for this intent: `HAS_REACT_DOM_CLIENT`.

## Monorepo / submodules / LFS / infra
- Yarn workspaces monorepo with 235 workspace packages.
- No submodules and no LFS.
- Infra: Dockerfiles (`packages/backend`, `.devcontainer`, `contrib/docker`), `docker-compose.deps.yml`, `contrib/terraform`, and 49 GitHub workflows.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md). This is the standard open-source vulnerability-disclosure policy, so it is a low-confidence signal. There are no compliance directories and no compliance CODEOWNERS.
- `regulated_repo_warning_required: true`.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them. If Cursor's auto-lint runs on save, changes we make may trigger it.
- GitHub Copilot instructions exist at `.github/copilot-instructions.md`. They stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. In this clone, the shared `.git/info/exclude` already ignores it, so the risk is low. Gate 0 can still offer to add `.gitignore` to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits
`.env`, `.env.*`, `.claude/**`, `.cursor/**`, `.mcp.json`, `.github/copilot-instructions.md`, `AGENTS.md`, `**/node_modules/**`, `**/dist/**`, `dist-types/**`, `dist-storybook/**`, `build/**`, `.yarn/releases/**`, `.yarn/patches/**`, `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `docs/releases/**`, `**/CHANGELOG.md`, `.sdlc/**`, `.git/**`.

## Stack profile (Tier 2b)
Triggered: this is a React/TypeScript monorepo, and no pre-authored adapter matches it (only generic, nest and python ship). The profile has not been built yet. It is deferred to Gate 0 approval and will be written to `.sdlc/baseline/stack-profile.md`.

## React 17 removal inventory (intent-focused)

### 1. package.json files with React 17 peer ranges: 56
Every one of them uses `react`, `react-dom` and `@types/react` set to `^17.0.0 || ^18.0.0`. No package.json in the workspace uses `^16.13.1 || ^17 || ^18`.
Only `packages/ui/package.json` already declares `^18.0.0`. Two of the 56 are private: `packages/app-example-plugin` and `plugins/example-todo-list`.
- `packages/app-defaults/package.json`
- `packages/app-example-plugin/package.json` (private)
- `packages/core-app-api/package.json`
- `packages/core-compat-api/package.json`
- `packages/core-components/package.json`
- `packages/core-plugin-api/package.json`
- `packages/dev-utils/package.json`
- `packages/frontend-app-api/package.json`
- `packages/frontend-defaults/package.json`
- `packages/frontend-dev-utils/package.json`
- `packages/frontend-dynamic-feature-loader/package.json`
- `packages/frontend-plugin-api/package.json`
- `packages/frontend-test-utils/package.json`
- `packages/integration-react/package.json`
- `packages/module-federation-common/package.json`
- `packages/test-utils/package.json`
- `packages/theme/package.json`
- `packages/version-bridge/package.json`
- `plugins/api-docs-module-protoc-gen-doc/package.json`
- `plugins/api-docs/package.json`
- `plugins/app-react/package.json`
- `plugins/app-visualizer/package.json`
- `plugins/app/package.json`
- `plugins/auth-react/package.json`
- `plugins/auth/package.json`
- `plugins/catalog-graph/package.json`
- `plugins/catalog-import/package.json`
- `plugins/catalog-react/package.json`
- `plugins/catalog-unprocessed-entities/package.json`
- `plugins/catalog/package.json`
- `plugins/config-schema/package.json`
- `plugins/devtools-react/package.json`
- `plugins/devtools/package.json`
- `plugins/example-todo-list/package.json` (private)
- `plugins/home-react/package.json`
- `plugins/home/package.json`
- `plugins/kubernetes-cluster/package.json`
- `plugins/kubernetes-react/package.json`
- `plugins/kubernetes/package.json`
- `plugins/mui-to-bui/package.json`
- `plugins/notifications/package.json`
- `plugins/org-react/package.json`
- `plugins/org/package.json`
- `plugins/permission-react/package.json`
- `plugins/scaffolder-node-test-utils/package.json`
- `plugins/scaffolder-react/package.json`
- `plugins/scaffolder/package.json`
- `plugins/search-react/package.json`
- `plugins/search/package.json`
- `plugins/signals-react/package.json`
- `plugins/signals/package.json`
- `plugins/techdocs-addons-test-utils/package.json`
- `plugins/techdocs-module-addons-contrib/package.json`
- `plugins/techdocs-react/package.json`
- `plugins/techdocs/package.json`
- `plugins/user-settings/package.json`

Places that generate or enforce these ranges:
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`: the `peerDependencies` constant (`^17.0.0 || ^18.0.0`), `peerDependenciesReact18Only`, and the `react18OnlyPackages` set. This drives `yarn lint:peer-deps`, so it must change together with the package.json files.
- `packages/cli-module-new/templates/frontend-plugin/package.json.hbs`, `legacy-frontend-plugin/package.json.hbs` and `plugin-web-library/package.json.hbs` use `'^16.13.1 || ^17.0.0 || ^18.0.0'`.
- `packages/cli-module-new/templates/scaffolder-field-extension-module/package.json.hbs` uses `^17.0.0 || ^18.0.0`.
- `packages/create-app/templates/*/packages/app/package.json.hbs` already pin `^18.0.2`. No change is needed there.
- Test fixtures `packages/cli-node/src/monorepo/Lockfile.test.ts` (lines ~336, 389) contain `^16.13.1 || ^17.0.0` lockfile strings. These are fixture data and probably need no change.

### 2. Source files with React 17 compatibility code
`HAS_REACT_DOM_CLIENT` build/test flag:
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts`
- `packages/cli-module-build/src/lib/bundler/config.ts` (DefinePlugin, around lines 272–285)
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` (React 17 deprecation warning)
- `packages/cli-module-test-jest/config/jest.js` (around lines 52–59)
- `packages/cli-module-build/knip-report.md` lists `hasReactDomClient`. It is a generated report.

Dual render paths (`'createRoot' in ReactDOM` falling back to `ReactDOM.render`):
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, plus its test `createDevApp.test.tsx` (contains "fall back to legacy react-dom rendering")
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`

React version checks:
- `packages/cli-module-build/src/lib/bundler/server.ts`: `checkReactVersion`, which warns on React 16 with "upgrade to React 17" text.

`use-sync-external-store/shim` (polyfill only needed before React 18):
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`
- `packages/ui/src/hooks/useBreakpoint.ts`
- Dependency declared in `packages/frontend-plugin-api/package.json`, `packages/ui/package.json` and `plugins/app/package.json`. `plugins/app` source already imports `useSyncExternalStore` from `react`.

`legacyRoot` test option (public API):
- `packages/test-utils/src/testUtils/testingLibrary.ts` (`LegacyRootOption`, documented as "while we're working against React 17")
- `packages/test-utils/src/testUtils/appWrappers.tsx`
- `packages/test-utils/report.api.md` (API report)

Old-React test utilities (optional cleanup):
- `react-dom/test-utils` `act` is imported in `packages/core-components/src/components/AutoLogout/disconnectedUsers.test.ts`, `plugins/scaffolder-react/src/next/components/TemplateOutputs/DefaultTemplateOutputs.test.tsx`, `plugins/scaffolder/src/components/fields/RepoUrlPicker/BitbucketRepoPicker.test.tsx` and `plugins/scaffolder/src/components/fields/RepoUrlPicker/RepoUrlPickerRepoName.test.tsx`.
- `packages/core-app-api/package.json` has a `@testing-library/react-hooks` ^8 devDependency.
- `plugins/catalog-react/package.json` has a `react-test-renderer` ^16.13.1 devDependency.

Not found: `useId` shims, `React.version` checks, `ReactDOM.hydrate` or `unmountComponentAtNode` usage.
Already React 18 only: `packages/app`, `packages/app-legacy`, the create-app templates and `packages/techdocs-cli-embedded-app` all use `react-dom/client` `createRoot`.

### 3. React 17 CI / test matrix
None found. The `.github/workflows/ci.yml` matrix only covers `node-version: [22.x, 24.x]`, and no workflow or script swaps React versions.
`yarn.lock` still has `react@^17.0.2` entries, but they come from third-party tools (`@yarnpkg/libui`, `react-reconciler@0.26`), not from Backstage packages.

### 4. Docs mentioning React 17 support
- `docs/tutorials/react18-migration.md` says "compatible with all versions of React from v17 to v18" and shows `^17.0.0 || ^18.0.0` peer examples.
- `docs/tutorials/jsx-transform-migration.md` (line ~61) says "once React 17 is fully deprecated".
- `docs/tutorials/migrate-to-mui5.md` (lines ~48–69) shows `^17.0.0 || ^18.0.0` peers and says "Ensure you are using `"react": "^17.0.0"`".
- Excluded: 13 files under `docs/releases/` mention React 17. They are off-limits per AGENTS.md. Package CHANGELOGs are excluded too.

### Changesets
No existing `.changeset/*.md` mentions React 17 or 18. Changesets need to be authored for the published packages among the 54 non-private packages above, plus `@backstage/cli-module-build`, `@backstage/cli-module-test-jest`, `@backstage/cli-module-new` and `@backstage/repo-tools` if they change.
