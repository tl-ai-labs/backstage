---
'@backstage/core-compat-api': minor
'@backstage/core-components': minor
'@backstage/frontend-app-api': minor
'@backstage/frontend-defaults': minor
'@backstage/frontend-dev-utils': minor
'@backstage/frontend-dynamic-feature-loader': minor
'@backstage/frontend-plugin-api': minor
'@backstage/frontend-test-utils': minor
'@backstage/module-federation-common': minor
'@backstage/theme': minor
'@backstage/plugin-api-docs-module-protoc-gen-doc': minor
'@backstage/plugin-api-docs': minor
'@backstage/plugin-app-react': minor
'@backstage/plugin-app-visualizer': minor
'@backstage/plugin-app': minor
'@backstage/plugin-auth-react': minor
'@backstage/plugin-auth': minor
'@backstage/plugin-catalog-graph': minor
'@backstage/plugin-catalog-import': minor
'@backstage/plugin-catalog-unprocessed-entities': minor
'@backstage/plugin-config-schema': minor
'@backstage/plugin-devtools-react': minor
'@backstage/plugin-devtools': minor
'@backstage/plugin-home-react': minor
'@backstage/plugin-home': minor
'@backstage/plugin-kubernetes-cluster': minor
'@backstage/plugin-kubernetes-react': minor
'@backstage/plugin-kubernetes': minor
'@backstage/plugin-mui-to-bui': minor
'@backstage/plugin-notifications': minor
'@backstage/plugin-org-react': minor
'@backstage/plugin-org': minor
'@backstage/plugin-permission-react': minor
'@backstage/plugin-scaffolder-node-test-utils': minor
'@backstage/plugin-signals-react': minor
'@backstage/plugin-signals': minor
'@backstage/plugin-user-settings': minor
---

Dropped support for React 17. The `react`, `react-dom` and `@types/react` peer dependencies now require version `^18.0.0`, so React 18 is required to use this package.
