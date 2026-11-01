# Requirements: require React 18 and remove React 17 compatibility code

Run `20261101-150500-refactor-require-react-18`. Job: `refactor`. Base: `f20fd9b59828`. Issue: backstage/backstage#35718.

A refactor's requirements state what changes and what must be preserved. React 18 users must see no change, apart
from the accepted exceptions in section "Preserved behaviour".

## In scope

1. Narrow the `react`, `react-dom` and `@types/react` peer ranges in all 56 manifests that carry `^17.0.0 || ^18.0.0`
   (54 public, 2 private).
2. Change the repo's peer-range source of truth (`packages/repo-tools/src/commands/peer-deps/peer-deps.ts`).
3. Use React's own `useSyncExternalStore` and `useId`.
4. Replace the legacy render paths with `react-dom/client` and `createRoot`.
5. Remove the `HAS_REACT_DOM_CLIENT` flag from the CLI and its consumers.
6. Update the CLI diagnostics to name React 18 as the minimum.
7. Remove `LegacyRootOption` from `@backstage/test-utils`.
8. Remove two unused test dependencies.
9. Update the four scaffolding templates that allow React 16 or 17.
10. Update three tutorials, add changesets, regenerate API and knip reports, and add `.sdlc/` to `.gitignore`.

## Out of scope

1. Removing React 17 from repository tooling. `react@17.0.2` stays in `yarn.lock` through `@yarnpkg/libui`, and Yarn's
   bundled executables stay as they are.
2. Adding React 19 support, or changing `microsite/`, `docs-ui/` or `workspaces/`.
3. Changing the JSX compiler configuration, `tsconfig.json` or any lint config.
4. Replacing `act` imports from `react-dom/test-utils`.
5. Removing third-party transitive `use-sync-external-store`, server-rendering helpers, or old frontend system and
   router compatibility that does not depend on removed React APIs.
6. Editing `docs/releases/**` or any `CHANGELOG.md`, or editing `.changeset/pre.json`.
7. Committing, pushing or opening a pull request.
8. Fixing tests that already fail before this run. They are reported, not fixed.

## Functional requirements

### Peer ranges and tooling

- **FR-1** Every manifest among the 56 declares `react`, `react-dom` and `@types/react` (those it already declares) as
  `^18.0.0` in `peerDependencies`. `peerDependenciesMeta`, including any `optional` flag, is unchanged.
- **FR-2** `peer-deps.ts` requires `^18.0.0` for `react`, `react-dom` and `@types/react` by default, and the
  React-18-only exception list (`react18OnlyPackages` and its separate range table) is gone. `yarn lint:peer-deps`
  enforces the new range on all packages.
- **FR-3** `yarn.lock` is regenerated with `yarn install` and matches the manifests. `react@17.0.2` may remain through
  `@yarnpkg/libui`.

### Native hooks

- **FR-4** `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` and `packages/ui/src/hooks/useBreakpoint.ts`
  import `useSyncExternalStore` from `react`. Call sites and arguments are unchanged.
- **FR-5** `use-sync-external-store` is removed from `packages/frontend-plugin-api`, `packages/ui` and `plugins/app`,
  and `@types/use-sync-external-store` from `packages/frontend-plugin-api` and `packages/ui`.
- **FR-6** `Popover`, `Tooltip`, `Table` and `TablePagination` under `packages/ui/src/components/` import `useId` from
  `react` instead of `react-aria`. Any other import from `react-aria` in those files stays.

### Render paths

- **FR-7** `packages/dev-utils/src/devApp/render.tsx`, `packages/frontend-dev-utils/src/createDevApp.tsx` and
  `plugins/techdocs/src/reader/transformers/renderReactElement.ts` render only through `react-dom/client` and
  `createRoot`. The conditional import and the `ReactDOM.render` fallback are gone. Each function's public signature
  and its sync or async behaviour are unchanged.
- **FR-8** `createDevApp.test.tsx` drops or rewrites only the case that exercises the legacy path. Every other case in
  that file is unchanged.

### CLI

- **FR-9** `process.env.HAS_REACT_DOM_CLIENT` is removed from both bundler branches in
  `packages/cli-module-build/src/lib/bundler/config.ts` and from `packages/cli-module-test-jest/config/jest.js`.
  `hasReactDomClient.ts` is deleted, along with the comment in `config.ts` that explains the flag.
- **FR-10** A user who starts the frontend with a React below 18 still gets a diagnostic. It names React 18 as the
  minimum and links to `https://backstage.io/docs/tutorials/react18-migration/`. `server.ts`'s check covers every
  version below 18, not only `16.`. `startFrontend.ts` no longer depends on `hasReactDomClient`, and the spec states
  whether its warning moves to, or is replaced by, the version check. A React 18 user sees no diagnostic and no new
  output.

### Test utilities and test dependencies

- **FR-11** `LegacyRootOption` and all `legacyRoot` forwarding are removed from `packages/test-utils`, including any
  path that passes the option on at runtime. `renderWithEffects` and `renderInTestApp` behave the same for callers that
  never set it.
- **FR-12** Migration guidance for external consumers of `LegacyRootOption` is published in the changeset and in
  `docs/tutorials/react18-migration.md`.
- **FR-13** `@testing-library/react-hooks` is removed from `packages/core-app-api` and `react-test-renderer` from
  `plugins/catalog-react`.

### Templates, docs and release

- **FR-14** The four `packages/cli-module-new/templates/*/package.json.hbs` files (`frontend-plugin`,
  `legacy-frontend-plugin`, `plugin-web-library`, `scaffolder-field-extension-module`) use the React 18 range wherever
  they allow React 16 or 17, keeping each file's own `versionQuery` form.
