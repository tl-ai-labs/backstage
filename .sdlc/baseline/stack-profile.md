# Stack profile — learned from repo scan

Built: 2026-10-29 · git HEAD `f20fd9b598285c88401406b3812fe00d7708136c` (clean)
Run: `20261029-refactor-react18` · trigger: `adaptive_profile: true` (no pre-authored adapter matches; shipped set is generic / nest / python)
Tier 1 refresh decision was `cached` — Tier 1 was not re-scanned. This document is Tier 2b only.

Scope note: this profile was sampled against the confirmed scope in
`.sdlc/runs/20261029-refactor-react18/intent_brief.md` (React 17 removal). It profiles the
conventions that scope touches, not the whole 235-package monorepo.

## Language & runtime

TypeScript monorepo, Yarn 4.18.1 workspaces (`packages/*`, `plugins/*` only — 235 packages).
Node `22 || 24`. Root `tsconfig.json` extends `@backstage/cli/config/tsconfig.json`, sets
`"jsx": "react-jsx"` (automatic runtime — no `import React` needed, and see the lint ban below)
and `useUnknownInCatchVariables: false`. Type checking is root-only: `yarn tsc`.

Every package has `"backstage": { "role": ... }`. The role drives jest environment selection,
peer-dep expectations and bundling. Roles in this run's scope: `web-library`
(test-utils, ui, frontend-plugin-api, dev-utils, frontend-dev-utils), `frontend-plugin`
(plugin-techdocs), `cli-module` (cli-module-build, cli-module-test-jest), `cli` (repo-tools).
Roles `cli`/`frontend`/`backend` are **exempt from peer-dep rules entirely** (`isStandaloneApplication`
in peer-deps.ts) — so `packages/repo-tools` itself is not one of the 56 manifests.

## Framework

Backstage's own framework, with two parallel frontend systems that coexist:
`core-*` packages are the **old** frontend system, `frontend-*` packages are the **new** one.
Both are in this run's scope and must keep working. Orchestration is `@backstage/cli`'s own
`repo` subcommands (`backstage-cli repo test|lint|fix`) plus `backstage-repo-tools` — there is
no Nx/Turbo/Lerna, so generic monorepo adapter advice about `nx test <pkg>` or
`turbo run test --filter` is wrong here.

## Conventions detected

### The 56 peer-dependency manifests are generated, not hand-written

This is the single most important finding for this run. **Do not hand-edit the 56 manifests as
the primary change.** The authoritative source is a table of constants in
`packages/repo-tools/src/commands/peer-deps/peer-deps.ts`:

```ts
const peerDependencies = {
  '@types/react': '^17.0.0 || ^18.0.0',
  react: '^17.0.0 || ^18.0.0',
  'react-dom': '^17.0.0 || ^18.0.0',
  'react-router-dom': '^6.30.2',
};

// Packages that have dropped React 17 support and only support React 18+
const peerDependenciesReact18Only = {
  '@types/react': '^18.0.0',
  react: '^18.0.0',
  'react-dom': '^18.0.0',
  'react-router-dom': '^6.30.2',
};

const react18OnlyPackages = new Set(['@backstage/ui']);
```

`yarn lint:peer-deps` validates; `backstage-repo-tools peer-deps --fix` rewrites manifests to
match. CI runs the non-fix form (`.github/workflows/ci.yml:111`), so any manifest that disagrees
with these constants **fails CI**. The correct shape of this change is: edit the constants
(fold `peerDependenciesReact18Only` into `peerDependencies`, drop the
`react18OnlyPackages` / `getExpectedPeerDependencies` exception since `@backstage/ui` becomes the
default), then run the `--fix` form to propagate to all 56 manifests. Hand-editing 56 files
risks drift the linter will reject.

Note `desiredLocalVersionsOfDependencies` is a _separate_ table (`react: '^18.0.2'`,
`@types/react: '^18.0.0'`) governing **devDependencies**, which are already React 18-only
in every sampled package. Only the peer table carries React 17. Do not conflate them.

