---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` command now expects `^18.0.0` peer dependency ranges for `react`, `react-dom` and `@types/react` in every package, and reports packages that still allow React 17. Run it with `--fix` to update your packages.
