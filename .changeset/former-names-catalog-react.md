---
'@backstage/plugin-catalog-react': minor
---

Added `EntityRenamedNotice` and `resolveEntityRename`, so plugins can redirect from a former entity name to the renamed entity and show a dismissible notice that the entity was renamed. `resolveEntityRename` looks up the current name of an entity that could not be found and returns the route to redirect to, and `EntityRenamedNotice` renders the notice on the page you land on.
