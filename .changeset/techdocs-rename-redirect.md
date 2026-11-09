---
'@backstage/plugin-techdocs': minor
---

The TechDocs reader now redirects documentation links that use an entity's old ref to the renamed entity's documentation when the renamed entity lists the old ref in its `backstage.io/former-refs` annotation. The redirect keeps the rest of the documentation path, the query string and the hash, and shows a dismissible notice that the entity was renamed.
