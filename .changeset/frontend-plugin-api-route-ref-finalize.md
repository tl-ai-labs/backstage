---
'@backstage/frontend-plugin-api': patch
---

Added an optional `subscribe` method to `RouteResolutionApi`, which notifies listeners when the route resolution state changes. The `useRouteRef` hook now uses it to re-resolve routes when the route resolution state is updated after the app has been finalized, so that route refs that could not be resolved during bootstrap no longer remain `undefined`.
