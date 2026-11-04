---
'@backstage/test-utils': major
---

**BREAKING**: Removed the `legacyRoot` render option and the `LegacyRootOption` type from `renderWithEffects` and `renderInTestApp`, since React 18 is now required and the legacy React 17 rendering mode is no longer supported. If you were passing this option in your tests, remove it.
