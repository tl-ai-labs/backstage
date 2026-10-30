---
'@backstage/catalog-client': minor
---

Added the optional `getEntityRefByFormerRef` method to `CatalogApi`, implemented by `CatalogClient` and `InMemoryCatalogClient`. It resolves a former entity ref, as declared with the `backstage.io/former-names` annotation, to the current ref of the renamed entity, or `undefined` when there is no unambiguous match.
