---
'@backstage/frontend-app-api': patch
'@backstage/frontend-plugin-api': patch
---

Fixed an issue where app root elements calling `useRouteRef` for a page route could throw during bootstrap before sign-in completes and would not update with the resolved link after app finalization. `useRouteRef` now returns `undefined` while routes are not yet available during bootstrap and updates automatically once the app is finalized.
