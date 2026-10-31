# Brownfield discovery: Backstage

- **Run:** `20261031-181500-feature-new-entity-former-names`
- **Mode:** first-time, full Tier 1 scan
- **Intent:** feature-new
- **Seed:** Remember an entity's former names in the Backstage catalog and redirect old entity-page and TechDocs links to the renamed entity, with a notice.

The repo has 12,364 tracked files, so the scan did not need sampling. It ran no tests, builds or installs.

## Git state

| Item | Value |
| --- | --- |
| HEAD | `f20fd9b598285c88401406b3812fe00d7708136c` |
| Branch | `BS-NF-12/opus55-only` |
| Dirty | Yes, but only from the untracked `.sdlc/`. Tracked files are clean. |
| origin | `https://github.com/tl-ai-labs/backstage.git` (fork) |
| upstream | `https://github.com/backstage/backstage.git` |
| `.sdlc/` gitignored | No |

- This is a linked worktree. Its git directory is `/Users/apple/Documents/GitHub/backstage/.git/worktrees/BS-NF-12`, and the object store and stash stack are shared with several sibling worktrees.
- HEAD matches local `master` and `origin/master`. The `upstream/master` ref points at a different commit (`c7046d9bfe1f`). This scan did not check how far the two have diverged.
- Hooks run from `.husky/_`. The pre-commit hook runs `yarn lint-staged`.

## Directory topology

Top-level directories:

- **Workspace code:** `packages/` (core packages and example apps) and `plugins/`
- **Docs and proposals:** `docs/`, `docs-ui/`, `microsite/`, `beps/`
- **Supporting:** `contrib/`, `scripts/`, `workspaces/ui/`

Entry points:

- `packages/backend/src/index.ts`
- `packages/app/src/index.tsx` (new frontend system)
- `packages/app-legacy/src/index.tsx` (old frontend system)

## Detected stacks

| Manifest | Stack | Frameworks | Scope |
| --- | --- | --- | --- |
| `package.json` | node-typescript | Backstage, React, Express, Knex | Root workspace |
| `docs-ui/package.json` | node-typescript | Next, React | Independent yarn project |
| `microsite/package.json` | node-javascript | Docusaurus, React | Independent yarn project |
| `workspaces/ui/package.json` | node-typescript | Backstage | Independent yarn project |

- The root manifest has no framework dependencies, so the root row comes from the workspace manifests.
- Tooling: yarn 4.18.1 with `nodeLinker: node-modules`, Node 22 or 24, TypeScript ~5.7.
- No Python, Go, Rust, Java, Ruby, PHP or Elixir manifests are tracked.

### Stack adapter

Tier 2b trigger 1 is met: the shipped adapters are `generic.md`, `nest.md` and `python.md`, and none matches a React and Express TypeScript monorepo. `CLAUDE.md` declares no custom framework.

The caller also passed `adaptive_profile: true`. The learned profile is at `.sdlc/baseline/stack-profile.md`, and it wins over `generic.md` wherever the two disagree.

## Test, build and run scripts

