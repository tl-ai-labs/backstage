---
'@backstage/test-utils': major
---

**BREAKING**: Removed the `legacyRoot` option and the `LegacyRootOption` type from `renderWithEffects` and `renderInTestApp`. Tests always render with the React 18 root; remove any `legacyRoot` option you pass to these helpers.
