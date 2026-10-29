## Conventions

- Every edit to packages/catalog-model/src is comment-only: add lines inside new or existing /\*_ ... _/ blocks; never change, move or delete a code line, an import, an existing comment line, or a release tag.
- Never add a blank line outside a comment block (no blank line between interface members or class members), so every added line of the src diff is /\*_, a ' _ ...' line, or ' \*/'.
- TSDoc blocks are always multi-line: '/\*_' on its own line, one ' _ ' prefix per line, ' \*/' on its own line, indented to the member they document (2 spaces inside an interface or class, 0 at top level).
- Wrap comment prose at about 80 columns; prettier (singleQuote, trailingComma all, arrowParens avoid; config at packages/cli/config/prettier.json) does not rewrap comments.
- Summaries are one or two short sentence-case sentences ending with a period, in present tense and active voice, describing what the code does, never what the name suggests (doc style guide at docs/contribute/doc-style-guide.md).
- Tag order inside a block: summary, blank ' _' line, optional '@remarks' section (tag line, blank ' _' line, prose), blank ' \*' line, '@param <name> - <Description>' lines, '@returns <description>', '@throws <description>' when it throws, then any existing release tag last.
- Parameter lines use the package form '@param value - The value to check' (name, space, hyphen, space, capitalised description, no trailing period).
- Wrap literal values, field paths and code fragments in backticks (for example `backstage.io/v1alpha1`, `metadata.namespace`, `true`); use {@link Symbol} only for symbols exported from the package entry point (src/index.ts), such as {@link ApiEntityV1alpha1} or {@link CommonValidatorFunctions.isValidDnsSubdomain}.
- Do not name internal, non-exported helpers or private fields in a comment (for example the local require/optional functions in FieldFormatEntityPolicy, or private fields such as parentRef).
- Do not touch copyright headers; new non-source files (the changeset) carry none.
- report.api.md and report-alpha.api.md are never typed: the api-reports project check regenerates them after the last unit.

## Decisions

- How the API reports are regenerated: The first project check runs `yarn build:api-reports packages/catalog-model`, which regenerates report.api.md and report-alpha.api.md for this package only; the second asserts no `(undocumented)` marker remains in report.api.md. (not unscoped `yarn build:api-reports`; not a tooling unit; not hand-editing the reports) — The unscoped run may rewrite other packages' reports, which are off-limits; a docs run holds no tooling unit; Gate 0 allows the reports to change only through the tool.
- Release tag position in the type guard blocks: New lines go between the existing '/**' line and the existing ' \* @public' line, so @param and @returns come before @public and @public stays last and unchanged. (not @public first, then @param/@returns as in entity/ref.ts) — FR-4 requires the existing @public tag to stay unchanged and last, and inserting after '/**' keeps the diff additions-only.
- Link targets for kind types: Link to the V1alpha1 interface name ({@link ApiEntityV1alpha1}, {@link ComponentEntityV1alpha1}, and so on), never the ApiEntity-style alias. (not {@link ApiEntity}) — The report prints guard return types as the V1alpha1 interfaces, and those names are exported from both entry points.
- Required versus optional wording in spec comments: Required/optional wording follows the TypeScript type (a field without ? is required, a field with ? is optional); where the kind JSON schema disagrees with the type (User `memberOf` is optional in the type but required by the schema) the comment names the field without calling it required or optional. (not follow the JSON schema; not follow the type and ignore the schema) — FR-3 forbids contradicting the type, and NFR-3 forbids a statement the schema makes false.
- Shape of the enforce method comments: Each enforce block has a summary, an optional @remarks section for detail, '@param entity - ...', '@returns ...', and '@throws ...' only when the method body or an operation it performs throws. (not {@inheritDoc EntityPolicy.enforce}; not summary only) — FR-6 asks for policy-specific return and throw behaviour, which the inherited generic text in entity/policies/types.ts does not give.

## Files of this change

- `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts` (U01, edit)
- `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts` (U02, edit)
- `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts` (U03, edit)
- `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts` (U04, edit)
- `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts` (U05, edit)
- `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts` (U06, edit)
- `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts` (U07, edit)
- `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts` (U08, edit)
- `packages/catalog-model/src/entity/conditions.ts` (U09, edit)
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (U10, edit)
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (U11, edit)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U12, edit)
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (U13, edit)
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (U14, edit)
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (U15, edit)
- `.changeset/catalog-model-tsdoc.md` (U16, create)
