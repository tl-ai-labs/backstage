# Discovery: Backstage monorepo

Run `20261101-150500-refactor-require-react-18`, mode `first-time`, intent `refactor`.
Seed: require React 18 across Backstage packages and remove the React 17 shims, legacy render paths and peer ranges.

The scan was read-only, and the only writes were under `.sdlc/`. Tests were not run. No hard errors.

## 1. Git state

- HEAD: `f20fd9b598285c88401406b3812fe00d7708136c`, branch `BS-RF-10/opus55-only`.
- HEAD equals `origin/master`; `upstream/master` is 60 commits ahead.
- Dirty: yes, but only because `.sdlc/` is untracked.
- This is a git worktree. Its git directory is under `/Users/apple/Documents/GitHub/backstage/.git`, so the stash stack is shared with other checkouts.
- Remotes: `origin` is `tl-ai-labs/backstage`, `upstream` is `backstage/backstage`.
- `.gitignore` does not cover `.sdlc/` (`gitignore_covers_sdlc: false`).

## 2. Directory topology

Main areas are `packages/`, `plugins/`, `docs/`, `docs-ui/`, `microsite/`, `scripts/`, `contrib/`, `beps/` and `workspaces/`. The repo has 12,364 tracked files, so sampling was not needed.

## 3. Detected stacks

| Manifest | Stack | Frameworks |
| --- | --- | --- |
| `package.json` | node-typescript | React, Express, Knex, Material UI v4, Backstage UI, Jest, Storybook, Yarn workspaces |

- Node 22 or 24, Yarn 4.18.1, TypeScript 5.7. Installed `react` and `react-dom` are 18.3.1.
- There are no Python, Go, Rust, Java, Ruby, PHP or Elixir manifests.
- No dedicated adapter ships for this stack, so `generic.md` applies and the Tier 2b profile was built at `.sdlc/baseline/stack-profile.md`.

## 4. Test, build and run scripts

- Proposed: `yarn test` (from `package.json#scripts.test`, with `yarn.lock` present).
- **Use the scoped form:** `CI=1 yarn test <path>`. `AGENTS.md` says always to provide a path and avoid running all tests. Gate 0 should confirm this form.
- Type check: `yarn tsc`, from the root only, with no options.
- Lint: `yarn lint --fix` (compares against `origin/master`).
- Peer dependency check: `yarn lint:peer-deps`, which CI runs.
- API reports: `yarn build:api-reports`.
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release` and the changeset CLI.

## 5. Docs

`README.md` and four translations, `AGENTS.md`, `.claude/CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, and 15 ADRs plus a template and an index in `docs/architecture-decisions/`.

`CONTRIBUTING.md` has an AI use policy section, and a `DCO` file sits at the root. Read both before anything goes upstream.

## 6. Detected AI/agent setup

| Path | Type |
| --- | --- |
| `.claude/` | Claude Code config, with skills |
| `.claude/CLAUDE.md` | Symlink to `AGENTS.md` |
| `.claude/settings.local.json` | Local settings, gitignored; values not read |
| `.cursor/rules/` | Cursor rules |
| `.cursor/rules/backstage-project.mdc` | Symlink to `AGENTS.md` |
| `.github/copilot-instructions.md` | Copilot instructions |
| `AGENTS.md` | Shared agent instructions |

Not found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, Gemini config files.

Both symlinks stay inside the repo. They were not followed for writing.

## 7. Env keys

There are no `.env`, `.env.*` or `.envrc` files anywhere in the tree, so `env_keys_by_file` is empty. Source references 123 env var names; `baseline.json` records names only. `HAS_REACT_DOM_CLIENT` is one of them and is central to this refactor.

## 8. Source topology, monorepo, submodules, LFS

- Monorepo: Yarn workspaces over `packages/*` and `plugins/*`, 235 packages, 19 of them private.
- Per-package tests: `CI=1 yarn test <package-root>`.
- Separate roots with their own `yarn.lock`, outside the workspace: `microsite` (React ^19.2.4), `docs-ui` (React 19.2.7), `workspaces/ui`. These are not part of the peer range work.
- Submodules: none. Git LFS: none, and no `.gitattributes`.
- Entry points: `packages/app/src/index.tsx`, `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`, `packages/techdocs-cli-embedded-app/src/index.tsx`.
- Infra: `packages/backend/Dockerfile`, `contrib/docker/`, `.devcontainer/Dockerfile`, `docker-compose.deps.yml`, `contrib/terraform/`, 49 entries in `.github/workflows/`.

## Regulated-repo signals

- `SECURITY.md` at the repo root.

