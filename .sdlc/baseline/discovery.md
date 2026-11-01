# Discovery: Backstage (BS-FE-08)

Run `20261101-feature-extend-scaffolder-conditional-fields`, intent `feature-extend`, mode `first-time`.
Seed: "Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard."

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on `BS-FE-08/opus55-only`, same commit as `origin/master`.
- This is a git worktree. The default branch is `master`.
- Dirty: yes, but the only change is the untracked `.sdlc/` directory.
- Remotes: `origin` (tl-ai-labs/backstage fork), `upstream` (backstage/backstage).
- `.gitignore` covers `.sdlc/`: no.

## Directory topology

Top-level source directories: `packages/` (74 entries), `plugins/` (162 entries), `docs/`, `beps/`, `contrib/`, `scripts/`, `microsite/`, `docs-ui/`, `workspaces/`.
Generated and present: `node_modules/`, `dist-types/`.
12,364 tracked files, below the sampling threshold, so the scan was not sampled.

## Detected stacks

| Manifest | Stack | Frameworks |
| --- | --- | --- |
| `package.json` | node-typescript | Yarn workspaces, Backstage, React, Express, Knex, Material UI v4, rjsf |
| `docs-ui/package.json` | node-typescript | Next 16, React 19 (outside the root workspaces) |
| `microsite/package.json` | node-javascript | Docusaurus 3, React 19 (outside the root workspaces) |
| `workspaces/ui/package.json` | node-typescript | Outside the root workspaces |

Toolchain: Yarn 4.18.1, Node v24.22.1 locally (engines allow 22 or 24), TypeScript ~5.7. `node_modules/` is installed.

No pre-authored adapter fits (`generic.md`, `nest.md` and `python.md` ship), so `generic.md` is the base and Tier 2b ran. The learned profile is at `.sdlc/baseline/stack-profile.md`.

## Test and build commands

- Proposed: `CI=1 yarn test plugins/scaffolder-react`
- Template: `CI=1 yarn test <path>`
- Source: `package.json#scripts.test`, with the path-scoped CI form from `AGENTS.md`. The project says to always pass a path.
- Gate 0 confirms this. It was not run during discovery, so there is no baseline test result.

Other project commands: `yarn tsc` (root only, no options), `yarn lint --fix`, `yarn prettier --write <paths>`, `yarn build:api-reports`. Do not run `yarn build`, `yarn changesets version` or `yarn release`.

## Docs

Present: `README.md` plus four translations, `AGENTS.md`, `.claude/CLAUDE.md`, `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (17 entries), `beps/`, `docs/contribute/doc-style-guide.md`.
Relevant to this run: `docs/features/software-templates/` (`input-examples.md`, `writing-templates.md`, `ui-options-examples.md`, `writing-custom-field-extensions.md`) and `beps/0010-scaffolder-templating-in-parameters/` (status: provisional).

## Detected AI/agent setup

| Path | Type |
| --- | --- |
| `.claude/` | Claude Code project directory |
| `.claude/settings.local.json` | Local settings, gitignored (presence only, not read) |
| `.claude/CLAUDE.md` | Claude instructions, symlink to `AGENTS.md` |
| `.claude/skills/` | Project skills |
| `.cursor/rules/` | Cursor rules |
| `.cursor/rules/backstage-project.mdc` | Cursor rule, symlink to `AGENTS.md` |
| `.github/copilot-instructions.md` | Copilot instructions |
| `AGENTS.md` | Shared agent instructions |

Not found: root `CLAUDE.md`, `CLAUDE.local.md`, `.claude/settings.json`, `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, tracked `gemini*.{yaml,json}`.

## Env keys

No `.env*` files exist in the repo, so no env file was read and `env_keys_by_file` is empty.
`env_keys_referenced_in_code` lists 121 names from source, including test fixture names. Names only.

## Source topology

- Monorepo: Yarn workspaces (`package.json#workspaces`), 235 packages listed in `baseline.json`. Per-package test: `CI=1 yarn test <package-root>`.
- Submodules: none.
- Git LFS: none. There is no `.gitattributes`.
- Entry points: `packages/app/src/index.tsx`, `packages/app/src/App.tsx`, `packages/backend/src/index.ts`.
- Infra: 49 GitHub workflows, `docker-compose.deps.yml`, Dockerfiles in `packages/backend/`, `.devcontainer/` and `contrib/docker/`, Terraform under `contrib/terraform/`.

## Scaffolder context for this run

Facts read from source. Nothing here is a design decision.

Packages and versions:

| Package | Version | Role |
| --- | --- | --- |
| `plugins/scaffolder-react` | 3.0.0-next.0 | Form wizard: Stepper, schema parsing, review step |
| `plugins/scaffolder` | 1.41.0-next.0 | Frontend plugin and built-in field extensions |
| `plugins/scaffolder-common` | 2.3.1 | Template entity schema and shared types |
| `plugins/scaffolder-backend` | 4.2.2-next.0 | Server-side task creation and parameter validation |

