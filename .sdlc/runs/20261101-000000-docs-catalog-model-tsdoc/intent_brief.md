# Intent Brief — docs — TSDoc for undocumented @backstage/catalog-model public API

Status: approved at Gate 0, with auth mode `estimated`, policy `opus55-only`, and audience API consumers
(adopters and plugin authors). `.gitignore` stays unchanged; the final report must note that `.sdlc/` is not ignored.

`yarn build:api-reports` must be scoped to `packages/catalog-model`: the contract refuses writes to other packages'
reports.

## Context

The user's request, verbatim: "Write accurate TSDoc for the 45 undocumented exports of @backstage/catalog-model."

`packages/catalog-model` is at version 1.10.2. Its `report.api.md` has exactly 45 `(undocumented)` markers: 8 top-level
functions and 37 members.

- 8 `is*Entity` functions in `src/entity/conditions.ts`. Each already has a `/** @public */` block, which needs a
  description rather than a second comment.
- 24 `apiVersion`, `kind` and `spec` members across the 8 kind interfaces in `src/kinds/*EntityV1alpha1.ts`.
- 8 `KubernetesValidatorFunctions.isValid*` static methods in `src/validation/KubernetesValidatorFunctions.ts`.
- 5 `enforce` methods on the policy classes in `src/entity/policies/`.

`report-alpha.api.md` has 25 more. 3 overlap with the 45 because `src/alpha.ts` re-exports `ApiEntityV1alpha1`.

Baseline before the run: `CI=1 yarn test packages/catalog-model` passes, 64 suites and 893 tests.

## Goal

Every one of the 45 entries has TSDoc that states what the code actually does, so `report.api.md` has no
`(undocumented)` markers left.

## Files in scope

- `packages/catalog-model/src/entity/conditions.ts`
- `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts`
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts`
- `packages/catalog-model/report.api.md` (regenerated with `yarn build:api-reports`, never hand-edited)
- `packages/catalog-model/report-alpha.api.md` (regenerated, same rule)
- `.changeset/*.md` (one new patch changeset for `@backstage/catalog-model`)

## Files off-limits

- Project defaults from `.sdlc/project.json`.
- AI configs: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`,
  `plugins/catalog-backend/CLAUDE.md`.
- `docs/releases/**`, and ESLint, Prettier and TypeScript configuration.
- Every other `report*.api.md` and `knip-report.md`.
- Test files, and any file not listed under "Files in scope".

## Acceptance criteria

- `report.api.md` has 0 `(undocumented)` markers.
- The only changes to `report.api.md` are removed markers; no exported signature changes.
- The source diff contains comments only, with no executable or type change.
- Each comment is verified against the implementation, schema or tests. Validator comments state the actual rules.
- Each `is*Entity` description states the check the function performs.
- Wording follows `docs/contribute/doc-style-guide.md` and the surrounding TSDoc in each file.
- `CI=1 yarn test packages/catalog-model`, `yarn tsc`, and `yarn lint --fix` pass.
- A changeset covers `@backstage/catalog-model` at `patch`, written for adopters without internal symbol names.

## Non-goals

- The 22 entries that only appear in `report-alpha.api.md`.
- Rewriting existing TSDoc, even where it could be better.
- Changes to `/docs`, the README, or any other package.
- Any behaviour, type, or test change.
