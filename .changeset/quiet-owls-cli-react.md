---
'@backstage/cli-module-build': minor
'@backstage/cli-module-test-jest': minor
'@backstage/cli-module-new': minor
---

Dropped support for React 17. The frontend dev server and the test setup now always assume that `react-dom/client` is available, the React 17 deprecation warning is gone, and new frontend plugins are generated with a `^18.0.0` React peer dependency range.
