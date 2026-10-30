# Stack profile — learned from repo scan

Built 2026-10-30T15:26:59Z from `f20fd9b5` on branch `BS-DOC-04/flash-agsdk-only-v38`.
Trigger: no pre-authored adapter matches (we ship `generic`, `nest`, `python`; this is a Backstage/React TypeScript monorepo).
Sampling focused on `packages/catalog-model`, the target of the upcoming `docs` run.

## Language & runtime

TypeScript `~5.7.0` on Node `22 || 24`, Yarn Berry `4.18.1` with workspaces (`packages/*`, `plugins/*`) and `.yarn/patches`. ESM-flavoured source compiled by `@backstage/cli`; packages publish `dist` but point `main`/`types` at `src/index.ts` in-repo so workspace consumers read source directly. Jest 30 under `--experimental-vm-modules`. Prettier 2 via `@backstage/cli/config/prettier`; ESLint 8 with `@spotify/eslint-plugin`, `eslint-plugin-notice` (enforces the license header), and `@backstage/eslint-plugin`.

## Framework

Backstage (CNCF) — a plugin-based developer-portal framework. `@backstage/catalog-model` is a **`common-library`** role package (per `backstage.role` in its `package.json`): pure types, validators, and small pure functions. No DI container, no HTTP layer, no ORM in this package.

## Conventions detected

### File naming

Two coexisting conventions, split by what the file exports:

- **PascalCase** when the file's primary export is a type/class/namespace: `Entity.ts`, `EntityEnvelope.ts`, `EntityStatus.ts`, `AlphaEntity.ts`, `EntityPolicies.ts`, `CommonValidatorFunctions.ts`, `KubernetesValidatorFunctions.ts`.
- **camelCase** when the file exports functions/factories: `ref.ts`, `conditions.ts`, `constants.ts`, `makeValidator.ts`, `entitySchemaValidator.ts`, `entityKindSchemaValidator.ts`, `entityEnvelopeSchemaValidator.ts`, `ajv.ts`, `types.ts`.

Tests sit **next to** their subject: `ref.ts` / `ref.test.ts`, `CommonValidatorFunctions.ts` / `CommonValidatorFunctions.test.ts`. Each directory (`entity/`, `kinds/`, `location/`, `model/`, `schema/`, `validation/`) has an `index.ts` barrel; the package root re-exports through `src/index.ts` with a second public surface at `src/alpha.ts`.

### License header — mandatory on every source file

```ts
/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

Enforced by `eslint-plugin-notice`. **Never change the year on an existing file** (project rule); new files use the current year.

### Package documentation comment

`src/index.ts` opens with the package-level doc, after the license header and before the re-exports:

```ts
/**
 * Types and validators that help describe the model of a Backstage Catalog
 *
 * @packageDocumentation
 */

export * from './entity';
export { EntityPolicies } from './EntityPolicies';
export type { CompoundEntityRef } from './types';
```

### TSDoc shape — type alias with member docs (the dominant pattern)

From `src/entity/Entity.ts`. Note: release tag on the outer declaration, no release tag on members, short first sentence then `@remarks` for the long part, `{@link …}` for external references, members documented inline.

```ts
/**
 * The parts of the format that's common to all versions/kinds of entity.
 *
 * @remarks
 *
 * See also:
 * {@link https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/}
 * @public
 */
export type Entity = {
  /**
   * The version of specification format for this particular entity that
   * this is written against.
   */
  apiVersion: string;

  /**
   * The high level entity type being described.
   */
  kind: string;

  /**
   * Metadata related to the entity.
   */
  metadata: EntityMeta;
};
```

Longer member docs use a blank-line-separated second paragraph inside the same comment rather than `@remarks` (see `EntityMeta.uid` / `.etag` in the same file).

### TSDoc shape — exported function

From `src/entity/ref.ts`. `@public` comes **before** `@param`/`@returns`; every `@param` has the `-` separator that API Extractor requires.

```ts
/**
 * Parses an entity reference, either on string or compound form, and returns
 * a structure with a name, and optional kind and namespace.
 *
 * @remarks
 *
 * The context object can contain default values for the kind and namespace,
 * that will be used if the input reference did not specify any.
 *
 * @public
 * @param ref - The reference to parse
 * @param context - The context of defaults that the parsing happens within
 * @returns The compound form of the reference
 */
