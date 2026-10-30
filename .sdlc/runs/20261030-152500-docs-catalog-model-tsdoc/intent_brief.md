# Intent Brief — docs — TSDoc for undocumented exports of @backstage/catalog-model

## Job brief (user's words, verbatim)

> What to document: @backstage/catalog-model, which defines what a catalog entity is (kinds like
> Component, API, Group), how references such as component:default/foo are parsed and how entities
> are validated. 45 of its exports are marked (undocumented) in
> packages/catalog-model/report.api.md. Audience: plugin authors and other engineers who build
> against the entity model. Existing docs: update the package's source TSDoc in place, across
> kinds, relations, validation and entity helpers, then regenerate report.api.md. Match the TSDoc
> style the package already uses. Accuracy matters more than volume: describe what the code does,
> not what it sounds like it does. Acceptance criteria: yarn build:api-reports passes and
> packages/catalog-model/report.api.md contains zero (undocumented) markers. Use this exact check
> command in the contract, unchanged: yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md

### Contract check command (verbatim, unchanged)

```bash
yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md
```

### Audience

Plugin authors and other engineers who build against the entity model. Write for someone wiring a
plugin against `Entity`, a kind interface or a validator — not for a maintainer of this package.

---

## Scope findings (verification of the brief above)

## Context

`@backstage/catalog-model` (v1.10.2, `packages/catalog-model`, role `common-library`,
non-private) exposes two entry points: `.` (`src/index.ts`) and `./alpha` (`src/alpha.ts`).
API Extractor generates `report.api.md` and `report-alpha.api.md` and marks items without a
TSDoc comment as `// (undocumented)`.

Current marker counts, confirmed independently by discovery and by direct inspection:

| Report | Markers | Top-level exports | Members of documented exports |
| --- | --- | --- | --- |
| `report.api.md` | 45 | 8 | 37 |
| `report-alpha.api.md` | 25 | 1 | 24 |

The user's "45 undocumented exports" maps exactly to `report.api.md`'s marker count. The
figure is accurate as a marker count, but only 8 of the 45 are top-level exports; the other 37
are members (fields, static methods) of exports that already carry a TSDoc block. The brief
below keeps the 45 target and states the composition honestly.

`ae-undocumented` is in the `-o` omit list of `build:api-reports`, so these gaps do not fail
the build today. This is additive quality work, not a red-build fix.

In-package precedent is unambiguous:
- `CommonValidatorFunctions` documents every static with a description, `@param name - desc`
  and `@see` where a spec applies, and therefore carries zero markers. Its sibling
  `KubernetesValidatorFunctions` carries 8. That class is the style template.
- 19 interfaces in the package already carry member-level TSDoc, so documenting interface
  members is in-style here, not an invention.

The brief names kinds, relations, validation and entity helpers as the areas to cover. Verified
against the markers: **relations and entity-reference parsing are already fully documented** and
contribute zero markers — all 14 `RELATION_*` constants, plus `parseEntityRef`,
`stringifyEntityRef`, `getCompoundEntityRef` and `CompoundEntityRef` (the `component:default/foo`
parsing surface) carry TSDoc today. The 45 markers fall entirely in **kinds** (24), **validation**
(8), **entity helpers** (8 type guards) and **entity policies** (5). Those four groups are the
work; relations and ref are read-only context for writing accurate prose about the kinds that use
them.

Baseline verification before any change: `CI=1 yarn test packages/catalog-model` →
64 suites / 893 tests passing; working tree clean at `f20fd9b`.

### Auth mode — vendor, with ANTHROPIC_API_KEY waived

Auth mode is `vendor` and stays `vendor`. `ANTHROPIC_API_KEY` is unset and is **waived by the
person's explicit decision**: the run's policy `flash-agsdk-only-v38` declares
`required_env: []` and `requires_vertex_adc: true`, so every typist on it signs with Google Cloud
ADC and no Anthropic key is on its path. If the run's start check flags the missing key, proceed
past that one finding. Any other start-check failure still halts the run.

### Repo-state notes carried into the run

