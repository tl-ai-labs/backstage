---
'@backstage/cli-module-build': minor
'@backstage/cli-module-test-jest': minor
---

**BREAKING**: Dropped support for React 17 in the frontend build and Jest test tooling. Both now require React 18, so projects still on React 17 need to upgrade to React 18 before updating.
