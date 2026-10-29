---
'@backstage/cli-module-build': patch
---

Starting a frontend package or app now shows a single warning, with a link to the [React 18 migration guide](https://backstage.io/docs/tutorials/react18-migration/), when the app uses a React version older than 18, and the previous React 16 and React 17 warnings are removed. Frontend builds always target React 18, and packages built for earlier Backstage versions keep rendering with the React 18 root API.
