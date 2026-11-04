---
'@backstage/plugin-catalog-backend': minor
---

Added support for recording the former names an entity declares in its `backstage.io/previous-names` annotation when the catalog processes the entity, and exposed the `GET /entities/by-name/:kind/:namespace/:name/redirect` endpoint to resolve former entity references to their current entity reference.
