# Discovery: backstage (first-time, Tier 1 + Tier 2b)

Run: `20261031-0945-feature-extend-scaffolder-cross-step-conditions` · built 2026-10-31T04:12:19Z · plugin 0.9.3

## Git state

- HEAD `cb8b07905b900ecb57e5c4b77fe299ff5b83de43` on branch `BS-FE-08/opus55-plus-flash38` (base `f20fd9b598` plus one study-setup commit).
- Working tree clean (`dirty: false`).
- Remote: `origin` -> `git@github.com:tl-ai-labs/backstage.git`.
- `.gitignore` covers `.sdlc/`: **no**. `.git/info/exclude` (line 7) does ignore `.sdlc/` on this clone, so `git add -A` will not pick it up here. That protection only applies to this clone.

## Directory topology

A Yarn-workspaces TypeScript monorepo with 12,365 tracked files, 74 `packages/*` and 162 `plugins/*` (235 workspace manifests).
Top-level folders: `packages/`, `plugins/`, `docs/`, `docs-ui/`, `microsite/`, `beps/`, `contrib/`, `scripts/`, `workspaces/`, `.changeset/`, `.patches/`, `.yarn/`, `.storybook/`, `.github/`, `.devcontainer/`, `dist-types/` (generated, untracked).
Example apps: `packages/app` (new frontend system), `packages/app-legacy` and `packages/backend`.

## Detected stacks

- `package.json` -> **node-typescript** (TypeScript ~5.7, Node 22 || 24, yarn@4.18.1). Frameworks: React 18, `@backstage/cli` (jest 30 test runner), react-jsonschema-form (`@rjsf/*`, ajv8 validator), Material UI v4 plus `@backstage/ui`, Storybook 10 and Playwright for e2e.
- No other language manifests at the root.
- **No pre-authored adapter matches** (the plugin ships only generic, nest and python). Tier 2b ran, and its stack profile is at `.sdlc/baseline/stack-profile.md`.

## Test / build commands

- **test_command_proposed:** `CI=true yarn test plugins/scaffolder-react plugins/scaffolder && yarn tsc && yarn lint:all` (supplied by the caller).
- Root `scripts.test` = `backstage-cli repo test`. `.claude/CLAUDE.md` says to always pass a path (`CI=1 yarn test <path>`), to run `yarn tsc` only from the root and without options, and to never run `yarn build`, `changesets version` or `release`.
- `yarn lint:all` = `backstage-cli repo lint` (whole repo, slow). `yarn lint` lints only files changed since `origin/master`.
- API reports: `yarn build:api-reports` regenerates `report*.api.md`.

## Docs

README.md (plus 4 translations), `.claude/CLAUDE.md` (a symlink to `AGENTS.md`), CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, ADRs in `docs/architecture-decisions/`, doc style guide in `docs/contribute/doc-style-guide.md`.

Template-author docs for this feature:

- `docs/features/software-templates/writing-templates.md`: `spec.parameters` (L105), feature-flag field removal (L404), step `if:` (L728), Template Editor (L989).
- `docs/features/software-templates/input-examples.md`: "Use parameters as condition in steps" (L238), "Use parameters as conditional for fields" (L262), "Multiple conditional fields with custom ordering" (L292) and "Conditionally set parameters" (L343). **This is the most likely home for the new cross-step documentation.**
- `docs/features/software-templates/ui-options-examples.md`, `writing-custom-step-layouts.md`.

## Focus area (feature-extend: cross-step field conditions)

`@backstage/plugin-scaffolder-react` 3.0.0-next.0, `plugins/scaffolder-react/src/next/`:

- `components/Stepper/Stepper.tsx` (362 lines): the wizard. It holds `stepsState` across steps, `activeStep`, and the shared ajv8 `validator`. `handleNext` runs `createAsyncValidators(steps[activeStep].mergedSchema, ...)` and then merges the step's formData into `stepsState`. `<Form>` receives `formData={stepsState}`, `formContext.formData = stepsState`, and `schema={currentStep.schema}`. The review step renders `<ReviewStateComponent formState={stepsState} schemas={steps} />`.
- `components/Stepper/createAsyncValidators.ts` and `utils.ts` (`hasErrors`, `isObject`): per-step custom field validation.
- `hooks/useTemplateSchema.ts`: maps `manifest.steps` to `ParsedTemplateSchema {schema, mergedSchema, uiSchema, title, description}` through `extractSchemaFromStep`, and filters steps and properties by `ui:backstage.featureFlag`. It already special-cases `dependencies`. **This is the likely seam for cross-step conditions.**
- `hooks/useFilteredSchemaProperties.ts` and `hooks/useTransformSchemaToProps.ts`.
- `lib/schema.ts`: `extractSchemaFromStep` and `extractUiSchema`. These walk `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then` and `else`, and move `ui:*` keys into uiSchema.
- `components/ReviewState/ReviewState.tsx` and `util.ts`: `findSchemaForKey` uses `json-schema-library` Draft07 and feeds `dependencies` data to resolve dynamic schemas. Hidden or conditional fields must be handled here as well.
- `components/Workflow/Workflow.tsx`: wraps the Stepper and is used by the wizard page.
- Tests sit next to their sources: `Stepper.test.tsx`, `createAsyncValidators.test.ts`, `utils.test.ts`, `useTemplateSchema.test.tsx`, `useFilteredSchemaProperties.test.tsx`, `lib/schema.test.ts`, `ReviewState.test.tsx`, `ReviewState/util.test.ts`, `Workflow.test.tsx`.
- API reports: `plugins/scaffolder-react/report.api.md`, `report-alpha.api.md`, `report-testUtils.api.md` (most of the `next/` exports are `@alpha`).

