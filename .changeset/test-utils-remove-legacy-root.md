---
'@backstage/test-utils': major
---

**BREAKING** Removed the `legacyRoot` option from `renderWithEffects` and `renderInTestApp`, along with the `LegacyRootOption` type.

React 18's concurrent root is now used exclusively for rendering in tests. To migrate, remove the `legacyRoot` option from any calls to `renderWithEffects` or `renderInTestApp`.

Additionally, `@backstage/test-utils` now requires React 18 (`react`, `react-dom`, and `@types/react` peer dependencies are updated to `^18.0.0`).
