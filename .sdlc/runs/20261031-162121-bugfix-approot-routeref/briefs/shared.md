## Conventions

- TypeScript + React 18 JSX, formatted by the repo Prettier config: single quotes, trailing commas, 2-space indent, 80-column wrap, arrow functions without parens around a single parameter.
- Match the style of the file you edit; consistency within a package beats consistency across the repo.
- No new source files in this change. Never change the Apache 2.0 copyright year of an existing file.
- No new dependencies. Stay compatible with the React peer range ^17 || ^18: do not use useSyncExternalStore; use useState plus useEffect.
- Public API members get TSDoc in plain adopter-facing language; the interface keeps its existing @public tag.
- Tests are Jest describe/it with @testing-library/react; prefer screen with findBy*/getBy* over waitFor, no test ids, one thorough test with several assertions.
- Changesets live in .changeset/<name>.md: YAML front matter mapping each quoted package name to its bump, a blank line, then one plain-language paragraph for adopters that names no internal code symbols (public API names such as useRouteRef and RouteResolutionApi are allowed).
- API report files (report\*.api.md) are regenerated with `yarn build:api-reports` after this change; never type them by hand.
- Docs follow docs/contribute/doc-style-guide.md: present tense, active voice, address the reader as you, code style for package names and API names.

## Decisions

- Q-1: how route resolution tells consumers that its route information changed: Add two optional public members to RouteResolutionApi in @backstage/frontend-plugin-api: subscribe?(listener: () => void): () => void, and isReady?(): boolean (false while the app is starting and only part of the routes are known). (not Undocumented methods on the app's proxy object that both hooks duck-type, like the existing getRouteObjects TODO in AppRoot (a hidden cross-package contract no mock or adopter implementation can see); not A versioned value shared through a @backstage/version-bridge global singleton (more machinery for one bit of state)) — Optional members are typed, documented and mockable, keep every existing implementation valid (FR-5), and follow the pattern of other core APIs that expose change notifications; the cost is a frontend-plugin-api API report change.
- How the hooks re-resolve when route information changes: Each useRouteRef keeps a numeric state counter; a useEffect on [routeResolutionApi, ready] subscribes via routeResolutionApi.subscribe when present and bumps the counter on each notification; the counter is added to the useMemo dependency array behind an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment placed on the line directly above the array. (not useSyncExternalStore (React 18 only, the peer range includes React 17); not Remounting root elements at finalization (changes tree instantiation, a non-goal)) — One notification causes exactly one state update and one re-render per consumer (FR-4), and an API without subscribe leaves the hook exactly as today (FR-5).
- Race between the first render and the subscription effect: Each hook reads `ready = routeResolutionApi.isReady?.() ?? true` during render; the effect, right after subscribing, bumps the counter once if `isReady?.() ?? true` now differs from the render-time value. — A notification that fires between render and subscribe would otherwise be lost and leave the bootstrap result in place.
- What the core-plugin-api bridge returns for a required ref that is unresolved before the app is ready: A placeholder RouteFunc `(() => pathname) as RouteFunc<Params>` that links to the current location; once isReady is true (or the API has no isReady), an unresolved required ref throws `No path for ${routeRef}` exactly as today; optional refs keep returning undefined. (not Throwing a promise to suspend (an element without its own boundary suspends app/root, which hides the sign-in page and deadlocks finalization); not Returning undefined for a required ref (callers type it as always defined and crash calling it)) — Root elements render during startup without an error box (AC-2) and switch to the real link on the next notification.
- Where readiness comes from: RouteResolutionApiProxy.initialize takes a third argument `options: { ready: boolean }`; instantiateAndInitializePhaseTree passes `{ ready: !options.stopAtAttachment }`, because only the bootstrap phase stops at the session boundary. (not Threading an explicit flag through createBootstrapApp and finalizeFromSessionState/finalizeFromBootstrapError (edits two more files for the same information)) — Keeps the fix in phaseApis.tsx; prepareSpecializedApp.tsx and treeLifecycle.tsx stay unchanged.
- Changeset bumps: Two changesets: one fix changeset with patch for @backstage/frontend-app-api (0.16.x), @backstage/frontend-plugin-api (0.18.x) and @backstage/core-plugin-api (1.12.x, fix only, no new API in that package); one patch changeset for @backstage/frontend-plugin-api describing the new optional RouteResolutionApi members. — CLAUDE.md: patch below 1.0 even for additions, patch for a fix at 1.0 and above; separate messages because the API addition concerns one package only.
- API reports: No unit types packages/frontend-plugin-api/report.api.md; it is regenerated with `yarn build:api-reports` after the units are typed. — NFR-4; a bugfix spec cannot hold a tooling unit.

## Files of this change

- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (U01, edit)
- `packages/frontend-plugin-api/src/apis/definitions/RouteResolutionApi.ts` (U02, edit) — import: `import { RouteResolutionApi, routeResolutionApiRef } from '@backstage/frontend-plugin-api';`
  - `optional interface method RouteResolutionApi.subscribe(listener: () => void): () => void`
  - `optional interface method RouteResolutionApi.isReady(): boolean`
- `packages/frontend-app-api/src/wiring/phaseApis.tsx` (U03, edit) — import: `import { RouteResolutionApiProxy } from './phaseApis';`
  - `method RouteResolutionApiProxy.initialize(routeInfo: RouteInfo, routeRefsById: Map<string, RouteRef | SubRouteRef>, options: { ready: boolean }): RouteInfo`
  - `method RouteResolutionApiProxy.subscribe(listener: () => void): () => void`
  - `method RouteResolutionApiProxy.isReady(): boolean`
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx` (U04, edit)
- `packages/core-plugin-api/src/routing/useRouteRef.tsx` (U05, edit)
- `.changeset/fix-app-root-element-route-refs.md` (U06, create)
- `.changeset/route-resolution-api-subscribe.md` (U07, create)
