---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` command now expects `^18.0.0` as the peer dependency range for `react`, `react-dom` and `@types/react`. Packages that still allow React 17 are reported as having incorrect peer dependencies.
