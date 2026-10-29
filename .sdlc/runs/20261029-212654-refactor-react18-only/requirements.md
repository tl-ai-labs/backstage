# Requirements — refactor — Require React 18, drop React 17 shims

Run: `20261029-212654-refactor-react18-only` · Intent: `refactor` · Brief: `intent_brief.md`

## What must be preserved (refactor invariants)

- React 18 apps behave the same: `@backstage/dev-utils`, `@backstage/frontend-dev-utils` and the TechDocs
  reader still mount through `createRoot` from `react-dom/client`.
- Older published plugin builds that read `process.env.HAS_REACT_DOM_CLIENT` keep taking their `createRoot`
  path: the flag stays defined as `true` in frontend builds (webpack/rspack `DefinePlugin`) and in Jest.
- `useRouteRef` (frontend-plugin-api) and `useBreakpoint` (ui) keep their public signatures and behavior.
- `legacyRoot` / `LegacyRootOption` in `@backstage/test-utils` keep their shape; only the doc comment changes.
- `react-router-dom` peer ranges are unchanged.
- Every currently passing test in the touched packages still passes; `yarn tsc` still passes.

## In scope

1. Narrow `@types/react`, `react` and `react-dom` peer ranges from `^17.0.0 || ^18.0.0` to `^18.0.0` in the
   56 package.json files listed in the brief.
2. `packages/ui/package.json`: drop `use-sync-external-store` and `@types/use-sync-external-store` (its peer
   range is already `^18.0.0`).
3. `repo-tools` peer-deps lint: one expected React range (`^18.0.0`), no `react18OnlyPackages` special case.
4. Remove the legacy `ReactDOM.render` fallbacks in dev-utils `render.tsx`, frontend-dev-utils
   `createDevApp.tsx` and techdocs `renderReactElement.ts`; remove the fallback test in
   `createDevApp.test.tsx`; keep `render.test.tsx` consistent.
5. Delete `cli-module-build/src/lib/bundler/hasReactDomClient.ts`; define `HAS_REACT_DOM_CLIENT` as `true`
   unconditionally in `config.ts` and keep it in `cli-module-test-jest/config/jest.js`; update
   `knip-report.md` so it no longer points at the deleted file.
6. CLI warnings: remove the React 17 deprecation warning in `startFrontend.ts`; replace the React 16 check in
   `server.ts` with a warning when the app's React major is below 18, linking to
   `https://backstage.io/docs/tutorials/react18-migration/`.
7. Replace `use-sync-external-store/shim` with React's `useSyncExternalStore` in `useRouteRef.tsx` and
   `useBreakpoint.ts`; drop the two dependencies from frontend-plugin-api, ui and plugins/app package.json.
8. Fix the stale React 17 doc comment on `LegacyRootOption` in `test-utils/src/testUtils/testingLibrary.ts`.
9. Update `docs/tutorials/react18-migration.md` to state React 17 is no longer supported (doc style guide).
10. Add changesets (new `.changeset/*.md` files) covering every affected non-private package.
11. Add `.sdlc/` to `.gitignore`.
12. `yarn.lock` changes only via `yarn install` after the dependency removals.

## Out of scope

1. React 19 support or any change to `react-router-dom` ranges.
2. Removing `legacyRoot` / `LegacyRootOption`.
3. `packages/create-app` templates, `packages/app`, `packages/app-legacy`.
4. Any frontend-system API change beyond the list above.
5. Editing release notes under `docs/releases`, ESLint/Prettier/TS config.

## Functional requirements

- **FR-1 (peer ranges)**: every listed package.json declares `"@types/react": "^18.0.0"`, `"react": "^18.0.0"`,
  `"react-dom": "^18.0.0"` in `peerDependencies`; any matching `peerDependenciesMeta` is untouched; no other
  field changes except the dependency removals of FR-7.
- **FR-2 (peer-deps lint)**: `packages/repo-tools/src/commands/peer-deps/peer-deps.ts` expects `^18.0.0` for
  the three React peers in every package and has no `react18OnlyPackages` list or branch.
- **FR-3 (dev-utils render)**: `render.tsx` imports `createRoot` from `react-dom/client` statically and mounts
  with it; no `HAS_REACT_DOM_CLIENT` branch, no `ReactDOM.render`; `render.test.tsx` passes.