- **Husky `pre-commit` runs `lint-staged`** (`eslint --fix` + `prettier --write` on `.ts`,
  `prettier --write` + `check-docs-quality` on `.md`). The run makes no commits, so this hook never
  fires during it — it will apply when the person commits the result themselves.
- **`.sdlc/` is excluded through `.git/info/exclude` on this machine**, which is sufficient for
  this run. `.gitignore` is **off-limits** and the run makes no `.gitignore` change. (For the
  record: that exclude file is machine-local, so a fresh clone or CI checkout would see run
  artifacts as untracked. Out of scope here by decision.)
- **`.claude/CLAUDE.md` is a symlink to `../AGENTS.md`** — one instruction source presented under
  two paths. Both are off-limits; neither is ever a write target.
- The proposed test command comes from the project instructions (`AGENTS.md`), which require `CI=1`
  and a path argument, and forbid `yarn build`, `changesets version` and `yarn release` outright.

## Goal

Clear all 45 `// (undocumented)` markers from `packages/catalog-model/report.api.md` by adding
accurate TSDoc to the source declarations behind them, then regenerate the API reports.

Write for plugin authors and engineers building against the entity model. Accuracy matters more
than volume: describe what the code does, not what it sounds like it does. Match the TSDoc style
the package already uses.

Work, grouped by owning file:

1. **`src/entity/conditions.ts` — 8 top-level exports.** `isApiEntity`, `isComponentEntity`,
   `isDomainEntity`, `isGroupEntity`, `isLocationEntity`, `isResourceEntity`, `isSystemEntity`,
   `isUserEntity`. Each already has `/** @public */` with no prose. Add a one-line description
   and `@param entity - ...`. State that the check is a case-insensitive comparison of
   `entity.kind` and that the function is a TypeScript type guard narrowing to the kind's
   interface — both are true of the implementations as written.

2. **`src/validation/KubernetesValidatorFunctions.ts` — 8 static members.**
   `isValidApiVersion`, `isValidKind`, `isValidObjectName`, `isValidNamespace`,
   `isValidLabelKey`, `isValidLabelValue`, `isValidAnnotationKey`, `isValidAnnotationValue`.
   Follow `CommonValidatorFunctions` exactly: description, `@param value - The value to check`,
   and `@see` the relevant Kubernetes naming/syntax doc where one applies. Describe the rule
   each function actually enforces (read the implementation; several delegate to
   `CommonValidatorFunctions.isValidDnsLabel` / `isValidPrefixAndOrSuffix`).

3. **`src/kinds/*.ts` — 24 interface members.** `apiVersion`, `kind`, `spec` on the eight kind
   interfaces: `ApiEntityV1alpha1`, `ComponentEntityV1alpha1`, `DomainEntityV1alpha1`,
   `GroupEntityV1alpha1`, `LocationEntityV1alpha1`, `ResourceEntityV1alpha1`,
   `SystemEntityV1alpha1`, `UserEntityV1alpha1`. Document what the field means for that kind,
   not a generic restatement of its type. Each interface's own TSDoc block stays as it is.

4. **`src/entity/policies/*.ts` — 5 members.** The `enforce` method on
   `DefaultNamespaceEntityPolicy`, `FieldFormatEntityPolicy`,
   `GroupDefaultParentEntityPolicy`, `NoForeignRootFieldsEntityPolicy`,
   `SchemaValidEntityPolicy`. Describe what each policy does to or asserts about the entity,
   and its return/throw behaviour as implemented.

5. **Regenerate the reports only** — run `yarn build:api-reports`. The run makes **no
   commits**: regenerated reports are left in the working tree for the person to review and
   commit themselves.

6. **Changeset.** No pending changeset names `@backstage/catalog-model` (38 pending checked),
   so add one: `patch` (TSDoc-only, no API surface change; package is ≥ 1.0.0 and this is
   neither a new API nor a breaking change). Message written for adopters in plain language,
   naming no internal symbols beyond the public exports themselves.

## Files in scope

