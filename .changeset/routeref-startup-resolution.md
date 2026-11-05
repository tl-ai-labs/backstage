---
'@backstage/frontend-app-api': patch
'@backstage/frontend-plugin-api': patch
---

Fixed an issue where components mounted in the application root using route references could fail to resolve links during initial startup. Route references now automatically re-resolve once application startup completes.
