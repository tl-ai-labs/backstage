# Requirements — TSDoc for `@backstage/catalog-model`

## In scope

1. Add TSDoc summaries (and `@param` tags) to the 8 exported entity kind type guards (`isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity`) in `packages/catalog-model/src/entity/conditions.ts`.
2. Add TSDoc comments (summaries and `@param value - ...` tags) to the 8 static validation methods on `KubernetesValidatorFunctions` in `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`.
3. Add TSDoc comments to the 5 `enforce` methods on `DefaultNamespaceEntityPolicy`, `FieldFormatEntityPolicy`, `GroupDefaultParentEntityPolicy`, `NoForeignRootFieldsEntityPolicy`, and `SchemaValidEntityPolicy` under `packages/catalog-model/src/entity/policies/`.
4. Add TSDoc member summaries to `apiVersion`, `kind`, and `spec` (24 interface members total) across the 8 kind interfaces (`ApiEntityV1alpha1`, `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`, `GroupEntityV1alpha1`, `LocationEntityV1alpha1`, `ResourceEntityV1alpha1`, `SystemEntityV1alpha1`, `UserEntityV1alpha1`) under `packages/catalog-model/src/kinds/`.
5. Regenerate `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md` via `yarn build:api-reports` so that `packages/catalog-model/report.api.md` contains zero `// (undocumented)` markers (and `report-alpha.api.md` loses the 6 duplicate `ApiEntityV1alpha1` undocumented markers).
6. Add a single `patch` changeset file `.changeset/<name>.md` for `@backstage/catalog-model`.

## Out of scope

1. The 19 alpha-only undocumented symbols in `packages/catalog-model/report-alpha.api.md` (`AiResource*`, `McpServerApiEntity.spec`, `CatalogModelKindRootSchema.*`, `CatalogModelLayer.$$type`, `CatalogModelSourceReadOptions.signal`, `CatalogModelKindRelationFieldDefinition`).
2. Modifying existing TSDoc on already-documented symbols, `packages/catalog-model/README.md`, `/docs/**`, or `docs/releases/**`.
3. Any runtime code, type signature, import, or behavior changes in `@backstage/catalog-model`.
4. Updating `report*.api.md` in any package other than `packages/catalog-model`, or editing any `CHANGELOG.md` or `knip-report.md`.
5. Touching off-limits paths: `.env*`, `.mcp.json`, `node_modules/**`, `dist/**`, `.sdlc/**`, `.git/**`, `.gitignore`, `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`.

## Functional requirements per module

