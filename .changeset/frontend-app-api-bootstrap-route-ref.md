---
'@backstage/frontend-app-api': patch
---

Fixed route resolution during app bootstrap. `RouteResolver` now returns `undefined` instead of throwing a `No path for ...` error when an ancestor route ref has not yet been registered, which can happen at startup while only a partial extension tree is instantiated. `RouteResolutionApiProxy` now also supports `subscribe` and notifies its subscribers when route resolution is re-initialized at app finalization, so that route refs that could not be resolved earlier are resolved again.
