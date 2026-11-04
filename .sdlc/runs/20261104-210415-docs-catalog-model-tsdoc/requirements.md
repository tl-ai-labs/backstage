# Requirements — TSDoc for the 45 Undocumented `@backstage/catalog-model` Exports

- **Run ID**: `20261104-210415-docs-catalog-model-tsdoc`
- **Mode**: `brownfield`
- **Intent**: `docs`
- **Target Package**: `@backstage/catalog-model` (`packages/catalog-model`)

---

## In scope

1. **Document only the 24 undocumented kind interface members (`apiVersion`, `kind`, `spec`) across the 8 kind source files** (`packages/catalog-model/src/kinds/<Kind>EntityV1alpha1.ts` for `Api`, `Component`, `Domain`, `Group`, `Location`, `Resource`, `System`, and `User`), with no comments on the fields inside `spec`, grounded in each kind's TypeScript definition, `src/schema/kinds/<Kind>.v1alpha1.schema.json`, and `<Kind>EntityV1alpha1.test.ts`.
2. **Document the 8 undocumented entity kind type-guard functions in `packages/catalog-model/src/entity/conditions.ts`** (`isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity`), stating their exact runtime behaviour as verified in `conditions.ts` and `conditions.test.ts`.
3. **Document the 8 undocumented static validator methods on `KubernetesValidatorFunctions` in `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`** (`isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`, `isValidLabelValue`, `isValidAnnotationKey`, `isValidAnnotationValue`), stating the exact format rules each method accepts and rejects as verified in `KubernetesValidatorFunctions.ts`, `CommonValidatorFunctions.ts`, and `KubernetesValidatorFunctions.test.ts`.
4. **Document the 5 undocumented `enforce` methods on the entity policy classes in `packages/catalog-model/src/entity/policies/<Policy>.ts`** (`DefaultNamespaceEntityPolicy.enforce`, `FieldFormatEntityPolicy.enforce`, `GroupDefaultParentEntityPolicy.enforce`, `NoForeignRootFieldsEntityPolicy.enforce`, `SchemaValidEntityPolicy.enforce`), stating what each method checks, whether it returns the original entity or a new/mutated entity, and when it throws an error, as verified against each policy's implementation and `<Policy>.test.ts`.
5. **Regenerate `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md`** exclusively by running `yarn build:api-reports` (never hand-editing either file) so `packages/catalog-model/report.api.md` contains zero `(undocumented)` markers and `packages/catalog-model/report-alpha.api.md` reflects the updated `ApiEntityV1alpha1` member docs.
6. **Add one `patch` changeset for `@backstage/catalog-model`** at `.changeset/*catalog-model-tsdoc*.md` with an adopter-facing summary and no internal symbol names.

---

## Out of scope

1. Documenting the 22 remaining `(undocumented)` markers in `packages/catalog-model/report-alpha.api.md` that do not belong to `ApiEntityV1alpha1` (such as `AiResourceEntityV1alpha1Default`, `CatalogModelKindRelationFieldDefinition`, `CatalogModelKindRootSchema`, `CatalogModelLayer`, `CatalogModelSourceReadOptions`, `McpServerApiEntity`, and `AiResource` subtype specs).
2. Rewriting, removing, or expanding TSDoc comments on exports or members that are already documented in `packages/catalog-model`, or adding comments on fields inside `spec` on the kind interfaces.
3. Any modification to TypeScript types, function/method signatures, parameter names, `export` declarations, release tags (`@public`, `@alpha`, `@deprecated`), runtime logic, JSON schemas, or test files.
4. Converting arrow-function constants to `function` declarations or changing any code construct outside `/** ... */` TSDoc comments.
5. Editing `README.md`, files under `docs/`, `CHANGELOG.md`, API Extractor configuration (`-o ae-undocumented`), or any file outside the 18 allowlisted paths in the approved Intent Brief.
6. Hand-editing `packages/catalog-model/report.api.md` or `packages/catalog-model/report-alpha.api.md`.

---