The fixer writes with `` `${JSON.stringify(packageJson, null, 2)}\n` `` — 2-space indent,
trailing newline, key order preserved from the in-memory object.

### Peer-dependency block shape and its actual variance

All 56 were enumerated and compared. Variance is far lower than `AGENTS.md`'s
"conventions are package-local" warning would suggest — but it is not zero:

- **53 of 56** carry exactly `@types/react`, `react`, `react-dom`, `react-router-dom`,
  in that alphabetical order, with `react-router-dom: ^6.30.2`.
- **`plugins/permission-react`** has **no `react-router-dom`** at all — only the three React
  entries. A blind find/replace that assumes a 4-key block will corrupt it.
- **`plugins/scaffolder-react`** additionally has `react-router: ^6.30.3` (note: `.3`, while
  `react-router-dom` is `^6.30.2` — an existing inconsistency, leave it alone).
  `packages/module-federation-common` has `react-router: ^6.30.2`.
- Packages carrying extra peers that must be preserved: `module-federation-common`
  (`@emotion/react`, `@material-ui/core`, `@material-ui/styles`, `@mui/material`),
  `theme` (`@material-ui/core`), `test-utils` / `frontend-test-utils` /
  `techdocs-addons-test-utils` (`@testing-library/dom ^10.0.0`, `@testing-library/react ^16.0.0`),
  `catalog-react` / `scaffolder-react` (`@backstage/frontend-test-utils: workspace:^`).
- **`peerDependenciesMeta` is uniform across all 56**: exactly `@types/react: { optional: true }`
  and nothing else. `@types/jest: "*"` is also marked optional where present
  (test-utils, frontend-test-utils) — that is in `peerDependencies`, with meta.
  The brief's instruction to "preserve existing optional-peer metadata" resolves to: leave
  `peerDependenciesMeta` blocks byte-identical. Only `@types/react` is in
  `optionalPeerDependencies` in peer-deps.ts, so the fixer will re-add it if removed.

Raw shape, from `packages/theme/package.json` (representative):

```json
  "peerDependencies": {
    "@material-ui/core": "^4.12.2",
    "@types/react": "^17.0.0 || ^18.0.0",
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0",
    "react-router-dom": "^6.30.2"
  },
  "peerDependenciesMeta": {
    "@types/react": {
      "optional": true
    }
  }
```

The already-migrated target shape is visible in `packages/ui/package.json` — use it as the
style reference for the other 55, since it is the one package already on React 18-only.

The 2 private manifests are `app-example-plugin` (`packages/app-example-plugin`) and
`@internal/plugin-todo-list` (`plugins/example-todo-list`). Note the latter's package **name**
is `@internal/plugin-todo-list`, not `example-todo-list` — relevant if anything keys off names.

### A commit hook re-sorts every staged package.json

`lint-staged` on `package.json` runs, in order:
`backstage-repo-tools generate-catalog-info` → `git add */catalog-info.yaml` →
`node ./scripts/sort-package-json.mjs`. That last script runs `sort-package-json` with
a forced lead order of `name, version, description, backstage, publishConfig` and rewrites the
file as `JSON.stringify(pkg, null, 2) + '\n'`. So key order and formatting in a manifest are
**not** the typist's to decide — write valid JSON in the existing order and let the hook
normalize. Post-commit content is authoritative.

One correction to the Tier 1 note carried in the brief: `generate-catalog-info` derives only
`metadata.name`/`title`/`description` from `package.json` (verified in
`generate-catalog-info.ts`; sampled `catalog-info.yaml` contains no dependency data). Changing
only peer ranges will therefore regenerate catalog-info files to _identical_ content. Expect the
hook to run, but expect no catalog-info diff. If one appears, something else changed.

### Copyright headers are eslint-enforced and auto-replaced

