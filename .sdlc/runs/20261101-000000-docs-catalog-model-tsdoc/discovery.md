# Brownfield discovery

Run `20261101-000000-docs-catalog-model-tsdoc`, built 2026-11-01T10:58:46.940Z, mode `first-time` (full scan). Intent context: docs, TSDoc for `@backstage/catalog-model`.

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-DOC-04/opus55-only`, identical to `master` and `origin/master`.
- `upstream/master` is 60 commits ahead of local `master`.
- Working tree: the only change is the untracked `.sdlc/` folder. `git.dirty` is true by the rule, `git.dirty_excluding_sdlc` is false.
- Remotes: `origin` (tl-ai-labs/backstage fork), `upstream` (backstage/backstage).
- Linked worktree. The common git dir is `/Users/apple/Documents/GitHub/backstage/.git`, with 7 worktrees sharing it. The stash stack is shared across them.
- Husky pre-commit hook is active (`core.hooksPath` is `.husky/_`).
- `gitignore_covers_sdlc`: false.

## Topology

Top-level source and content folders: `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`. There is no root `src/`. 12,364 tracked files, no sampling needed.

Entry points: `packages/backend/src/index.ts`, `packages/app/src/index.tsx`, and for the target package `packages/catalog-model/src/index.ts` plus `packages/catalog-model/src/alpha.ts`.

## Detected stacks

- `package.json` at the root: `node-typescript`, Yarn 4.18.1, Node `22 || 24` (local Node is v24.22.1). The root manifest names no framework dependency. Across the 235 workspace manifests: react in 60, express in 45, knex in 17, zod in 65. This is the Backstage framework itself.
- No Python, Go, Rust, JVM, Ruby, PHP, or Elixir manifest at the root.
- Target package `packages/catalog-model`: role `common-library`, version 1.10.2, depends on ajv, ajv-errors, lodash, zod. Entry points `.` and `./alpha`.

No pre-authored adapter matches, so the Tier 2b profile ran. See `.sdlc/baseline/stack-profile.md`.

## Test and build commands

- Proposed: `CI=1 yarn test packages/catalog-model`. Source: `package.json#scripts.test` and `yarn.lock`, with `CI=1` and the path taken from `.claude/CLAUDE.md`, which says always to give a path. Not run during discovery. Gate 0 confirms it.
- Tooling is installed: `backstage-cli`, `backstage-repo-tools`, and `tsc` resolve from `node_modules/.bin`.
- Type check: `yarn tsc`, root only, no options.
- API reports: `yarn build:api-reports`.
- Format: `yarn prettier --write <paths>`. Lint: `yarn lint --fix`.
- Forbidden by project rules: `yarn build`, `yarn changesets version`, `yarn release`.

## Docs

`README.md` (plus 4 translations), `AGENTS.md`, `.claude/CLAUDE.md` (symlink to `AGENTS.md`), `plugins/catalog-backend/CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/contribute/doc-style-guide.md`, `docs/architecture-decisions/`, `docs/features/search/README.md`, `docs/features/techdocs/README.md`, `packages/catalog-model/README.md`. No `ARCHITECTURE.md`.

`STYLE.md` holds the TSDoc rules (section "Documentation Guidelines"). `docs/contribute/doc-style-guide.md` sets U.S. English.

## Detected AI/agent setup

- `.claude/` (claude-code)
- `.claude/CLAUDE.md` (claude-instructions): symlink to ../AGENTS.md, inside the repo
- `.claude/settings.local.json` (claude-code-settings)
- `.claude/skills/` (claude-skills)
- `.cursor/` (cursor)
- `.cursor/rules/` (cursor)
- `.github/copilot-instructions.md` (copilot)
- `AGENTS.md` (agents-instructions)
- `plugins/catalog-backend/CLAUDE.md` (claude-instructions)

