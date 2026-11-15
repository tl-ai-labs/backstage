---
'@backstage/cli-module-build': patch
'@backstage/cli-module-new': patch
'@backstage/repo-tools': patch
---

Updated tooling for React 18 being required. New plugins created with `backstage-cli new` declare React 18 as their peer dependency, `backstage-repo-tools peer-deps` now expects `react`, `react-dom`, and `@types/react` peer dependency ranges of `^18.0.0`, and the warning shown when starting a frontend on React 17 now states that React 17 is no longer supported.
