# Requirements — TSDoc for the 45 Undocumented Exports of `@backstage/catalog-model`

- **Run ID**: `20261104-docs-catalog-model-tsdoc`
- **Mode**: `brownfield`
- **Intent**: `docs` (Phase 1 form: *scoped — what docs?*)
- **Target Package**: `@backstage/catalog-model` (`packages/catalog-model`)

---

## In scope

1. **8 entity kind type guards in `packages/catalog-model/src/entity/conditions.ts`** (8 `(undocumented)` markers in `packages/catalog-model/report.api.md`):
   - `isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity`.
2. **24 entity-kind interface members across `packages/catalog-model/src/kinds/*EntityV1alpha1.ts`** (24 `(undocumented)` markers in `packages/catalog-model/report.api.md`):
   - `apiVersion`, `kind`, and `spec` on each of `ApiEntityV1alpha1` (`ApiEntity`), `ComponentEntityV1alpha1` (`ComponentEntity`), `DomainEntityV1alpha1` (`DomainEntity`), `GroupEntityV1alpha1` (`GroupEntity`), `LocationEntityV1alpha1` (`LocationEntity`), `ResourceEntityV1alpha1` (`ResourceEntity`), `SystemEntityV1alpha1` (`SystemEntity`), and `UserEntityV1alpha1` (`UserEntity`).
3. **5 `enforce` methods on `EntityPolicy` implementations in `packages/catalog-model/src/entity/policies/`** (5 `(undocumented)` markers in `packages/catalog-model/report.api.md`):
   - `DefaultNamespaceEntityPolicy.enforce`, `FieldFormatEntityPolicy.enforce`, `GroupDefaultParentEntityPolicy.enforce`, `NoForeignRootFieldsEntityPolicy.enforce`, and `SchemaValidEntityPolicy.enforce`.
4. **8 static validator methods on `KubernetesValidatorFunctions` in `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`** (8 `(undocumented)` markers in `packages/catalog-model/report.api.md`):
   - `isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`, `isValidLabelKey`, `isValidLabelValue`, `isValidAnnotationKey`, and `isValidAnnotationValue`.
5. **API report regeneration in `packages/catalog-model/`**:
   - Regenerating `packages/catalog-model/report.api.md` (and `packages/catalog-model/report-alpha.api.md` as a side effect of shared kind exports) strictly via `yarn build:api-reports` so zero `(undocumented)` markers remain in `packages/catalog-model/report.api.md`.
6. **Adopter-facing `patch` changeset at `.changeset/catalog-model-tsdoc.md`**:
   - A new changeset for `@backstage/catalog-model` (`patch`) summarizing the TSDoc additions for adopters.

---

## Out of scope

1. **The 25 `(undocumented)` markers in `packages/catalog-model/report-alpha.api.md`**: Targeting `@alpha`-only exports is out of scope (note: 24 shared kind-interface member markers in `report-alpha.api.md` may clear automatically as a side effect of documenting `src/kinds/*EntityV1alpha1.ts`).
2. **Nested properties inside `spec` on entity kind interfaces** (e.g., `ComponentEntityV1alpha1['spec']['owner']`, `GroupEntityV1alpha1['spec']['profile']`): API Extractor does not emit `(undocumented)` markers for anonymous inline nested object properties.
3. **Package `README.md` and monorepo `/docs` site files**: No edits to `packages/catalog-model/README.md`, `docs/**`, or `docs/releases/**`.
4. **Runtime code, type signatures, release tags, or copyright headers**: No functional or type changes, no changes to `@public` / `@alpha` / `@deprecated` tags, and no copyright year updates.
5. **Files outside the 18-path Gate 0 allowlist**: All other files in `packages/catalog-model/`, other workspace packages' `report*.api.md` files, ESLint/Prettier/TypeScript configs, `.gitignore`, and AI/agent configuration files (`.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`).

---

## Functional requirements per module

