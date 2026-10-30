# Requirements — docs — TSDoc for the undocumented exports of `@backstage/catalog-model`

Run `20261030-152500-docs-catalog-model-tsdoc` · intent `docs` · derived from
`intent_brief.md` (authoritative) and `.sdlc/baseline/current.json` / `stack-profile.md`.

## What docs (scope of this docs run)

Source-level TSDoc **in place**, in `packages/catalog-model/src`, on exactly the 45 declarations
that `packages/catalog-model/report.api.md` currently marks `// (undocumented)`, then a
regeneration of the API reports. No README, no `/docs` page, no ADR, no new test.

Audience: plugin authors and other engineers building against the entity model — someone wiring a
plugin against `Entity`, a kind interface or a validator, not a maintainer of this package.

### In scope

1. 8 top-level type-guard exports in `src/entity/conditions.ts`.
2. 8 static members of `KubernetesValidatorFunctions` in `src/validation/KubernetesValidatorFunctions.ts`.
3. 24 interface members (`apiVersion`, `kind`, `spec`) across the 8 kind interfaces in `src/kinds/*EntityV1alpha1.ts`.
4. 5 `enforce` methods on the 5 entity policy classes in `src/entity/policies/`.
5. Regeneration of `report.api.md` and `report-alpha.api.md` by `yarn build:api-reports`.
6. One new changeset naming `@backstage/catalog-model` at `patch`.

Total: 45 markers, 15 source files, 2 generated reports, 1 changeset.

### Out of scope

1. The 25 markers in `report-alpha.api.md` — not a target; only incidental movement from a shared
   declaration documented above is accepted.
2. Relations and entity-reference parsing — all 14 `RELATION_*` constants, `parseEntityRef`,
   `stringifyEntityRef`, `getCompoundEntityRef` and `CompoundEntityRef` are already fully
   documented and contribute zero markers. Read-only context; never edited.
3. Any behaviour, signature, naming or declaration-order change.
4. Any test file; any `*.test.ts` edit; any new test.
5. Any change to the `ae-undocumented` suppression (`-o` omit list stays as it is).
6. Any commit, branch, tag or pull request. Any `.gitignore` change.
7. Any copyright-year change on an existing file.

## Functional requirements

### FR-1 — `src/entity/conditions.ts` (8 top-level exports)

`isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`,
`isResourceEntity`, `isSystemEntity`, `isUserEntity` each already carry `/** @public */` with no
prose. Each gains a one-line third-person description plus `@param entity - ...`, stating that the
check is a case-insensitive comparison of `entity.kind` and that the function is a TypeScript type
guard narrowing to that kind's interface. The existing `@public` tag is reused, never changed.

### FR-2 — `src/validation/KubernetesValidatorFunctions.ts` (8 statics)

`isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`,
`isValidLabelValue`, `isValidAnnotationKey`, `isValidAnnotationValue` each gain a description,
`@param value - The value to check`, and `@see` the relevant Kubernetes naming/syntax document
where one applies — following the in-package template `CommonValidatorFunctions`, which documents
every static this way and therefore carries zero markers. Each description states the rule the
implementation actually enforces; several delegate to `CommonValidatorFunctions.isValidDnsLabel` or
`.isValidPrefixAndOrSuffix`, and the prose must reflect the delegated rule, not a guess from the
member's name. As members of a documented class, these carry no release tag of their own.

### FR-3 — `src/kinds/*EntityV1alpha1.ts` (24 members)

On each of `ApiEntityV1alpha1`, `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`,
`GroupEntityV1alpha1`, `LocationEntityV1alpha1`, `ResourceEntityV1alpha1`, `SystemEntityV1alpha1`
and `UserEntityV1alpha1`, the three members `apiVersion`, `kind` and `spec` gain one short member
comment each, describing what the field means for that kind rather than restating its type. Each
interface's own TSDoc block and release tag stay exactly as they are; the members carry no release
tag. `apiVersion` and `kind` are literal discriminators here — document them as the literal values
the kind accepts, without inventing semantics the code does not express.

