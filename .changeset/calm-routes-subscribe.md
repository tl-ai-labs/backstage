---
'@backstage/frontend-plugin-api': patch
---

Added an optional `subscribe` method to `RouteResolutionApi` that notifies listeners when route information changes, for example when the app is finalized. `useRouteRef` now uses it to update its result, and may return `undefined` before the app is finalized, for example in app root elements.