This looks like a normal open source security policy rather than a compliance document. No compliance folders or CODEOWNERS entries matched. `regulated_repo_warning_required` is `true` because any hit sets it.

## Repo-state risks

- **LFS and submodules:** none.
- **Encrypted secrets:** no `git-crypt`, SOPS or encrypted file markers, and no tracked key files. `microsite/data/plugins/vault.yaml` matched by name only, and is a plugin listing.
- **Failing tests:** unknown. Tests were not run and the pre-check skipped its test probe, so there is no baseline to compare against.
- **Broad `.gitignore` rules:** `dist`, `site`, `logs`, `coverage`, `pids`, `typings/`, `*.local.yaml`, `*-credentials.yaml`, `docs.json`, `knip.json` match at any depth. A new file under a matching path is silently unstaged. Two `packages/eslint-plugin` fixtures are tracked despite matching ignore rules.
- **Stale local artifacts:** `dist-types/` is ignored and dates from 28 Oct.
- **Pre-commit hook:** `yarn lint-staged` runs on commit. For `package.json` it regenerates `catalog-info.yaml`, stages those files with `git add`, and re-sorts the manifest, so commits can include files nobody edited on purpose.

## Seed-relevant findings

This is a pointer list from cheap searches, not a full change plan.

**Peer ranges**
- 56 `package.json` files declare `^17.0.0 || ^18.0.0` for `react`, `react-dom` and `@types/react`. Only `packages/ui` is already `^18.0.0`.
- The source of truth is `packages/repo-tools/src/commands/peer-deps/peer-deps.ts`, which has a separate React 18 list and a `react18OnlyPackages` set. `yarn lint:peer-deps` enforces it in CI, so the tool and the manifests must change together.
- `yarn.lock` has 228 lines containing this range, covering workspace entries and possibly third-party ones. It needs a matching update, so keep it writable.

**Legacy render paths** (each branches on `process.env.HAS_REACT_DOM_CLIENT`)
- `packages/dev-utils/src/devApp/render.tsx`
- `packages/frontend-dev-utils/src/createDevApp.tsx`, with a test at `createDevApp.test.tsx:152`
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts`

**What sets that flag**
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` and `config.ts`
- `packages/cli-module-test-jest/config/jest.js`

**Runtime warnings**
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` warns that React 17 is deprecated.
- `packages/cli-module-build/src/lib/bundler/server.ts` still tells React 16 users to upgrade to React 17.

**Shims**
- `use-sync-external-store/shim` is imported in `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`.
- `packages/core-app-api/package.json` uses `@testing-library/react-hooks`, which dates from the React 17 era.

**Public API**
- `LegacyRootOption` in `packages/test-utils/src/testUtils/testingLibrary.ts` is `@public` and used by `appWrappers.tsx`. Removing it changes the API report and is a breaking change.

**Scaffolding templates**
- `packages/cli-module-new/templates/` has four `package.json.hbs` files. Three still allow `^16.13.1 || ^17.0.0 || ^18.0.0`; `scaffolder-field-extension-module` allows `^17.0.0 || ^18.0.0`.

**Docs**
- `docs/tutorials/react18-migration.md`, `docs/tutorials/jsx-transform-migration.md`, `docs/tutorials/migrate-to-mui5.md`.

**Release rules from `AGENTS.md`**
- Narrowing a peer range is breaking, which means `minor` for packages below 1.0.0 and `major` for packages at 1.0.0 or above. The changesets need separate handling for those two groups. 42 entries already exist in `.changeset/`; check them first.
- API reports must be regenerated before a pull request.

**False positives to ignore**
- `.yarn/releases/*.cjs` and the copies under `packages/create-app/templates/` bundle a React 17 license banner.
- `docs/releases/`, `CHANGELOG.md` files and `docs-ui/src/utils/changelogs/` are history and must not change.
- `packages/cli-node/src/monorepo/Lockfile.test.ts` uses old ranges as test data.
- `packages/eslint-plugin` fixtures use `"react": "*"`.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Proposed off-limits

- **AI config:** `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md` (both symlinks point here), `.mcp.json`, `routing-policy.yaml`
- **Env:** `.env`, `.env.*`, `.env.local`, `.envrc`
- **Build and dependencies:** `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`
- **Generated or vendored:** `.yarn/releases/**`, `packages/create-app/templates/*/.yarn/releases/**`, `**/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`
- **Project rules:** `docs/releases/**`, `**/CHANGELOG.md`, `docs-ui/src/utils/changelogs/**`, `.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`
- **Internal:** `.git/**`, `.sdlc/**`

These must stay writable, even though tools generate them: `yarn.lock`, `**/report*.api.md`, `**/knip-report.md`, `.changeset/**`.
