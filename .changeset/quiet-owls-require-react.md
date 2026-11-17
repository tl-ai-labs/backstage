---
'@backstage/app-defaults': major
'@backstage/core-app-api': major
'@backstage/core-plugin-api': major
'@backstage/dev-utils': major
'@backstage/integration-react': major
'@backstage/test-utils': major
'@backstage/version-bridge': major
'@backstage/plugin-catalog-react': major
'@backstage/plugin-catalog': major
'@backstage/plugin-scaffolder-react': major
'@backstage/plugin-scaffolder': major
'@backstage/plugin-search-react': major
'@backstage/plugin-search': major
'@backstage/plugin-techdocs-addons-test-utils': major
'@backstage/plugin-techdocs-module-addons-contrib': major
'@backstage/plugin-techdocs-react': major
'@backstage/plugin-techdocs': major
---

Dropped support for React 17. The `react`, `react-dom` and `@types/react` peer dependencies now require version `^18.0.0`, so React 18 is required to use this package.