Not a manual convention. Root `.eslintrc.js` enables `notice/notice` with
`templateFile: ./scripts/templates/copyright-header.txt` and
**`onNonMatchingHeader: 'replace'`**. The template is:

```
/*
 * Copyright <%= YEAR %> The Backstage Authors
 ...
 */
```

Consequences a generic adapter gets wrong:

- For a **new** file, write the block with the current year (2026) — or just write the file and
  let `yarn lint --fix` / the pre-commit hook insert it.
- For an **existing** file, `AGENTS.md` says do not bump the year, and the rule agrees: existing
  headers match the template structurally (only `YEAR` differs) so they are left alone. Observed
  years in this run's files span 2020–2026 (`useRouteRef.tsx` 2020, `useBreakpoint.ts` 2025,
  `testingLibrary.ts` 2026). **Do not normalize them.**
- `.eslintrc.js` is itself in `.prettierignore` — don't reformat it.

### React import style is lint-banned, which constrains the ReactDOM work

Root `.eslintrc.js` has `no-restricted-syntax` rules that **error** on any default _or_
namespace import from `'react'`:

```
"ImportDeclaration[source.value='react'] :matches(ImportDefaultSpecifier, ImportNamespaceSpecifier)"
```

So `import React from 'react'` and `import * as React from 'react'` are both forbidden
(`react/react-in-jsx-scope` is `off`, JSX runtime is automatic). Named imports only:
`import { useMemo } from 'react'`.

Note the rule targets `'react'` **only, not `'react-dom'`** — the existing
`ReactDOM.render` sites reach ReactDOM through dynamic `import()`, not a static default import,
so this rule is not what forced that shape (see next section). When converting, prefer the
named-import form `import { createRoot } from 'react-dom/client'` for consistency with the
codebase's named-import habit.

### The ReactDOM conditional is a lazy-Promise pattern, not a plain import

All three render sites share one shape. From
`plugins/techdocs/src/reader/transformers/renderReactElement.ts` (the whole file, post-header):

```ts
let ReactDOMPromise: Promise<
  typeof import('react-dom') | typeof import('react-dom/client')
>;
if (process.env.HAS_REACT_DOM_CLIENT) {
  ReactDOMPromise = import('react-dom/client');
} else {
  ReactDOMPromise = import('react-dom');
}

/** @internal */
export function renderReactElement(element: JSX.Element, root: HTMLElement) {
  ReactDOMPromise.then(ReactDOM => {
    if ('createRoot' in ReactDOM) {
      ReactDOM.createRoot(root).render(element);
    } else {
      ReactDOM.render(element, root);
    }
  });
}
```

Identical structure in `packages/dev-utils/src/devApp/render.tsx` (lines ~57-65 and ~320-328)
and `packages/frontend-dev-utils/src/createDevApp.tsx` (lines ~118-125 and ~114-123).

**The trap:** the `import()` is dynamic and the render is inside `.then()`. Collapsing this to a
static `import { createRoot } from 'react-dom/client'` makes rendering **synchronous** and
changes observable timing — tests that currently `await waitFor(...)` for the render to land
depend on it being async. `dev-utils/src/devApp/render.tsx` also has a bare side-effect
`import 'react-dom';` at line 53 that exists to keep the dependency resolvable; decide
deliberately whether it goes.

`config.ts` explains why the env flag exists at all, and the comment should go with it:

```ts
// This allows for conditional imports of react-dom/client, since there's no way
// to check for presence of it in source code without module resolution errors.
'process.env.HAS_REACT_DOM_CLIENT': JSON.stringify(hasReactDomClient()),
```

It appears **twice** in `config.ts` (both DefinePlugin branches, ~lines 274 and 283) — both must
go. `hasReactDomClient()` has a second consumer at
`packages/cli-module-build/src/commands/package/start/startFrontend.ts:45`, and a third,
independent copy of the same `require.resolve` probe lives in
`packages/cli-module-test-jest/config/jest.js:51-58` (sets `process.env.HAS_REACT_DOM_CLIENT = true`).
Three removal sites, not one.