### FR-1 — `packages/catalog-model/src/entity/conditions.ts` (8 exports)
Edit the existing tag-only `/** @public */` blocks in place above each of the 8 exported type guard functions (`isApiEntity`, `isComponentEntity`, `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`, `isUserEntity`), retaining `@public` and adding a summary sentence, `@param entity - ...`, and `@returns ...`:
- **`isApiEntity(entity: Entity): entity is ApiEntity`**: Must state that it is a type guard that checks whether `entity` is an {@link ApiEntity} by comparing `entity.kind` case-insensitively to `'API'` (`entity.kind.toUpperCase() === 'API'`).
- **`isComponentEntity(entity: Entity): entity is ComponentEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link ComponentEntity} by comparing `entity.kind` case-insensitively to `'Component'` (`entity.kind.toUpperCase() === 'COMPONENT'`).
- **`isDomainEntity(entity: Entity): entity is DomainEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link DomainEntity} by comparing `entity.kind` case-insensitively to `'Domain'` (`entity.kind.toUpperCase() === 'DOMAIN'`).
- **`isGroupEntity(entity: Entity): entity is GroupEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link GroupEntity} by comparing `entity.kind` case-insensitively to `'Group'` (`entity.kind.toUpperCase() === 'GROUP'`).
- **`isLocationEntity(entity: Entity): entity is LocationEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link LocationEntity} by comparing `entity.kind` case-insensitively to `'Location'` (`entity.kind.toUpperCase() === 'LOCATION'`).
- **`isResourceEntity(entity: Entity): entity is ResourceEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link ResourceEntity} by comparing `entity.kind` case-insensitively to `'Resource'` (`entity.kind.toUpperCase() === 'RESOURCE'`).
- **`isSystemEntity(entity: Entity): entity is SystemEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link SystemEntity} by comparing `entity.kind` case-insensitively to `'System'` (`entity.kind.toUpperCase() === 'SYSTEM'`).
- **`isUserEntity(entity: Entity): entity is UserEntity`**: Must state that it is a type guard that checks whether `entity` is a {@link UserEntity} by comparing `entity.kind` case-insensitively to `'User'` (`entity.kind.toUpperCase() === 'USER'`).

### FR-2 — `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `ApiEntityV1alpha1` (matching `Entity` in `src/entity/Entity.ts`):
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'API'`).
- **`spec`**: States that it is the specification data describing the API entity itself (including its `type`, `lifecycle`, `owner`, `definition`, and optional `system`).

### FR-3 — `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `ComponentEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'Component'`).
- **`spec`**: States that it is the specification data describing the Component entity itself (including its `type`, `lifecycle`, `owner`, and optional `subcomponentOf`, `providesApis`, `consumesApis`, `dependsOn`, `dependencyOf`, and `system` relations).

### FR-4 — `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `DomainEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'Domain'`).
- **`spec`**: States that it is the specification data describing the Domain entity itself (including its `owner`, optional parent domain `subdomainOf`, and optional domain `type`).

### FR-5 — `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `GroupEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'Group'`).
- **`spec`**: States that it is the specification data describing the Group entity itself (including its group `type`, optional `profile`, optional `parent` group, `children` groups, and optional `members`).

### FR-6 — `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `LocationEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'Location'`).
- **`spec`**: States that it is the specification data describing the Location entity itself (including its optional location `type`, single `target` or multiple `targets`, and optional `presence` flag `'required' | 'optional'`).

### FR-7 — `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `ResourceEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'Resource'`).
- **`spec`**: States that it is the specification data describing the Resource entity itself (including its resource `type`, `owner`, and optional `dependsOn`, `dependencyOf`, and `system` relations).

### FR-8 — `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `SystemEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'System'`).
- **`spec`**: States that it is the specification data describing the System entity itself (including its `owner`, optional `domain`, and optional system `type`).

### FR-9 — `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts` (3 interface members)
Add TSDoc `/** ... */` comments above the 3 top-level members of `UserEntityV1alpha1`:
- **`apiVersion`**: States that it is the specification format version for this entity (`'backstage.io/v1alpha1'` or `'backstage.io/v1beta1'`).
- **`kind`**: States that it is the high-level entity kind being described (`'User'`).
- **`spec`**: States that it is the specification data describing the User entity itself (including its optional `profile` information and optional `memberOf` group list).

### FR-10 — `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (1 method)
Add a TSDoc `/** ... */` comment above `DefaultNamespaceEntityPolicy.prototype.enforce(entity: Entity): Promise<Entity>`:
- Must state that if `entity.metadata.namespace` is already set (truthy), it returns `entity` unchanged; otherwise it returns a new merged entity with `metadata.namespace` populated with the policy's configured default namespace (`DEFAULT_NAMESPACE`, `'default'`, unless overridden in the constructor). Include `@param entity` and `@returns`.

