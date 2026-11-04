## Conventions

- Write TSDoc in /** ... */ blocks starting with a one-sentence summary, followed by an optional @remarks section separated by a blank comment line.
- Format parameter tags as '@param <name> - <description>' with the hyphen required by TSDoc and no trailing period on single-sentence descriptions.
- Place @returns and @throws after @param tags, and place release tags (@public) last when applicable.
- Do not add @public or @alpha tags to interface properties or class methods because they inherit the release tag of their enclosing interface or class.
- Preserve the existing @public tag as the last tag on each top-level exported function in packages/catalog-model/src/entity/conditions.ts.
- Use {@link Symbol} or {@link https://...} for cross-references and wrap TSDoc lines at approximately 80 columns to match Prettier.
- Modify only /** ... */ TSDoc comments in the 15 TypeScript source files; never alter types, signatures, exports, release tags, copyright headers, or runtime code.

## Decisions

- Kind interface member TSDoc scope and kind field wording: Document only the 3 top-level members (apiVersion, kind, spec) on each of the 8 V1alpha1 kind interfaces without adding comments to nested spec properties, and state the literal kind value expected by the type and its schema validator without saying it is 'always' that value since is<Kind>Entity compares entity.kind.toUpperCase(). (not Adding TSDoc comments to nested properties inside spec; not Stating that kind is always the exact-case literal string) — Only the 3 top-level members are reported as undocumented by API Extractor, and Gate 1 explicitly decided against 'always' because the type guard narrows case-insensitively.
- Release tags on documented members, methods, and functions: Omit @public on interface properties and class methods while keeping @public as the final tag on the 8 top-level functions in conditions.ts. (not Adding @public to interface properties and class methods) — Interface members and class methods inherit their parent's release tag in API Extractor, matching Entity.ts and CommonValidatorFunctions.ts.
- API report regeneration: Leave packages/catalog-model/report.api.md and packages/catalog-model/report-alpha.api.md out of typed units so yarn build:api-reports regenerates them. (not Hand-editing report.api.md and report-alpha.api.md as spec units) — API reports are generated build outputs verified and updated by yarn build:api-reports.
- Changeset file path and content: Create .changeset/catalog-model-tsdoc.md with '@backstage/catalog-model': patch frontmatter and a concise adopter-facing summary that omits internal symbol names. (not Enumerating internal symbol names in the changeset) — Matches the allowlist glob .changeset/*catalog-model-tsdoc*.md and AC-5 requirements for adopter-facing release notes.

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