`packages/cli-module-build/src/lib/bundler/server.ts:282` is a separate string fix — the React 16
warning currently says "Please upgrade to React 17", inside an emoji-bordered ASCII banner whose
column alignment is hand-maintained. Changing "17" to "18" preserves width; a longer rewrite
would break the banner.

### The external-store shim

Only **2** source files import it, both as a named import from the `/shim` subpath:

```ts
import { useSyncExternalStore } from 'use-sync-external-store/shim';
```

`packages/ui/src/hooks/useBreakpoint.ts:17` and
`packages/frontend-plugin-api/src/routing/useRouteRef.tsx:18`. Both become
`import { useSyncExternalStore } from 'react'` — merge into the existing named `react` import
on the adjacent line (`useBreakpoint.ts:16` already has `import { useMemo } from 'react'`;
`useRouteRef.tsx:17` likewise) rather than adding a second `react` import line.

Manifest declarations to drop: `packages/ui/package.json` (`use-sync-external-store` at :59 in
`dependencies`, `@types/use-sync-external-store` at :70 in `devDependencies`),
`packages/frontend-plugin-api/package.json` (:53, :64), `plugins/app/package.json` (:78 —
dependency only, no `@types`, and **no source file in `plugins/app` imports it**, so it is a
pure manifest removal).

Both call sites pass the 3-arg form `(subscribe, getSnapshot, getServerSnapshot)`. React's
native hook has the same signature, so no call-site change — but `useBreakpoint.ts` relies on
`getServerSnapshot` for SSR and the brief explicitly keeps server-rendering helpers, so retain
the third argument.

Neither `useRouteRef.test.tsx` nor any test references the shim or `useSyncExternalStore`
directly — no test updates needed for this part.

### Test shape — genuinely package-local, as AGENTS.md warns

`AGENTS.md` says consistency within a package beats consistency across the repo, and the sampled
tests bear that out. Match the file you are editing, not a repo-wide ideal:

- **`packages/test-utils`** uses the **destructured-result** style and does _not_ use `screen`
  (only 1 file in the package references `screen.`). From `appWrappers.test.tsx`:

  ```ts
  const rendered = await renderInTestApp(Foo);
  expect(rendered.getByText('foo')).toBeInTheDocument();
  ```

  It also uses a local `withLogCollector(['error'], async () => {...})` helper from
  `./logCollector` to assert on console output — an in-package idiom with no generic equivalent.

- **`packages/ui`** uses `screen` widely (24 files) and `renderHook` for hooks:

  ```ts
  const { result, rerender } = renderHook(
    ({ isVisible }) => useDelayedVisibility(isVisible, 300),
    { initialProps: { isVisible: false } },
  );
  act(() => jest.advanceTimersByTime(299));
  ```

- **`packages/frontend-dev-utils/src/createDevApp.test.tsx`** is the file the brief changes, and
  it is the most idiosyncratic. It uses `jest.isolateModules` + `require` behind a
  `loadCreateDevAppIsolated()` helper, because the module under test reads
  `process.env.HAS_REACT_DOM_CLIENT` **at module load time**. It saves/restores
  `process.env` around each test, uses `within(document.body)` plus `findByText` with an
  explicit `{ timeout: 10000 }`, sets `jest.setTimeout(15000)`, and mocks `react-dom/client`
  via `jest.doMock('react-dom/client', () => ({ __esModule: true, createRoot }))`.

  The test to delete is `'should fall back to legacy react-dom rendering when createRoot is
unavailable'` (lines 150-192), which `delete process.env.HAS_REACT_DOM_CLIENT` and mocks
  `react-dom`. Keep the other three (plugin render, `bindRoutes` forwarding, missing-root error),
  per the brief. Once the env flag is gone, `loadCreateDevAppIsolated` and the
  `process.env` save/restore scaffolding may become dead — check whether the remaining
  `bindRoutes` test still needs module isolation (it calls `jest.resetModules()` itself and
  relies on `doMock`, so it probably does; do not delete the helper reflexively).

