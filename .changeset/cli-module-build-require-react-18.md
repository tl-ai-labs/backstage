---
'@backstage/cli-module-build': minor
---

**BREAKING**: React 18 is now required to build and start frontend packages. Frontend builds no longer provide the flag that reported whether `react-dom/client` is available. Starting a frontend package now prints a warning for any React version below 18, with a link to the [React 18 migration guide](https://backstage.io/docs/tutorials/react18-migration/).
