# Discovery - 20261109-123532-feature-extend-cross-step-conditional-fields

Mode: first-time (full Tier 1 scan). Intent: feature-extend.
Seed: "Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard."
Tier 2b stack profile: triggered (primary stack is React/TypeScript, no pre-authored adapter) - see `.sdlc/baseline/stack-profile.md`.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` (2026-10-27), branch `BS-FE-08/opus55-plus-flash38-agsdk` (worktree), base branch `master`.
- Dirty: only the untracked `.sdlc/` folder (plugin-owned). No tracked-file modifications.
- Remote: `origin` -> https://github.com/tl-ai-labs/backstage.git (fork of backstage/backstage).
- `.gitignore` does NOT cover `.sdlc/` (`gitignore_covers_sdlc: false`).

## Directory topology
Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.lighthouseci`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `docs`, `docs-ui`, `microsite`, `packages`, `plugins`, `scripts`, `workspaces`. 12,364 tracked files (below the sampling threshold; full scan used).
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Detected stacks
- `package.json` (root, private) -> node-typescript. Yarn 4.18.1 workspaces (`packages/*` = 74 packages, `plugins/*` = 161 plugins), `nodeLinker: node-modules`, engines node `22 || 24` (local node v24.22.1).
- Frameworks relevant to this run: React, Backstage frontend system (old `core-*` and new `frontend-*`), Material UI v4 plus `@backstage/ui`, react-jsonschema-form 5.24.13 (`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`), `json-schema-library` 9 (Draft07), `ajv-errors`, lodash, Jest with React Testing Library.
- Changesets are in **pre mode** (`.changeset/pre.json`, tag `next`).

## Test / build commands
- Proposed test command: `CI=1 yarn test plugins/scaffolder-react/src/next` (source: `.claude/CLAUDE.md` "Development Flow": `CI=1 yarn test <path>` from the repo root, always with a path; root `scripts.test` = `backstage-cli repo test`).
- Narrower suggestions: `.../components/Stepper`, `.../components/ReviewState`, `.../hooks`, `.../lib`, and `CI=1 yarn test plugins/scaffolder/src/alpha/components/TemplateEditorPage`.
- Type check: `yarn tsc` (root only, no options). Format: `yarn prettier --write <changed files>`. Lint: `yarn lint --fix`. API reports: `yarn build:api-reports`.
- Forbidden by repo rules: `yarn build`, `yarn changesets version`, `yarn release`.
- Gate 0 must still confirm the command. `yarn install` is needed first; `node_modules` is present (2,130 entries).

## Docs present
README.md (+ translations), `.claude/CLAUDE.md`, AGENTS.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (ADRs), `docs/contribute/doc-style-guide.md`, `docs/contribute/project-structure.md`, `docs/features/software-templates/` (template-author docs).

Repo rules that bind downstream phases (from `.claude/CLAUDE.md` / AGENTS.md):
- New `.ts/.tsx/.js/.jsx` files need an Apache 2.0 header with the current year (2026). Do not change the year on existing files.
- Match the style of each package. Prefer fewer, thorough tests. In RTL tests use `screen` and `findBy*`, not `waitFor`, and add no test IDs.
- Published-package changes need changeset coverage. Edit `.changeset/*.md` directly and never run the changeset CLI. Packages below 1.0.0 take `patch` for new features; packages at 1.0.0 or above take `minor`. The two packages here are `@backstage/plugin-scaffolder-react` 3.0.0-next.0 (minor) and `@backstage/plugin-scaffolder` 1.41.0-next.0 (minor).
- New or changed behavior needs docs: TSDoc, the README, or `/docs`, following the doc style guide.
- Never edit ESLint, Prettier or TS config, and never edit `docs/releases`.

## Module map for this run (scaffolder form wizard)
Core (`plugins/scaffolder-react/src/next/`):
- `components/Stepper/Stepper.tsx`: the wizard. It holds `stepsState` across steps, re-keys `<Form key={activeStep}>` per step, and passes `formContext.formData = stepsState`. `handleNext` runs `createAsyncValidators(steps[activeStep].mergedSchema, ...)` on the current step's `formData` only. Review uses `ReviewStateComponent` or `ReviewStepComponent`.
- `components/Stepper/createAsyncValidators.ts`: custom field-extension validation. It resolves pointers with `json-schema-library` `getSchema({pointer, data: formData})`. The data is the current step's data only.
- `components/Stepper/utils.ts`: `hasErrors` and `isObject`.
- `hooks/useTemplateSchema.ts`: splits the manifest into `ParsedTemplateSchema[]` (`mergedSchema`, `schema`, `uiSchema`) and applies feature-flag filtering for steps and properties.
- `hooks/useTransformSchemaToProps.ts`: resolves layouts.
- `lib/schema.ts`: `extractSchemaFromStep` / `extractUiSchema`, which pull `ui:*` keys out of `properties`, `items`, `anyOf`/`oneOf`/`allOf`, `dependencies`, `then`/`else`.
- `components/ReviewState/ReviewState.tsx` and `util.ts`: `findSchemaForKey` resolves each key against each step using only that step's `dependencies` keys as data. This is a likely gap for cross-step conditions.
- `components/Form/Form.tsx` (rjsf wrapper, theme switch) and `components/Workflow/Workflow.tsx` (wraps Stepper).
- Tests: `Stepper.test.tsx` (924 lines), `createAsyncValidators.test.ts`, `utils.test.ts`, `hooks/useTemplateSchema.test.tsx`, `lib/schema.test.ts`, `ReviewState.test.tsx`, `ReviewState/util.test.ts`, `Workflow.test.tsx`.