### FR-11 — `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (1 method)
Add a TSDoc `/** ... */` comment above `FieldFormatEntityPolicy.prototype.enforce(entity: Entity): Promise<Entity>`:
- Must state that it validates the format of `apiVersion`, `kind`, `metadata.name`, and (when present) `metadata.namespace`, `metadata.labels` (keys and values), `metadata.annotations` (keys and values), `metadata.tags`, and `metadata.links` (`url` required, `title` and `icon` optional non-empty strings) using the configured `Validators` and `CommonValidatorFunctions`.
- Must state that it resolves with the unmodified `entity` when all fields are valid, or rejects/throws an `Error` if a required field is missing (`undefined` or `null`) or any field fails format validation. Include `@param entity` and `@returns`.

### FR-12 — `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (1 method)
Add a TSDoc `/** ... */` comment above `GroupDefaultParentEntityPolicy.prototype.enforce(entity: Entity): Promise<Entity>`:
- Must state that if `entity.kind !== 'Group'` or `entity.spec.parent` is already set, it returns `entity` unchanged; otherwise, as long as the group's own entity reference (`stringifyEntityRef(entity)`) does not equal the configured default parent reference (preventing a group from becoming its own parent), it sets `entity.spec.parent` to the configured default parent entity ref and returns the entity. Include `@param entity` and `@returns`.

### FR-13 — `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts` (1 method)
Add a TSDoc `/** ... */` comment above `NoForeignRootFieldsEntityPolicy.prototype.enforce(entity: Entity): Promise<Entity>`:
- Must state that it checks every top-level key of `entity` (`Object.keys(entity)`) against the configured list of known root fields (defaulting to `['apiVersion', 'kind', 'metadata', 'spec']`), throwing an `Error` (`Unknown field <field>`) if any unrecognized root field is present, or resolving with `entity` unchanged when all root fields are known. Include `@param entity` and `@returns`.

### FR-14 — `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts` (1 method)
Add a TSDoc `/** ... */` comment above `SchemaValidEntityPolicy.prototype.enforce(entity: Entity): Promise<Entity>`:
- Must state that it validates `entity` against the core `Entity` JSON schema (`Entity.schema.json`, `EntityMeta.schema.json`, and `common.schema.json` compiled via Ajv), resolving with `entity` unchanged if valid or throwing an `Error` (`Malformed envelope, ...`) if schema validation fails. Include `@param entity` and `@returns`.

### FR-15 — `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (8 static methods)
Add TSDoc `/** ... */` comments above each of the 8 static methods on `KubernetesValidatorFunctions` (matching the `@param value - The value to check` style of `CommonValidatorFunctions`):
- **`isValidApiVersion(value: unknown): boolean`**: States that it checks whether `value` is a string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`) and `<suffix>` is 1–63 ASCII alphanumeric characters (`/^[a-z0-9A-Z]+$/`).
- **`isValidKind(value: unknown): boolean`**: States that it checks whether `value` is a string of 1–63 characters starting with an ASCII letter (`a-zA-Z`) followed by ASCII alphanumeric characters (`/^[a-zA-Z][a-z0-9A-Z]*$/`).
- **`isValidObjectName(value: unknown): boolean`**: States that it checks whether `value` is a string of 1–63 characters starting and ending with an ASCII alphanumeric character (`A-Za-z0-9`) and containing only ASCII alphanumeric characters, `-`, `_`, or `.` in between (`/^([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9]$/`).
- **`isValidNamespace(value: unknown): boolean`**: States that it checks whether `value` is a valid RFC 1123 DNS label by delegating to `CommonValidatorFunctions.isValidDnsLabel` (1–63 lowercase alphanumeric characters `[a-z0-9]` separated by `-`).
- **`isValidLabelKey(value: unknown): boolean`**: States that it checks whether `value` is a string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`) and `<suffix>` is a valid object name (`KubernetesValidatorFunctions.isValidObjectName`).
- **`isValidLabelValue(value: unknown): boolean`**: States that it checks whether `value` is either an empty string (`''`) or a valid object name (`KubernetesValidatorFunctions.isValidObjectName`).
- **`isValidAnnotationKey(value: unknown): boolean`**: States that it checks whether `value` is a string of the form `<suffix>` or `<prefix>/<suffix>`, where the optional `<prefix>` is a valid DNS subdomain (`CommonValidatorFunctions.isValidDnsSubdomain`) and `<suffix>` is a valid object name (`KubernetesValidatorFunctions.isValidObjectName`).
- **`isValidAnnotationValue(value: unknown): boolean`**: States that it checks whether `value` is a string (`typeof value === 'string'`).

### FR-16 — `.changeset/catalog-model-tsdoc.md` (1 new file)
Create `.changeset/catalog-model-tsdoc.md` with YAML frontmatter naming only `'@backstage/catalog-model': patch` and a concise adopter-facing description of the added TSDoc documentation for the package's public exports, referencing no internal symbols beyond the public API.