## Functional requirements per module

### Module 1 — Kind Entity Interfaces (`packages/catalog-model/src/kinds/*EntityV1alpha1.ts`)

Each kind interface extends `Entity` and is re-exported both as `<Kind>EntityV1alpha1` and as `<Kind>Entity`. In every one of these 8 interfaces, the interface name ends with `V1alpha1`, **but `apiVersion` accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`** (verified in `src/schema/kinds/*.v1alpha1.schema.json` and the `'silently accepts v1beta1 as well'` test in each `src/kinds/*EntityV1alpha1.test.ts`). Also, unlike `Entity.spec` (which is optional on the base `Entity` type), `spec` is required on all 8 kind interfaces. Each FR below covers only the 3 top-level interface members `apiVersion`, `kind`, and `spec`; no comments are added on fields inside `spec`. Member TSDoc blocks on interface properties must NOT carry release tags (`@public` / `@alpha`) because interface members inherit the release tag of their enclosing interface.

#### FR-1: `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts` (3 markers in `report.api.md`, plus 3 shared markers in `report-alpha.api.md`)
Add TSDoc comments only to the 3 undocumented members of `ApiEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the API entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'API'` — The entity kind. Name `'API'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["API"]}`, exact case). Must not say the value is "always" `'API'`: the `isApiEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the API entity itself (required on `ApiEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-2: `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `ComponentEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the Component entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'Component'` — The entity kind. Name `'Component'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["Component"]}`, exact case). Must not say the value is "always" `'Component'`: the `isComponentEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the Component entity itself (required on `ComponentEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-3: `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `DomainEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the Domain entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'Domain'` — The entity kind. Name `'Domain'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["Domain"]}`, exact case). Must not say the value is "always" `'Domain'`: the `isDomainEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the Domain entity itself (required on `DomainEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-4: `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `GroupEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the Group entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'Group'` — The entity kind. Name `'Group'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["Group"]}`, exact case). Must not say the value is "always" `'Group'`: the `isGroupEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the Group entity itself (required on `GroupEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-5: `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `LocationEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the Location entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'Location'` — The entity kind. Name `'Location'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["Location"]}`, exact case). Must not say the value is "always" `'Location'`: the `isLocationEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the Location entity itself (required on `LocationEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-6: `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `ResourceEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the Resource entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'Resource'` — The entity kind. Name `'Resource'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["Resource"]}`, exact case). Must not say the value is "always" `'Resource'`: the `isResourceEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the Resource entity itself (required on `ResourceEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-7: `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `SystemEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the System entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'System'` — The entity kind. Name `'System'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["System"]}`, exact case). Must not say the value is "always" `'System'`: the `isSystemEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the System entity itself (required on `SystemEntityV1alpha1`, unlike the optional `spec` on `Entity`).

#### FR-8: `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts` (3 markers in `report.api.md`)
Add TSDoc comments only to the 3 undocumented members of `UserEntityV1alpha1` (no comments on the fields inside `spec`):
- `apiVersion`: `'backstage.io/v1alpha1' | 'backstage.io/v1beta1'` — The `apiVersion` string of the User entity; accepts both `'backstage.io/v1alpha1'` and `'backstage.io/v1beta1'`.
- `kind`: `'User'` — The entity kind. Name `'User'` as the value the type and this kind's validator expect (its schema is `"kind": {"enum": ["User"]}`, exact case). Must not say the value is "always" `'User'`: the `isUserEntity` guard compares `entity.kind.toUpperCase()`, so it narrows an entity to this type for any letter case of the kind (Gate 1 decision).
- `spec`: The specification data describing the User entity itself (required on `UserEntityV1alpha1`, unlike the optional `spec` on `Entity`).

---

### Module 2 — Entity Kind Type Guards (`packages/catalog-model/src/entity/conditions.ts`)

#### FR-9: `packages/catalog-model/src/entity/conditions.ts` (8 markers in `report.api.md`)
Update the existing `@public` TSDoc blocks on all 8 exported functions in `packages/catalog-model/src/entity/conditions.ts` (preserving `@public` as the last tag and `@param entity - ...`):
1. `isApiEntity(entity: Entity): entity is ApiEntity`
2. `isComponentEntity(entity: Entity): entity is ComponentEntity`
3. `isDomainEntity(entity: Entity): entity is DomainEntity`
4. `isGroupEntity(entity: Entity): entity is GroupEntity`
5. `isLocationEntity(entity: Entity): entity is LocationEntity`
6. `isResourceEntity(entity: Entity): entity is ResourceEntity`
7. `isSystemEntity(entity: Entity): entity is SystemEntity`
8. `isUserEntity(entity: Entity): entity is UserEntity`

**Required accuracy details for FR-9**:
- Each function is a TypeScript type guard narrowing `Entity` to the corresponding `<Kind>Entity` (alias of `<Kind>EntityV1alpha1`, linked via `{@link ApiEntity}`, `{@link ComponentEntity}`, etc.).
- At runtime, each function **only checks whether `entity.kind` matches the target kind string case-insensitively** (`entity.kind.toUpperCase() === '<KIND>'`, e.g. `'API'`, `'COMPONENT'`, `'DOMAIN'`, `'GROUP'`, `'LOCATION'`, `'RESOURCE'`, `'SYSTEM'`, `'USER'`).
- It does **not** check `entity.apiVersion` or validate `entity.metadata` / `entity.spec` against the kind's schema.

---

### Module 3 — Kubernetes Validator Functions (`packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`)

#### FR-10: `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (8 markers in `report.api.md`)
Add TSDoc comments to all 8 static methods of `KubernetesValidatorFunctions` (matching `CommonValidatorFunctions.ts` style: summary starting with `"Checks that the value ..."`, `@remarks` where detail is needed, `@param value - The value to check`, and no release tag on class methods since the class carries `@public`):
1. `isValidApiVersion(value: unknown): boolean`:
   - Checks that `value` is a valid `apiVersion` string on the form `<suffix>` or `<prefix>/<suffix>` (delegating to `CommonValidatorFunctions.isValidPrefixAndOrSuffix` with `'/'`).
   - If `<prefix>` is present, it must be a valid RFC 1123 DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`: 1–253 characters of dot-separated DNS labels, each label 1–63 characters of lowercase ASCII letters and digits `[a-z0-9]`, starting and ending with one, with hyphens `-` allowed inside per `CommonValidatorFunctions.isValidDnsLabel`: `/^[a-z0-9]+(?:\-+[a-z0-9]+)*$/`).
   - `<suffix>` (or the entire value when there is no `'/'`) must be 1–63 ASCII alphanumeric characters (`[a-z0-9A-Z]+`; hyphens, underscores, and dots are rejected in the suffix).
2. `isValidKind(value: unknown): boolean`:
   - Checks that `value` is a valid `kind` string: 1–63 characters starting with an ASCII letter (`[a-zA-Z]`) followed by zero or more ASCII alphanumeric characters (`[a-z0-9A-Z]*`).
   - Rejects strings starting with a digit, strings containing hyphens or other punctuation, empty strings, strings longer than 63 characters, and non-strings.
3. `isValidObjectName(value: unknown): boolean`:
   - Checks that `value` is a valid object name string: 1–63 characters starting and ending with an ASCII alphanumeric character (`[A-Za-z0-9]`), with only ASCII alphanumeric characters, hyphens (`-`), underscores (`_`), and dots (`.`) in between (`/^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/`).
   - Note that uppercase letters, underscores, dots, and consecutive internal separators (such as `a--b` or `a..b`) are accepted.
4. `isValidNamespace(value: unknown): boolean`:
   - Checks that `value` is a valid `namespace` string by delegating to `{@link CommonValidatorFunctions.isValidDnsLabel}`.
   - Must be a valid RFC 1123 DNS label: 1–63 characters consisting of lowercase ASCII alphanumeric characters (`[a-z0-9]`) and internal hyphens (`-`), starting and ending with `[a-z0-9]`. Rejects uppercase letters, underscores, and dots.
5. `isValidLabelKey(value: unknown): boolean`:
   - Checks that `value` is a valid label key string on the form `<name>` or `<prefix>/<name>` (via `CommonValidatorFunctions.isValidPrefixAndOrSuffix` with `'/'`).
   - If `<prefix>` is present, it must be a valid DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`: 1–253 characters of dot-separated DNS labels, each label 1–63 characters of lowercase ASCII letters and digits `[a-z0-9]`, starting and ending with one, with hyphens `-` allowed inside per `CommonValidatorFunctions.isValidDnsLabel`: `/^[a-z0-9]+(?:\-+[a-z0-9]+)*$/`).
   - `<name>` must be a valid object name (`KubernetesValidatorFunctions.isValidObjectName`, 1–63 characters).
6. `isValidLabelValue(value: unknown): boolean`:
   - Checks that `value` is a valid label value string: either an **empty string (`''`)** or a valid object name (`KubernetesValidatorFunctions.isValidObjectName`: 1–63 characters starting and ending with `[A-Za-z0-9]` and containing only `[-A-Za-z0-9_.]`).
7. `isValidAnnotationKey(value: unknown): boolean`:
   - Checks that `value` is a valid annotation key string on the form `<name>` or `<prefix>/<name>` (via `CommonValidatorFunctions.isValidPrefixAndOrSuffix` with `'/'`).
   - If `<prefix>` is present, it must be a valid DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`: 1–253 characters of dot-separated DNS labels, each label 1–63 characters of lowercase ASCII letters and digits `[a-z0-9]`, starting and ending with one, with hyphens `-` allowed inside per `CommonValidatorFunctions.isValidDnsLabel`: `/^[a-z0-9]+(?:\-+[a-z0-9]+)*$/`), and `<name>` must be a valid object name (`KubernetesValidatorFunctions.isValidObjectName`, 1–63 characters) — using the same validation rule as `isValidLabelKey`.
8. `isValidAnnotationValue(value: unknown): boolean`:
   - Checks that `value` is a valid annotation value: any string (`typeof value === 'string'`), including an empty string `''`, with no length or character restrictions.

---

### Module 4 — Entity Policies (`packages/catalog-model/src/entity/policies/*EntityPolicy.ts`)

Each policy class implements `EntityPolicy` (`src/entity/policies/types.ts`) and carries `@public` at the class level; its `enforce` method must NOT add a duplicate `@public` tag, and must follow the `@param entity - ...`, `@returns ...`, `@throws ...` convention from `src/entity/policies/types.ts`.

#### FR-11: `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (1 marker in `report.api.md`)
Add a TSDoc comment to `DefaultNamespaceEntityPolicy.enforce(entity: Entity): Promise<Entity>`:
- Resolves with the original `entity` untouched when `entity.metadata.namespace` is truthy.
- Otherwise, resolves with a new deep copy (`lodash.merge` onto `{ metadata: { namespace: <default> } }`) in which the configured default namespace (`DEFAULT_NAMESPACE` / `'default'` by default) is applied only when `metadata.namespace` is absent or `undefined`, while `''` and `null` are kept as they are in the returned copy.
- The input `entity` is never changed.

#### FR-12: `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (1 marker in `report.api.md`)
Add a TSDoc comment to `FieldFormatEntityPolicy.enforce(entity: Entity): Promise<Entity>`:
- Validates the format of the entity's envelope fields using the configured `Validators` instance (defaulting to `makeValidator()`):
  - Required fields: `apiVersion` (`isValidApiVersion`), `kind` (`isValidKind`), and `metadata.name` (`isValidEntityName`).
  - Optional fields/collections when present: `metadata.namespace` (`isValidNamespace`), `metadata.labels` keys and values (`isValidLabelKey`, `isValidLabelValue`), `metadata.annotations` keys and values (`isValidAnnotationKey`, `isValidAnnotationValue`), `metadata.tags` items (`isValidTag`), and `metadata.links` items (requiring `url` via `CommonValidatorFunctions.isValidUrl`, and validating optional `title` and `icon` via `CommonValidatorFunctions.isNonEmptyString`).
- Does not check `metadata.uid`, `metadata.etag`, `metadata.title`, `metadata.description`, `metadata.links[].type`, or `spec`.
- `@param entity - The entity to validate`
- `@returns` Resolves with the unmodified `entity` if all checked fields are valid.
- `@throws` Rejects with an `Error` if a required field is `undefined` or `null`, if a validator throws, or if any checked field fails validation.

#### FR-13: `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (1 marker in `report.api.md`)
Add a TSDoc comment to `GroupDefaultParentEntityPolicy.enforce(entity: Entity): Promise<Entity>`:
- Applies only when `entity.kind === 'Group'` (case-sensitive); non-`Group` entities are returned untouched.
- If the `Group` entity already has a truthy `spec.parent`, or if `stringifyEntityRef(entity)` matches the policy's configured default `parentRef` (preventing the default parent group from becoming its own parent), returns the entity untouched.
- Otherwise, **mutates `entity.spec.parent` in place** to the normalized default `parentRef` (`group:<namespace>/<name>`) and resolves with the entity.

#### FR-14: `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (1 marker in `report.api.md`)
Add a TSDoc comment to `NoForeignRootFieldsEntityPolicy.enforce(entity: Entity): Promise<Entity>`:
- Checks every top-level key (`Object.keys(entity)`) against the policy's allowed root fields (`['apiVersion', 'kind', 'metadata', 'spec']` by default unless overridden in the constructor).
- `@param entity - The entity to validate`
- `@returns` Resolves with the unmodified `entity` if all root-level fields are in the known fields list.
- `@throws` Rejects with an `Error` (`Unknown field <field>`) if the entity contains any root-level property not in the known fields list.

#### FR-15: `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (1 marker in `report.api.md`)
Add a TSDoc comment to `SchemaValidEntityPolicy.enforce(entity: Entity): Promise<Entity>`:
- Validates `entity` against the base `Entity` and `EntityMeta` JSON schemas (`Entity.schema.json`, `EntityMeta.schema.json`, and `common.schema.json`, lazily compiled with Ajv on first call).
- **Accuracy note**: Despite the class-level summary mentioning "entity spec", `enforce` validates the **base entity envelope/structure** (requiring `apiVersion`, `kind`, and `metadata` with valid `EntityMeta` field types, allowing optional `spec` as any JSON object, optional `relations`, and optional `status`, and rejecting unknown root properties), not kind-specific `spec` schemas.
- `@param entity - The entity to validate`
- `@returns` Resolves with the unmodified `entity` if it conforms to the base entity JSON schema.
- `@throws` Rejects with an `Error` prefixed with `Malformed envelope,` if schema validation fails.

---

### Module 5 — Companion Artifacts (API Reports & Changeset)

#### FR-16: `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md`
Regenerate `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md` by running `yarn build:api-reports` (never hand-editing either file):
- All 45 `// (undocumented)` markers in `packages/catalog-model/report.api.md` are removed.
- The 3 `// (undocumented)` markers on `ApiEntityV1alpha1` in `packages/catalog-model/report-alpha.api.md` are removed (reducing its marker count from 25 to 22).

#### FR-17: `.changeset/*catalog-model-tsdoc*.md`
Create a single Changesets file matching `.changeset/*catalog-model-tsdoc*.md` with:
- Frontmatter targeting `'@backstage/catalog-model': patch`.
- A concise, adopter-facing description of the TSDoc documentation improvements for entity kinds, kind type guards, Kubernetes format validators, and entity policies, containing **no internal symbol names**.

---

## Non-functional requirements

- **NFR-1 (Behavioural Accuracy)**: Every statement in every added TSDoc comment must reflect the actual runtime implementation, JSON schema, and unit tests in `packages/catalog-model`, never guessing from symbol names alone.
- **NFR-2 (Zero Runtime / Type Surface Change)**: No TypeScript types, interfaces, function/method signatures, exports, release tags (`@public`, `@alpha`, `@deprecated`), or executable statements may be altered. In `packages/catalog-model/report.api.md`, the only diff permitted is the removal of the 45 `// (undocumented)` lines (and in `report-alpha.api.md`, the removal of the 3 `// (undocumented)` lines on `ApiEntityV1alpha1`).
- **NFR-3 (TSDoc Style & Formatting Compliance)**: All TSDoc comments must conform to `STYLE.md` and `.sdlc/baseline/stack-profile.md`:
  - `/** ... */` blocks with a one-sentence summary first, optional `@remarks` separated by a blank comment line, followed by `@param <name> - <description>` (always with the hyphen and no trailing period on single-sentence `@param` lines), `@returns`, `@throws`, and the release tag (`@public`) last where applicable (top-level functions in `conditions.ts` keep `@public`; interface members and class methods inherit their parent's `@public` tag and must not add their own).
  - Cross-references use `{@link Symbol}` or `{@link https://...}`.
  - Lines wrap at approximately 80 columns and pass Prettier formatting (`yarn prettier --check`).
- **NFR-4 (Clean API Extractor Build)**: `yarn build:api-reports` must exit 0 with zero TSDoc parser or API Extractor warnings/errors.
- **NFR-5 (Strict Allowlist Compliance)**: Only the 15 source files, the 2 generated API report files (`report.api.md`, `report-alpha.api.md`), and the 1 new changeset file (`.changeset/*catalog-model-tsdoc*.md`) may be modified or created.

---

## PII inventory

None — this is a documentation-only change (TSDoc comments, generated API report files, and a changeset) in `@backstage/catalog-model`, which is a stateless schema and type definition library that stores or processes no personal data at runtime.

| Field | Sensitivity | Protection |
|---|---|---|
| None (`UserEntityV1alpha1.spec.profile` and `GroupEntityV1alpha1.spec.profile` are static TypeScript type definitions only; no PII is collected, stored, or processed) | None | N/A (TSDoc comments only) |

---

## Role matrix

Not applicable — `@backstage/catalog-model` is a framework-free common library of TypeScript interfaces, type guards, validators, and entity policies with no authentication, authorization, or role-based access control surface, and this task modifies TSDoc comments only.

| Role | Resource | Action |
|---|---|---|
| N/A | N/A | N/A |

---

## Acceptance criteria

1. **AC-1**: Each of the 45 previously undocumented members and functions across the 15 source files in `packages/catalog-model/src/` (FR-1 through FR-15) has a `/** ... */` TSDoc comment whose statements accurately match the implementation, JSON schemas, and unit tests, with no comments added on fields inside `spec` on the kind interfaces.
2. **AC-2**: All added TSDoc comments follow the package's TSDoc conventions (`STYLE.md` and `.sdlc/baseline/stack-profile.md`), with no changes to types, signatures, release tags, copyright years, runtime code, or tests.
3. **AC-3**: Running the fixed verification command at the repository root succeeds (exits 0):
   ```sh
   yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md
   ```
4. **AC-4**: `git diff packages/catalog-model/report.api.md` shows only the removal of the 45 `// (undocumented)` lines (no signature, release-tag, or export changes), and `git diff packages/catalog-model/report-alpha.api.md` shows only the removal of the 3 `// (undocumented)` lines on `ApiEntityV1alpha1`.
5. **AC-5**: Exactly one new changeset file matching `.changeset/*catalog-model-tsdoc*.md` exists, specifies `'@backstage/catalog-model': patch`, is written for adopters, and contains no internal symbol names.
6. **AC-6**: `git status --porcelain` shows modifications/additions only within the 18 allowlisted file paths defined in the Intent Brief.

---

## Open questions for HITL

None. The scope, allowlist, target exports, style conventions, and verification command are fully specified and approved in Gate 0.
