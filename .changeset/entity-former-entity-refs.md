---
'@backstage/catalog-model': minor
'@backstage/catalog-client': minor
'@backstage/plugin-catalog-backend': minor
'@backstage/plugin-catalog-react': minor
'@backstage/plugin-catalog': minor
'@backstage/plugin-techdocs': minor
---

Entities can now record the refs they were previously known by using the new `backstage.io/former-entity-refs` annotation. Links to an entity's former catalog page or TechDocs URL now land on its current location, with the sub-path preserved and a notice naming the former ref. `User` entities are excluded from this mechanism for privacy.
