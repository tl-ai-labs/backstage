---
'@backstage/frontend-app-api': patch
---

Apps now provide an `AppLifecycleApi` implementation that reports when the app has been finalized. This fixes `app/root.elements` extensions that use `useRouteRef` to link to pages, which previously did not resolve the link after sign-in.