- **FR-4 (frontend-dev-utils)**: `createDevApp.tsx` imports from `react-dom/client` and calls `createRoot`; the
  legacy-fallback test in `createDevApp.test.tsx` is removed and remaining tests pass.
- **FR-5 (techdocs)**: `renderReactElement.ts` imports `createRoot` from `react-dom/client`; no legacy branch.
- **FR-6 (CLI flag)**: `hasReactDomClient.ts` is deleted; `config.ts` defines
  `'process.env.HAS_REACT_DOM_CLIENT': JSON.stringify(true)` in both DefinePlugin sites with no detection;
  `jest.js` keeps `process.env.HAS_REACT_DOM_CLIENT = true`; `knip-report.md` has no row for the deleted file.
- **FR-7 (use-sync-external-store)**: `useRouteRef.tsx` and `useBreakpoint.ts` import `useSyncExternalStore`
  from `react`; `use-sync-external-store` and `@types/use-sync-external-store` are removed from
  `packages/frontend-plugin-api`, `packages/ui` and `plugins/app` package.json; `yarn install` refreshes
  `yarn.lock`.
- **FR-8 (CLI warnings)**: `startFrontend.ts` prints no React 17 warning and no longer imports
  `hasReactDomClient`; `server.ts` warns once when the app's React major is below 18, linking to the React 18
  migration guide, instead of the React 16 message.
- **FR-9 (test-utils doc)**: `LegacyRootOption`'s doc comment no longer refers to React 17; type unchanged;
  `report.api.md` regenerated only if `yarn build:api-reports` changes it.
- **FR-10 (docs)**: `docs/tutorials/react18-migration.md` states React 17 is no longer supported and React 18
  is the minimum, following `docs/contribute/doc-style-guide.md`.
- **FR-11 (changesets)**: new `.changeset/*.md` files: `major` for non-private packages at >=1.0.0 whose peer
  range narrows, `minor` for those below 1.0.0, `patch` for CLI-module/repo-tools changes as appropriate; none
  for private packages (`app-example-plugin`, `@internal/plugin-todo-list`); messages adopter-facing, no internal
  symbol names; existing `.changeset/` entries checked first.
- **FR-12 (.gitignore)**: `.sdlc/` is ignored.

## Non-functional requirements

- **NFR-1**: Every new or changed source file keeps its existing Apache 2.0 header; no copyright year changes.
- **NFR-2**: Changed files are formatted with `yarn prettier --write <paths>`.
- **NFR-3**: No `yarn build`, `yarn release` or `changesets version`; no commits.
- **NFR-4**: Only write-contract allowlisted paths change.

## PII inventory

None. The change touches build tooling, peer ranges and render bootstrapping; no personal data.

| Field | Sensitivity | Protection |
| ----- | ----------- | ---------- |
| —     | —           | —          |

## Role matrix

Not applicable (no authz surface). Adopters: install/upgrade packages; CLI users: see a warning on React < 18.

## Acceptance criteria

- **AC-1**: No `package.json` under `packages/` or `plugins/` declares a React, React DOM or `@types/react` range
  that includes 17 (`grep -l '\^17' ... ` over those peers finds nothing).
- **AC-2**: `yarn lint:peer-deps` passes.
- **AC-3**: `ReactDOM.render(` does not appear in non-test source under `packages/` or `plugins/`.
- **AC-4**: `hasReactDomClient` no longer exists; `HAS_REACT_DOM_CLIENT` is only defined as `true`.
- **AC-5**: `use-sync-external-store` is not imported or declared anywhere in `packages/` or `plugins/`.
- **AC-6**: `yarn tsc` passes.
- **AC-7**: `CI=1 yarn test` passes for `packages/dev-utils`, `packages/frontend-dev-utils`,
  `packages/frontend-plugin-api`, `packages/ui`, `packages/test-utils`, `packages/cli-module-build`,
  `packages/repo-tools`, `plugins/techdocs`, `plugins/app`.
- **AC-8**: Changesets cover every affected non-private package at the correct bump level.

## Open questions for HITL

None; the user's Gate 0 decisions settle the brief's choices (ranges, CLI flag kept as `true`, `legacyRoot`
kept, changeset semver).
