# Intent Brief — docs — TSDoc for the 45 undocumented items in @backstage/catalog-model

## Context

`@backstage/catalog-model` (packages/catalog-model, v1.10.2, common-library) defines what a catalog
entity is (kinds such as Component, API, Group), how references such as `component:default/foo` are
parsed, and how entities are validated. `packages/catalog-model/report.api.md` carries exactly 45
`// (undocumented)` markers:

- 24 kind-interface fields — `apiVersion`, `kind`, `spec` on each of `ApiEntityV1alpha1`,
  `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`, `GroupEntityV1alpha1`, `LocationEntityV1alpha1`,
  `ResourceEntityV1alpha1`, `SystemEntityV1alpha1`, `UserEntityV1alpha1` (src/kinds/\*EntityV1alpha1.ts)
- 8 type guards — `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`,
  `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity` (src/entity/conditions.ts;
  each carries only `@public`)
- 8 static methods on `KubernetesValidatorFunctions` — `isValidApiVersion`, `isValidKind`,
  `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`, `isValidLabelValue`,
  `isValidAnnotationKey`, `isValidAnnotationValue` (src/validation/KubernetesValidatorFunctions.ts)
- 5 `enforce` methods — `DefaultNamespaceEntityPolicy`, `FieldFormatEntityPolicy`,
  `GroupDefaultParentEntityPolicy`, `NoForeignRootFieldsEntityPolicy`, `SchemaValidEntityPolicy`
  (src/entity/policies/\*.ts)

## Goal

Add accurate TSDoc to each of the 45 items, in place in the package source, then regenerate the API
reports. Audience: plugin authors and other engineers who build against the entity model. Match the
TSDoc style the package already uses. Accuracy over volume: describe what the code does (e.g. the
guards compare `entity.kind` case-insensitively; `enforce` behaviour per policy as implemented), not
what the name suggests. Keep existing release tags (`@public`) unchanged.

## Files in scope

- packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts
- packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts
- packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts
- packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts
- packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts
- packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts
- packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts
- packages/catalog-model/src/kinds/UserEntityV1alpha1.ts
- packages/catalog-model/src/entity/conditions.ts
- packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts
- packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts
- packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts
- packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts
- packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts
- packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts
- packages/catalog-model/report.api.md (regenerated, companion)
- packages/catalog-model/report-alpha.api.md (regenerated, companion — the alpha entry point re-exports the kind interfaces)
- .changeset/catalog-model-tsdoc.md (new patch changeset — TSDoc ships in the published type declarations)

## Files off-limits

- Everything else, including all other packages, packages/catalog-model tests, runtime code paths
  (comment-only edits), docs/releases/\*\*, ESLint/Prettier/TypeScript configs
- Project defaults from .sdlc/project.json and detected AI configs (.claude/\*\*, CLAUDE.md, etc.)

## Acceptance criteria

- `yarn build:api-reports` passes.
- `packages/catalog-model/report.api.md` contains zero `(undocumented)` markers.
- Diff to `src/` is comment-only (no code, signature, or release-tag changes); each comment is
  verified against the implementation it describes.
- New comments follow the package's existing TSDoc voice and the doc style guide.
- `CI=1 yarn test packages/catalog-model` still passes.

## Non-goals

- The 25 `(undocumented)` markers in `report-alpha.api.md` that are not re-exports of the 45 items
  above (AI resource kinds, McpServerApiEntity, CatalogModelKindRootSchema, etc.).
- Nested `spec.*` sub-fields not flagged by the report.
- README or /docs changes.

## Gate 0 decisions (approved 2026-10-29)

- Stack: node-typescript (Yarn 4 workspaces monorepo).
- Test command: `CI=1 yarn test packages/catalog-model`; also `yarn tsc` (repo root, no options) and `yarn build:api-reports`.
- Auth mode: estimated. Policy: opus55-plus-sonnet55 (project default).
- Allowlist frozen as listed under "Files in scope" (18 paths). report\*.api.md change only by running `yarn build:api-reports`.
- Off-limits: project defaults + detected AI configs (.claude/**, AGENTS.md, plugins/catalog-backend/CLAUDE.md, .cursor/rules/**, .github/copilot-instructions.md) + dist-types, .yarn, docs/releases, CHANGELOG.md, knip-report.md, lint/prettier/tsconfig files, .gitignore.
- `.gitignore` not updated for `.sdlc/` (user declined); note it in the final report.
- Regulated-repo signal (SECURITY.md only) treated as not regulated.
- No commits; never use `git stash` (shared stash stack across worktrees). Never run `yarn build`, release, or the changeset CLI.
