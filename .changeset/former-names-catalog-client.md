---
'@backstage/catalog-client': minor
'@backstage/plugin-catalog-node': minor
---

Added an optional `resolveFormerEntityRef` method to `CatalogApi` and `CatalogService`. It finds the current entity ref for a former name, so that a link to a renamed or moved entity can lead to the entity it became. The method is optional, so existing implementations of these interfaces keep working without changes. When a catalog backend has no entity for a former name, or does not support the lookup, the method returns `undefined`.
