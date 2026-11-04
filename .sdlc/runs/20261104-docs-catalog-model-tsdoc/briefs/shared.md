## Conventions

- Preserve existing Apache 2.0 license headers and copyright years unchanged on all existing files.
- Edit only TSDoc comments (/** ... */); never modify executable code, imports, exports, type signatures, parameter names, return types, or release tags (@public, @alpha, @deprecated).
- Follow @backstage/catalog-model TSDoc conventions: a summary sentence, optional @remarks block separated by blank lines, release tag (@public) on top-level exports, followed by @param <name> - <description> and @returns <description> on functions/methods, using {@link ...} for symbol references.
- Do not add release tags (@public or @alpha) to interface members or class methods whose enclosing interface or class already carries @public.
- Format modified files with yarn prettier --write; never run eslint --fix or hand-edit report*.api.md files.

## Decisions

- TSDoc block placement on conditions.ts type guards: Edit the existing single-tag /** @public */ block in place above each of the 8 exported type guard functions to include the summary, @public tag, @param entity, and @returns (not Adding a second doc comment block above /** @public */; not Removing the @public release tag) — API Extractor reads the single TSDoc comment block immediately preceding each exported declaration and requires the @public release tag to stay intact.
- TSDoc on *EntityV1alpha1 interface members: Add concise /** ... */ doc comments above apiVersion, kind, and spec on each *EntityV1alpha1 interface matching the style of Entity in src/entity/Entity.ts without adding release tags or nested spec property comments (not Adding @public tags to interface members; not Documenting nested fields inside spec) — Interface members inherit the release tag of their enclosing @public interface, and API Extractor only marks top-level apiVersion, kind, and spec as (undocumented) in report.api.md.
- TSDoc on EntityPolicy.enforce implementations and KubernetesValidatorFunctions static methods: Add /** ... */ doc comments with summary, @param, and @returns above each enforce method in src/entity/policies/*EntityPolicy.ts and each static method in KubernetesValidatorFunctions.ts accurately describing its runtime behavior (not Copying generic interface documentation without policy-specific or validator-specific details) — Requirements FR-10 through FR-15 and AC-3 require every TSDoc comment to state what the implementation in its source file actually does.
- Changeset bump level and scope: Create .changeset/catalog-model-tsdoc.md with '@backstage/catalog-model': patch and an adopter-facing summary of the TSDoc additions (not minor bump; not Omitting a changeset) — TSDoc comments ship in published .d.ts files without changing runtime behavior, and Gate 0 froze a patch changeset for @backstage/catalog-model.

## Files of this change

- `packages/catalog-model/src/entity/conditions.ts` (U01, edit)
- `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts` (U02, edit)
- `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts` (U03, edit)
- `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts` (U04, edit)
- `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts` (U05, edit)
- `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts` (U06, edit)
- `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts` (U07, edit)
- `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts` (U08, edit)
- `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts` (U09, edit)
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (U10, edit)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U11, edit)
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (U12, edit)
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (U13, edit)
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (U14, edit)
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (U15, edit)
- `.changeset/catalog-model-tsdoc.md` (U16, create)
