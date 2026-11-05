# Intent Brief — test — bound the root-element route-ref render count

## Context
What needs testing: packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx, the test "should resolve page route refs in app root elements after finalization without render loops". The earlier bugfix run on this branch added it. After finalization it asserts expect(renderCount).toBe(2), but the fixed code renders the root element 3 times. That is a fixed count, not a loop, so the test fails: 433 of 434 tests pass.

Conventions: Jest and React Testing Library with screen, as in the rest of the file.

## Goal
Target: make that test pass while it still fails if the root element keeps re-rendering (a render loop). Replace the exact count after finalization with an upper bound, for example at most 3. Keep the other assertions: "Root link: unresolved" with renderCount 1 before finalization, and "Root link: /my-page" after it.

## Files in scope
- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (edit; only the test named above)

## Files off-limits
Change only this one test file: no source changes, no other tests, and no changeset, because this is a test-only change.
- All other files under `packages/**` and `plugins/**`, including the earlier run's source fix
- `.changeset/**` (the existing `routeref-startup-resolution.md` stays as it is)
- Project defaults: `.env*`, `.mcp.json`, `node_modules/**`, `.cursor/rules/**`, `.claude/settings.local.json`, `dist/**`, `.sdlc/**`, `.git/**`
- Detected AI configs: `.claude/**`, `AGENTS.md`, `.cursor/**`

## Acceptance criteria
Acceptance: CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports passes, with 434 of 434 tests.

## Non-goals
- Source changes, other tests, or a changeset.
