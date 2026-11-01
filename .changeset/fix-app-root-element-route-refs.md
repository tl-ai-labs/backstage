---
'@backstage/frontend-app-api': patch
'@backstage/frontend-plugin-api': patch
'@backstage/core-plugin-api': patch
---

Fixed app root elements, such as a global announcement banner, failing with a `No path for` error when they call `useRouteRef` for a page route while the app is starting. `useRouteRef` now updates to the correct link once the app has finished loading.
