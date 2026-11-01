# Requirements — docs — TSDoc for undocumented @backstage/catalog-model exports

Run: `20261101-153026-docs-catalog-model-tsdoc` · job: `docs` · base commit `f20fd9b59828`

Authoritative target: the 45 `(undocumented)` markers in `packages/catalog-model/report.api.md`
(verified by `grep -c "(undocumented)"` = 45). They fall in four groups across 15 source files. The
intent brief's mention of `Validators` members, `CompoundEntityRef` fields and
`groupEntityV1alpha1Validator` does not match the report: none of those carry a marker in
`report.api.md`, so they are not targets of this run.

## In scope

1. TSDoc comments added in place, above the flagged declarations, in the source files listed under FR-1 to FR-4.
2. A new changeset `.changeset/catalog-model-tsdoc.md` (`'@backstage/catalog-model': patch`).
3. Regenerating `report.api.md` / `report-alpha.api.md` with `yarn build:api-reports` (run by the
   orchestrator as an end-of-run check, never hand-edited).

## Out of scope

1. The 25 markers in `report-alpha.api.md` (only cleared if they fall in the same edits).
2. Rewriting or rewording existing TSDoc; documenting non-exported symbols; `/docs` pages.
3. Any runtime code, type, signature, import or export change. Any test file (`*.test.ts`).
4. Every file outside the frozen allowlist.

## Functional requirements

### FR-1 — Kind interface members (24 markers, 8 files)

For each of `ApiEntityV1alpha1`, `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`,
`GroupEntityV1alpha1`, `LocationEntityV1alpha1`, `ResourceEntityV1alpha1`, `SystemEntityV1alpha1`,
`UserEntityV1alpha1` (files `packages/catalog-model/src/kinds/<Name>.ts`), add a TSDoc comment on the
`apiVersion`, `kind` and `spec` members. `apiVersion` names the accepted API versions; `kind` names
the entity kind literal; `spec` describes what the kind's spec holds (summarise the fields actually
declared, without inventing semantics). Existing comments on nested `spec` fields stay untouched.

### FR-2 — Kind type guards (8 markers, 1 file)

In `packages/catalog-model/src/entity/conditions.ts`, add TSDoc to `isApiEntity`,
`isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`,
`isSystemEntity`, `isUserEntity`, describing exactly the check the implementation performs (for
example whether the kind comparison is case-insensitive, and that it does not validate the spec or
apiVersion if it does not), with a `@param` for `entity` where the file's style uses one.

### FR-3 — KubernetesValidatorFunctions statics (8 markers, 1 file)

In `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`, add TSDoc to
`isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`,
`isValidLabelValue`, `isValidAnnotationKey`, `isValidAnnotationValue`, stating the format each
accepts as implemented (lengths, character sets, prefix/name split), and that it returns `false`
for non-string input when the implementation does so.

### FR-4 — Entity policy `enforce` methods (5 markers, 5 files)

In `packages/catalog-model/src/entity/policies/`: `DefaultNamespaceEntityPolicy.ts`,
`FieldFormatEntityPolicy.ts`, `GroupDefaultParentEntityPolicy.ts`,
`NoForeignRootFieldsEntityPolicy.ts`, `SchemaValidEntityPolicy.ts` — add TSDoc on each class's
`enforce` method describing what it checks or changes and what it does on failure (throws, returns
a modified copy, returns the input unchanged), as the implementation does.

### FR-5 — Changeset

Create `.changeset/catalog-model-tsdoc.md` with frontmatter `'@backstage/catalog-model': patch`
and a one-sentence adopter-facing message (documentation added for previously undocumented
exports); no code symbol names.

## Non-functional requirements

- NFR-1: Comments only. The compiled output and the types are unchanged; `git diff` of each source
  file adds only comment lines.
- NFR-2: Match the package's existing TSDoc style (`/** ... */`, sentence case, full stops,
  `@remarks` / `@param` only where neighbouring declarations use them). No `@public` tags added to
  members (release tags belong on the top-level declaration, which already has them).
- NFR-3: Accuracy over volume: each comment describes the implementation as written.
- NFR-4: No copyright header changes on existing files. Files formatted by `yarn prettier --write`.

## PII inventory

None. Documentation comments only; no data handling changes.

## Role matrix

Not applicable (no runtime behaviour).

## Acceptance criteria

- AC-1: `yarn build:api-reports` passes, and `grep -c "(undocumented)" packages/catalog-model/report.api.md` is `0`.
- AC-2: `CI=1 yarn test packages/catalog-model` passes as at baseline.
- AC-3: `yarn tsc` (root, no options) passes as at baseline.
- AC-4: Each changed source file's diff adds only comment lines (FR-1 to FR-4 files).
- AC-5: `.changeset/catalog-model-tsdoc.md` exists with a `patch` entry for `@backstage/catalog-model`.

## Open questions for HITL

1. The caller's note lists `Validators` members, `CompoundEntityRef` fields and
   `groupEntityV1alpha1Validator` as flagged, but `report.api.md` does not mark them. This run treats
   the report as authoritative and leaves those alone (they already have TSDoc or are not flagged).
   Reply `revise:` if you want them covered anyway.