- **FR-1 (`src/entity/conditions.ts` — 8 entity type guards)**: Insert a concise summary sentence and `@param entity - ...` inside each existing `/** @public */` TSDoc block (above `@public`, without creating a second block) for `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, and `isUserEntity`, accurately noting case-insensitive matching against `entity.kind`.
- **FR-2 (`src/validation/KubernetesValidatorFunctions.ts` — 8 static validator methods)**: Add a multi-line TSDoc comment with a summary sentence and `@param value - The value to check` (no release tag on class members) to `isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`, `isValidLabelValue`, `isValidAnnotationKey`, and `isValidAnnotationValue`, accurately reflecting each method's actual validation rules.
- **FR-3 (`src/entity/policies/*EntityPolicy.ts` — 5 policy `enforce` methods)**: Add TSDoc comments (using `{@inheritDoc EntityPolicy.enforce}` or matching `EntityPolicy.enforce`'s summary and `@param entity - ...` contract without a member release tag) to `enforce` in:
  - `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts`
  - `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts`
  - `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts`
  - `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts`
  - `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts`
- **FR-4 (`src/kinds/*EntityV1alpha1.ts` — 24 kind interface members)**: Add summary-only multi-line TSDoc blocks (no release tags on interface members) to `apiVersion`, `kind`, and `spec` in:
  - `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts`
  - `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts`
  Wording must align with `Entity` member conventions and the corresponding `src/schema/kinds/<Kind>.v1alpha1.schema.json` descriptions.
- **FR-5 (`packages/catalog-model/report.api.md` & `report-alpha.api.md` — API reports)**: Regenerate API reports exclusively by running `yarn build:api-reports` (never hand-editing report files). Note that `yarn build:api-reports` runs repo-wide across all packages, while only `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md` are in the write contract; if any other package's report changes during regeneration, revert/do not write those out-of-scope files and report the discrepancy.
- **FR-6 (`.changeset/<new>.md` — patch changeset)**: Create a single changeset file declaring a `patch` bump for `@backstage/catalog-model` with a brief, adopter-facing summary of the documentation improvements.

## Non-functional requirements

- **NFR-1 (Comments-only, zero runtime impact)**: Only JSDoc/TSDoc comments may be added in the 15 TypeScript source files; no executable statements, type declarations, imports, or exports may change.
- **NFR-2 (Package TSDoc style compliance)**: Follow `@backstage/catalog-model` conventions: multi-line `/** ... */` blocks, summary-only comments on interface/class members with no `@public`/`@alpha` release tags on members, hyphenated `@param <name> - <description>` tags on methods/functions, and `{@inheritDoc ...}` where appropriate.
- **NFR-3 (Implementation accuracy)**: Every TSDoc description must match the actual code behavior (e.g., exact character set/length constraints in `KubernetesValidatorFunctions`, case-insensitive `kind` comparison in `conditions.ts`, and schema definitions in `src/schema/kinds/*.schema.json`).
- **NFR-4 (License headers preserved)**: Keep existing Apache 2.0 headers and their `Copyright 20XX The Backstage Authors` years completely untouched.
- **NFR-5 (Formatting)**: Run `yarn prettier --write` only on the modified files; follow `docs/contribute/doc-style-guide.md`.
- **NFR-6 (Changeset prose)**: Write the changeset for adopters describing the outcome (improved TSDoc coverage for `@backstage/catalog-model` exports) without listing raw internal file paths or code symbol dumps.

## PII inventory

None. This is a documentation-only change to open-source TypeScript type definitions and validators; no PII fields are processed, stored, or exposed.

| Field | Sensitivity | Protection |
| --- | --- | --- |
| None | N/A | N/A |

## Role matrix

Not applicable. `@backstage/catalog-model` is a common library package of data types and validation functions with no authentication, authorization, or role-based access control.

## Acceptance criteria

1. **AC-1 (Gate 0 API report verification)**: Running the Gate 0 test command verbatim succeeds with exit code 0:
   ```sh
   yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md
   ```
2. **AC-2 (Report diff cleanliness)**: `packages/catalog-model/report.api.md` differs from `HEAD` only by the removal of the 45 `// (undocumented)` markers, and `packages/catalog-model/report-alpha.api.md` differs only by the removal of the 6 `ApiEntityV1alpha1` `// (undocumented)` markers.
3. **AC-3 (Typecheck)**: `yarn tsc` exits with code 0.
4. **AC-4 (Unit tests)**: `CI=1 yarn test packages/catalog-model` exits with code 0 with all tests passing.
5. **AC-5 (Formatting check)**: `yarn prettier --check` passes on all modified files.
6. **AC-6 (Write contract enforcement)**: `git status --porcelain` shows modifications/additions only within the frozen allowlist:
   - `packages/catalog-model/src/entity/conditions.ts`
   - `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`
   - `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts`
   - `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts`
   - `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts`
   - `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts`
   - `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts`
   - `packages/catalog-model/src/kinds/{Api,Component,Domain,Group,Location,Resource,System,User}EntityV1alpha1.ts`
   - `packages/catalog-model/report.api.md`
   - `packages/catalog-model/report-alpha.api.md`
   - `.changeset/<new>.md` (single new file)
   Any incidental changes to other packages' `report*.api.md` produced by `yarn build:api-reports` are not written/left dirty in the working tree and are only noted in reporting if observed.

## Open questions for HITL

None. All scope,changesets, test commands, and write-contract boundaries were resolved at Gate 0.
