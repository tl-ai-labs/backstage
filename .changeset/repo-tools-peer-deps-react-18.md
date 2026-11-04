---
'@backstage/repo-tools': minor
---

**BREAKING**: The `peer-deps` check now requires the `react`, `react-dom`, and `@types/react` peer dependencies of your packages to be declared with the range `^18.0.0`. Packages that declare a different range, such as one that also allows React 17, will now be reported as failing the check.
