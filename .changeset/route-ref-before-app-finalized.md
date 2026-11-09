---
'@backstage/frontend-app-api': patch
'@backstage/core-plugin-api': patch
---

Fixed an issue where app root elements and other components that render before the app has finished loading, for example while the sign-in page is shown, failed with a `No path for` error or never showed a link when calling `useRouteRef` for a page route. `useRouteRef` now returns `undefined` for such routes until the app is ready, and then re-renders with the resolved route. Route refs that cannot be resolved after the app has loaded behave as before.
