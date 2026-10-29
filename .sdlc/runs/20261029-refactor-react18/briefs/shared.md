## Conventions

- Every source file (.ts/.tsx/.js) carries the Apache 2.0 notice header; eslint owns it (notice/notice, onNonMatchingHeader: 'replace'). This change creates no source file, so never touch an existing header: years here span 2020-2026 (useRouteRef.tsx 2020, config.ts 2020, testingLibrary.ts 2026) and must not be advanced or tidied.
- Default and namespace imports from 'react' are lint errors (no-restricted-syntax): named imports only, as in `import { useMemo } from 'react'`. The rule targets 'react' only, not 'react-dom'.
- Prettier owns all formatting and is run as the check's write form before the check: write the statement, never hand-wrap to a column, and never reflow a line you were not given a site for.
- A package.json edit writes valid JSON in the existing key order. A pre-commit hook re-sorts every staged manifest (scripts/sort-package-json.mjs), so key order is not yours to choose.
- Generated files are never typed: the 56 peer-range manifests come from the constants in packages/repo-tools/src/commands/peer-deps/peer-deps.ts via `backstage-repo-tools peer-deps --fix`, and packages/test-utils/report.api.md from `yarn build:api-reports`. Both are produced by tooling units in this spec.
- Test idioms are package-local, per AGENTS.md: packages/test-utils destructures `rendered.getByText` and has a local withLogCollector helper; packages/ui uses `screen` and `renderHook`; packages/frontend-dev-utils/src/createDevApp.test.tsx uses jest.isolateModules + require, process.env save/restore and jest.setTimeout(15000). Match the file you edit, not a repo-wide style.
- A changeset file is frontmatter with single-quoted package names one per line, a blank line, then prose. Filenames are descriptive kebab-case. Never invoke the changesets CLI; write the file directly.
- Breaking-change prose carries a leading **BREAKING** marker. Bump level follows the package version: minor below 1.0.0, major at or above it.
- This is a refactor under NFR-1 (no visible change for React 18 users): change nothing outside a named site. No opportunistic renames, no reordering, no rewriting a surviving waitFor, no removing a comment you were not told to remove.

## Decisions

