# Brownfield discovery: Tier 1

- Run: `20261104-210402-refactor-require-react18`
- Mode: first-time (full scan)
- Intent hint: refactor. "Require React 18 across Backstage packages and remove the React 17 shims, legacy render paths and peer ranges."
- Plugin: mmo 0.10.1

## Git state

- HEAD: `f20fd9b598285c88401406b3812fe00d7708136c` ("Merge pull request #36296 from backstage/changeset-release/master")
- Branch: `BS-RF-10/argon4-agsdk-only`
- Working tree: clean (no lines from `git status --short`)
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- `.gitignore` covers `.sdlc/`: **no**. On this clone, `.git/info/exclude` (line 7) already ignores `.sdlc/`, so `git add -A` will not stage run artifacts.

## Directory topology

Top-level directories: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types` (generated, gitignored), `docs`, `docs-ui`, `microsite`, `packages` (74 packages), `plugins` (162 packages), `scripts`, `workspaces`.

12,364 tracked files. This is under the very-large-repo threshold, so the scan was full, with no sampling.

Entry points:
- `packages/app/src/index.tsx`: example app on the new frontend system
- `packages/app-legacy/src/index.tsx`: example app on the old frontend system
- `packages/backend/src/index.ts`: example backend

## Detected stacks

| Manifest | Stack | Frameworks / notes |
|---|---|---|
| `package.json` (root) | node-typescript | Backstage framework, React, react-dom, react-router-dom, Material UI v4 (39 pkgs), MUI v5 (4), Express (45), Knex (17), Jest 30, Storybook 10, Playwright. Yarn 4.18.1, TypeScript ~5.7, Node 22 or 24. The root `resolutions` pin `@types/react` and `@types/react-dom` to `^18.0.0`. |
| `docs-ui/package.json` | node-typescript | Next 16.3.8, React 19.2.7. Private and standalone (not in the root workspaces). |
| `microsite/package.json` | node-javascript | Docusaurus ^3.10.0, React ^19.2.4. Private and standalone. |
| `workspaces/ui/package.json` | node-typescript | Isolated nested Yarn workspace with its own `yarn.lock`. Its README says it is work in progress and not yet in use. |

There is no Python, Go, Rust, Java, Ruby, PHP or Elixir manifest. `mkdocs.yml` and `mkdocs-ci.yml` exist for TechDocs tooling, but the repo has no Python manifest.

Package roles (from `backstage.role`): backend-plugin-module 78, web-library 32, node-library 31, common-library 23, frontend-plugin 23, backend-plugin 18, cli-module 17, cli 5, frontend 3, frontend-plugin-module 3, backend 1, none 4.

### Intent orientation (presence only, not analysis)

- 56 workspace `package.json` files declare the peer range `"^17.0.0 || ^18.0.0"` (react, react-dom, @types/react). One (`packages/ui`) already declares `react: ^18.0.0`.
- `HAS_REACT_DOM_CLIENT` appears in `packages/cli-module-build/src/lib/bundler/config.ts`, `packages/cli-module-test-jest/config/jest.js`, `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` (+ `.test.tsx`) and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
- Legacy render APIs (`ReactDOM.render`, `unmountComponentAtNode`, `ReactDOM.hydrate`) appear in `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` and `plugins/techdocs/src/reader/transformers/renderReactElement.ts`.
- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` encodes the React 17 peer range. This is the `yarn lint:peer-deps` checker.
- `packages/create-app/templates/` contains scaffolded app templates (default-app, legacy-app) that ship their own package.json files.

## Test / build / run commands

- **Proposed test command: `CI=1 yarn test <path>`**. Source: `package.json#scripts.test` (`NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`) plus the Development Flow section of `.claude/CLAUDE.md`, which says to always pass a path and never run the whole suite. Gate 0 must confirm the path or paths.
- Type check: `yarn tsc`, from the repo root only, with no options.
- Lint: `yarn lint --fix` (diffs against `origin/master`). Peer-dep lint: `yarn lint:peer-deps`.
- Format: `yarn prettier --write <changed paths>`.
- API reports: `yarn build:api-reports`. Project memory says that for CI key order, run `tsc:full` and then `build:api-reports:only`.
- Forbidden by CLAUDE.md: `yarn build`, `yarn changesets version`, `yarn release`.
- Changesets are required for published packages in `packages/` and `plugins/`. Edit `.changeset/*.md` directly and never use the changeset CLI.

## Docs present