AGENTS.md's own test guidance, which the architect should carry into the spec: prefer fewer
thorough tests with multiple assertions; prefer `screen` and `.findBy*` over `waitFor`; avoid
adding test IDs. Note the existing `createDevApp.test.tsx` uses `waitFor` — when editing it,
the in-package precedent and the repo guidance conflict; the brief says only to drop
legacy expectations, so do not opportunistically rewrite the surviving `waitFor` calls.

Enforced testing-library lint rules (root `.eslintrc.js`, all `error`):
`await-async-queries`, `await-async-utils`, `no-await-sync-queries`, `no-dom-import`,
`no-wait-for-side-effects`, `await-async-events`. `no-wait-for-side-effects` is the one most
likely to bite when editing `waitFor` blocks.

No package in scope has its own `jest` field except `packages/cli-module-build`
(`coveragePathIgnorePatterns: ['/node_modules/', '/__fixtures__/']`). There are **no per-package
jest setup files** in the sampled packages — jest config is centralized in
`packages/cli-module-test-jest/config/jest.js`, which picks the environment from the
package's `backstage.role` (`FRONTEND_ROLES` → jsdom, `NODE_ROLES` → node).

### Test command

Per-package scripts are all `backstage-cli package test`. The repo's own instruction
(`AGENTS.md`) is to run from the root, scoped, always with a path:

```
CI=1 yarn test <path>
```

Root `test` script is `NODE_OPTIONS='--experimental-vm-modules' backstage-cli repo test`. The
`NODE_OPTIONS` matters — ESM-only deps fail without it. Do not invent `yarn workspace <pkg> test`
or `jest <path>`; and do not run unscoped (235 packages).

### api-report regeneration

216 `report.api.md` files exist, one per published package, generated by API Extractor. Header of
each: `> Do not edit this file. It is a report generated by [API Extractor]` — so the file is
**never hand-edited**, despite the brief listing it as a file in scope. Regenerate with:

```
yarn build:api-reports
```

(= `backstage-repo-tools api-reports --sql-reports --allow-warnings ... --validate-release-tags --tsc`).
It is repo-wide and memory-hungry (`--max-old-space-size=8192`, `LANG=en_US.UTF-8` is set
deliberately — locale affects sort order in the output, so dropping it produces spurious diffs).
CI verifies with `yarn build:api-reports:only --ci --docs` then `node scripts/verify-api-reference.js`.

`report.api.md` files are in `.prettierignore` (`report.api.md`, `report-*.api.md`) — do not
prettier them.

For `packages/test-utils` specifically, the removal of `LegacyRootOption` touches 3 places in
`report.api.md`: the type declaration at line 73, and the two signatures at lines 321-323
(`renderInTestApp`) and 327-329 (`renderWithEffects`). `report-alpha.api.md` does **not**
mention it — only the main report changes. Let the tool produce the diff; do not write it by hand.

`knip-report.md` files also exist per package (`build:knip-reports`) and are prettier-ignored.
Removing the `use-sync-external-store` deps may change `packages/ui/knip-report.md` and
`packages/frontend-plugin-api/knip-report.md`, both of which currently list _other_ unused
deps (`@tanstack/react-table`, `globals`, `glob`; `@backstage/frontend-app-api`). Those
pre-existing entries are not this run's to fix.

### The `@public` / `@internal` release-tag discipline

Every exported symbol carries a TSDoc release tag, and `--validate-release-tags` enforces it.
The tag sits inside the doc comment, conventionally as the last line:

```ts
/**
 * @public
 * Set legacy mode when using React 18/RTL 13+.
 * Mock this option while we're working against React 17 or lower.
 */
export type LegacyRootOption = { legacyRoot?: boolean };
```

