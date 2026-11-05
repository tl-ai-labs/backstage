# Discovery: 20261105-100510-docs-catalog-model-tsdoc

Mode: first-time (Tier 1 full scan). Built 2026-11-05. Intent: docs. Write TSDoc for the 45 undocumented exports of `@backstage/catalog-model`.

## Git state
- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-DOC-04/argon4-plus-flash38`. Working tree clean.
- This is a **git worktree** (common dir `/Users/macbook/Documents/GitHub/backstage/.git`). Its toplevel matches cwd.
- Remote: `origin` git@github.com:tl-ai-labs/backstage.git
- `.gitignore` does **not** list `.sdlc/`. It is ignored anyway through the shared `.git/info/exclude` (line 7), and `git check-ignore` confirms this.

## Topology
Yarn-workspaces monorepo (`packages/*`, `plugins/*`) with 74 packages, 162 plugins and 12,364 tracked files. Other top-level dirs: `docs/`, `docs-ui/`, `microsite/`, `beps/`, `contrib/`, `scripts/`, `workspaces/ui`, `.changeset/`, `.patches/`, `.storybook/`.
Target package `packages/catalog-model` has 242 tracked files and 64 test files. Its entry points are `src/index.ts` (public) and `src/alpha.ts` (`./alpha`).

## Detected stacks
- `package.json` gives node-typescript (TypeScript ~5.7, Node 22 || 24, yarn@4.18.1). Frameworks: Backstage (React frontend / Node backend), Jest 30, API Extractor 7.57.3 via `@backstage/repo-tools`, and Changesets (pre mode, tag `next`).
- No pre-authored adapter matches this stack. The stack profile is written to `.sdlc/baseline/stack-profile.md`.

## Test / build commands (Gate 0 confirms)
- Test: `CI=1 yarn test packages/catalog-model` (source: `.claude/CLAUDE.md` Development Flow; root `scripts.test` = `backstage-cli repo test`). Always pass a path.
- Type-check: `yarn tsc` (root only, no options).
- API reports: `yarn build:api-reports`. It regenerates `packages/catalog-model/report.api.md`, and TSDoc on members removes their `// (undocumented)` markers.
- Forbidden: `yarn build`, `yarn changesets version`, `yarn release`.

## Docs present
README.md (plus fr/ja/ko/zh translations), `.claude/CLAUDE.md`, `AGENTS.md`, CONTRIBUTING.md, STYLE.md, REVIEWING.md, SECURITY.md, `docs/architecture-decisions/` (17 ADRs), `docs/contribute/doc-style-guide.md`, `packages/catalog-model/README.md`.

## Detected AI/agent setup
- `.claude/CLAUDE.md`: project Claude instructions (competing AI config, binding repo rules)
- `.claude/settings.local.json` (gitignored), `.claude/skills/` (catalog-db-performance, backstage-release-notes)
- `AGENTS.md`: same content as CLAUDE.md, with Cursor `alwaysApply` front-matter
- `.cursor/rules/`: backstage-project.mdc, tests/test-utils.mdc, tests/backend-test-utils.mdc
- `.github/copilot-instructions.md`
- None found: `.mcp.json`, `.cursorrules`, Aider, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini config files.

## Env keys
No `.env*` files exist. The code references 136 distinct `process.env.*` names repo-wide (names only, in baseline.json). `packages/catalog-model` references none.

## Monorepo / submodules / LFS / infra
- Monorepo: yarn workspaces (no pnpm/nx/turbo/lerna/rush). Per-package test: `CI=1 yarn test <pkg-path>`.
- Submodules: none (no `.gitmodules`). LFS: none (no `.gitattributes`).
- Infra: `packages/backend/Dockerfile`, `.devcontainer/Dockerfile`, `docker-compose.deps.yml`, 49 GitHub workflows. No Terraform, GitLab CI or CircleCI.

## Regulated-repo signals
- `SECURITY.md` at the repo root. This is a standard OSS security-disclosure policy. No HIPAA/PCI/SOC2/compliance dirs, and CODEOWNERS has no security, compliance, privacy or legal team entries. Warning flag set (`regulated_repo_warning_required: true`). Low real risk for a TSDoc run.

## Coexistence risks
- You have Cursor rules at `.cursor/rules/`. The plugin will never touch them, but if you have Cursor's auto-lint running on save, changes we make may trigger it.
- `.claude/CLAUDE.md`, `AGENTS.md` and `.github/copilot-instructions.md` carry repo rules that apply to this run. Do not update copyright years on existing files. Changesets are required for published-package changes. Follow `docs/contribute/doc-style-guide.md`. Never edit ESLint/Prettier/TS config. Never touch `docs/releases`.
- Your `.gitignore` doesn't cover `.sdlc/`. Run artifacts under `.sdlc/` (packets, backups, telemetry) are protected only by the shared `.git/info/exclude` of the main clone. They will stay ignored unless that file changes. Gate 0 may offer to add `.gitignore` to the allowlist, but that is not recommended here because it would add an unrelated diff to an upstream-style PR.
- Husky + lint-staged are active. A commit runs eslint/prettier on staged `.ts` files and `check-docs-quality` on `.md` files.

## Changeset relevance
`@backstage/catalog-model` is version **1.10.2**, published (`publishConfig.access: public`, not private). Changesets are in pre mode (tag `next`). No existing `.changeset/*.md` names `@backstage/catalog-model`. Per CLAUDE.md, TSDoc-only changes to a published package change its published typings and docs, so a `patch` changeset is needed for release coverage. Gate 0 / architect should confirm.

## ae-undocumented handling
The API Extractor config does **not** treat ae-undocumented as a warning. The root script `build:api-reports:only` passes `-o ae-undocumented,ae-wrong-input-file-type`, which sets the API Extractor `logLevel: none` (packages/repo-tools/src/commands/api-reports/api-reports/runApiExtraction.ts:151-155). So no `Warning: (ae-undocumented)` lines appear. Undocumented items show up only as `// (undocumented)` comments in the report.

## Undocumented exports (report.api.md: 45 markers)
The source of the count is `packages/catalog-model/report.api.md`, 45 `// (undocumented)` markers. A TypeScript-compiler cross-check over `src/index.ts` found the same 45 items. The 8 `is*Entity` functions have a TSDoc block holding only `@public` with no summary. Everything else has no comment at all.

| Symbol | File:line (packages/catalog-model/) |
|---|---|
| ApiEntityV1alpha1.apiVersion | src/kinds/ApiEntityV1alpha1.ts:32 |
| ApiEntityV1alpha1.kind | src/kinds/ApiEntityV1alpha1.ts:33 |
| ApiEntityV1alpha1.spec | src/kinds/ApiEntityV1alpha1.ts:34 |
| ComponentEntityV1alpha1.apiVersion | src/kinds/ComponentEntityV1alpha1.ts:32 |
| ComponentEntityV1alpha1.kind | src/kinds/ComponentEntityV1alpha1.ts:33 |
| ComponentEntityV1alpha1.spec | src/kinds/ComponentEntityV1alpha1.ts:34 |
| DomainEntityV1alpha1.apiVersion | src/kinds/DomainEntityV1alpha1.ts:32 |
| DomainEntityV1alpha1.kind | src/kinds/DomainEntityV1alpha1.ts:33 |
| DomainEntityV1alpha1.spec | src/kinds/DomainEntityV1alpha1.ts:34 |
| GroupEntityV1alpha1.apiVersion | src/kinds/GroupEntityV1alpha1.ts:28 |
| GroupEntityV1alpha1.kind | src/kinds/GroupEntityV1alpha1.ts:29 |
| GroupEntityV1alpha1.spec | src/kinds/GroupEntityV1alpha1.ts:30 |
| LocationEntityV1alpha1.apiVersion | src/kinds/LocationEntityV1alpha1.ts:28 |
| LocationEntityV1alpha1.kind | src/kinds/LocationEntityV1alpha1.ts:29 |
| LocationEntityV1alpha1.spec | src/kinds/LocationEntityV1alpha1.ts:30 |
| ResourceEntityV1alpha1.apiVersion | src/kinds/ResourceEntityV1alpha1.ts:32 |
| ResourceEntityV1alpha1.kind | src/kinds/ResourceEntityV1alpha1.ts:33 |
| ResourceEntityV1alpha1.spec | src/kinds/ResourceEntityV1alpha1.ts:34 |
| SystemEntityV1alpha1.apiVersion | src/kinds/SystemEntityV1alpha1.ts:32 |
| SystemEntityV1alpha1.kind | src/kinds/SystemEntityV1alpha1.ts:33 |
| SystemEntityV1alpha1.spec | src/kinds/SystemEntityV1alpha1.ts:34 |
| UserEntityV1alpha1.apiVersion | src/kinds/UserEntityV1alpha1.ts:28 |
| UserEntityV1alpha1.kind | src/kinds/UserEntityV1alpha1.ts:29 |
| UserEntityV1alpha1.spec | src/kinds/UserEntityV1alpha1.ts:30 |
| DefaultNamespaceEntityPolicy.enforce | src/entity/policies/DefaultNamespaceEntityPolicy.ts:34 |
| FieldFormatEntityPolicy.enforce | src/entity/policies/FieldFormatEntityPolicy.ts:43 |
| GroupDefaultParentEntityPolicy.enforce | src/entity/policies/GroupDefaultParentEntityPolicy.ts:51 |
| NoForeignRootFieldsEntityPolicy.enforce | src/entity/policies/NoForeignRootFieldsEntityPolicy.ts:34 |
| SchemaValidEntityPolicy.enforce | src/entity/policies/SchemaValidEntityPolicy.ts:38 |
| isApiEntity | src/entity/conditions.ts:32 |
| isComponentEntity | src/entity/conditions.ts:38 |
| isDomainEntity | src/entity/conditions.ts:44 |
| isGroupEntity | src/entity/conditions.ts:50 |
| isLocationEntity | src/entity/conditions.ts:56 |
| isResourceEntity | src/entity/conditions.ts:62 |
| isSystemEntity | src/entity/conditions.ts:68 |
| isUserEntity | src/entity/conditions.ts:74 |
| KubernetesValidatorFunctions.isValidApiVersion | src/validation/KubernetesValidatorFunctions.ts:29 |
| KubernetesValidatorFunctions.isValidKind | src/validation/KubernetesValidatorFunctions.ts:38 |
| KubernetesValidatorFunctions.isValidObjectName | src/validation/KubernetesValidatorFunctions.ts:47 |
| KubernetesValidatorFunctions.isValidNamespace | src/validation/KubernetesValidatorFunctions.ts:56 |
| KubernetesValidatorFunctions.isValidLabelKey | src/validation/KubernetesValidatorFunctions.ts:60 |
| KubernetesValidatorFunctions.isValidLabelValue | src/validation/KubernetesValidatorFunctions.ts:69 |
| KubernetesValidatorFunctions.isValidAnnotationKey | src/validation/KubernetesValidatorFunctions.ts:75 |
| KubernetesValidatorFunctions.isValidAnnotationValue | src/validation/KubernetesValidatorFunctions.ts:84 |

Groups: 8 kind interfaces × 3 fields (apiVersion/kind/spec) = 24; 5 EntityPolicy `enforce` methods; 8 `is*Entity` type guards; 8 `KubernetesValidatorFunctions` static methods. The public aliases (`ApiEntity`, `ComponentEntity`, …) resolve to these same declarations, so documenting the V1alpha1 interface covers both.

Out of scope: `report-alpha.api.md` has 25 more markers. 6 are the ApiEntityV1alpha1 duplicates; the other 19 are alpha-only (AiResource* specs, McpServerApiEntity.spec, CatalogModelKindRootSchema.* never-fields and index signature, CatalogModelLayer.$$type, CatalogModelSourceReadOptions.signal, CatalogModelKindRelationFieldDefinition).

## Proposed off-limits
`.env`, `.env.*`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `.next/**`, `target/**`, `vendor/**`, `.yarn/**`, `.git/**`, `.sdlc/**`, `docs/releases/**`, `**/report.api.md` / `**/report-*.api.md` / `**/knip-report.md` (generated, regenerate via tooling only), `**/CHANGELOG.md`.
Expected write scope for this intent: the 13 source files in the table plus one new `.changeset/*.md`. `report.api.md` changes only through `yarn build:api-reports`.
