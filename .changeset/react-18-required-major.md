---
'@backstage/app-defaults': major
'@backstage/core-app-api': major
'@backstage/core-plugin-api': major
'@backstage/dev-utils': major
'@backstage/integration-react': major
'@backstage/plugin-catalog': major
'@backstage/plugin-catalog-react': major
'@backstage/plugin-scaffolder': major
'@backstage/plugin-scaffolder-react': major
'@backstage/plugin-search': major
'@backstage/plugin-search-react': major
'@backstage/plugin-techdocs': major
'@backstage/plugin-techdocs-addons-test-utils': major
'@backstage/plugin-techdocs-module-addons-contrib': major
'@backstage/plugin-techdocs-react': major
'@backstage/test-utils': major
'@backstage/version-bridge': major
---

**BREAKING**: This package now requires React 18. The peer dependency ranges for `react`, `react-dom` and `@types/react` are now `^18.0.0`, and React 17 is no longer supported. If your app still uses React 17, follow the [React 18 migration guide](https://backstage.io/docs/tutorials/react18-migration/) before you upgrade.
