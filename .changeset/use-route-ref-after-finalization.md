---
'@backstage/frontend-plugin-api': patch
---

The `useRouteRef` hook now resolves the route again once the app has been finalized. Elements that render before finalization, such as `app/root.elements` extensions, receive `undefined` until the routes are known and then re-render with the resolved link, instead of keeping a stale result or failing with a "No path for routeRef" error.
