---
'@backstage/frontend-plugin-api': patch
---

Added an optional `subscribe` method to `RouteResolutionApi` and updated `useRouteRef` to subscribe to route changes so components rendered before app finalization automatically resolve routes once the app is finalized.
