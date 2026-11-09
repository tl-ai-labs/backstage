---
'@backstage/catalog-client': minor
---

Added an optional `getEntityByFormerRef` method to `CatalogApi`, implemented by `CatalogClient`, which returns the entity that currently declares a given ref in its `backstage.io/former-refs` annotation, or `undefined` when there is no match. Custom `CatalogApi` implementations do not need to change.