`LegacyRootOption` is exported from `packages/test-utils/src/testUtils/testingLibrary.ts:30`
and re-exported via the barrel `packages/test-utils/src/testUtils/index.tsx:28`
(`export * from './testingLibrary';`) — a star export, so removing the type needs no barrel edit.
It has **zero consumers** anywhere in `packages/` or `plugins/` beyond its two definition sites
(`appWrappers.tsx:38,257,265,269` and `testingLibrary.ts:30,46`). Only `docs/releases/` mentions
it, and that is off-limits. So the removal is self-contained.

### Changesets — the repo is in prerelease mode

This is the finding most likely to be missed. `.changeset/pre.json` exists with
`mode: "pre"`, `tag: "next"`, and 38 already-consumed changesets. Package versions in scope read
e.g. `1.7.24-next.0`, `0.18.3-next.0`. The repo is mid-prerelease.

- **39 changeset `.md` files are pending** (plus `README.md`, `config.json`, `pre.json`,
  `backstage-changelog.js`, which are not changesets).
- Bump distribution across them: **44 patch, 9 minor, 0 major.**
- `config.json`: `baseBranch: master`, `commit: false`, `access: public`,
  `updateInternalDependencies: patch`, custom `changelog: ./backstage-changelog.js`,
  and `onlyUpdatePeerDependentsWhenOutOfRange: true` under
  `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH` — **this last one is why narrowing a peer
  range matters**: it controls whether peer-dependent packages get bumped when a peer range
  changes.

File format — single-quoted package names, one per line, blank line, then prose:

```markdown
---
'@backstage/plugin-kubernetes-common': patch
'@backstage/plugin-kubernetes-cluster': patch
---

Moved `kubernetes-models` and `@kubernetes-models/apimachinery` to dev dependencies, since they are only used for types. Backends no longer install `kubernetes-models` through `@backstage/plugin-kubernetes-common`.
```

Filenames are kebab-case and **descriptive, not the changesets CLI's random animal names** for
hand-written ones (`techdocs-toc-alignment.md`, `type-only-deps-kubernetes.md`,
`ts7-eslint-plugin-import-rules.md`), though generated-name files do exist
(`tidy-birds-mock.md`, `four-dingos-filter.md`). Prefer a descriptive name.
`AGENTS.md` forbids using the changeset CLI at all — create the file directly.
Changeset `.md` files are prettier-formatted on commit (`*.md` → `prettier --write`) and also
run through `node ./scripts/check-docs-quality`.

Breaking changes are marked in prose with a leading **`**BREAKING**`** marker, not by a
`major` bump. From `tidy-birds-mock.md` (a `minor`):

```markdown
---
'@backstage/frontend-test-utils': minor
---

**BREAKING** Updated `renderInTestApp` and `renderTestApp` to provide default API implementations...
```

Per `AGENTS.md`: breaking → `minor` below 1.0.0, `major` at or above. Applied to this run:
`@backstage/test-utils` is at **1.7.24-next.0**, i.e. ≥ 1.0.0, so removing the `@public`
`LegacyRootOption` is a **`major`**. That would be the only `major` among 39 pending
changesets — worth flagging to the human before writing it, since a major in the middle of a
`-next` prerelease train is a release-management decision, not a mechanical one.
`@backstage/ui` (0.19.0), `frontend-plugin-api` (0.18.3-next.0), `cli-module-build` (0.1.10-next.0),
`frontend-dev-utils` (0.1.8-next.0), `cli-module-test-jest` (0.1.8-next.0) are all < 1.0.0 → `minor`
for breaking. `@backstage/plugin-techdocs` (1.19.1-next.0) and `@backstage/dev-utils`
(1.1.29-next.0) are ≥ 1.0.0.

