---
'@backstage/cli-module-build': minor
---

**BREAKING**: The frontend build and dev server now assume React 18 and no longer inject the build-time flag that reported whether `react-dom/client` is available. When the app you start resolves a React version older than 18, `package start` warns that Backstage requires React 18 and links the [React 18 migration guide](https://backstage.io/docs/tutorials/react18-migration).