Behaviour that bears on the feature:

- **Form state.** `Stepper.tsx` keeps one merged `stepsState`. It passes the whole object as `formData` and in `formContext.formData`, but only the active step's schema (lines 296 to 298).
- **Same-step conditions already exist.** `docs/features/software-templates/input-examples.md:262` documents `dependencies` with `allOf`, `if` and `then`, including a conditional `required`.
- **Cross-step conditions are undocumented.** Because the merged state reaches each step's form, a `dependencies` block keyed on an earlier step's field might partly work today. This was not tested and needs verifying before anything is designed.
- **Schema parsing.** `extractSchemaFromStep` in `next/lib/schema.ts` moves `ui:*` keys into the UI schema. It walks `dependencies`, `then`, `else`, `anyOf`, `oneOf` and `allOf`, but not `if`.
- **Existing visibility gate.** `useTemplateSchema.ts` filters steps and properties by `ui:backstage.featureFlag`. It has no access to form state. `useFilteredSchemaProperties` is used by `Workflow.tsx`.
- **Per-step validation.** `createAsyncValidators` receives only the active step's `mergedSchema`.
- **Hidden answers persist.** `Stepper` strips `liveOmit` and `omitExtraData` from `formProps` (lines 180 and 181). `handleCreate` submits all of `stepsState`, and `ReviewState` iterates every key in form state, so an answer whose field later became hidden stays in the review and in the submitted values.
- **Review step schema lookup.** `findSchemaForKey` in `ReviewState/util.ts` passes only keys listed in a step's top-level `dependencies` to `getSchema`.
- **Backend validation.** `plugins/scaffolder-backend/src/service/router.ts:589` (task creation) and `:1072` (dry run) validate the full `values` against every step's schema using the `jsonschema` library. That is a different validator from the frontend's rjsf with ajv8. A hide-or-require rule has to behave the same in both, or be scoped deliberately to one.

Changes in published packages need changeset coverage, API report updates and doc updates. All four packages above are at 1.0.0 or higher, so a non-breaking new feature takes a `minor` bump. `.changeset/pre.json` exists, so changesets are in prerelease mode.

## Regulated-repo signals

- `SECURITY.md` at the repo root (kind `security-policy-file`).

The rule is mechanical, so `regulated_repo_warning_required` is true. The file's opening sections cover vulnerability reporting and maintainer remediation, not a compliance regime. `.github/CODEOWNERS` has no security, compliance, privacy or legal team entries, and no `HIPAA`, `PCI`, `SOC2`, `regulated` or `compliance` directories exist within depth 3.

## Proposed off-limits

- Repository internals: `.git/**`, `.sdlc/**` (run artifacts stay auto-allowlisted)
- Env files: `.env`, `.env.*`
- AI config: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `.mcp.json`
- Build output: `**/node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `packages/*/dist/**`, `plugins/*/dist/**`
- Generated code: `**/src/schema/openapi/generated/**`, `plugins/events-node/src/generated/**`, `**/CHANGELOG.md`
- Project rules: `docs/releases/**`, `**/.eslintrc.js`, `.eslintignore`, `.prettierignore`, `tsconfig.json`

`AGENTS.md` is included because `.claude/CLAUDE.md` and `.cursor/rules/backstage-project.mdc` are symlinks to it.

Keep the `dist` and `build` globs anchored as written. Tracked source sits under directories with those names at depth (for example under `packages/cli-module-build/src/commands` and `plugins/app-backend/src/service`), so a bare `**/build/**` would block real code.

These tracked outputs must stay writable, and should be in the allowlist when a published package changes: `.changeset/*.md`, `**/report*.api.md`, `**/knip-report.md`.

## Coexistence risks

- You have Cursor rules at `.cursor/rules`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.

## Repo-state risks

- LFS: none.
- Submodules: none.
- Encrypted secrets: none found. This was a tracked-filename scan only; contents were not inspected.
- Failing tests: unknown. Tier 1 does not run tests.
- `.gitignore`: does not cover `.sdlc/`. It also has broad unanchored patterns (`dist`, `logs`, `site`, `coverage`, `typings/`, `.cache`, `knip.json`, `docs.json`, `*.local.yaml`, `*-credentials.yaml`), so a new file or directory with one of those names is silently untracked anywhere in the repo.
- Pre-commit: Husky runs `yarn lint-staged`, which applies `eslint --fix` and `prettier --write` and can regenerate `catalog-info` files.

## Scan notes

- One combined probe was denied by the permission system. The required checks were re-run as narrower commands, and no data was lost.
- The `Grep` tool is unavailable in this session, so content searches used `grep` and `git grep` through Bash.
