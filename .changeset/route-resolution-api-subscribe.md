---
'@backstage/frontend-plugin-api': patch
---

Added optional `subscribe` and `isReady` methods to `RouteResolutionApi`, which let `useRouteRef` pick up route changes while the app is starting. Existing implementations without these methods keep working as before.
