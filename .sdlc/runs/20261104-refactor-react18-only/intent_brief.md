# Intent Brief — refactor — Require React 18, drop React 17 support

## Context
Backstage frontend packages declare `react`, `react-dom` and `@types/react` peer ranges of `^17.0.0 || ^18.0.0`
(56 package.json files; only `packages/ui` is already ^18-only). The repo already installs React 18.3.1, and there
is no React 17 CI matrix. Several code paths still carry React 17 compatibility: a `HAS_REACT_DOM_CLIENT` bundler
flag, `createRoot` → `ReactDOM.render` fallbacks, React-version warnings in the CLI, `use-sync-external-store/shim`
imports, and the `legacyRoot` option in `@backstage/test-utils`. Full inventory: `discovery.md` in this folder.

## Goal
Require React 18 across the workspace's published packages and remove the React 17 shims, legacy render paths and
peer ranges (seed description, verbatim: "Require React 18 across Backstage packages and remove the React 17
shims, legacy render paths and peer ranges.").

1. Narrow every `react` / `react-dom` / `@types/react` peer range from `^17.0.0 || ^18.0.0` to `^18.0.0`
   (56 package.json files), and make `yarn lint:peer-deps` enforce it (`packages/repo-tools` peer-deps source,
   dropping the now-redundant `react18OnlyPackages` special case).
2. Update the `@backstage/cli-module-new` package templates (`^16.13.1 || ^17 || ^18`, `^17 || ^18`) to `^18.0.0`.
3. Remove the `HAS_REACT_DOM_CLIENT` flag and its detection (`cli-module-build` bundler, `cli-module-test-jest`
   jest config), the React 16/17 version warnings in `cli-module-build`, and always use `react-dom/client`.
4. Replace the `createRoot` / `ReactDOM.render` dual paths with `createRoot` only in `dev-utils`,
   `frontend-dev-utils` (and its test) and `plugins/techdocs`.
5. Replace `use-sync-external-store/shim` with `useSyncExternalStore` from `react` in `frontend-plugin-api` and
   `ui`, and drop the `use-sync-external-store` dependency from those packages and `plugins/app`.
6. Remove the `legacyRoot` option (`LegacyRootOption`) from `@backstage/test-utils` render helpers — a breaking
   public API change.
7. Update the three tutorials that describe React 17 support, add changesets, regenerate API/knip reports.

## Files in scope
See the frozen allowlist (`allowlist.json` in this folder): the 56 package.json files plus `packages/ui/package.json`,
`packages/repo-tools/src/commands/peer-deps/**`, `packages/cli-module-new/templates/*/package.json.hbs`,
`packages/cli-module-build/src/lib/bundler/**`, `packages/cli-module-build/src/commands/package/start/**`,
`packages/cli-module-test-jest/config/jest.js`, `packages/dev-utils/src/devApp/**`,
`packages/frontend-dev-utils/src/createDevApp{,.test}.tsx`, `plugins/techdocs/src/reader/transformers/renderReactElement*`,
`packages/frontend-plugin-api/src/routing/useRouteRef*`, `packages/ui/src/hooks/useBreakpoint*`,
`packages/test-utils/src/testUtils/**`, `**/report.api.md`, `**/knip-report.md`, the three tutorials,
`.changeset/*.md`, `yarn.lock`.

## Files off-limits
Project defaults plus: `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`,
`docs/releases/**`, `**/CHANGELOG.md`, `.yarn/releases/**`, `.yarn/patches/**`, OpenAPI `generated/` folders,
`node_modules/**`, `dist*/**`, `.git/**`, `.sdlc/**` (outside this run's folder).

## Acceptance criteria
- No workspace package.json or CLI template declares a React peer range that admits 16 or 17.
- `yarn lint:peer-deps` passes and would flag a reintroduced `^17` range.
- No source references `HAS_REACT_DOM_CLIENT`, `ReactDOM.render`, `use-sync-external-store`, or `legacyRoot`.
- `yarn tsc` passes; `CI=1 yarn test` passes for every touched package.
- Behaviour under React 18 is unchanged: dev apps, techdocs rendering and route-ref hooks behave as before.
  The only public API change is the removal of `legacyRoot` from `@backstage/test-utils`.
- Changesets cover every affected published package: breaking bump (minor < 1.0, major ≥ 1.0) for the peer
  range narrowing and `legacyRoot` removal; API reports regenerated.

## Run constraints (Gate 0)
- Test command for the whole run, verbatim:
  `yarn tsc && yarn lint:all && yarn lint:peer-deps && CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils`
- Never run lint with `--fix`.
- Do not read or check open upstream PRs; continue regardless of them.
- Auth mode: `vendor`. Policy `argon4-plus-sonnet55`; its endpoints (Vertex AI in project
  `temp-genmedia-study`, and Anthropic) are confirmed acceptable for this repo.
- `.gitignore` is left unchanged (`.sdlc/` is excluded via `.git/info/exclude`).

## Non-goals
- Upgrading to React 19 or widening any range to include it.
- Removing `@testing-library/react-hooks` / `react-test-renderer` dev dependencies, or migrating
  `react-dom/test-utils` `act` imports in tests.
- Touching `microsite/`, `docs-ui/`, `workspaces/`, release notes or CHANGELOGs.
- Changing create-app templates (already `^18.0.2`).

## Gate 0 resolution
Approved 2026-11-04. Auth mode: vendor (user-confirmed; no ANTHROPIC_API_KEY — policy has no in-session-adapter models). Write contract frozen: 77 allowlist entries (allowlist.json), 26 off-limits patterns (baseline.json#off_limits_proposed).
