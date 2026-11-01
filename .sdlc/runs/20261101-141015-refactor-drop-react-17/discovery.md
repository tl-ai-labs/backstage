# Brownfield discovery

Run `20261101-141015-refactor-drop-react-17`, mode `first-time`, intent hint `refactor`. Machine-readable twin: `baseline.json`.

The scan was not sampled: 12,365 tracked files is under the 100k threshold. Discovery did not run any tests, builds or installs.

## Git state

- HEAD `cb8b07905b900ecb57e5c4b77fe299ff5b83de43` on `BS-RF-10/opus55-plus-flash38`, working tree clean.
- Remote `origin` is `git@github.com:tl-ai-labs/backstage.git`, a fork. `origin/master` (`f20fd9b598`) is an ancestor of HEAD, so `yarn lint` (which uses `--since origin/master`) has a valid base.
- `gitignore_covers_sdlc: false`. `.gitignore` has no `.sdlc` entry, but `.git/info/exclude` line 7 ignores `.sdlc/`, and `git check-ignore` confirms it.

## Directory topology

Top-level directories: `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`.

- `packages/` holds 74 packages, including the example apps `app` and `app-legacy` and the example `backend`.
- `plugins/` holds 161 packages plus a README.
- There is no root `src/`.

## Detected stacks

| Manifest                     | Stack           | Frameworks                                                          | Scope                   |
| ---------------------------- | --------------- | ------------------------------------------------------------------- | ----------------------- |
| `package.json`               | node-typescript | Backstage, React, Express, Knex, Material UI, Jest, Rspack, webpack | Primary, 235 workspaces |
| `docs-ui/package.json`       | node-typescript | Next.js, React 19.2.7                                               | Own `yarn.lock`         |
| `microsite/package.json`     | node-typescript | Docusaurus, React ^19.2.4                                           | Own `yarn.lock`         |
| `workspaces/ui/package.json` | node-typescript | Yarn workspaces                                                     | Own `yarn.lock`         |

- Runtime: Node 22 or 24, Yarn 4.18.1 with the `node-modules` linker, TypeScript ~5.7, React 18.3.1 installed at the root. Dependencies are installed.
- No matching stack adapter exists (`generic.md`, `nest.md`, `python.md`), so the Tier 2b profile was built at `.sdlc/baseline/stack-profile.md`.
- Workspace package roles: 78 backend-plugin-module, 32 web-library, 31 node-library, 23 frontend-plugin, 23 common-library, 18 backend-plugin, 17 cli-module, 5 cli, 3 frontend, 3 frontend-plugin-module, 1 backend. 19 of the 235 are private.

## Test, build and run

- `test_command_proposed`: `CI=1 yarn test <path>`
- `test_command_source`: `AGENTS.md` Development Flow, backed by `package.json#scripts.test`.

`<path>` is required: the repo instructions say never to run all tests. The command was not executed here, and Gate 0 confirms it. `.sdlc/pre-check-status.json` shows the test probe as skipped and `ok: false`, with `discovery_smoke` still pending for the orchestrator to post.

Other repo rules:

- Type checking is `yarn tsc`, from the root only, with no options.
- Lint is `yarn lint --fix`.
- API reports are `yarn build:api-reports`.
- `yarn build`, `yarn changesets version` and `yarn release` must not be run.

## Docs

