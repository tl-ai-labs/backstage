# Brownfield discovery — 20261101-093743-feature-new-home-notifications-card

Mode: `first-time`. Intent hint: `feature-new`. Tier 1 ran in full, without sampling: 12,247 tracked files and fewer than 100 top-level directories. Tier 2b ran. The profile is at `.sdlc/baseline/stack-profile.md`.

Timebox note: the 30-second bound was exceeded. By timestamps, the run took about six minutes from start to written files, including Tier 2b. No group was cut short.

## Git state

- HEAD: `fe6ace679f3439ba2c5abf188a97dc5641a946f8`
- Branch: `BS-NF-09/flash-agsdk-only-v38`
- Working tree: clean
- Remotes: `origin` (https://github.com/tl-ai-labs/backstage.git), `upstream` (https://github.com/backstage/backstage.git)
- `gitignore_covers_sdlc`: `false`. `.gitignore` has no `.sdlc` line, but `.git/info/exclude` ignores `.sdlc/` in this clone.

## Directory topology

- `packages/`: core framework packages, including `app`, `app-legacy` and `backend`
- `plugins/`: plugin packages
- `docs/`, `beps/`, `docs-ui/`, `microsite/`: documentation, proposals and sites
- `contrib/`, `scripts/`, `workspaces/`: community extras, repo tooling and the standalone `workspaces/ui` project
- `.changeset/`, `.patches/`, `.yarn/`, `.github/`, `.husky/`, `.storybook/`, `.devcontainer/`, `.lighthouseci/`: repo machinery

`packages/cli-module-catalog`, `packages/cli-module-scaffolder` and `packages/cli-module-search` exist on disk with no tracked files. They look like leftovers from another checkout.

## Detected stacks

| Manifest | Stack | Frameworks | Scope |
| --- | --- | --- | --- |
| `package.json` | node-typescript | backstage, react, express | root workspaces |
| `docs-ui/package.json` | node-typescript | next, react | standalone |
| `microsite/package.json` | node-typescript | docusaurus, react | standalone |
| `workspaces/ui/package.json` | node-typescript | none detected | standalone |

The root manifest names no web framework. react (60 packages) and express (45 packages) come from workspace manifests. Material UI v4 appears in 39 packages, `@backstage/ui` in 24, knex in 17. There are no non-Node manifests in the repo outside fixtures and templates.

## Test, build and run

- Proposed test command: `yarn test`, from `package.json#scripts.test` with `yarn.lock` present.
- Repo guidance: `AGENTS.md` says to use `CI=1 yarn test <path>` and always give a path. Gate 0 should prefer this form.
- Per-package: `yarn workspace <pkg> test`, or `CI=1 yarn test <package-root>`.
- Type check: `yarn tsc`, from the root with no options.
- Lint: `yarn lint --fix`. Format: `yarn prettier --write <paths>`.
- API reports: `yarn build:api-reports`.
- `AGENTS.md` forbids running `yarn build`, `yarn changesets version` and `yarn release`.

## Docs

Present: `README.md` and four translations, `AGENTS.md`, `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `CONTRIBUTING.md`, `docs/architecture-decisions/`. `AGENTS.md` also points to `STYLE.md`, `REVIEWING.md` and `SECURITY.md`.

Absent: root `CLAUDE.md`, `ARCHITECTURE.md`, `docs/adr/`, `docs/decisions/`, `adr/`, and any `README` in a top-level `docs/` subfolder.

## Detected AI/agent setup

- `.claude/`, with `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `.claude/skills/`, and `.claude/settings.local.json` (gitignored)
- `.cursor/rules/`, with `backstage-project.mdc` (symlink to `AGENTS.md`) and `tests/*.mdc`
- `.github/copilot-instructions.md`

Not found: `.claude/settings.json`, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.{yaml,json}`.

## Env keys

No `.env*` files exist in the repo, so there are no file-based keys. 120 environment variable names are referenced in code. The list is in `baseline.json` as `env_keys_referenced_in_code`, names only.

## Monorepo, submodules, LFS

- Monorepo: Yarn workspaces (`yarn@4.8.1`), globs `packages/*` and `plugins/*`, 230 packages. The full list is in `baseline.json`.
- `docs-ui`, `microsite` and `workspaces/ui` are separate projects outside the root workspaces.
- Submodules: none. LFS: none (no `.gitattributes`).
- Entry points: `packages/app/src/index.tsx`, `packages/app/src/App.tsx`, `packages/app-legacy/src/index.tsx`, `packages/app-legacy/src/App.tsx`, `packages/backend/src/index.ts`.
- Infra: `packages/backend/Dockerfile` and others under `contrib/` and `.devcontainer/`, `docker-compose.deps.yml`, `contrib/terraform`, 49 files in `.github/workflows/`. No root `Dockerfile`, GitLab CI, CircleCI or Jenkinsfile.

## Regulated-repo signals

- `SECURITY.md` at the repo root (kind: `SECURITY.md`)

`regulated_repo_warning_required` is `true`. The file is the project's vulnerability reporting policy, and it is the only hit: no other compliance file, no regulated folder, and no matching `CODEOWNERS` team. Whether this repo is regulated remains your call.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- Correction to the note above for this clone: `.git/info/exclude` already ignores `.sdlc/`, so `git add -A` does not pick it up here. That rule is local to this clone and is not shared.
- The pre-commit hook in `.husky/pre-commit` runs `yarn lint-staged`, so commits may rewrite staged files (eslint --fix, prettier) and run generate-catalog-info for package.json changes.

## Proposed off-limits

- Env: `.env`, `.env.*`, `.env.local`
- AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`
- Build output: `node_modules/**`, `**/node_modules/**`, `dist/**`, `**/dist/**`, `dist-types/**`, `build/**`, `.next/**`
- Git: `.git/**`
- Generated: `packages/*/src/schema/openapi/generated/**`, `plugins/*/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `docs-ui/src/utils/theme-switcher.ts`

`AGENTS.md` is not a group 6 path. It is listed because `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to it.

Tool-generated files that a feature legitimately regenerates are not listed: `report*.api.md`, `report.sql.md`, `knip-report.md`, `catalog-info.yaml`, `yarn.lock`. Their headers do not match the generated-file markers, and blocking them would stop `yarn build:api-reports` and dependency changes.

Unresolved: `plugins/bitbucket-cloud-common/src/models/` looks generated from an OpenAPI spec, but no marker appears in the header of `models/index.ts`, and `index.ts` is listed as manually maintained in `.openapi-generator-ignore`. It is not listed.

## Tier 2b

Triggered by condition 1: the primary stack has no adapter in `skills/pipeline/stacks/`, which ships `generic.md`, `nest.md` and `python.md`. Condition 2 did not apply: there is no root `CLAUDE.md`, and `AGENTS.md` declares no custom framework. Condition 3 was not set.