**`@backstage/ui` has a mandated changeset format** documented in `.changeset/README.md`:
must end with `**Affected components:** <comma-separated>`, must add a `**Migration:**` section
for breaking changes, and must use **no markdown headings** (`##`/`###`) inside — bold markers
only. A generic adapter will not produce this.

Existing changesets already naming packages this run touches (inspect and reuse per AGENTS.md
rather than adding duplicates): `deep-plugin-extensions.md` and `quiet-wolves-listen.md`
(both `@backstage/frontend-plugin-api: patch`), `techdocs-toc-alignment.md`
(`@backstage/plugin-techdocs: patch`).

`scripts/verify-changesets.js` (CI) enforces one rule only: a changeset must not name an
unpublished package. Its hardcoded private set is `example-app`, `example-backend`, `e2e-test`,
`storybook`, `techdocs-cli-embedded-app`. Note this set does **not** include
`app-example-plugin` or `@internal/plugin-todo-list`, the 2 private manifests in scope — they
are private via `"private": true`, so still must not get changesets, but this script won't catch
the mistake. `yarn tsc`/release would.

### Config

No `.env` files anywhere. Configuration is YAML: `app-config.yaml`, `app-config.docker.yaml`,
validated by `yarn backstage-cli config:check --lax` in CI, with per-package `config.d.ts`
schema files included in the root tsconfig. Nothing in this run's scope touches config.

### Data layer

Not applicable — the scope is frontend packages and build tooling. No ORM involved.

## CI gates this change must clear

In `.github/workflows/ci.yml` order, the ones this run can break:

