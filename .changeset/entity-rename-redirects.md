---
'@backstage/catalog-model': minor
'@backstage/plugin-catalog-backend': minor
'@backstage/catalog-client': minor
'@backstage/plugin-catalog': minor
'@backstage/plugin-techdocs': minor
---

Added support for former entity names and automatic rename redirects.

When you rename an entity, you can now list its previous references in the `backstage.io/former-names` annotation as a comma-separated list of entity references. Entries that omit the kind or namespace default to those of the entity declaring the annotation, and every entry must have the same kind as the entity itself. For example, `backstage.io/former-names: old-service, other-namespace/older-service`.

Old links keep working after a rename. When someone opens the catalog entity page or the TechDocs reader page using a former entity reference, they are now redirected to the current entity, including any sub-page or documentation path, and shown a notice that the entity was renamed. A redirect happens only when no entity currently uses the old reference, the claiming entity has the same kind, and exactly one entity claims the name. While the catalog still keeps a record of the former entity, the claim must also come from the same source as that former entity; with the default orphan strategy (`delete`), that record is usually removed soon after a rename, after which any single entity of the same kind can claim the name. If a second entity also claims the name, the redirect stops and the old link shows not found. Entities that the user is not permitted to read are never revealed through a redirect.
