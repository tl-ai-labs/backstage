---
'@backstage/cli-module-build': minor
'@backstage/cli-module-test-jest': minor
---

**BREAKING** Frontend builds and tests no longer define the `process.env.HAS_REACT_DOM_CLIENT` flag. Any app or plugin source that reads it must import `react-dom/client` directly instead.

React 18 is now the minimum supported React version for frontend builds and tests.
