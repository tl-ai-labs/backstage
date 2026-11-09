---
'@backstage/frontend-plugin-api': patch
---

`RouteResolutionApi` has two new optional methods, `subscribe` and `isPending`,
which let implementations tell consumers when route resolution changes and
whether the app is still loading its routes. `useRouteRef` now uses them to
update components that rendered before the app finished loading, such as app
root elements, once the route becomes known. Existing implementations of
`RouteResolutionApi` keep working without changes.
