---
'@backstage/frontend-app-api': patch
---

Fixed an issue where app root elements calling `useRouteRef` for page routes before app finalization could throw or fail to update once the app finalized.
