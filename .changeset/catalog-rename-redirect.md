---
'@backstage/plugin-catalog': minor
---

The entity page now redirects links that use an entity's old ref to the renamed entity when the renamed entity lists the old ref in its `backstage.io/former-refs` annotation. The redirect keeps the rest of the path and the query string and shows a dismissible notice that the entity was renamed. This works in both the old and the new frontend system.
