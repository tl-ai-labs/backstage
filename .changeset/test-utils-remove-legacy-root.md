---
'@backstage/test-utils': major
---

**BREAKING**: Removed the `LegacyRootOption` type and the `legacyRoot` option of `renderInTestApp` and `renderWithEffects`. Tests now always render with a React 18 root, so a test that passed `legacyRoot: true` needs to be updated to work with it.
