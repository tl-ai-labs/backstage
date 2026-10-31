---
'@backstage/catalog-client': minor
'@backstage/plugin-catalog-node': minor
'@backstage/plugin-catalog-react': minor
---

Added an optional `getEntityByFormerRef` method to `CatalogApi` and `CatalogService`, which finds an entity by a ref it was previously known by. The method is also available on the in-memory catalog client and the test mocks. Because it is optional, existing implementers keep working, and callers must treat a missing method as not found.
