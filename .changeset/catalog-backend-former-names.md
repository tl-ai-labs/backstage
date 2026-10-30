---
'@backstage/plugin-catalog-backend': minor
---

The catalog now indexes the refs listed in the `backstage.io/former-names` annotation and adds the `GET /entities/by-former-name/:kind/:namespace/:name` endpoint, which returns the current ref of the entity that claims a former ref. It responds with 404 when a live entity holds the ref, when nothing claims it, when several entities claim it (a warning is logged), or when the caller may not read the claimant. Existing lookups are unchanged and no database migration is needed.
