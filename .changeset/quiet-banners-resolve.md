---
'@backstage/frontend-app-api': patch
---

App root elements can now use `useRouteRef` before the app has been finalized, for example while the sign-in page is shown. Routes that are not yet known resolve to `undefined`, and the link becomes available once the app is finalized.
