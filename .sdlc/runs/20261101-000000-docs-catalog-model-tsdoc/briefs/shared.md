## Conventions

- Comments only: a typed source file gains TSDoc lines at its sites and changes nothing else. No code, type, import, blank line or existing comment changes, and no copyright year changes.
- A site's rule gives the comment's text in labelled parts, in order: Summary, Remarks, @param, @returns, @throws. Type that text word for word, changing only the line breaks.
- The labels Summary and Remarks are not typed. Summary text is the plain description. Remarks text goes under a @remarks tag, written as in ComponentEntityV1alpha1.ts: a ` *` line, ` * @remarks`, a ` *` line, then the text.
- A ` *` line separates the description or remarks from the first @param, and @param, @returns and @throws sit on consecutive lines. `@param name - text` keeps its hyphen.
- A new member or method block is multi-line, at the indentation of the line it documents: `/**`, one or more ` * text` lines, ` */`. Wrap text at 80 columns including the indentation, as Entity.ts does. Prettier does not wrap comments.
- No release tag on a member or method block; it inherits from its class or interface. Only the conditions.ts blocks carry @public, on the line they already have.
- TSDoc markup characters (at sign, braces, angle brackets) appear only inside backticks, as they do in the site rules. Never write a star followed by a slash inside comment text, so comment text holds no regular expression.
- Wording follows docs/contribute/doc-style-guide.md: U.S. English, present tense, active voice, plain language, with code names in backticks.
- The changeset follows the existing .changeset files: single-quoted package name, one plain-language paragraph for adopters, no internal symbol names.

## Decisions

- Cross-references in new comments: Name symbols in backticks and write no {@link} tag (not {@link} to exported symbols) — An unresolved link adds a warning line to the API report, which NFR-4 and AC-2 forbid, and backticks carry the same meaning.
- Where the type and the JSON schema differ: The spec comment states what the JSON schema does and names the difference: User memberOf is required by the schema and optional in the type, and dependencyOf on Component and Resource is in the type but not in the schema (not Describing the type alone; not Changing the type to match the schema) — FR-2 requires agreement with the schema, the User tests reject a missing memberOf, and NFR-1 forbids a type change.
- Where the code and Kubernetes differ: Validator comments state the code's rules with no comparison to Kubernetes, for example isValidObjectName accepts upper case and underscores, and isValidAnnotationValue applies no size limit (not Quoting the Kubernetes documentation) — FR-3 says the comment states what the code does.
- API report regeneration (FR-5): No unit writes a report: the orchestrator regenerates both reports after the typed files are in. FR-5 appears in the covers of U15, the last source unit, only because finalize requires every FR id to be covered (not A typed unit; not A tooling unit) — Requirements FR-5 keeps the step out of the spec and a docs run holds no tooling unit. AC-1 and AC-2 are judged after that step, so they are not project checks.
- Lint command: The project check runs `yarn lint`, without --fix (not `yarn lint --fix`) — A check does not write files. A pass without --fix means `yarn lint --fix` has nothing to change, which satisfies AC-7.
- Changeset: Add one new patch changeset (not Reusing an existing changeset) — No .changeset markdown file names @backstage/catalog-model at the current HEAD, so nothing already covers this change.

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
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (U10, edit)
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (U11, edit)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U12, edit)
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (U13, edit)
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (U14, edit)
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (U15, edit)
- `.changeset/clear-catalog-model-docs.md` (U16, create)
