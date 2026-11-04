---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` check now expects `^18.0.0` for `react`, `react-dom`, and `@types/react` peer dependencies and rejects React 17 ranges. Update your React peer dependency ranges to `^18.0.0`, or run the `peer-deps` check with `--fix`.