- **Proposed test command:** `CI=1 yarn test <path>`
- **Source:** `package.json#scripts.test`, plus the path rule in `AGENTS.md`
- **Gate 0 action:** replace `<path>`. This is a template, and `AGENTS.md` says never to run the suite without a path.
- **Type check:** `yarn tsc`, from the repo root only, with no options
- **Lint:** `yarn lint --fix` (the script compares against `origin/master`)
- **Format:** `yarn prettier --write <paths>`, on changed files only
- **API reports:** `yarn build:api-reports`, required before a PR
- **Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`

## Docs

- `README.md` plus four translations
- `AGENTS.md`, with `.claude/CLAUDE.md` as a symlink to it. There is no root `CLAUDE.md`, but `plugins/catalog-backend/CLAUDE.md` holds package-level instructions.
- `CONTRIBUTING.md`, including an AI Use Policy: PR authors must personally understand and test AI-generated changes
- `STYLE.md`, `REVIEWING.md`, `SECURITY.md`
- `docs/architecture-decisions/` (ADRs)
- `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`
- `docs/features/search/README.md`, `docs/features/techdocs/README.md`

## Detected AI/agent setup

| Path | Type | Notes |
| --- | --- | --- |
| `.claude/` | Claude Code | Contains `CLAUDE.md`, `settings.local.json`, `skills/` |
| `.claude/CLAUDE.md` | Claude Code | Symlink to `AGENTS.md` |
| `.claude/settings.local.json` | Claude Code | Gitignored |
| `.claude/skills/` | Claude Code | Includes `catalog-db-performance.md`, which is relevant to catalog work |
| `plugins/catalog-backend/CLAUDE.md` | Claude Code | Package-level instructions: catalog database changes need the query performance battery |
| `.cursor/rules/` | Cursor | Includes two test-utility rule files |
| `.cursor/rules/backstage-project.mdc` | Cursor | Symlink to `AGENTS.md` |
| `.github/copilot-instructions.md` | GitHub Copilot | PR review instructions |

Not found: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `CLAUDE.local.md`, `routing-policy.yaml`, Gemini config. Both symlinks resolve inside the repo.

## Environment keys

No `.env*` files exist in the working tree, so `env_keys_by_file` and `env_keys_all` are empty. No env values were read.

The code references 121 `process.env` names, listed in `baseline.json`. Names from the vendored `.yarn` releases are excluded, and the list still includes names used only in tests.

## Source topology

- **Monorepo:** Yarn workspaces, declared in `package.json` as `packages/*` and `plugins/*`. It has 235 packages, and each one is listed in `baseline.json` with its version and role.
- **Per-package tests:** `CI=1 yarn test <package-root>`
- **Outside the root workspace:** `docs-ui`, `microsite`, `workspaces/ui`
- **Submodules:** none
- **Git-LFS:** none, and there is no `.gitattributes`. Binary test fixtures (`.tar.gz`, `.zip`) are committed directly.
- **Infra:** `docker-compose.deps.yml`, `packages/backend/Dockerfile`, `.devcontainer/`, `contrib/docker/`, 49 GitHub workflow files. `contrib/terraform` holds examples.

### Packages the seed is likely to touch

This list comes from the seed text only. No code was analysed. Versions decide changeset bumps: below 1.0.0, breaking is `minor` and new API is `patch`; at 1.0.0 or above, breaking is `major` and new API is `minor`.

| Package | Root | Version |
| --- | --- | --- |
| `@backstage/catalog-model` | `packages/catalog-model` | 1.10.2 |
| `@backstage/catalog-client` | `packages/catalog-client` | 1.16.3 |
| `@backstage/plugin-catalog-backend` | `plugins/catalog-backend` | 4.0.3-next.0 |
| `@backstage/plugin-catalog-node` | `plugins/catalog-node` | 2.2.7-next.0 |
| `@backstage/plugin-catalog` | `plugins/catalog` | 2.0.11-next.0 |
| `@backstage/plugin-catalog-react` | `plugins/catalog-react` | 4.0.0-next.0 |
| `@backstage/plugin-techdocs` | `plugins/techdocs` | 1.19.1-next.0 |
| `@backstage/plugin-techdocs-react` | `plugins/techdocs-react` | 1.4.1-next.0 |
| `@backstage/plugin-techdocs-backend` | `plugins/techdocs-backend` | 2.4.1-next.0 |
| `@backstage/plugin-techdocs-node` | `plugins/techdocs-node` | 2.2.0-next.0 |

## Regulated-repo signals

- `security-doc`: `SECURITY.md`

This is the only signal. There are no compliance folders, and `.github/CODEOWNERS` has no security, compliance, privacy or legal entries. `regulated_repo_warning_required` is `true`, so Gate 0 shows its standard warning.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- GitHub Copilot instructions at `.github/copilot-instructions.md` and Claude Code config under `.claude/` stay untouched.
- `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to `AGENTS.md`, so an edit to `AGENTS.md` changes the instructions for all those tools.

## Repo-state risks

- **LFS, submodules, encrypted secrets:** none found. There are no git-crypt, SOPS, `.gpg`, `.enc`, `.age`, `.pem` or `.key` files in the tracked tree.
- **Broad `.gitignore` patterns:** `site`, `logs`, `pids`, `coverage`, `dist`, `typings/`, `.cache`, `docs.json` and `knip.json` match at any depth. `plugins/techdocs-backend/.gitignore` also ignores `static`. A new file or folder with one of these names won't show up in `git status`. `site` and `static` matter most, because they are natural names for TechDocs work.
- **Generated code the feature may need:** if the catalog REST API changes, `plugins/catalog-backend/src/schema/openapi/generated/**` and `packages/catalog-client/src/schema/openapi/generated/**` need regenerating. Both are on the proposed off-limits list, so Gate 0 would have to move them into scope.
- **API reports:** public API changes also change the generated `report*.api.md` files. These are not off-limits. Only `yarn build:api-reports` should update them.
- **Changesets:** the repo is in `next` pre-release mode (`.changeset/pre.json`). `AGENTS.md` says to edit `.changeset` files directly and never use the CLI.
- **Local leftovers:** root `dist-types/` is ignored build output.
- **Tracked but ignored:** two ESLint fixture files under a `node_modules` path. These are harmless.

## Proposed off-limits

Default list, from the discovery rules and `.sdlc/project.json`:

- Env files: `.env`, `.env.*`, `.env.local`
- AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `plugins/catalog-backend/CLAUDE.md`
- Build output: `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.next/**`
- Generated code: `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`
- Tool state: `.sdlc/**`, `.git/**`

Suggested additions from the project's own rules, for Gate 0 to accept or drop:

- Release notes: `docs/releases/**`
- Lint and type config: `.eslintrc.js`, `**/.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`, `**/tsconfig.json`
- Release tooling: `.changeset/config.json`, `.changeset/pre.json`, `.yarn/releases/**`
- Shared AI instructions: `AGENTS.md`
- Possible credentials: `*-credentials.yaml`, `*.local.yaml`