- **FR-15** `docs/tutorials/react18-migration.md` and `docs/tutorials/migrate-to-mui5.md` state that React 18 is
  required. The React 17 future-configuration statement in `docs/tutorials/jsx-transform-migration.md` is reconciled,
  in wording only.
- **FR-16** Changesets cover every published package whose release this changes: `minor` for packages below 1.0.0,
  `major` at 1.0.0 or above when the change is breaking for them. Today 17 of the 54 public packages are at or above
  1.0.0. The other changed packages (for example `@backstage/frontend-plugin-api`, `@backstage/ui`,
  `@backstage/repo-tools` and the CLI modules) are classified by the same rule. Each message is written for adopters
  and names no internal symbols. Existing changesets are inspected first. `.changeset/pre.json` is not edited.
- **FR-17** API reports and knip reports are regenerated, with `yarn build:api-reports` and `yarn build:knip-reports`,
  and contain only changes this run caused.
- **FR-18** `.gitignore` has a `.sdlc/` entry.

## Non-functional requirements

- **NFR-1** A pre-change run of the affected packages' tests is recorded in the run folder before any source write.
  It is the comparison baseline, and pre-existing failures are reported, not fixed.
- **NFR-2** The affected packages for that baseline, and for the run after the change, are at least: `repo-tools`,
  `frontend-plugin-api`, `ui`, `dev-utils`, `frontend-dev-utils`, `plugins/techdocs`, `cli-module-build`,
  `cli-module-test-jest`, `test-utils`, `cli-module-new`, `core-app-api`, `plugins/catalog-react` and `plugins/app`. The
  spec may add packages. Tests are run with `CI=1 yarn test <path>`, never unscoped.
- **NFR-3** Each package keeps its own code style. New source files, if any, carry the Apache 2.0 header. Existing
  copyright years are not changed.
- **NFR-4** `yarn build`, `yarn changesets version`, `yarn release` and the changeset CLI are never run. Bare `git stash`
  is never used, and every command runs from the worktree.
- **NFR-5** Lint verification does not write files beyond this run's allowlist.

## Preserved behaviour

Everything a React 18 user sees stays identical. The proof is the diff, plus the same test suite passing before and
after. A test changes only where it asserted the React 17 path.

Accepted exceptions:

- Narrowed peer ranges and the removed `LegacyRootOption`, both breaking for their consumers.
- `@backstage/ui` generated IDs change format with React's `useId`. SVG `<use href>` references, accessibility
  relationships and ID uniqueness must still hold.

## PII inventory

| Field | Sensitivity | Protection |
|---|---|---|
| None | n/a | This change handles no personal data. |

## Role matrix

Not applicable. The change adds no roles, resources or permissions.

## Acceptance criteria

- **AC-1** `yarn tsc` exits 0 from the repository root.
- **AC-2** `yarn lint` exits 0.
- **AC-3** The affected packages' suites show no new failure against the pre-change baseline. Any test that changed
  asserted the React 17 path.
- **AC-4** `yarn lint:peer-deps` exits 0.
- **AC-5** `git grep -F '^17.0.0 || ^18.0.0' -- 'packages/*/package.json' 'plugins/*/package.json'` finds nothing, and
  no `packages/cli-module-new/templates/*/package.json.hbs` file allows React 16 or 17.
- **AC-6** `git grep -E 'HAS_REACT_DOM_CLIENT|hasReactDomClient|LegacyRootOption|legacyRoot|use-sync-external-store'`
  finds nothing under `packages/*/src`, `plugins/*/src`, `packages/cli-module-test-jest/config` or any `package.json`,
  and `git grep 'ReactDOM.render('` finds nothing under `packages/*/src` or `plugins/*/src`.
- **AC-7** In `Popover` and `Tooltip`, the `<use href>` values and the `id` of the referenced path come from one
  `useId` call and resolve in a browser with React's ID format. `Table` and `TablePagination` keep their ARIA
  relationships. A component rendered twice gets different IDs.
- **AC-8** Each changed published package is named in a changeset with the bump the repo rule requires, and
  `.changeset/pre.json` is unchanged.
- **AC-9** The API reports and knip reports are current. The diff in them matches the removed `LegacyRootOption`, the
  removed dependencies and the changed peer ranges, and nothing else.
- **AC-10** The diff touches only files on the write contract's allowlist.

## Gate 1 decisions

Gate 1 was answered `approved`, relayed by the coordinator, so the three points below stand as written:

1. `major` bumps stay for the 17 packages at or above 1.0.0.
2. No new `useId` tests are added. AC-7 is checked by the existing tests and by reading the diff, and the final report
   must say so.
3. FR-10 stands. The change spec sets the warning's placement, shown at Gate 2.

## Open questions for HITL (resolved at Gate 1)

1. **Major bumps.** The repo rule makes this breaking change a `major` for 17 packages, including
   `@backstage/core-plugin-api`, `@backstage/core-app-api`, `@backstage/test-utils` and `@backstage/version-bridge`.
   This follows the brief as written. Say so if a narrower bump is wanted.
2. **Proof for AC-7.** The brief says a test changes only where it asserted the React 17 path, so this run adds no new
   ID tests. AC-7 is checked by the existing tests and by review of the diff, and the final report will say so. Say so
   if new test cases are wanted in the allowlisted `Popover`, `Tooltip` or `TablePagination` folders. `Table`'s test
   files are not on the allowlist.
3. **`startFrontend.ts` warning.** Removing `hasReactDomClient` takes away the only condition on that warning. FR-10
   keeps a diagnostic for users below React 18 and leaves its exact placement to the change spec, shown at Gate 2.
