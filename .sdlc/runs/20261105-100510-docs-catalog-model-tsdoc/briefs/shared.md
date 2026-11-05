## Conventions

- Use multi-line `/** ... */` TSDoc blocks for all added or updated documentation comments; never modify executable statements, type declarations, imports, exports, or existing Apache-2.0 license headers and copyright years.
- Never add `@public` or `@alpha` release tags to interface properties or class methods; release tags belong only on top-level exported declarations.
- Format parameter tags with a hyphen separator (`@param <name> - <description>`) and place `@param` after `@public` on top-level functions (matching `packages/catalog-model/src/entity/ref.ts`) or at the end of the method TSDoc block on class methods (matching `packages/catalog-model/src/validation/CommonValidatorFunctions.ts`).
- Write U.S. English prose in present tense and active voice per `docs/contribute/doc-style-guide.md`, wrapping inline code and field names in backticks and avoiding Latin abbreviations (`e.g.`, `i.e.`).
- Format all modified TypeScript and Markdown files with Prettier (`yarn prettier --write`).

## Decisions

- Entity kind type guard TSDoc structure in `src/entity/conditions.ts`: Expand each existing `/** @public */` comment in place into a single multi-line TSDoc block containing a summary sentence noting case-insensitive `entity.kind` matching, followed by `@public` and `@param entity - The entity to check`. (not Adding a second TSDoc block above `/** @public */`; not Omitting `@param entity` or case-insensitivity details) — API Extractor attaches only the immediately preceding TSDoc block to the export, and existing functions in `src/entity/ref.ts` place summary first, then `@public`, then `@param`.
- Class method TSDoc structure in `src/validation/KubernetesValidatorFunctions.ts`: Add a multi-line TSDoc block above each of the 8 static methods with a summary sentence starting with `Checks that the value is ...` that states the exact validation rule and `@param value - The value to check`, with no release tag. (not Adding `@public` to static class methods; not Generic summaries that omit length or character-set rules) — Matches `CommonValidatorFunctions` in the same directory and satisfies API Extractor rules plus NFR-3 accuracy.
- Policy `enforce` method TSDoc in `src/entity/policies/*EntityPolicy.ts`: Add a multi-line `/** ... */` block containing `{@inheritDoc EntityPolicy.enforce}` above `async enforce(entity: Entity): Promise<Entity>` in each of the 5 policy classes, with no release tag. (not Duplicating custom prose across all 5 `enforce` methods; not Single-line `/** {@inheritDoc EntityPolicy.enforce} */`) — All 5 classes implement `EntityPolicy.enforce`, NFR-2 requires multi-line `/** ... */` blocks and `{@inheritDoc ...}` where appropriate, and API Extractor resolves `{@inheritDoc EntityPolicy.enforce}` cleanly.
- Kind interface member TSDoc in `src/kinds/*EntityV1alpha1.ts`: Add summary-only multi-line `/** ... */` blocks (no release tags) to `apiVersion`, `kind`, and `spec` on all 8 `*EntityV1alpha1` interfaces, aligning wording with `Entity` (`src/entity/Entity.ts`) and each kind's JSON schema (`src/schema/kinds/<Kind>.v1alpha1.schema.json`). (not Adding `@public` on interface members; not Using `{@inheritDoc Entity.apiVersion}` on narrowed literal properties) — Follows `Entity` and `EntityMeta` member TSDoc style in `src/entity/Entity.ts` and provides kind-specific context from the JSON schemas.
- API report regeneration for `report.api.md` and `report-alpha.api.md`: Do not include `report.api.md` or `report-alpha.api.md` as typed units; let the Gate 0 test command (`yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md`) regenerate them after source comments land. (not Hand-editing `report.api.md` and `report-alpha.api.md` as units) — FR-5 and Gate 0 forbid hand-editing API Extractor reports and require regeneration exclusively via `yarn build:api-reports`.
- Changeset file for `@backstage/catalog-model`: Create `.changeset/catalog-model-tsdoc-comments.md` with a `patch` bump for `@backstage/catalog-model` and a concise adopter-facing summary of the TSDoc improvements. (not Omitting a changeset; not Listing raw internal file paths or all 45 symbol names in the changeset) — Satisfies FR-6 and NFR-6 for a published package (`@backstage/catalog-model`).

## Files of this change

- `packages/catalog-model/src/entity/conditions.ts` (U01, edit)
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (U02, edit)
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (U03, edit)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U04, edit)
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (U05, edit)
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (U06, edit)
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (U07, edit)
- `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts` (U08, edit)
- `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts` (U09, edit)
- `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts` (U10, edit)
- `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts` (U11, edit)
- `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts` (U12, edit)
- `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts` (U13, edit)
- `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts` (U14, edit)
- `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts` (U15, edit)
- `.changeset/catalog-model-tsdoc-comments.md` (U16, create)
