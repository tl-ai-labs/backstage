# Requirements — docs — TSDoc for the 45 undocumented exports of @backstage/catalog-model

Run: `20261109-123701-docs-catalog-model-tsdoc` · Job: `docs` · Policy: `opus55-plus-flash38-agsdk` · Auth: `estimated`
Brief: `.sdlc/runs/20261109-123701-docs-catalog-model-tsdoc/intent_brief.md`

## What is documented

`packages/catalog-model/report.api.md` carries 45 `// (undocumented)` markers (verified at `f20fd9b59828`),
all on members or functions, in four groups:

| Group | Count | Source file(s) |
|---|---|---|
| `apiVersion`, `kind`, `spec` of `ApiEntityV1alpha1`, `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`, `GroupEntityV1alpha1`, `LocationEntityV1alpha1`, `ResourceEntityV1alpha1`, `SystemEntityV1alpha1`, `UserEntityV1alpha1` | 24 | `packages/catalog-model/src/kinds/<Kind>EntityV1alpha1.ts` |
| `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity` | 8 | `packages/catalog-model/src/entity/conditions.ts` |
| Static methods `isValidAnnotationKey`, `isValidAnnotationValue`, `isValidApiVersion`, `isValidKind`, `isValidLabelKey`, `isValidLabelValue`, `isValidNamespace`, `isValidObjectName` of `KubernetesValidatorFunctions` | 8 | `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` |
| `enforce` of `DefaultNamespaceEntityPolicy`, `FieldFormatEntityPolicy`, `GroupDefaultParentEntityPolicy`, `NoForeignRootFieldsEntityPolicy`, `SchemaValidEntityPolicy` | 5 | `packages/catalog-model/src/entity/policies/<Policy>.ts` |

Audience: plugin authors and engineers who build against the entity model.

## In scope

1. Add a TSDoc comment to each of the 45 members and functions above, in its source file.
2. Regenerate `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md` with
   `yarn build:api-reports` (part of the test command), never by hand.
3. Add one new `patch` changeset for `@backstage/catalog-model` at a path matching
   `.changeset/*catalog-model-tsdoc*.md` (no existing changeset covers the package).

## Out of scope

1. The 22 `(undocumented)` markers in `report-alpha.api.md` not on `ApiEntityV1alpha1` (the 3 on its alpha copy
   disappear as a side effect of documenting the interface).
2. Rewriting, expanding or moving TSDoc that already exists, or documenting exports that already carry a comment.
3. Any change to types, signatures, release tags, runtime code, tests, README or `/docs`.
4. API-report tooling settings (`-o ae-undocumented` and the like), `.gitignore`, any other package's report.

## Functional requirements

- **FR-1 (kind members).** In each of the 8 kind interfaces, `apiVersion`, `kind` and `spec` each get a TSDoc
  comment. `apiVersion` and `kind` state the exact literal type(s) the interface declares (for example
  `backstage.io/v1alpha1` or `backstage.io/v1beta1` where both are allowed; the kind name). `spec` summarises
  what the spec holds for that kind, naming only fields the interface actually declares, and which are required
  vs optional where the comment says so.
- **FR-2 (type guards).** Each `is<Kind>Entity` function in `conditions.ts` gets a TSDoc comment stating what it
  checks, as the code does it (for example whether the comparison of `kind` is case-insensitive, and that
  `apiVersion` is not checked if that is the case), with `@param` for its parameter in the package's
  `@param name - description` form, and what it returns (a type guard narrowing to the kind interface).
- **FR-3 (Kubernetes validators).** Each of the 8 static methods of `KubernetesValidatorFunctions` gets a TSDoc
  comment stating the rule it actually enforces: the accepted character set, length limits, prefix/name split
  and type checks as implemented (including which non-string inputs return `false`), with `@param`. Where the
  implementation delegates to another helper of the package (for example a common DNS-label or prefix check),
  the comment describes the resulting rule, not the helper's name unless it is public API.