`@backstage/plugin-scaffolder` 1.41.0-next.0:

- `src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`: renders `<Workflow>` with `manifest` from `useTemplateParameterSchema`. Test: `TemplateWizardPage.test.tsx`.
- `src/alpha/components/TemplateEditorPage/TemplateEditorForm.tsx`: renders `<Stepper>` for the editor preview. Also `TemplateFormPreviewer.tsx` and `TemplateFormPage.tsx` (with test), plus `TemplateEditorPage.test.tsx`.
- API reports: `plugins/scaffolder/report.api.md`, `report-alpha.api.md`.

Changesets: 41 pending in `.changeset/`, some already touching scaffolder (for example `scaffolder-completed-controls.md`). Review them before adding a new one, as CLAUDE.md requires. Both packages are at >=1.0, so a new feature gets a **minor** bump.

## Detected AI/agent setup

- `.claude/` with `CLAUDE.md` (a symlink to `../AGENTS.md`), `settings.local.json` (sets the subagent model env) and `skills/`.
- `AGENTS.md` (tracked).
- `.cursor/rules/`: `backstage-project.mdc`, `tests/test-utils.mdc`, `tests/backend-test-utils.mdc`.
- `.github/copilot-instructions.md`.
- None of these are present: `.mcp.json`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini config.

## Env keys

No `.env*` files in the repo. 72 env-var names are referenced in code (names only). The ones relevant to scaffolder are `LOG_LEVEL` and `NODE_ENV`. The full list is in `baseline.json`.

## Monorepo / submodules / LFS / infra

- Yarn workspaces (`packages/*`, `plugins/*`). Per-package tests: `CI=1 yarn test <path>` from the root.
- Submodules: none. Git-LFS: none (no `.gitattributes`).
- Infra: `.github/workflows/`, `docker-compose.deps.yml`, `.devcontainer/`. No Dockerfile at the root, no terraform, no other CI.
- Husky and lint-staged run eslint --fix, prettier and a docs-quality check on commit.

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md). This is a standard open-source vulnerability-disclosure policy. There are no HIPAA, PCI, SOC2 or compliance folders and no security, compliance or legal CODEOWNERS entries. The flag is set (`regulated_repo_warning_required: true`), but the risk is low.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions at `.github/copilot-instructions.md` and the project Claude config at `.claude/` stay untouched.
- Your `.gitignore` doesn't cover `.sdlc/`. On this clone `.git/info/exclude` already ignores it, so run artifacts are not visible to `git add -A` here. Gate 0 can still offer to add `.gitignore` to this run's allowlist if you want the entry in the shared file. For a study branch, keeping it clone-local is probably better.
- The husky pre-commit hook (lint-staged) rewrites staged files with eslint --fix and prettier.

## Proposed off-limits

`.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.env`, `.env.*`, `.env.local`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `docs/releases/**` (CLAUDE.md rule), ESLint/Prettier/TypeScript config (`.eslintrc.js`, `tsconfig.json`, `.prettierignore`, `.eslintignore`; CLAUDE.md rule), `.git/**`.

## Scope notes for downstream phases

- Expected write set: `plugins/scaffolder-react/src/next/**` (source and tests), possibly `plugins/scaffolder/src/alpha/components/TemplateEditorPage/**`, `plugins/scaffolder-react/report*.api.md` and `plugins/scaffolder/report*.api.md` (if APIs change), a new `.changeset/*.md`, and `docs/features/software-templates/input-examples.md` and/or `writing-templates.md`.
- New `.ts`/`.tsx` files need the Apache 2.0 header with year 2026.

## Timing

The scan finished well within the timebox. No sampling fallback was needed.