### FR-4 — `src/entity/policies/*.ts` (5 `enforce` methods)

The `enforce` method on `DefaultNamespaceEntityPolicy`, `FieldFormatEntityPolicy`,
`GroupDefaultParentEntityPolicy`, `NoForeignRootFieldsEntityPolicy` and `SchemaValidEntityPolicy`
gains a description of what that policy does to, or asserts about, the entity, plus its return and
throw behaviour exactly as implemented (which policies return the entity unchanged, which return a
modified copy, which throw and on what). `@param` form per FR-6. Members of a documented class
carry no release tag.

### FR-5 — Regenerated reports

`packages/catalog-model/report.api.md` and `report-alpha.api.md` are produced only by
`yarn build:api-reports`. Never hand-edited.

### FR-6 — Style conformance

Every added block follows the package's own conventions as sampled in
`.sdlc/baseline/stack-profile.md`: third-person declarative prose, a short indexable first
sentence, `@remarks` only where the text runs long, tag order `description → @remarks → release
tag → @param`, and `@param name - description` with the hyphen required by `STYLE.md:234`.
`{@link ...}` for cross-references.

### FR-7 — Changeset

One new `.changeset/<name>.md` names `@backstage/catalog-model` at `patch`, with an adopter-facing
message in plain language that references no internal symbol names. No pending changeset already
names this package (38 checked).

## Non-functional requirements

- **NFR-1** Accuracy over volume. Every block is written after reading the implementation it
  documents. No invented parameter, no behaviour the code does not have, no text adapted from a
  sibling whose logic differs. A wrong comment is worse than a missing one.
- **NFR-2** Release-tag safety. `--validate-release-tags` is active. Each added block reuses the
  release tag the API report already shows for its enclosing declaration; an `@alpha` is never
  promoted to `@public`. Documented members carry no tag of their own.
- **NFR-3** Comment-only. The diff contains no executable change; the 893-test baseline is the
  regression check.
- **NFR-4** Copyright headers, including their original years, are untouched.
- **NFR-5** Within-package consistency outranks repo-wide consistency, per the project
  instructions.

## PII inventory

None. This run adds comments to a pure types-and-validators library. No field of the change reads,
stores, logs or transports personal data; no secret, credential or env key is read or written.

| Field | Sensitivity | Protection |
| --- | --- | --- |
| — (none) | — | — |

## Role matrix

Not applicable. `@backstage/catalog-model` is a `common-library` role package with no HTTP layer,
no authorization surface and no actors; this run adds no code path.

| Role | Resource | Action |
| --- | --- | --- |
| — (none) | — | — |

## Acceptance criteria

- **AC-1** The contract check command passes, verbatim and unchanged:
  `yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md`
  This is the single authoritative acceptance check: it regenerates the reports and asserts zero
  remaining markers.
- **AC-2** `CI=1 yarn test packages/catalog-model` passes with 64 suites / 893 tests, matching the
  pre-run baseline exactly, with no test file modified.
- **AC-3** `yarn tsc` passes from the project root.
- **AC-4** Re-running `yarn build:api-reports` leaves no further diff — the reports are generated
  output, not hand edits.
- **AC-5** `yarn lint --fix` and `yarn prettier --check` report no issues on the touched files.
- **AC-6** Every added TSDoc block is accurate against the implementation it documents (NFR-1).
- **AC-7** Release tags are reused exactly as the report shows them; no `@alpha` promoted to
  `@public`; documented members carry no release tag (NFR-2).
- **AC-8** Every `@param` uses the `name - description` form.
- **AC-9** One new changeset names `@backstage/catalog-model` at `patch`, adopter-facing in
  wording.
- **AC-10** Copyright headers on existing files are untouched, original years included.

## Open questions for HITL

None. The brief has been revised twice by the person and resolves auth mode (`vendor`, with the
unused `ANTHROPIC_API_KEY` waived), the no-commit rule, the `.gitignore` exclusion, the exact
45-marker ownership, the style template, the release-tag rule and the verbatim check command.
