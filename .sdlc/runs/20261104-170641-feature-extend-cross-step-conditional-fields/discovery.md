# Discovery - 20261104-170641-feature-extend-cross-step-conditional-fields

Mode: first-time (Tier 1 full scan). Intent: feature-extend. Built 2026-11-04.
Machine-readable snapshot: `.sdlc/runs/20261104-170641-feature-extend-cross-step-conditional-fields/baseline.json`.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-FE-08/argon4-plus-flash38` (master is the PR base).
- Working tree clean (`git_dirty: false`).
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git` (fork of backstage/backstage).
- `.gitignore` does not list `.sdlc/` (`gitignore_covers_sdlc: false`), but `.git/info/exclude` line 7 does: `.sdlc/` is already ignored locally.
- A second worktree is active: `/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08` (branch `BS-BF-08/argon4-plus-flash38`).
- 12,364 tracked files: no sampling needed.

## Directory topology
Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`, `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (162), `scripts`, `workspaces`.
Example apps are `packages/app` (new frontend system), `packages/app-legacy` and `packages/backend`.

## Detected stacks
- `package.json` -> **node-typescript** monorepo (Yarn 4.18.1 workspaces `packages/*`, `plugins/*`; TypeScript ~5.7; Node 22 || 24).
- Frameworks: React 18, Backstage (core-/frontend-/backend- systems), Jest 30 + React Testing Library, rjsf 5.24.13 (`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`), `json-schema-library` ^9, Storybook 10, Playwright.
- No pre-authored adapter matches React/TypeScript (only generic, nest, python ship), so Tier 2b fired: `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- **Proposed test command:** `CI=1 yarn test <path>` from repo root, always with a path. Source: `.claude/CLAUDE.md` (a symlink to `AGENTS.md`), "Development Flow". Root `scripts.test` = `backstage-cli repo test`.
  - `CI=1 yarn test plugins/scaffolder-react/src/next`
  - `CI=1 yarn test plugins/scaffolder/src/alpha/components/TemplateEditorPage`
- Type check: `yarn tsc` (root, no options). Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`. API reports: `yarn build:api-reports`.
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`. Never use the changeset CLI. Edit `.changeset/*.md` directly.

## Docs
README.md (plus translations), AGENTS.md, .claude/CLAUDE.md, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, docs/architecture-decisions/ (ADRs), docs/contribute/doc-style-guide.md, docs/features/software-templates/.
Rules from the repo's instructions that apply here: new source files need the Apache 2.0 header with the current year (2026), and existing headers keep their year. Match the style of each package. Prefer fewer, thorough tests. With RTL, prefer `screen` / `findBy*` and don't add test IDs. Behavior changes need docs and changesets. Never edit `docs/releases`, ESLint, Prettier or TS config.

## Detected AI/agent setup
| Path | Type |
|---|---|
| `.claude/` | Claude project dir (tracked: CLAUDE.md symlink -> AGENTS.md, skills/) |
| `.claude/settings.local.json` | Claude local settings (gitignored) |
| `.claude/skills/` | Claude skills (backstage-release-notes, catalog-db-performance.md) |
| `AGENTS.md` | agents instructions (the target of the CLAUDE.md symlink) |
| `.cursor/rules/` | Cursor rules (backstage-project.mdc -> AGENTS.md, tests/*.mdc) |
| `.github/copilot-instructions.md` | Copilot instructions |

Not present: `.mcp.json`, `.cursorrules`, Aider config, `.continue/`, `.roo/`, `CLAUDE.local.md`, any `routing-policy.yaml`, gemini config files.

## Env keys
No `.env*` files at the repo root or tracked anywhere. 123 distinct `process.env.*` names are referenced in code (listed in baseline.json). None are in `plugins/scaffolder` or `plugins/scaffolder-react`.

## Monorepo / submodules / LFS / infra
- Yarn workspaces monorepo. `.changeset/pre.json` puts changesets in **pre mode (tag `next`)**.
- `@backstage/plugin-scaffolder-react` is at version **3.0.0-next.0** (>= 1.0: a new feature = `minor`, breaking = `major`).
- `@backstage/plugin-scaffolder` is at **1.41.0-next.0** (same rules).
- No submodules, no Git LFS.
- Infra: Dockerfiles (packages/backend, .devcontainer, contrib/docker), docker-compose.deps.yml, 49 GitHub workflows, devcontainer. No terraform or other CI.
- Husky + lint-staged pre-commit: eslint --fix, prettier, check-docs-quality on *.md, and generate-catalog-info when package.json or CODEOWNERS change.

## Regulated-repo signals
- `SECURITY.md` (kind: SECURITY.md) at repo root. This is the standard open-source vulnerability-disclosure policy, not a sign of regulated data. `regulated_repo_warning_required: true` per the rule. There are no compliance dirs and no security/compliance/legal teams in CODEOWNERS.

## Feature area - cross-step conditional fields (Scaffolder)
How it works today (from reading the code):
- `useTemplateSchema` maps each manifest step through `extractSchemaFromStep`. It keeps `mergedSchema` (the raw step schema) and `schema`/`uiSchema` (with `ui:*` removed). If a step has `dependencies` and no `properties`, the feature-flag property filter is skipped.
- `Stepper` holds one shared `stepsState` across all steps, and passes it to rjsf `Form` as `formData` and `formContext.formData`. Each `Form` renders only `currentStep.schema`. JSON Schema `dependencies` / `if-then` therefore only see properties declared in the same step. Answers from earlier steps sit in formData, but the current step's schema doesn't declare them, so conditions on them never resolve.
- `createAsyncValidators(steps[activeStep].mergedSchema, ...)` runs per step on submit with `json-schema-library` Draft07.
- `ReviewState` -> `findSchemaForKey` (`ReviewState/util.ts`) resolves each key against each step's `mergedSchema`. It passes only that step's own `dependencies` keys from formState as `data`, so a dependency on another step's key will not resolve there either.
- The template editor preview (`TemplateEditorForm`) renders the same `Stepper` from `@backstage/plugin-scaffolder-react/alpha`, so it picks up the fix automatically.

### Source files
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`: wizard, shared `stepsState`, `Form` per step, `handleNext` validation
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`: per-step async custom-field validation (`@alpha` export)
- `plugins/scaffolder-react/src/next/components/Stepper/utils.ts`: `hasErrors`, `isObject`
- `plugins/scaffolder-react/src/next/components/Stepper/index.ts`: barrel
- `plugins/scaffolder-react/src/next/lib/schema.ts`: `extractSchemaFromStep`, `createFieldValidation` (`@alpha`)
- `plugins/scaffolder-react/src/next/lib/index.ts`: barrel
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`: `ParsedTemplateSchema`, step parsing, feature-flag filtering
- `plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts`: layout transform of the current step
- `plugins/scaffolder-react/src/next/hooks/useFormDataFromQuery.ts`: initial state
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx`: review table
- `plugins/scaffolder-react/src/next/components/ReviewState/util.ts`: `findSchemaForKey` (handles `dependencies` for the same step only)
- `plugins/scaffolder-react/src/next/components/Workflow/Workflow.tsx`: wraps Stepper (used by TemplateWizardPage)
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx`: editor preview, renders `Stepper`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPreviewer.tsx`: form previewer, uses TemplateEditorForm
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditor.tsx`: uses `TemplateEditorForm.DirectoryEditorDryRun`
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`: runtime wizard, uses `Workflow`

### Existing tests
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (924 lines, `renderInTestApp` + `SecretsContextProvider`)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts`
- `plugins/scaffolder-react/src/next/components/Stepper/utils.test.ts`
- `plugins/scaffolder-react/src/next/lib/schema.test.ts`
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx`
- `plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.test.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts`
- `plugins/scaffolder-react/src/next/components/Workflow/Workflow.test.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateFormPage.test.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateEditorPage/TemplateEditorPage.test.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.test.tsx`

### Template-author docs
- `docs/features/software-templates/input-examples.md`: the section "Use parameters as conditional for fields" (around line 262) shows `dependencies` / `allOf` / `if-then` within one step. This is the natural home for a cross-step example.
- `docs/features/software-templates/writing-templates.md`: covers parameters and multi-step forms (around line 110).
- `docs/features/software-templates/ui-options-examples.md`
- Style guide: `docs/contribute/doc-style-guide.md`

### API reports (regenerated via `yarn build:api-reports`, never hand-edited)
- `plugins/scaffolder-react/report.api.md`
- `plugins/scaffolder-react/report-alpha.api.md`: lists `Stepper`, `StepperProps`, `createAsyncValidators`, `extractSchemaFromStep`, `ReviewState`, `ReviewStateProps`, `useTemplateSchema`, `ParsedTemplateSchema`
- `plugins/scaffolder-react/report-testUtils.api.md`
- `plugins/scaffolder/report.api.md`
- `plugins/scaffolder/report-alpha.api.md`

### Existing changesets touching these packages (pre mode, tag `next`)
- `.changeset/fix-bui-array-item-titles.md`: scaffolder-react patch (BUI array item titles)
- `.changeset/four-dingos-filter.md`: scaffolder minor + scaffolder-react minor (`ScaffolderTemplateFilterBlueprint`)
- `.changeset/gitlab-branch-autocomplete.md`: scaffolder minor + backend-module-gitlab patch
- `.changeset/scaffolder-completed-controls.md`: scaffolder patch (task button bar)

None of these cover cross-step conditionals, so the feature needs a new changeset. It should most likely be a `minor` for `@backstage/plugin-scaffolder-react`, and also for `@backstage/plugin-scaffolder` if its behavior changes.

## Coexistence risks
- **Cursor rules detected:** "You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it."
- **Claude / Copilot instructions:** `.claude/CLAUDE.md`, `AGENTS.md` and `.github/copilot-instructions.md` are left untouched. Their rules (above) bind the run.
- **`.sdlc/` not in `.gitignore`:** "Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run." Note: `.git/info/exclude` already ignores `.sdlc/` here, so `git add -A` will not pick it up and no `.gitignore` edit is needed.
- **Parallel worktree:** `/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08` is checked out on another branch. It shares the git object store. Leave its branch alone.
- **Pre-commit hooks:** husky/lint-staged run eslint --fix and prettier on commit, and can rewrite staged files.
- No `.mcp.json`, no Aider config, no repo-local `routing-policy.yaml`.

## Proposed off-limits
`.env`, `.env.*`, `.env.local`, `.claude/**`, `.cursor/**`, `AGENTS.md`, `.github/copilot-instructions.md`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `docs/releases/**`, ESLint/Prettier/TS config (`.eslintrc.js`, `**/.eslintrc.js`, `tsconfig.json`, `.prettierignore`), `**/CHANGELOG.md`, `.changeset/pre.json`, `**/knip-report.md`.
`report*.api.md` files stay in scope only as outputs of `yarn build:api-reports`. They are not hand-edited.