`README.md` (+ fr_FR, ja_JP, ko_kr and zh_Hans translations), `AGENTS.md`, `.claude/CLAUDE.md` (a symlink to `AGENTS.md`), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (17 ADRs), `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `beps/` (enhancement proposals), `.github/PULL_REQUEST_TEMPLATE.md`. There is no `ARCHITECTURE.md` and no root `CLAUDE.md`.

## Detected AI/agent setup

- `.claude/` is a Claude Code project dir:
  - `.claude/CLAUDE.md` is a tracked symlink to `../AGENTS.md`
  - `.claude/settings.local.json` is gitignored and contains an `env` block. Its values were not read.
  - `.claude/skills/` is tracked and contains `backstage-release-notes/SKILL.md` and `catalog-db-performance.md`
- `.cursor/rules/` is tracked:
  - `backstage-project.mdc` is a symlink to `../../AGENTS.md`
  - `tests/backend-test-utils.mdc` and `tests/test-utils.mdc`
- `.github/copilot-instructions.md`
- `AGENTS.md` is the shared instruction file that both symlinks point to.
- Not found: `.mcp.json`, `CLAUDE.local.md`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env file keys

No `.env`, `.env.*` or `.envrc` files exist outside `node_modules`. The scan found 135 distinct env-var names referenced in tracked code (names only, in `baseline.json` → `env_keys_referenced_in_code`). Most are CI, Yarn, AWS/Azure or Postgres names, plus `HAS_REACT_DOM_CLIENT`, which is relevant to this intent.

## Monorepo, submodules, LFS

- Monorepo: **Yarn 4 workspaces** (`packages/*`, `plugins/*`), 235 packages, listed in `baseline.json` → `monorepo.packages`. There is no pnpm, Nx, Turbo, Lerna or Rush manifest. Per-package test command: `CI=1 yarn test <package-root>`.
- Nested or standalone projects outside the root workspaces: `workspaces/ui` (own lockfile, WIP), `docs-ui` (Next, React 19), `microsite` (Docusaurus, React 19).
- Submodules: none (no `.gitmodules`).
- Git LFS: none (no `.gitattributes`).
- Encrypted secrets: no sops, git-crypt, `*.enc` or `*.gpg` markers.
- Tracked symlinks: `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc`. Both point inside the repo.

## Infra hints

- Dockerfiles: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `contrib/docker/*/Dockerfile`
- `docker-compose.deps.yml`
- `contrib/terraform/`
- `.github/workflows/` (49 files)
- `.devcontainer/`
- Husky pre-commit: `yarn lint-staged`
- No GitLab CI, CircleCI or Jenkins.

## Generated paths

- OpenAPI generated code: `**/src/schema/openapi/generated/**` (10 packages) and `plugins/events-node/src/generated/**`.
- 316 tracked `report*.api.md` API reports. `yarn build:api-reports` regenerates them; do not edit them by hand. They are not proposed off-limits because a peer-range or API change may legitimately need them regenerated.
- `dist-types/` at the root (tsc output, gitignored).

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md). This is a standard open-source vulnerability-disclosure policy, not a compliance regime. No HIPAA, PCI, SOC2, GDPR or compliance directories, and no security, compliance, privacy or legal team owners in CODEOWNERS.
- `regulated_repo_warning_required: true` because the rule fires on any hit. The signal is weak.

## Coexistence risks

- **Cursor rules detected**: You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- **Symlinked agent instructions**: `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to `AGENTS.md`. Any edit to `AGENTS.md` changes both, so `AGENTS.md` is proposed off-limits.
- **Copilot instructions**: `.github/copilot-instructions.md` is present and stays untouched.
- **`.sdlc/` not gitignored**: Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run. *Mitigation already in place:* `.git/info/exclude` ignores `.sdlc/` on this clone, so the risk does not apply here. I recommend not editing the upstream `.gitignore`.
- **Husky pre-commit hook**: `lint-staged` runs `eslint --fix` and prettier on staged JS/TS. For staged `package.json` changes it also regenerates `*/catalog-info.yaml`, runs `git add */catalog-info.yaml`, and sorts `package.json`. A peer-range refactor touches many `package.json` files, so expect the commit to pick up extra catalog-info and sort changes.
- No `.mcp.json`, Aider config or repo-local `routing-policy.yaml` was found.

## Proposed off-limits

```
.env, .env.*, .env.local, .envrc
.claude/**, .cursor/**, .github/copilot-instructions.md, AGENTS.md, .mcp.json
node_modules/**, **/node_modules/**, dist/**, **/dist/**, dist-types/**, **/dist-types/**,
dist-workspace/**, dist-storybook/**, build/**, .next/**
.yarn/releases/**, .yarn/plugins/**, workspaces/ui/.yarn/**
**/src/schema/openapi/generated/**, plugins/events-node/src/generated/**
docs/releases/**   (CLAUDE.md: never edit past release notes)
.sdlc/**, .git/**
```

`yarn.lock` is deliberately **not** off-limits. Workspace peer-dependency changes may change lockfile entries.

## Tier 2b: adaptive stack profile

**Triggered, but not run in this step.** The primary stack is React + Express under the Backstage framework (TypeScript). The only pre-authored adapters are `generic.md`, `nest.md` and `python.md`, so none fits. Run the adaptive profile after Gate 0 approval. It would write `.sdlc/baseline/stack-profile.md`, which this step was not asked to write.

## Scan notes

- Full scan, no timeouts, no file-read failures.
- Two of my shell commands needed a retry because of zsh glob behavior (`nomatch` on `.aider*`). The retry with `nullglob` completed cleanly.
