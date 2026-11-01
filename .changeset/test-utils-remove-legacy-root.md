---
'@backstage/test-utils': major
---

**BREAKING**: Removed the `LegacyRootOption` type and the `legacyRoot` option of `renderInTestApp` and `renderWithEffects`. Remove the option and any import of the type so that your tests run on a React 18 concurrent root. If a test still needs a legacy root while you update it, call `render` from `@testing-library/react` with `legacyRoot: true` and wrap the element with `wrapInTestApp`. See the [React 18 migration guide](https://backstage.io/docs/tutorials/react18-migration/).