1. `yarn backstage-cli pm verify-patches` — `.yarn/patches` integrity (off-limits, but don't disturb)
2. `node scripts/verify-lockfile-duplicates.js` — also a `yarn.lock` lint-staged hook with `--fix`
3. `node scripts/verify-changesets.js`
4. `node scripts/verify-local-dependencies.js`
5. **`yarn lint:peer-deps`** — the gate that makes peer-deps.ts authoritative
6. **`yarn fix --check`** (`backstage-cli repo fix --publish`) — "check for missing repo fixes";
   will fail if generated/derived files are stale
7. `yarn backstage-cli config:check --lax`
8. **`yarn tsc:full`** — note CI runs `tsc:full` (clean + `--skipLibCheck false --incremental false`),
   stricter than the local `yarn tsc` in the acceptance criteria
9. **`yarn build:api-reports:only --ci --docs`** then `node scripts/verify-api-reference.js`
10. `yarn backstage-repo-tools generate-catalog-info --ci`
11. `yarn prettier:check --cache ...`

## Sample files inspected

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (kind: generator / source of truth)
- `scripts/sort-package-json.mjs` (kind: commit-hook normalizer)
- `scripts/verify-changesets.js` (kind: CI gate)
- `packages/repo-tools/src/commands/generate-catalog-info/generate-catalog-info.ts` (kind: generator)
- All 56 affected `package.json` files (kind: manifest — peer-block signature extracted from each)
- `packages/theme/package.json`, `packages/ui/package.json`,
  `plugins/permission-react/package.json` (kind: manifest — raw shape read)
- `packages/ui/src/hooks/useBreakpoint.ts` (kind: hook / shim consumer)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (kind: hook / shim consumer)
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts` (kind: render site)
- `packages/dev-utils/src/devApp/render.tsx` (kind: render site)
- `packages/frontend-dev-utils/src/createDevApp.tsx` (kind: render site)
- `packages/frontend-dev-utils/src/createDevApp.test.tsx` (kind: test — to be edited)
- `packages/test-utils/src/testUtils/testingLibrary.ts` (kind: public API surface)
- `packages/test-utils/src/testUtils/appWrappers.tsx` (kind: public API surface)
- `packages/test-utils/src/testUtils/appWrappers.test.tsx` (kind: test — in-package idiom)
- `packages/ui/src/hooks/useDelayedVisibility.test.tsx` (kind: test — in-package idiom)
- `packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts` (kind: detection to remove)
- `packages/cli-module-build/src/lib/bundler/config.ts` (kind: bundler config)
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` (kind: CLI diagnostics)
- `packages/cli-module-build/src/lib/bundler/server.ts` (kind: CLI warning string)
- `packages/cli-module-test-jest/config/jest.js` (kind: shared jest config)
- `packages/test-utils/report.api.md`, `report-alpha.api.md` (kind: generated API report)
- `packages/ui/knip-report.md`, `packages/frontend-plugin-api/knip-report.md` (kind: generated)
- `.changeset/config.json`, `pre.json`, `README.md` + 6 changeset `.md` files (kind: changeset)
- `.eslintrc.js`, `.prettierignore`, `scripts/templates/copyright-header.txt` (kind: lint/format)
- root `package.json` (scripts + `lint-staged`), root `tsconfig.json` (kind: build config)
- `.github/workflows/ci.yml` (kind: CI)
- `packages/test-utils/catalog-info.yaml` (kind: generated metadata)

## Notes for downstream codegen

1. **Change `peer-deps.ts` first, then propagate with the tool.** The 56 manifests are
   tool-maintained and CI-verified against those constants. Hand-editing them is the
   highest-risk path available.
2. **Never hand-edit `report.api.md` or `knip-report.md`.** Run `yarn build:api-reports`.
   Both are prettier-ignored.
3. **Don't touch copyright years on existing files.** eslint owns headers; new files get 2026.
4. **Named imports from `react` only** — default and namespace imports are lint errors.
5. **Preserve the async `Promise.then` render boundary** when removing the ReactDOM conditional,
   or update the dependent `waitFor` assertions deliberately.
6. **`plugins/permission-react` has no `react-router-dom` peer**; `scaffolder-react` and
   `module-federation-common` have an extra `react-router`. No blind block replacement.
7. **`peerDependenciesMeta` stays byte-identical** — only `@types/react: { optional: true }`.
8. **Match each package's own test idiom**: `rendered.getByX` in test-utils, `screen` in ui,
   `jest.isolateModules` + env save/restore in frontend-dev-utils.
9. **Three removal sites for the env flag**: `config.ts` (×2 branches), `startFrontend.ts`,
   and the independent probe in `cli-module-test-jest/config/jest.js`.
10. **Flag the `@backstage/test-utils` major bump to the human** before writing it — it would be
    the only `major` among 39 pending changesets during an active `-next` prerelease.
11. **`@backstage/ui` changesets need `**Affected components:**` and no headings.**
12. **Reuse the 3 existing changesets** that already name `frontend-plugin-api` and
    `plugin-techdocs` where they cover the behavior, per AGENTS.md.
13. **CI runs `tsc:full`, not `tsc`.** A change that passes locally can still fail on
    `--skipLibCheck false`.
14. Expect the pre-commit hook to rewrite what you wrote (eslint --fix, prettier, manifest
    re-sort). Treat post-commit content as authoritative.

## Truncation and bounds

- Tier 1 was **not** re-scanned (refresh decision `cached`, HEAD unchanged, tree clean).
- Peer-dependency analysis was **exhaustive**, not sampled: all 56 affected manifests were
  enumerated and their peer/meta signatures compared programmatically.
- Source and test sampling was **scope-limited by design** to the files named in
  `intent_brief.md` plus 2-3 representative tests per affected package. The other ~179 workspace
  packages were not sampled; conventions outside this run's scope are not characterized here.
- Not investigated (out of scope, cost): `yarn.lock` update mechanics beyond the brief's warning,
  the `.yarn/patches` contents, `microsite/` `docs-ui/` `workspaces/` nested workspaces
  (off-limits), `backstage-changelog.js` rendering behavior, and the full
  `no-restricted-globals` list in `.eslintrc.js` (~200 entries, read partially).
- Repo-wide test health remains unmeasured, per the brief's acceptance criterion 4.
