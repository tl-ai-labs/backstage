# Discovery: BS-FE-08 (Backstage monorepo)

Run: `20261029-144036-feature-extend-scaffolder-conditional-fields` | Mode: first-time | Intent: feature-extend
Built: 2026-10-29T09:14Z | Plugin: mmo 0.9.3 | Scan time: under 30s (Tier 1 sampled toward the scaffolder packages; the repo is too big to enumerate)

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-FE-08/opus55-plus-sonnet55` (this is a git worktree; its root matches cwd)
- Dirty: only the untracked `.sdlc/`
- Remotes: `origin` https://github.com/tl-ai-labs/backstage.git, `upstream` https://github.com/backstage/backstage.git
- `gitignore_covers_sdlc`: **false**

## Topology

Top level: `.changeset`, `.claude`, `.cursor`, `.devcontainer`, `.github`, `.husky`, `.patches`, `.storybook`, `.yarn`, `beps`, `contrib`, `dist-types`, `docs`, `docs-ui`, `microsite`, `packages` (74), `plugins` (162), `scripts`, `workspaces`. There are about 12.4k tracked files.
Apps: `packages/app` (new frontend system), `packages/app-legacy`, `packages/backend`.

## Detected stacks

- `package.json`: node-typescript (TS ~5.7, Node 22 or 24, yarn@4.18.1 workspaces `packages/*` and `plugins/*`). Frameworks: React 18, Backstage core/frontend plugin APIs, Material UI v4 alongside `@backstage/ui` (BUI), and rjsf 5.24.13 (`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/material-ui`) in scaffolder-react. Tests use Jest 30 through `backstage-cli`.
- No pre-authored adapter fits this stack, so the Tier 2b profile was built: `.sdlc/baseline/stack-profile.md`.

## Test, type-check and build commands

- Tests: `CI=1 yarn test <path>`, run from the repo root and always with a path. Source: `.claude/CLAUDE.md`; root `scripts.test` is `backstage-cli repo test`.
- Type-check: `yarn tsc` from the root, with no options.
- Format: `yarn prettier --write <changed files>`. Lint: `yarn lint --fix`. API reports: `yarn build:api-reports`.
- **Forbidden:** `yarn build`, `yarn changesets version`, `yarn release`, and the changeset CLI (edit `.changeset/*.md` by hand).

## Docs present

`README.md`, `.claude/CLAUDE.md`, `AGENTS.md` (the same content, with Cursor `alwaysApply` frontmatter), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`, `docs/architecture-decisions/` (ADRs: adr003 no default exports, adr006 avoid React.FC, adr007 msw for mocks), and `docs/contribute/doc-style-guide.md`.

Rules from the project that bind this run:

- New `.ts`/`.tsx` files need the Apache 2.0 header with year 2026. Do not change the year on existing files.
- Match each package's own style.
- Write fewer but more thorough tests. Use `screen` and `findBy*` from RTL, and do not add test IDs.
- Published packages need changesets. scaffolder-react is 3.0.0-next.0, so a new feature there is a `minor`. Check the existing changesets first: four already name scaffolder packages (`four-dingos-filter`, `fix-bui-array-item-titles`, `gitlab-branch-autocomplete`, `scaffolder-completed-controls`).
- New features must ship with docs updates, in TSDoc, a README, or `/docs`.
- Never touch ESLint, Prettier or TS configs, or `docs/releases`.

## Detected AI/agent setup

- `.claude/` holds `CLAUDE.md`, `settings.local.json` (env only) and `skills/` (`backstage-release-notes`, `catalog-db-performance.md`)
- `.cursor/rules/` holds `backstage-project.mdc`, `tests/test-utils.mdc` and `tests/backend-test-utils.mdc`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- Not found: `.mcp.json`, `.cursorrules`, aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs

## Env keys (names only)

- No `.env*` file at the repo root. `.devcontainer/devcontainer.env` has: `NODE_OPTIONS`.
- About 123 distinct `process.env.*` names are referenced in code. Most are CI or tooling names (AWS*\*, AZURE*_, GITHUB\__, YARN*\*, POSTGRES*_, BACKSTAGE\__). None are relevant to the scaffolder frontend. The full list is in baseline.json.

## Monorepo, submodules, LFS, infra

- Yarn workspaces, about 235 package.json files at depth 2. Per-package test: `CI=1 yarn test plugins/<pkg>`.
- No submodules and no LFS.
- Infra: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `docker-compose.deps.yml`, and 49 GitHub workflows.

## Regulated-repo signals

- `SECURITY.md` (kind: security-policy) at the repo root. This is a standard OSS vulnerability-disclosure file. CODEOWNERS names no security, compliance, privacy or legal teams, and there are no HIPAA, PCI or SOC2 directories. `regulated_repo_warning_required: true`, as the rule requires, but the signal is weak.

## Coexistence risks

- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) will be untracked but visible to `git add -A`. Gate 0 will offer to add `.gitignore` (create if missing, append if present) to this run's allowlist so the plugin can add the entry as part of the run.
- The husky and lint-staged pre-commit hooks run eslint, prettier and catalog-info generation on commit.
- `.claude/CLAUDE.md` and `AGENTS.md` hold binding project rules (see Docs).

## Proposed off-limits

`.env`, `.env.*`, `.devcontainer/devcontainer.env`, `.claude/**`, `.cursor/**`, `AGENTS.md`, `.github/copilot-instructions.md`, `.mcp.json`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.yarn/**`, `yarn.lock`, `docs/releases/**`, `**/report*.api.md` (generated by `yarn build:api-reports`; only that command should change them), `plugins/scaffolder-common/src/schema/openapi/generated/**`, `.git/**`, `.sdlc/**`.

## Focus area: scaffolder conditional fields across wizard steps

### Packages

| Package                                | Path                         | Version       | Role                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@backstage/plugin-scaffolder-react`   | `plugins/scaffolder-react`   | 3.0.0-next.0  | Wizard (`Stepper`), schema parsing, form, review. **Primary change site.** The `next/` code is exported through `/alpha`.                                                                                       |
| `@backstage/plugin-scaffolder`         | `plugins/scaffolder`         | 1.41.0-next.0 | Pages that host the wizard: `src/alpha/components/TemplateWizardPage/`, and the template editor's form previewer `src/alpha/components/TemplateEditorPage/TemplateFormPreviewer.tsx` and `TemplateFormPage.tsx` |
| `@backstage/plugin-scaffolder-common`  | `plugins/scaffolder-common`  | 2.3.1         | Types: `TemplateParameterSchema` (`steps: {title, description?, schema: JsonObject}[]`) and `TemplateParametersV1beta3` in `src/TemplateEntityV1beta3.ts`                                                       |
| `@backstage/plugin-scaffolder-backend` | `plugins/scaffolder-backend` | n/a           | `src/service/router.ts` (~L589, ~L1073) checks `values` against **each parameter step on its own** with the `jsonschema` lib. A cross-step `required` must still pass there.                                    |

### Key files (all under `plugins/scaffolder-react/src/next/`)

- `components/Stepper/Stepper.tsx` (362 lines): the wizard.
  - `stepsState` is **one flat `Record<string, JsonValue>`** shared by all steps, seeded from `useFormDataFromQuery(initialState)`.
  - `handleChange` and `handleNext` shallow-merge each step's `formData` into it.
  - Each step renders `<Form key={activeStep} formData={stepsState} formContext={{...propFormContext, formData: stepsState}} schema={currentStep.schema} .../>`.
  - Validation is `createAsyncValidators(steps[activeStep].mergedSchema, ...)` plus the ajv8 `customizeValidator()` with `ajv-errors`.
  - `liveOmit` and `omitExtraData` are deliberately removed from `formProps`, so values from fields that get hidden are kept and submitted.
  - `experimental_defaultFormStateBehavior: { allOf: 'populateDefaults' }`.
- `hooks/useTemplateSchema.ts`: `useTemplateSchema(manifest)` maps each step through `extractSchemaFromStep`. It filters steps and top-level properties by `ui:backstage.featureFlag`, strips `title`, and returns `ParsedTemplateSchema {schema, uiSchema, mergedSchema, title, description}`. **Each step is parsed separately; nothing here reads form data.** It is a likely place for a cross-step condition resolver.
- `lib/schema.ts`: `extractSchemaFromStep(step)` deep-copies the step (flatted) and moves every `ui:*` key into a uiSchema. It walks `properties`, `items`, `anyOf`, `oneOf`, `allOf`, `dependencies`, `then` and `else`, but **not `if`**. It is exported from `/alpha` (see `report-alpha.api.md`).
- `hooks/useFilteredSchemaProperties.ts`: `backstage:featureFlag` filtering on the raw manifest. It also prunes `required` for removed keys, which is a model to follow for "hide removes required". Used by `components/Workflow/Workflow.tsx` before it renders `<Stepper>`.
- `hooks/useTransformSchemaToProps.ts`: swaps `ui:ObjectFieldTemplate` for a registered layout.
- `components/Stepper/createAsyncValidators.ts`: runs custom field validators per key of `formData`. It resolves the schema with `json-schema-library` Draft07 `getSchema({pointer, data: formData})`, so the full cross-step formData is already passed in.
- `components/ReviewState/ReviewState.tsx` and `util.ts`: the review page. `findSchemaForKey` resolves only `dependencies` keys from formState; `ui:backstage.review` options (`show`, `mask`, `name`, `explode`). Hidden fields would need excluding here.
- `components/Form/Form.tsx`: chooses the rjsf MUI or BUI theme.
- `hooks/useFormDataFromQuery.ts`: initial state comes from the `?formData=` query string.
- Public types: `src/types.ts` re-exports `TemplateParameterSchema`. FormProps are in `src/components/types.ts` and `src/extensions/rjsf.ts`.

### Can later steps see earlier answers today?

- **Data: yes.** All steps share `stepsState`. Each later step's `<Form>` gets the full accumulated formData, and custom fields see it through `formContext.formData`. The async validators also get the full formData.
- **Schema: no first-class support.** Each step's JSON Schema only declares that step's own properties. Same-step conditionals (JSON Schema `dependencies` with `oneOf`/`allOf` + `if`/`then`) are documented and tested (`Stepper.test.tsx` around L174, `useTemplateSchema.test.tsx` around L280).
- **Cross-step:** a root-level `if: {properties: {earlierField: {const: x}}}` in a later step may partly work by accident, because rjsf and ajv evaluate it against the full formData. This is undocumented and untested, there is no `required` pruning for it, the review page ignores it, and the backend validates each step on its own, so an earlier-step key may not be visible in a later step's subschema.
- Today's only declarative show/hide hooks are feature flags: `ui:backstage.featureFlag` and `backstage:featureFlag`.

### Docs

- `docs/features/software-templates/input-examples.md`: "Use parameters as conditional for fields" (L262) and "Multiple conditional fields with custom ordering" (L292). These cover the same step only, via `dependencies`/`allOf`/`if`/`then`.
- `docs/features/software-templates/writing-templates.md`: `spec.parameters` (L105), "Remove sections or fields based on feature flags" (L404).
- Also related: `ui-options-examples.md`, `writing-custom-field-extensions.md`, `writing-custom-step-layouts.md`.

### Tests to extend

`next/components/Stepper/Stepper.test.tsx` (924 lines, `renderInTestApp` + `SecretsContextProvider` + `fireEvent`/`act`), `next/hooks/useTemplateSchema.test.tsx` (`renderHook` + `TestApiProvider`/`mockApis` from `@backstage/frontend-test-utils`), `next/lib/schema.test.ts`, `next/components/ReviewState/util.test.ts`, and `next/hooks/useFilteredSchemaProperties.test.tsx`.
Run them with `CI=1 yarn test plugins/scaffolder-react/src/next`.