export function parseEntityRef(
  ref: string | { kind?: string; namespace?: string; name: string },
  context?: {
    /** The default kind, if none is given in the reference */
    defaultKind?: string;
  },
): CompoundEntityRef {
```

Simpler functions drop `@remarks`:

```ts
/**
 * Extracts the kind, namespace and name that form the compound entity ref
 * triplet of the given entity.
 *
 * @public
 * @param entity - An entity
 * @returns The compound entity ref
 */
export function getCompoundEntityRef(entity: Entity): CompoundEntityRef {
```

Single-line doc comments for inline/nested members use the compact form: `/** The default kind, if none is given in the reference */`.

### TSDoc shape — short type alias

From `src/types.ts` and `src/validation/types.ts` — one-sentence description plus a release tag, nothing more:

```ts
/**
 * All parts of a complete entity ref, forming a full kind-namespace-name
 * triplet.
 *
 * @public
 */
export type CompoundEntityRef = {
  kind: string;
  namespace: string;
  name: string;
};
```

### Release tags — non-negotiable

`--validate-release-tags` is passed to `backstage-repo-tools api-reports`. Every exported declaration carries exactly one of `@public`, `@alpha`, `@beta`, `@internal`. Deprecations add `@deprecated` alongside (the API report shows `// @public @deprecated`). `src/alpha.ts` is the `@alpha` surface and gets its own `report-alpha.api.md`. When adding a doc comment to a previously undocumented export, **carry over the release tag the API report already shows for it** — do not invent one, and do not promote `@alpha` to `@public`.

### Prose style for doc text

Per `STYLE.md` §Documentation Guidelines and `docs/contribute/doc-style-guide.md`:

- First sentence is a short, indexable summary — the API reference index shows only up to `@remarks`.
- Third-person declarative ("Extracts the kind…", "Parses an entity reference…"), not imperative, not "This function…".
- `@remarks` preceded and followed by a blank line, with the body on its own line.
- `{@link Symbol}` to cross-reference, `{@link https://…}` for URLs.
- Export functions with the `function` keyword, never arrow consts (API Documenter misclassifies arrows).
- Do not destructure parameters in public signatures.

### Test shape

Jest with `describe` / `it`, co-located `*.test.ts`, a package-level `src/setupTests.ts`, and a repo-level `scripts/jest-setup.js`. Run with `CI=1 yarn test <path>` from the root. Project rule: prefer fewer thorough tests with multiple assertions over many small ones. **A TSDoc-only change should add no tests** — comments do not alter behavior.

### Config

No config layer in this package. Validation uses Ajv 8 (`src/validation/ajv.ts`, `makeValidator.ts`) with JSON Schemas under `src/schema/`; `zod ^4` is a dependency used for newer schema work. Nothing env-driven.

### Data layer

None. `catalog-model` is types + validators + pure functions, with `lodash` for utilities and `@backstage/errors` / `@backstage/types` as the only internal deps.

### Framework-owned wiring — how a new export "registers"

A symbol becomes public by being re-exported up the barrel chain: `src/<area>/<File>.ts` → `src/<area>/index.ts` → `src/index.ts` (or `src/alpha.ts` for alpha). It then appears in `report.api.md` / `report-alpha.api.md`, regenerated by `yarn build:api-reports`. For a docs-only run nothing new registers — but **the API report files still change**, because `// (undocumented)` markers disappear as comments are added. 45 such markers in `report.api.md`, 25 in `report-alpha.api.md` at scan time.

## Sample files inspected

- `packages/catalog-model/src/index.ts` (kind: package entry / barrel)
- `packages/catalog-model/src/types.ts` (kind: short type alias + TSDoc)
- `packages/catalog-model/src/entity/Entity.ts` (kind: type alias with documented members)
- `packages/catalog-model/src/entity/ref.ts` (kind: exported functions with `@param`/`@returns`)
- `packages/catalog-model/src/validation/types.ts` (kind: validator type alias)
- `packages/catalog-model/report.api.md` (kind: generated API report)
- `packages/catalog-model/report-alpha.api.md` (kind: generated alpha API report)
- `packages/catalog-model/package.json` (kind: package manifest)
- `STYLE.md` (kind: authoritative TSDoc style guide)
- `docs/contribute/doc-style-guide.md` (kind: prose style guide)

## Notes for downstream codegen

1. **Preserve the license header verbatim, year included.** Never re-emit a file without it; never bump an existing year.
2. **Release tag placement:** on the declaration's own comment, after `@remarks`, before `@param`. Reuse the tag the API report already records for that symbol.
3. **`@param name - description`** — the hyphen is required or API Extractor warns.
4. **Short first sentence, then `@remarks`** for anything longer than two lines. The index page truncates at `@remarks`.
5. **Member comments carry no release tag** — only the enclosing type/class does.
6. **Interface members that are literal discriminators** (`kind: 'Component'`, `apiVersion: 'backstage.io/v1alpha1' | …`) are the bulk of the undocumented markers in the kind entities. Document them with one short line each; resist inventing semantics not present in the code.
7. **Do not touch `*.test.ts`** for a docs job, and add no behavior.
8. **After editing, run** `yarn prettier --write <changed paths>` (explicit paths), then `yarn tsc` from the root, then `yarn build:api-reports` to regenerate both report files — do not hand-edit the generated reports.
9. **Changeset:** `@backstage/catalog-model` is published, so check `.changeset/` (39 files exist) for coverage before adding one; edit the markdown directly, never the CLI; `patch` is appropriate for docs-only on a `>=1.0.0` package; write the message for adopters with no internal symbol names.
10. **Match local style per file, not repo-wide** — the project instructions make within-package consistency the priority.
