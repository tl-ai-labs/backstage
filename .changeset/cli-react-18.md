---
'@backstage/cli-module-build': minor
'@backstage/cli-module-test-jest': minor
---

**BREAKING**: `process.env.HAS_REACT_DOM_CLIENT` is no longer defined during builds and tests as React 18 is now required. Import from `react-dom/client` directly instead of checking `process.env.HAS_REACT_DOM_CLIENT`.
