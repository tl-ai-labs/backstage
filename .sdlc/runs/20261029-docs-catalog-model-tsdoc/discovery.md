# Discovery: 20261029-docs-catalog-model-tsdoc

Mode: first-time. Built 2026-10-29T18:22:39Z with plugin 0.9.3. Tier 1 only.
Upcoming job: add TSDoc to the undocumented exports of `@backstage/catalog-model` (`packages/catalog-model`).

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-DOC-04/opus55-plus-sonnet55`. The commit date is 2026-10-27 ("Merge pull request #36296 ... Version Packages").
- Working tree: the only untracked item is `.sdlc/` (plugin artifacts). There are no tracked changes. `dirty: true` is set only because of `.sdlc/`.
- This is a **git worktree** of `/Users/apple/Documents/GitHub/backstage` (main checkout on `master` @ same SHA). Sibling worktrees exist: BS-BF-08, BS-FE-08, BS-NF-09. The stash stack is shared, so do not use bare `git stash`.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- At the last fetch, `upstream/master` was 38 commits ahead of HEAD and `origin/master` was 0 ahead.
- `.gitignore` covers `.sdlc/`: **no**.

## Topology

- Yarn 4 (`yarn@4.18.1`) workspaces monorepo. Workspaces are `packages/*` (74 dirs) and `plugins/*` (162 dirs), 235 workspace package.json files in total. There are 12,364 tracked files, which is under the sampling threshold, so this was a full scan.
- Top-level dirs: `.changeset .claude .cursor .devcontainer .github .husky .lighthouseci .patches .storybook .yarn beps contrib dist-types docs docs-ui microsite packages plugins scripts workspaces`.

### Target package: `packages/catalog-model`

- `@backstage/catalog-model` v1.10.2. It is published (not private), with role `common-library`. CODEOWNERS: `@backstage/catalog-maintainers`.
- Entry points: `src/index.ts` (main export `.`) and `src/alpha.ts` (`./alpha`).
- `src/index.ts` re-exports `./entity`, `EntityPolicies`, `./kinds`, `./location`, `type CompoundEntityRef` from `./types`, and `./validation`. It already has an `@packageDocumentation` block.
- `src/alpha.ts` explicitly lists alpha exports: Entity types, `KindValidator`, `AlphaEntity`, `EntityStatus*`, the AiResource kinds and validators, `McpServerApiEntity`, and the `*EntityModel` layers from `./model`.
- Source subdirs: `entity/` (incl. `policies/`), `kinds/`, `location/`, `model/` (`jsonSchema/`, `modelActions/`, `operations/`, `sources/`), `schema/` (JSON schemas), `validation/`.
- API reports (API Extractor output, "Do not edit"):
  - `packages/catalog-model/report.api.md` (502 lines, 82 `export` lines): **45 `(undocumented)` markers**.
    - 8 top-level: `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity`. All are in `src/entity/conditions.ts` and carry a bare `/** @public */` with no summary.
    - 37 member-level: mostly `apiVersion` / `kind` / `spec` on the `*EntityV1alpha1` interfaces, plus `enforce` methods on the `*EntityPolicy` classes.
  - `packages/catalog-model/report-alpha.api.md`: **25 markers**. One is top-level (`CatalogModelKindRelationFieldDefinition` in `src/model/modelActions/addKind.ts`) and 24 are member-level.
- Root `build:api-reports` passes `-o ae-undocumented,...`, so undocumented items are reported in the files rather than failing the build. Adding TSDoc means the reports need regenerating with `yarn build:api-reports` (heavy: runs tsc across the repo). Do not hand-edit them.
- In-package TSDoc style example (`src/kinds/ComponentEntityV1alpha1.ts`): a summary sentence, an optional `@remarks` with a `{@link https://backstage.io/docs/...}`, then a release tag (`@public` / `@alpha`). `{@link KindValidator}`-style cross-refs are used.
- Other package files: `README.md`, `CHANGELOG.md`, `knip-report.md` (flags unused devDep `@types/json-schema`; not part of this job), `examples/`.
- Pending changesets in `.changeset/` that name `@backstage/catalog-model`: **none** (41 changeset files total).

## Detected stacks

- `package.json` → node-typescript. Frameworks/tooling: Backstage (`@backstage/cli`, `@backstage/repo-tools`/API Extractor), React, Jest (through `backstage-cli`), Prettier, ESLint. Engines: node `22 || 24`.
- catalog-model deps: `@backstage/errors`, `@backstage/types`, `ajv`, `ajv-errors`, `lodash`, `zod`.

## Test command

- Proposed: `CI=1 yarn test packages/catalog-model`. Source: root `package.json#scripts.test` (`backstage-cli repo test`) together with `.claude/CLAUDE.md`, which says to always pass a path.
- Other verification: `yarn tsc` (repo root, no options), `yarn prettier --write <changed files>`, `yarn lint --fix`, and `yarn build:api-reports` for the report files.
- Forbidden by CLAUDE.md: `yarn build`, `yarn changesets version`, `yarn release`, and the changeset CLI.
- Prereq: `node_modules/` exists, so `yarn install` appears to have been run.

## Docs present

- `README.md` (+ 4 translations), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `plugins/catalog-backend/CLAUDE.md`.
- `docs/contribute/doc-style-guide.md` (the required style guide for docs changes).
- ADRs: `docs/architecture-decisions/` (adr000-adr015; adr005 covers catalog core entities, adr009 covers entity references).

## Project rules relevant to this job (from .claude/CLAUDE.md / AGENTS.md)

- Match the existing style of each file and package. Do not change copyright years on existing files.
- Published packages need changeset coverage for changes that affect the published version. Whether TSDoc-only edits need a changeset is a Gate 0 decision. If one is added, it goes in `.changeset/*.md`, written directly and never with the CLI. The bump would be `patch`, and the text should be adopter-facing with no internal symbols.
- Never edit ESLint, Prettier, or TS config. Never edit `docs/releases/`.

## Detected AI/agent setup

| Path                                                                                                    | Type                                                                                        | Tracked in git  |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| `.claude/` (`CLAUDE.md`, `skills/backstage-release-notes/SKILL.md`, `skills/catalog-db-performance.md`) | Claude Code project config                                                                  | yes             |
| `.claude/settings.local.json`                                                                           | Claude local settings                                                                       | no (gitignored) |
| `AGENTS.md`                                                                                             | agent instructions (same content as `.claude/CLAUDE.md`, Cursor `alwaysApply` front-matter) | yes             |
| `plugins/catalog-backend/CLAUDE.md`                                                                     | nested Claude instructions                                                                  | yes             |
| `.cursor/rules/` (`backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`)      | Cursor rules                                                                                | yes             |
| `.github/copilot-instructions.md`                                                                       | Copilot instructions                                                                        | yes             |

Absent: `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `CLAUDE.local.md`, `.claude/settings.json`, any `routing-policy.yaml`, any `gemini*.{yaml,json}`.

## Env keys (names only)

- No `.env*` files are at the repo root.
- There are 113 distinct `process.env.*` names referenced across `packages/**` and `plugins/**`; the full list is in baseline.json. **None are in `packages/catalog-model`.**

## Monorepo, submodules, LFS

- Monorepo: Yarn workspaces (`packages/*`, `plugins/*`). There is no nx/turbo/lerna/rush/pnpm manifest. The per-package test command is `CI=1 yarn test <path>`.
- Submodules: none (no `.gitmodules`).
- Git LFS: none (no LFS filters in `.gitattributes`).

## Infra hints

- `docker-compose.deps.yml`, `.devcontainer/`, `.github/workflows/` (49 workflows), `.husky/` git hooks. There is no Dockerfile at the root, and no terraform, GitLab CI, CircleCI or Jenkins config.

## Regulated-repo signals

- `SECURITY.md` (repo root). This is a standard OSS vulnerability-disclosure policy. There are no HIPAA/PCI/SOC2/compliance dirs, and no security/compliance/legal CODEOWNERS entries. Flag set: `regulated_repo_warning_required: true`. This is a low-confidence signal.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- `.claude/`, `AGENTS.md`, `.github/copilot-instructions.md` and `plugins/catalog-backend/CLAUDE.md` are tracked project instruction files. They are off-limits by default.
- This checkout is a git worktree that shares its stash stack with 4 other worktrees, and Husky hooks run on commit.
- HEAD is 38 commits behind `upstream/master` (as of the last fetch). The `report.api.md` baseline may differ slightly from upstream, so regenerate the reports from this HEAD.
- `report.api.md` / `report-alpha.api.md` are generated. Change them only by running `yarn build:api-reports`.

## Proposed off-limits

`.git/**`, `.sdlc/**`, `.env`, `.env.*`, `.env.local`, `.claude/**`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `third_party/**`, `.yarn/**`, `docs/releases/**`, `**/CHANGELOG.md`, `**/knip-report.md`, `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`, `**/tsconfig*.json`.

Not off-limits, decide at Gate 0:

- `packages/catalog-model/report*.api.md`: regenerate only.
- `.changeset/*.md`: whether a changeset is needed.

Suggested write scope: `packages/catalog-model/src/**/*.ts` (non-test), plus the regenerated reports.

## Tier 2b (adaptive stack profile)

Triggered: the primary stack (Backstage TS/React/Yarn) has no pre-authored adapter (only `generic.md`, `nest.md`, `python.md`). The profile was not built in Tier 1. For a TSDoc-only job, the TSDoc pattern in `src/kinds/*EntityV1alpha1.ts` may be enough of a style reference.