Present: `README.md` and four translations, `AGENTS.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (15 ADRs plus template and index), `beps/`.

Not present: `ARCHITECTURE.md`, root `CLAUDE.md`.

## Detected AI/agent setup

| Path                                | Type                | Note                                                       |
| ----------------------------------- | ------------------- | ---------------------------------------------------------- |
| `.claude/`                          | Claude Code config  |                                                            |
| `.claude/CLAUDE.md`                 | Claude instructions | Tracked symlink to `../AGENTS.md`                          |
| `.claude/settings.local.json`       | Claude settings     | Tracked despite a `.gitignore` rule, added in `cb8b07905b` |
| `.claude/skills/`                   | Claude skills       |                                                            |
| `plugins/catalog-backend/CLAUDE.md` | Claude instructions | Nested, scoped to catalog database work                    |
| `AGENTS.md`                         | Agent instructions  | Target of both symlinks here                               |
| `.cursor/rules/`                    | Cursor rules        | `backstage-project.mdc` symlinks to `AGENTS.md`            |
| `.github/copilot-instructions.md`   | Copilot             |                                                            |

No `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml` or `gemini*` config was found.

`docs/.well-known/skills/` holds seven published `SKILL.md` files. They are site content rather than local agent config, so they are not in the off-limits list.

## Env keys

No `.env*` files exist anywhere outside `node_modules`, so `env_keys_by_file` and `env_keys_all` are empty.

Source references 84 distinct env names, listed in `baseline.json`. Examples include `NODE_ENV`, `GITHUB_TOKEN`, `POSTGRES_HOST` and the bundler-injected `HAS_REACT_DOM_CLIENT`. Some of the names are test placeholders.

## Source topology

- Monorepo: Yarn workspaces on `packages/*` and `plugins/*`, 235 packages.
- Outside the root workspaces: `docs-ui`, `microsite`, `workspaces/ui`. Two more `yarn.lock` files sit in the `create-app` templates.
- Per-package tests: `CI=1 yarn test <package-root>`.
- Submodules: none.
- Git-LFS: none. There is no `.gitattributes` file.
- Entry points: `packages/app/src/index.tsx`, `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.
- Infra: 49 GitHub workflows, `docker-compose.deps.yml`, Dockerfiles in `packages/backend`, `.devcontainer` and `contrib/docker`, and `contrib/terraform`. No GitLab, CircleCI or Jenkins config.
- Generated and vendored: 306 tracked files under `generated/` directories, 296 `report*.api.md` API reports, and vendored Yarn releases under `.yarn/releases/`. A header scan for `// GENERATED` found no matches, so generated code is identified by path.

## Regulated-repo signals

- `root-security-policy`: `SECURITY.md`

`regulated_repo_warning_required: true`. This is the standard open-source security policy file. `.github/CODEOWNERS` has no security, compliance, privacy or legal team entries, and no compliance directories exist.

## Repo-state risks

- **Unanchored `.gitignore` rules.** `dist`, `site`, `logs`, `coverage`, `typings/` and `.cache` match at any depth. A new file or folder with one of those names would be ignored silently and would not appear in `git status` or `git diff`. There are 14 `.gitignore` files in total.
- **Tracked files matching ignore rules.** There are three: `.claude/settings.local.json` and two `eslint-plugin` fixture files under a `node_modules` path. They appear deliberate and need no action.
- **Encrypted secrets.** None detected: no `.sops.yaml`, git-crypt state or key-file extensions. `plugins/kubernetes-react/src/__fixtures__/1-secrets.json` and `2-secrets.json` match by name only. They sit in a fixtures folder and were not opened.
- **LFS and submodules.** None.
- **Pre-commit hook.** Husky runs `yarn lint-staged`. A commit that changes `package.json` also runs catalog-info generation and package.json sorting, and stages `*/catalog-info.yaml`. Commits can therefore include files beyond those the run wrote.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
  - **Correction for this repo:** the standard warning that artifacts are visible to `git add -A` does not apply here, because `.git/info/exclude` already ignores `.sdlc/`. That exclusion is local to this clone. The `.gitignore` edit is therefore optional, and it would add an unrelated change to the run's diff.

## Proposed off-limits

- Env: `.env`, `.env.*`, `.env.local`
- AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.mcp.json`
- Build and dependencies: `node_modules/**`, `**/node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`
- Generated and vendored: `**/generated/**`, `.yarn/releases/**`, `**/.yarn/releases/**`
- Repo rules from `AGENTS.md`: `docs/releases/**`, `.eslintrc.js`, `**/.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`
- Plumbing: `.git/**`, `.sdlc/**`

Keep `build/**` and `dist/**` root-anchored. `packages/cli-module-build/src/commands/package/build` is tracked source and an unanchored pattern would block it.

`report*.api.md` files are left out so that `yarn build:api-reports` can regenerate them. They should not be edited by hand.

## Run context: dropping React 17

These are starting facts for the architect, not an impact analysis.

- 56 workspace packages declare `react`, `react-dom` and `@types/react` peers as `^17.0.0 || ^18.0.0`. Only `@backstage/ui` is already `^18.0.0`.
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` enforces those ranges through `peerDependencies`, `peerDependenciesReact18Only` and `react18OnlyPackages`. It needs to change with the manifests, or the peer-deps lint will disagree with them.
- The root `yarn.lock` records these peer ranges, so manifest edits imply a lockfile update.
- `process.env.HAS_REACT_DOM_CLIENT` branches exist in:
  - `packages/dev-utils/src/devApp/render.tsx`
  - `packages/frontend-dev-utils/src/createDevApp.tsx` (with a test in `createDevApp.test.tsx`)
  - `plugins/techdocs/src/reader/transformers/renderReactElement.ts`
- The bundler side of that flag is `packages/cli-module-build/src/lib/bundler/config.ts` and `hasReactDomClient.ts`.
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` prints a React 17 deprecation warning.
- `packages/cli-module-build/src/lib/bundler/server.ts` warns React 16 users to upgrade to React 17, so that advice goes stale once 17 is dropped.
- `packages/test-utils/src/testUtils/testingLibrary.ts` exports the public `LegacyRootOption` type, documented in terms of React 17. Changing it would alter an API report.
- `react-dom/test-utils` `act` is imported in at least four test files.
- Related docs: `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`.
- Published-package changes need changesets. `AGENTS.md` sets the bump for breaking changes: `minor` below 1.0.0 and `major` at 1.0.0 or above. Inspect and edit `.changeset/` directly; 39 Markdown files are already there.
- `docs-ui` and `microsite` already use React 19 under their own lockfiles.
