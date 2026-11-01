---
'@backstage/core-plugin-api': patch
'@backstage/frontend-plugin-api': patch
'@backstage/frontend-app-api': patch
---

Fixed `useRouteRef` in elements attached to `app/root.elements`. During app startup, a route that isn't available yet no longer crashes the element: `useRouteRef` from `@backstage/core-plugin-api` returns a temporary function that points at the current page, and `useRouteRef` from `@backstage/frontend-plugin-api` returns `undefined`. Both hooks return the real route function as soon as the app is finalized, with no navigation needed. A route that is still missing after that fails with the same error as before.
