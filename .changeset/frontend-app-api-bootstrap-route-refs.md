---
'@backstage/frontend-app-api': patch
---

Fixed an issue where app root elements that link to a page route could fail with a "No path for routeRef" error while the app was starting up. These links now resolve correctly during startup and keep pointing to the right place once the app has finished loading, including after sign-in.