Absent: `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `CLAUDE.local.md`, `.claude/settings.json`, root `CLAUDE.md`, any `routing-policy.yaml`, any `gemini*.yaml` or `gemini*.json`.

## Env keys

No `.env*` file exists anywhere outside `node_modules/`. 135 env var names are referenced in code (names only, in `baseline.json`). None are referenced in `packages/catalog-model`.

## Monorepo, submodules, LFS, secrets

- Yarn workspaces, globs `packages/*` and `plugins/*`, 235 packages. `docs-ui`, `microsite`, and `workspaces/ui` sit outside the root workspace.
- Submodules: none (no `.gitmodules`).
- LFS: none (no `.gitattributes`). The `git-lfs` binary is not installed either, which has no effect here.
- Encrypted secrets: none found. No `.sops.yaml`, no `.git-crypt`, no encrypted file extensions, no vault markers. 7 tracked files match a PEM private-key header pattern, 6 of them test files. They were not opened and none is in `packages/catalog-model`.

## Infra hints

`.github/workflows/` (49 entries), `docker-compose.deps.yml`, 6 nested Dockerfiles, none at the root. No Terraform, GitLab CI, CircleCI, or Jenkins.

## Regulated-repo signals

- `SECURITY.md` at the repo root.

`regulated_repo_warning_required` is true because the rule fires on this file. Its content is a standard vulnerability-disclosure policy. `.github/CODEOWNERS` has no security, compliance, privacy, or legal team entries, and no HIPAA, PCI, SOC2, or compliance folders exist within depth 3.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/` (backstage-project.mdc, tests/test-utils.mdc, tests/backend-test-utils.mdc). The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- No Aider config, no `.mcp.json`, and no repo-local `routing-policy.yaml` were found, so the matching coexistence risks do not apply.

## Proposed off-limits

- `.claude/**`
- `.cursor/**`
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `plugins/catalog-backend/CLAUDE.md`
- `.env`
- `.env.*`
- `.env.local`
- `.envrc`
- `node_modules/**`
- `**/node_modules/**`
- `dist/**`
- `**/dist/**`
- `dist-types/**`
- `dist-storybook/**`
- `build/**`
- `**/build/**`
- `.next/**`
- `target/**`
- `vendor/**`
- `third_party/**`
- `**/generated/**`
- `**/report*.api.md`
- `**/knip-report.md`
- `.git/**`

`**/report*.api.md` is listed because those files are generated. See the scope notes below for the carve-out this run needs. Also restricted by project rules, outside the list above: docs/releases/** (no edits unless explicitly asked); ESLint, Prettier, and TypeScript config files (no edits unless requested); .changeset/*: edit directly, never through the changeset CLI; Never run yarn build, yarn changesets version, or yarn release.

## Scope notes for this run

**The count of 45 is real, but most entries are not exports.** It matches the `(undocumented)` markers in `packages/catalog-model/report.api.md`: 8 top-level exports and 37 members.

| Owner | Undocumented entries |
| --- | --- |
| ApiEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| ComponentEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| DefaultNamespaceEntityPolicy | `enforce` |
| DomainEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| FieldFormatEntityPolicy | `enforce` |
| GroupDefaultParentEntityPolicy | `enforce` |
| GroupEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| Top-level functions | `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity` |
| KubernetesValidatorFunctions | `isValidAnnotationKey`, `isValidAnnotationValue`, `isValidApiVersion`, `isValidKind`, `isValidLabelKey`, `isValidLabelValue`, `isValidNamespace`, `isValidObjectName` |
| LocationEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| NoForeignRootFieldsEntityPolicy | `enforce` |
| ResourceEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| SchemaValidEntityPolicy | `enforce` |
| SystemEntityV1alpha1 | `apiVersion`, `kind`, `spec` |
| UserEntityV1alpha1 | `apiVersion`, `kind`, `spec` |

- The 8 top-level functions are in `packages/catalog-model/src/entity/conditions.ts`. Each already has a `/** @public */` block, so that block needs a description added, not a second comment.
- `report-alpha.api.md` has 25 more undocumented entries (1 top-level, 24 members). Three of them (`ApiEntityV1alpha1` members) are the same source lines as public entries. The other 22 are outside the stated 45. Gate 0 should confirm that.
- Adding TSDoc changes `report.api.md`, because the `(undocumented)` markers disappear. `CONTRIBUTING.md` says CI fails when the report is stale. The file must be regenerated, not hand-edited, so Gate 0 needs to carve `packages/catalog-model/report.api.md` out of off-limits. `packages/catalog-model/report-alpha.api.md` will change too, because `src/alpha.ts` re-exports `ApiEntityV1alpha1`, so the same carve-out applies.
- Changesets: `.changeset/pre.json` is in `next` pre-release mode, and no pending changeset mentions `catalog-model`. Doc comments ship in the published types, so Gate 0 should decide whether a patch changeset is needed.
