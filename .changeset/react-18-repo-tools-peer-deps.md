---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` command now expects `^18.0.0` as the peer dependency range for `react`, `react-dom` and `@types/react` in every package, and reports `^17.0.0 || ^18.0.0` as incorrect. Run `backstage-repo-tools peer-deps --fix` to update your packages.
