---
'@backstage/test-utils': major
---

**BREAKING**: React 18 is now required and support for React 17 has been removed. The `LegacyRootOption` type and the `legacyRoot` option on `renderInTestApp` and `renderWithEffects` have been removed. Adopters should remove the `legacyRoot` option from their `renderWithEffects` and `renderInTestApp` calls.
