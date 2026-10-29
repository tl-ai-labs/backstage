# Intent Brief — bugfix — app root elements crash on useRouteRef during startup

## Context

In the new frontend system, `prepareSpecializedApp` renders a bootstrap tree before sign-in and
predicate context are resolved. The bootstrap instantiation stops at the `app/root.children`
session boundary (`packages/frontend-app-api/src/wiring/treeLifecycle.tsx`,
`isSessionBoundaryAttachment`), and the route resolver is initialized from that partial tree
(`packages/frontend-app-api/src/wiring/phaseApis.tsx`, `instantiateAndInitializePhaseTree`).
Page routes live under `app/root.children`, so during bootstrap they have no route path.
Extensions attached to `app/root.elements` are rendered during bootstrap and keep their bootstrap
instances through finalization (`clearFinalizationBoundaryInstances` skips `app/root.elements`).

Seed description (user's words): "In the new frontend system, app root elements that call
useRouteRef during startup crash with "No path for routeRef"."

## Goal

An extension attached to `app/root.elements` that calls `useRouteRef` for a route ref whose page
is mounted under `app/root.children` must not crash during startup, and must resolve to the
correct link once the app is finalized.

## Files in scope

- packages/frontend-app-api/src/wiring/treeLifecycle.tsx
- packages/frontend-app-api/src/wiring/phaseApis.tsx
- packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx
- packages/frontend-app-api/src/routing/RouteResolver.ts
- packages/frontend-app-api/src/routing/extractRouteInfoFromAppNode.ts
- packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx (reproducing test — required
  for a bugfix run: the test must fail on the bug before the fix)
- packages/frontend-app-api/src/routing/RouteResolver.test.ts (if resolver-level coverage is needed)
- .changeset/\*.md (one new patch changeset for `@backstage/frontend-app-api`)

## Files off-limits

- Project defaults from `.sdlc/project.json` (`.env*`, `.mcp.json`, `.cursor/rules/**`,
  `.claude/settings.local.json`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `.sdlc/**`, `.git/**`)
- Detected AI configs: `.claude/**`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`
- `.envrc`, `.devcontainer/devcontainer.env`, `.yarn/**`, `yarn.lock`, `**/report*.api.md`,
  `docs/releases/**`, `**/.eslintrc.js`, `.prettierignore`, `tsconfig.json`

## Acceptance criteria

- A new test in `createSpecializedApp.test.tsx` renders the bootstrap app with an
  `app/root.elements` extension calling `useRouteRef` for a page route mounted under
  `app/root.children`; it fails on the current code with "No path for routeRef" and passes after the fix.
- After finalization, the same element renders the correct link for the route.
- `CI=1 yarn test packages/frontend-app-api/src/wiring` and
  `CI=1 yarn test packages/frontend-app-api/src/routing` pass.
- A patch changeset for `@backstage/frontend-app-api` describes the fix in adopter terms.

## Non-goals

- Changing `useRouteRef` in `@backstage/core-plugin-api` or `@backstage/frontend-plugin-api`.
- Changing the bootstrap/finalization boundary or which extensions render during bootstrap.
- The old frontend system (`core-app-api`).

## Gate 0 decisions (approved 2026-10-29)

- Auth mode: estimated (CLAUDE_CODE_SUBAGENT_MODEL=claude-opus-5-5)
- Policy: opus55-plus-sonnet55
- Test command: `CI=1 yarn test <path>`
- `.gitignore` `.sdlc/` entry: declined — note in final report
- Allowlist and off-limits frozen as proposed above (plus `.gitignore` off-limits)
