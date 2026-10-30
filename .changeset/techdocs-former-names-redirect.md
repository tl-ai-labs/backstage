---
'@backstage/plugin-techdocs': minor
---

The TechDocs reader now redirects links for an entity that was renamed to the docs of its current ref, when the entity lists its old ref in the `backstage.io/former-names` annotation. The page path within the docs, the query string and the anchor are kept, and the reader shows a notice that the entity was renamed. This works in both the old and the new frontend system.