- How the React 18 peer ranges reach the 56 manifests: Edit the constants in packages/repo-tools/src/commands/peer-deps/peer-deps.ts, then propagate with a tooling unit running `backstage-repo-tools peer-deps --fix`. (not Typed units that hand-write the 56 package.json peer blocks; not A find/replace of '^17.0.0 || ^18.0.0' across the repo) — CI runs `yarn lint:peer-deps` (.github/workflows/ci.yml:111) and fails any manifest disagreeing with those constants; plugins/permission-react has no react-router-dom peer and plugins/scaffolder-react carries react-router ^6.30.3 beside react-router-dom ^6.30.2, both of which a block replacement corrupts.
- The lazy-Promise boundary at the three render sites: Keep a module-scoped `const ReactDOMPromise = import('react-dom/client');` and render inside `.then()`. (not `import { createRoot } from 'react-dom/client'` at the top of the file; not await at module scope) — A static import makes rendering synchronous and changes observable timing that existing waitFor assertions depend on; NFR-2 and AC-8 require the async boundary to survive.
- The bare `import 'react-dom';` side-effect lines at packages/dev-utils/src/devApp/render.tsx:53 and packages/frontend-dev-utils/src/createDevApp.tsx:24: Leave both lines exactly as they are. (not Removing them together with the conditional ReactDOM import) — No requirement names them, they exist to keep the dependency resolvable for the bundler, and removing them would change module resolution — outside this refactor's invariant.
- startFrontend's React-17 deprecation warning once the hasReactDomClient probe is gone: Delete the conditional warning with the probe, and state React 18 as the minimum in server.ts's checkReactVersion banner, which serveBundle runs on the same start path. (not Keeping the warning unconditionally in startFrontend; not Replacing the probe with a react/package.json version read inside startFrontend) — With the probe removed there is no condition left to test, and inventing an unconditional or newly-written diagnostic is new behaviour, not a refactor. FR-12's 'React 18 as the minimum' is satisfied by the existing diagnostic in checkReactVersion.
- Bump level for the peer-range narrowing across the 54 affected published packages: patch for all 54, with prose stating React 18 is now the minimum supported version. (not major for every package at or above 1.0.0 and minor for every 0.x package; not minor with a **BREAKING** marker for all 54) — Gate 0 decided the @backstage/test-utils major is the release train's only major, and the repo's own precedent for narrowing a peer range is a patch (packages/theme, react-router-dom ^6.30.2, CHANGELOG.md:24). React 17 is already deprecated in Backstage, so the range change records an already-deprecated state.
- Where @backstage/ui's changeset lives: Its own file in the mandated .changeset/README.md format, ending `**Affected components:** none`. (not Naming @backstage/ui in the multi-package changesets) — @backstage/ui already carries React-18-only peers (it is not one of the 56 affected manifests), its only change here is the use-sync-external-store swap, and the mandated `**Affected components:**` line is not relevant to the other packages. AGENTS.md asks for separate changesets when messages differ.
- Removing packages/cli-module-build/src/lib/bundler/hasReactDomClient.ts: A tooling unit running `rm -f` on the file, after both importing files are edited. (not A typed unit that empties the file or replaces it with a stub) — The apply form writes content and cannot express a deletion (NFR-10); the step runs under provenance so /mmo:revert can undo it.
- The provenance path of the manifest-and-lockfile propagation step: One tooling unit at path yarn.lock running `backstage-repo-tools peer-deps --fix` and then `yarn install --no-immutable`, ordered after every typed manifest edit. (not A tooling unit per manifest; not A glob path such as packages/\*/package.json; not Running the fixer before the typed manifest edits) — A tooling unit names one path, and yarn.lock is the only file in this change that no typed unit may write; the 56 manifests are git-tracked output of the repo's own fixer. The fixer re-serializes each manifest from the parsed object, so running it after the typed edits keeps those edits' line-numbered sites valid, while the reverse order would invalidate them.
- Whether expectedPeerDeps survives in peer-deps.ts: Remove getExpectedPeerDependencies and the local expectedPeerDeps binding, and read the single `peerDependencies` constant directly at all three fix sites. (not Keeping `const expectedPeerDeps = peerDependencies;` as an alias) — FR-1 asks that a single constant govern every package; an alias to a module constant is dead indirection a reviewer would ask to remove.

## Files of this change

- `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` (U01, edit)
- `packages/ui/package.json` (U02, edit)
- `packages/frontend-plugin-api/package.json` (U03, edit)
- `plugins/app/package.json` (U04, edit)
- `packages/ui/src/hooks/useBreakpoint.ts` (U06, edit)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (U07, edit)
- `plugins/techdocs/src/reader/transformers/renderReactElement.ts` (U08, edit)
- `packages/dev-utils/src/devApp/render.tsx` (U09, edit)
- `packages/frontend-dev-utils/src/createDevApp.tsx` (U10, edit)
- `packages/frontend-dev-utils/src/createDevApp.test.tsx` (U11, edit)
- `packages/cli-module-build/src/lib/bundler/config.ts` (U12, edit)
- `packages/cli-module-build/src/commands/package/start/startFrontend.ts` (U13, edit)
- `packages/cli-module-test-jest/config/jest.js` (U14, edit)
- `packages/cli-module-build/src/lib/bundler/server.ts` (U15, edit)
- `packages/test-utils/src/testUtils/testingLibrary.ts` (U17, edit)
- `packages/test-utils/src/testUtils/appWrappers.tsx` (U18, edit)
- `.changeset/react18-peer-dependencies.md` (U20, create)
- `.changeset/test-utils-remove-legacy-root-option.md` (U21, create)
- `.changeset/ui-native-use-sync-external-store.md` (U22, create)
- `.changeset/drop-use-sync-external-store-dependency.md` (U23, create)
- `.changeset/cli-require-react-18.md` (U24, create)
- `.changeset/repo-tools-react18-peer-deps.md` (U25, create)
