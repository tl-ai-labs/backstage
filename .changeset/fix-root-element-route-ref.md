---
'@backstage/frontend-app-api': patch
'@backstage/frontend-plugin-api': patch
---

Fixed an issue where app root elements calling `useRouteRef` during phased app startup would not automatically re-resolve page routes once the app is finalized.
