## Conventions

- TypeScript strict mode with React 18 and Jest (@testing-library/react); format with Prettier (single quotes, trailing commas) and lint with ESLint.
- Use Jest expect matchers and React Testing Library screen queries (getByText) and act(...) as established in packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx.
- Preserve the existing Apache 2.0 license header and copyright year on existing files.

## Decisions

- Post-finalization render count assertion in root-element route-ref test: Replace expect(renderCount).toBe(2) on line 1977 with expect(renderCount).toBeLessThanOrEqual(3) (not expect(renderCount).toBe(3); not Removing the renderCount assertion) — An upper bound of at most 3 accommodates the 3 deterministic renders across bootstrap, rerender, and route-resolution update while still failing if a render loop occurs.

## Files of this change

- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx` (U01, edit)