Consumers (`plugins/scaffolder/src/alpha/components/`):
- `TemplateWizardPage/TemplateWizardPage.tsx` (uses `Workflow`).
- `TemplateEditorPage/TemplateEditorForm.tsx` (uses `Stepper` directly for the editor preview), with `TemplateFormPreviewer.tsx` and `TemplateFormPage.tsx`.

Reference only (read, don't change unless scoped):
- `plugins/scaffolder-backend/src/service/router.ts` (~L589, ~L1072): the server validates the full `values` object against **each** `spec.parameters` step schema. A cross-step `if`/`then` is therefore evaluated server-side against all answers. Required-ness must stay consistent with the frontend, or task creation fails with a 400.
- `plugins/scaffolder-common` (`TemplateParameterSchema`, `TemplatePresentationV1beta3`), `plugins/scaffolder-react/src/types.ts`.

Docs for template authors:
- `docs/features/software-templates/input-examples.md`: "Use parameters as conditional for fields" and "Multiple conditional fields with custom ordering" (both same-step `dependencies` + `allOf`/`if`/`then`). This is the natural place for a cross-step section.
- `docs/features/software-templates/writing-templates.md`, `ui-options-examples.md`.

Generated API reports that change if the public or alpha API changes (regenerate with `yarn build:api-reports`, never hand-edit): `plugins/scaffolder-react/report-alpha.api.md`, `report.api.md`, `plugins/scaffolder/report-alpha.api.md`, `report.api.md`.

Existing unreleased changesets naming `@backstage/plugin-scaffolder-react`: `.changeset/four-dingos-filter.md` (template filter blueprint) and `.changeset/fix-bui-array-item-titles.md`. Neither covers this feature, so a new changeset is likely needed.

## Detected AI/agent setup
- `.claude/` (tracked `CLAUDE.md` and `skills/`; `settings.local.json` is present and gitignored)
- `AGENTS.md` (same content family as CLAUDE.md)
- `.cursor/rules/backstage-project.mdc` (alwaysApply), `.cursor/rules/tests/backend-test-utils.mdc`, `.cursor/rules/tests/test-utils.mdc`
- `.github/copilot-instructions.md`
- Absent: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `CLAUDE.local.md`, `routing-policy.yaml`, gemini configs.

## Env keys
- No `.env*` files exist (searched to depth 4, excluding node_modules).
- 137 distinct `process.env.*` names referenced across the repo (names only, listed in baseline.json). The scaffolder and scaffolder-react plugins reference none. No Python or Java env patterns.

## Monorepo / submodules / LFS
- Yarn workspaces (`packages/*`, `plugins/*`). Per-package test: `CI=1 yarn test <package path>`.
- No `.gitmodules`, no `.gitattributes`, so no submodules and no LFS.
- `workspaces/ui`, `microsite`, `docs-ui` are outside the Yarn workspace globs.

## Infra hints
`.github/workflows/` (49 files), `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `docker-compose.deps.yml`, Husky + lint-staged (eslint/prettier on commit). No Terraform, GitLab CI, CircleCI or Jenkins.

## Regulated-repo signals
- `SECURITY.md` (kind: security-policy). This is the standard OSS vulnerability-disclosure policy, not a compliance regime. CODEOWNERS has no security, compliance, privacy or legal teams, and there are no HIPAA, PCI, SOC2 or compliance folders. `regulated_repo_warning_required: true` per the rule; it is low-weight here.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/` (including the alwaysApply `backstage-project.mdc`). The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions at `.github/copilot-instructions.md` and agent instructions in `AGENTS.md` / `.claude/CLAUDE.md`. These stay untouched, and their code and changeset rules apply to this run.
- Husky pre-commit hooks run eslint, prettier and catalog-info generation on commit. The plugin does not commit, but your own commit will run them.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- No custom `.mcp.json`, Aider config or repo-local `routing-policy.yaml` found.

## Proposed off-limits
`.env`, `.env.*`, `.env.local`, `.mcp.json`, `.claude/**`, `.cursor/**`, `AGENTS.md`, `.github/copilot-instructions.md`, `routing-policy.yaml`, `**/node_modules/**`, `**/dist/**`, `build/**`, `**/dist-types/**`, `.git/**`, `.yarn/**`, `.sdlc/**`, `docs/releases/**`, `**/CHANGELOG.md`, `**/report*.api.md` (regenerate with tooling only), `**/knip-report.md`, `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`.

## Notes
- The scan finished well inside the timebox. No sampling was needed.
- `.sdlc/pre-check-status.json` records `test_command_probe: skip (unknown)`. This discovery now proposes `CI=1 yarn test <path>`.
