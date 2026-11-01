---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` command now requires `^18.0.0` as the peer dependency range for `react`, `react-dom` and `@types/react` in all packages. Run `backstage-repo-tools peer-deps --fix` to update your packages.
