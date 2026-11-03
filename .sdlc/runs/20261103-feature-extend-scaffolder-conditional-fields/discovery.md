# Discovery — 20261103-feature-extend-scaffolder-conditional-fields

Built 2026-11-03T12:30:59Z, mode `first-time`, plugin mmo 0.10.0. Intent hint: feature-extend, "Let a Scaffolder template show, hide or require fields based on answers given in an earlier step of the form wizard."

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-FE-08/argon4-plus-sonnet55`. The working tree is clean.
- This folder is a git worktree. Its common git dir is `/Users/apple/Documents/GitHub/backstage/.git`.
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git.
- `.gitignore` does not list `.sdlc/`. However, `.sdlc/` is already ignored through the shared `.git/info/exclude` (line 7), so `git add -A` will not pick it up.

## Directory topology
The repo is a Backstage monorepo with 12,364 tracked files. Top level: `packages/` (74 packages), `plugins/` (162 plugins), `docs/`, `docs-ui/`, `microsite/`, `beps/`, `contrib/`, `scripts/`, `workspaces/`, `.changeset/`, `.patches/`, `.github/`, `.storybook/`, `.devcontainer/`, `.husky/`, `.yarn/`.
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx`, `packages/backend/src/index.ts`.

## Detected stacks
- `package.json` → node-typescript. Uses Yarn 4.18.1 workspaces (`packages/*`, `plugins/*`) with nodeLinker node-modules.
- Frameworks: Backstage, React 17/18, `@rjsf/*` 5.24.13 with `@rjsf/validator-ajv8` and `ajv-errors`, Material UI v4 plus `@backstage/ui`, Express backend, and Jest through `backstage-cli`. Tests use `@testing-library/react`; e2e tests use Playwright.
- None of the pre-authored adapters (generic, nest, python) fits this stack, so Tier 2b ran. The learned profile is at `.sdlc/baseline/stack-profile.md`.

