---
'@backstage/test-utils': major
---

**BREAKING** Removed the `legacyRoot` render option from `renderInTestApp` and `renderWithEffects`. Tests that passed `legacyRoot: true` must drop the option, as legacy root rendering was only supported for React 17 compatibility.

React 18 is now the minimum supported React version. React 17 is no longer accepted by peer dependency ranges.