- `packages/catalog-model/src/entity/conditions.ts`
- `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts`
- `packages/catalog-model/src/kinds/ApiEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/ComponentEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/DomainEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/GroupEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/LocationEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/ResourceEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/SystemEntityV1alpha1.ts`
- `packages/catalog-model/src/kinds/UserEntityV1alpha1.ts`
- `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/NoForeignRootFieldsEntityPolicy.ts`
- `packages/catalog-model/src/entity/policies/SchemaValidEntityPolicy.ts`
- `packages/catalog-model/report.api.md` (regenerated, never hand-edited)
- `packages/catalog-model/report-alpha.api.md` (regenerated; may move if a shared
  declaration documented above is re-exported from `./alpha`)
- `.changeset/<new-file>.md` (one new changeset)

## Files off-limits

Project defaults from discovery, plus:

- `.git/**`, `.sdlc/**`, `node_modules/**`, `dist/**`, `dist-types/**`, `dist-workspace/**`,
  `build/**`, `coverage/**`, `*.tsbuildinfo`
- `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md` — competing agent
  instruction sources; read-only reference, never a write target
- `.env`, `.env.*`, `.envrc`
- `yarn.lock`, `.yarn/**`, `.husky/**`, `.patches/**`
- `**/CHANGELOG.md`, `**/knip-report.md`, `**/catalog-info.yaml` — machine-maintained
- `tsconfig.json`, `.eslintrc.js`, `prettier.config.js` — config, per CLAUDE.md
- `packages/catalog-model/src/**/*.test.ts` — no test changes; TSDoc is comment-only and the
  893-test baseline is the regression check
- `docs/reference/**`, `docs/**/*.api.mdx`, `docs/**/*.info.mdx` — generated API reference
- Every other package under `packages/**` and `plugins/**`

## Acceptance criteria

- `AC-1` The contract check command passes, verbatim and unchanged:
  ```bash
  yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md
  ```
  This is the single authoritative acceptance check: it both regenerates the reports and
  asserts zero remaining markers.
- `AC-2` `CI=1 yarn test packages/catalog-model` passes: 64 suites / 893 tests, matching the
  pre-run baseline exactly. No test file is modified.
- `AC-3` `yarn tsc` passes from the project root.
- `AC-4` Reports are the generated output, not hand edits: re-running
  `yarn build:api-reports` leaves no further diff.
- `AC-5` `yarn lint --fix` and `yarn prettier --check` report no issues on the touched files.
- `AC-6` Every TSDoc block is accurate against the implementation it documents: no invented
  parameters, no described behaviour the code does not have, no copied-and-adapted text from a
  sibling whose logic differs. A wrong comment is worse than a missing one.
- `AC-7` Release tags are reused exactly as the report already shows them — never promote an
  `@alpha` to `@public`. `--validate-release-tags` is active, so a doc comment added with the
  wrong tag turns today's silent omission into a hard build failure. Documented *members* of a
  type carry no release tag of their own (verified: `CatalogModelLayer.layerId`); only the
  enclosing declaration does.
- `AC-8` `@param` uses the `name - description` form required by STYLE.md:234.
- `AC-8b` Tag order within a block follows the package convention: description, then
  `@remarks`, then the release tag, then `@param`. See `.sdlc/baseline/stack-profile.md`.
- `AC-9` One new changeset exists naming `@backstage/catalog-model` at `patch`, adopter-facing
  in wording.
- `AC-10` Copyright headers on existing files are untouched, including their original years.

## Non-goals

- The 25 markers in `report-alpha.api.md` are not a target. Only incidental movement caused by
  documenting a shared declaration in scope above is accepted.
- No code behaviour change, no signature change, no refactor, no renaming, no reordering of
  declarations.
- No new tests; no edits to existing tests.
- No README, `/docs`, or ADR changes — this run is TSDoc only.
- No suppression-list change: `ae-undocumented` stays in the `-o` omit list. The goal is to
  remove the markers, not to start enforcing them.
- **No commits.** The run writes files and regenerates reports; staging, committing and
  pushing are the person's. No `git add`, no `git commit`, no branch or tag change.
- No opening of a pull request.
- No `.gitignore` change.