- **FR-4 (policy enforce).** Each `enforce` method of the 5 policies gets a TSDoc comment stating what it does to
  or with the entity as the code does it, with `@param`. All five are declared `Promise<Entity>`; none of them
  resolves to `undefined` (only the `EntityPolicy` interface allows that), and the comments do not mention
  `undefined`. The return and throw cases, as the code has them:
  - `DefaultNamespaceEntityPolicy`: when `metadata.namespace` is a non-empty string, resolves to the same entity,
    unchanged. Otherwise it resolves to a new object (never the entity it was passed): the entity merged (lodash
    `merge`) over `{ metadata: { namespace: <the policy's namespace> } }`. The entity's own value wins the merge
    unless it is `undefined`, so the default namespace is applied only when `metadata.namespace` is missing or
    `undefined`; when it is `''` or `null`, the new object keeps `''` or `null`. The comment must not say that the
    default is set for an empty namespace. It does not throw for a well-formed entity; an entity with no
    `metadata` throws a `TypeError`. The comment either says it does not throw for a well-formed entity or leaves
    throwing out, and never says "does not throw" without that qualifier.
  - `FieldFormatEntityPolicy`: resolves to the same entity, unchanged, when every checked field is valid; throws
    an `Error` when a required field has no value, when a validator throws, or when a field fails its validator
    (the message names the field).
  - `GroupDefaultParentEntityPolicy`: resolves to the same entity, unchanged, when its `kind` is not `Group` or
    `spec.parent` is already set; otherwise sets `spec.parent` to the policy's parent ref on the entity it was
    passed (in place, unless the group is itself the parent group) and resolves to that same object. It does not
    throw for a well-formed entity; a `Group` with no `spec` throws a `TypeError`. The comment either says it does
    not throw for a well-formed entity or leaves throwing out, and never says "does not throw" without that
    qualifier.
  - `NoForeignRootFieldsEntityPolicy`: resolves to the same entity, unchanged; throws an `Error` naming the first
    root field that is not in its list of known fields.
  - `SchemaValidEntityPolicy`: resolves to the same entity, unchanged, when it validates against the entity
    envelope schema; otherwise throws an `Error` beginning `Malformed envelope`.

  Statements are checked against the implementation and its tests.
- **FR-5 (style).** Comments follow the package's existing TSDoc style (STYLE.md and comments already in
  `packages/catalog-model/src`): `/** */` blocks, a one-line summary sentence, `@remarks` followed by a blank
  ` *` line before detail paragraphs when detail is needed, `@param name - description`, `{@link X}` for
  references to public exports. No `@public`/`@alpha` tags are added, removed or moved on members; release tags
  stay where they are.
- **FR-6 (changeset).** A new file `.changeset/<name>catalog-model-tsdoc<suffix>.md` with frontmatter
  `'@backstage/catalog-model': patch` and a one- or two-sentence adopter-facing message (documentation added for
  entity kind fields, entity type guards, Kubernetes-style validators and entity policies), naming no internal
  symbols that are not public API.
- **FR-7 (reports).** `report.api.md` and `report-alpha.api.md` change only through `yarn build:api-reports`.

## Non-functional requirements

- **NFR-1 (accuracy).** Every statement in a comment is verified against the implementation (and its tests where
  they exist), never inferred from the name. Accuracy over volume: short, correct comments are preferred.
- **NFR-2 (comment-only diff).** In the 15 source files the diff adds comment lines only; `git diff` filtered to
  non-comment lines is empty.
- **NFR-3 (no copyright change).** Existing copyright headers are untouched.
- **NFR-4 (formatting).** Each changed source file stays Prettier-clean.

## PII inventory

None. The change adds comments and a changeset; no data handling changes.

| Field | Sensitivity | Protection |
|---|---|---|
| — | — | — |

## Role matrix

Not applicable: no runtime behaviour, resources or permissions change.

## Acceptance criteria

- **AC-1.** Each of the 45 members and functions has a TSDoc comment in its source file, and every statement in it
  matches the code's actual behaviour (FR-1 to FR-4, NFR-1).
- **AC-2.** The comments follow the package's TSDoc style; no release tag, signature, type or runtime code
  changes (FR-5, NFR-2).
- **AC-3.** `yarn build:api-reports` exits 0 (FR-7).
- **AC-4.** `packages/catalog-model/report.api.md` contains zero `(undocumented)` markers. Verified by the run's
  fixed test command, word for word:
  `yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md`
- **AC-5.** One `patch` changeset for `@backstage/catalog-model`, written for adopters with no internal symbol
  names (FR-6).

## Open questions for HITL

None. Scope, test command and allowlist were fixed at Gate 0.
