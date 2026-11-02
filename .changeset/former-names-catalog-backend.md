---
'@backstage/plugin-catalog-backend': minor
---

Added support for renamed entities. The catalog now indexes the `backstage.io/former-names` annotation and serves a new `GET /entities/by-former-name/{kind}/{namespace}/{name}` endpoint. It returns the current entity ref for a name that an entity has claimed as a former name. The endpoint is permissioned like a normal entity read, so a caller who cannot read the target gets the same not-found response as for an unknown name.

This release adds a database migration. It needs no backfill: claims are indexed as each entity is next processed.

Catalog processing warnings now appear on entities that list an invalid former name or that share a former name with another entity.

Existing lookups, such as fetching an entity by name, are unchanged.