---

## Non-functional requirements

- **NFR-1 (Comments-only edits)**: In all 15 TypeScript source files, only TSDoc comments may be added or updated. No executable code, imports, exports, type signatures, parameter names, or return types may change.
- **NFR-2 (Preserve release tags and copyright years)**: Existing release tags (`@public`, `@alpha`, `@deprecated`) must be preserved unchanged. In `src/entity/conditions.ts`, edit the existing `/** @public */` blocks in place rather than duplicating comment blocks. Existing Apache 2.0 license headers and copyright years must not be modified.
- **NFR-3 (Package TSDoc style compliance)**: TSDoc blocks must follow `@backstage/catalog-model` conventions documented in `.sdlc/baseline/stack-profile.md` (summary sentence, optional `@remarks`, release tag where applicable, `@param <name> - <description>`, `@returns <description>`, and `{@link ...}` references).
- **NFR-4 (Prettier formatting step on changed files only)**: Format changed files using `yarn prettier --write <changed paths>` only on the modified files in scope. Never run lint with `--fix`.
- **NFR-5 (API report generation rule)**: `packages/catalog-model/report.api.md` and `packages/catalog-model/report-alpha.api.md` must only be updated by running `yarn build:api-reports`, never hand-edited. Any `report*.api.md` modified outside `packages/catalog-model/` by `yarn build:api-reports` must be reverted with `git checkout -- <path>`.
- **NFR-6 (Changeset conventions)**: `.changeset/catalog-model-tsdoc.md` must declare only `'@backstage/catalog-model': patch`, be written in clear adopter-facing prose, and reference no non-public symbols.

---

## PII inventory

None. This is a documentation-only change adding TSDoc comments to TypeScript source files in `@backstage/catalog-model`; no personally identifiable information (PII) is collected, stored, processed, or exposed.

| Field | Sensitivity | Protection |
| :--- | :--- | :--- |
| None | N/A | N/A |

---

## Role matrix

Not applicable. `@backstage/catalog-model` is a common library of TypeScript types, validators, and entity policies with no authentication, authorization, or role-based access control surface, and this run modifies only TSDoc comments and API reports.

| Role | Resource | Action | Permission |
| :--- | :--- | :--- | :--- |
| N/A | N/A | N/A | N/A |

---

## Acceptance criteria

1. **AC-1 (Verbatim Gate 0 test command)**:
   Running the Gate 0 test command verbatim:
   ```sh
   yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md
   ```
   exits with status `0`.
2. **AC-2 (Allowlist & working tree cleanliness after API report generation)**:
   After each run of `yarn build:api-reports`, check `git status --porcelain` and revert with `git checkout -- <path>` any change outside the allowlist (such as other packages' `report*.api.md` files), recording the reverted paths, so `git status --porcelain` shows changes only within the 18 allowlisted paths (`packages/catalog-model/src/entity/conditions.ts`, the 8 `packages/catalog-model/src/kinds/*EntityV1alpha1.ts` files, the 5 `packages/catalog-model/src/entity/policies/*EntityPolicy.ts` files, `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`, `packages/catalog-model/report.api.md`, `packages/catalog-model/report-alpha.api.md`, and `.changeset/catalog-model-tsdoc.md`).
3. **AC-3 (Implementation accuracy — review criterion)**:
   Every added TSDoc comment accurately states what the implementation in its source file does (case-insensitive `kind` comparison in `conditions.ts`; exact `enforce` behaviour in each of the 5 policy classes; exact validation rules in each of the 8 `KubernetesValidatorFunctions` static methods; accurate `apiVersion`, `kind`, and `spec` descriptions on the 8 `*EntityV1alpha1` interfaces).
4. **AC-4 (Comments-only changes — review criterion)**:
   Verified by reviewing the diff of the 15 source files: only TSDoc comment blocks (`/** ... */`) are added or edited in place, with zero changes to executable statements, type signatures, release tags (`@public`, `@alpha`), or copyright years.
5. **AC-5 (Formatting step applied & changeset review criterion)**:
   Changed files in scope are formatted using the Gate 0 formatting step (`yarn prettier --write <changed paths>`, without running lint `--fix`), and `.changeset/catalog-model-tsdoc.md` names only `@backstage/catalog-model` as `patch`, written in adopter-facing prose with no internal symbols beyond the public API.

---

## Open questions for HITL

None. Scope, allowlist, off-limits paths, changeset bump level (`patch`), and acceptance criteria were frozen at Gate 0.