## Test / build commands
- **Proposed test command: `CI=1 yarn test <path>`**, per `CLAUDE.md`/`AGENTS.md`. Always pass a path. Example: `CI=1 yarn test plugins/scaffolder-react/src/next`.
- Type-check: `yarn tsc`, from the root only and with no options. Lint: `yarn lint --fix`. Format: `yarn prettier --write <changed files>`. API reports: `yarn build:api-reports`.
- **Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`, and the changeset CLI. Edit `.changeset/*.md` by hand.
- `yarn install` must run before any of these commands. `node_modules/` is present.

## Docs present
`README.md` (+ translations), `AGENTS.md`, `.claude/CLAUDE.md` (a symlink to `AGENTS.md`), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (ADRs), `docs/contribute/doc-style-guide.md`, `docs/features/software-templates/`.

## Detected AI/agent setup
- `.claude/`: `CLAUDE.md` is a symlink to `../AGENTS.md`. `settings.local.json` sets the env names CLAUDE_CODE_SUBAGENT_MODEL, GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION. `skills/` contains `catalog-db-performance.md` and `backstage-release-notes/SKILL.md`.
- `AGENTS.md`: the canonical agent instructions. These are the project rules for this run.
- `.cursor/rules/`: `backstage-project.mdc` (a symlink to `AGENTS.md`), plus `tests/test-utils.mdc` and `tests/backend-test-utils.mdc`.
- `.github/copilot-instructions.md`.
- None of these are present: root `CLAUDE.md`, `CLAUDE.local.md`, `.mcp.json`, `.cursorrules`, `.aider*`, `.continue/`, `.roo/`, `routing-policy.yaml`, `gemini*.yaml/json`.

## Env file keys
The repo has no `.env*` files. Env names referenced in code include NODE_ENV, LOG_LEVEL, CI, BACKSTAGE_ENV, POSTGRES_*, AWS_*, AZURE_*, GITHUB_TOKEN and others (the full list is in `baseline.json`). None of them affect this feature. Only names were recorded.

## Monorepo / submodules / LFS / infra
- Yarn workspaces with 236 packages. Per-package test command: `CI=1 yarn test <package-path>`.
- No submodules and no LFS.
- Infra: `packages/backend/Dockerfile`, `docker-compose.deps.yml`, 49 GitHub workflows, `.devcontainer/`. Husky with lint-staged runs eslint, prettier and check-docs-quality on commit.

## Regulated-repo signals
- `SECURITY.md` at the repo root (kind: SECURITY.md). This is the standard OSS vulnerability-disclosure policy. There are no HIPAA/PCI/SOC2/GDPR files or folders, and CODEOWNERS has no security, compliance, privacy or legal teams. `regulated_repo_warning_required: true`, which is low-signal here.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- GitHub Copilot instructions are at `.github/copilot-instructions.md`. The plugin leaves them untouched.
- A Claude Code project config is at `.claude/` (settings.local.json, skills). The plugin leaves it untouched.
- Husky pre-commit hooks run lint-staged (eslint --fix, prettier, docs quality) on any commit.
- `.sdlc/` is not in `.gitignore` but is covered by `.git/info/exclude`. The `git add -A` risk is mitigated, so Gate 0 does not need to add `.gitignore` to the allowlist.

## Project rules that bind this run (from AGENTS.md / CLAUDE.md)
- New `.ts/.tsx` files need the Apache 2.0 header with the current year (2026). Do not change the year on existing files.
- Match each package's existing style. In tests, prefer `screen` and `findBy*` over `waitFor`, add no test IDs, and write fewer but thorough tests.
- Published packages need changeset coverage. Write changesets in adopter language and name no internal symbols. Check the existing `.changeset/*.md` for scaffolder first. The current ones (`scaffolder-completed-controls.md`, `scaffolder-task-registry-rules.md`, `scaffolder-keyed-redactions.md`, among others) are unrelated. Bump rules: `@backstage/plugin-scaffolder-react` 3.0.0-next.0 and `@backstage/plugin-scaffolder` 1.41.0-next.0 are at or above 1.0, so a new feature is `minor`. `@backstage/plugin-scaffolder-common` 2.3.1 also takes `minor` for a feature.
- Behaviour changes need docs, in `docs/features/software-templates/` and following `docs/contribute/doc-style-guide.md`.
- Run `yarn build:api-reports` when the public API changes (`plugins/scaffolder-react/report*.api.md`).

## Feature hotspots — conditional fields across wizard steps

**Frontend form wizard (plugins/scaffolder-react, new "next" system)**
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx`: the wizard. It keeps all answers in `stepsState`. Each step's `<Form>` gets `formData={stepsState}`, which holds every step's data, while `schema={currentStep.schema}` covers only the current step. `formContext.formData = stepsState`. `handleNext` runs the async validators and then advances. This is the main place to evaluate conditions against earlier-step answers.
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.ts`: maps `manifest.steps` to `{schema, uiSchema, mergedSchema}` through `extractSchemaFromStep`. It filters steps and properties by `ui:backstage.featureFlag`, and skips property filtering when a step has only `dependencies`. This is the natural spot to filter or resolve per-step conditions.
- `plugins/scaffolder-react/src/next/lib/schema.ts`: `extractSchemaFromStep`/`extractUiSchema` split `ui:*` keys out of the JSON Schema. It already recurses into `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then` and `else`.
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.ts`: runs custom-field validators by walking formData with `json-schema-library` Draft07 `getSchema({pointer, data: formData})` on the step's `mergedSchema`.
- `plugins/scaffolder-react/src/next/hooks/useFilteredSchemaProperties.ts`: the existing "hide" mechanism. It drops steps and properties tagged `backstage:featureFlag` and removes them from `required`. It is called from `Workflow.tsx` (line 92) and is the precedent for removing a property together with its `required` entry.
- `plugins/scaffolder-react/src/next/hooks/useTransformSchemaToProps.ts`: maps `ui:ObjectFieldTemplate` to custom layouts.
- `plugins/scaffolder-react/src/next/components/Workflow/Workflow.tsx`: wraps the Stepper.
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` and `util.ts`: the review page. `findSchemaForKey` already handles `dependencies` using the form state, so hidden fields must also disappear from the review.
- `plugins/scaffolder-react/src/next/components/Form/Form.tsx`: the RJSF `withTheme` wrapper (MUI or BUI theme).
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.tsx`: the page that hosts `Workflow`. `plugins/scaffolder/src/alpha/hooks/useFormDecorators.ts` holds the form decorators. No separate legacy multistep form exists any more.

**Existing conditional support (what works today)**
- Single-step conditions work through RJSF: JSON Schema `dependencies` with `oneOf`/`allOf` + `if/then/else`. They are documented in `docs/features/software-templates/input-examples.md` §"Use parameters as conditional for fields" (around line 262) and §"Multiple conditional fields with custom ordering", and tested in `schema.test.ts`, `useTemplateSchema.test.tsx` ("should deal with dependencies and oneOf options") and `ReviewState.test.tsx`.
- Cross-step conditions are not supported explicitly and are not documented. The Form receives every step's data, so an `if` that refers to an earlier-step property may happen to evaluate in AJV and RJSF. RJSF `dependencies` keyed on a property outside the current step's `properties` are skipped by RJSF's resolver. Treat cross-step behaviour as unverified until it is tested.
- Values of fields that later become hidden stay in `stepsState` and reach `onCreate`. The feature needs a policy on clearing them.

**Template types (plugins/scaffolder-common)**
- `plugins/scaffolder-common/src/TemplateEntityV1beta3.ts`: `TemplateParametersV1beta3` (with `backstage:permissions`), `TemplateParameterSchema` (line 165: `steps: {title, description?, schema: JsonObject}[]`), and `TemplatePresentationV1beta3`.
- `plugins/scaffolder-common/src/Template.v1beta3.schema.json`: the catalog validation schema for template entities. Any new template keyword must be allowed here.
- `plugins/scaffolder-react/src/types.ts`: re-exports `TemplateParameterSchema`.
- `plugins/*/src/schema/openapi/generated/**`: generated code. Do not edit it.

**Backend (secondary but important)**
- `plugins/scaffolder-backend/src/service/router.ts` lines 589 and 1072: the backend validates `values` against each parameter step with `jsonschema` `validate()` on task creation and dry-run. A conditional "required" must give the same answer on the backend as in the frontend.
- `plugins/scaffolder-backend/sample-templates/`: sample templates that could hold a demo.

**Tests**
- `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx` (`renderInTestApp` plus `SecretsContextProvider`, dependencies case around line 187)
- `plugins/scaffolder-react/src/next/hooks/useTemplateSchema.test.tsx`, `plugins/scaffolder-react/src/next/lib/schema.test.ts` (dependencies and if/then cases around lines 291 and 530)
- `plugins/scaffolder-react/src/next/components/Stepper/createAsyncValidators.test.ts`, `plugins/scaffolder-react/src/next/hooks/useFilteredSchemaProperties.test.tsx`
- `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.test.tsx`, `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts`, `plugins/scaffolder-react/src/next/components/Workflow/Workflow.test.tsx`
- `plugins/scaffolder/src/alpha/components/TemplateWizardPage/TemplateWizardPage.test.tsx`, `plugins/scaffolder-common/src/TemplateEntityV1beta3.test.ts`

**Docs**
- `docs/features/software-templates/writing-templates.md`: §`spec.parameters` (line 105) and §"Remove sections or fields based on feature flags" (line 404). New cross-step docs fit here.
- `docs/features/software-templates/input-examples.md`: existing conditional-field examples (around lines 240-340).
- `docs/features/software-templates/ui-options-examples.md` and `writing-custom-step-layouts.md`: related ui:schema docs.

## Proposed off-limits
`.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.git/**`, `.sdlc/**`, `.yarn/**`, `.husky/**`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `dist-storybook/**`, `plugins/*/src/schema/openapi/generated/**`, `packages/*/src/schema/openapi/generated/**`, `.eslintrc.js` (all), `tsconfig.json`, `.prettierignore`, `docs/releases/**`, `**/CHANGELOG.md`.

## Notes
- The scan finished well inside the timebox, so no sampling was needed. The topology has 19 top-level dirs.
