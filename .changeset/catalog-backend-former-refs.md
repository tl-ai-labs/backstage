---
'@backstage/plugin-catalog-backend': minor
---

The catalog now indexes the entity refs that entities list in the `backstage.io/former-refs` annotation and serves them through a new `GET /entities/by-former-name/:kind/:namespace/:name` endpoint, which returns the entity that currently declares the given former ref. A ref that an existing entity holds, or that more than one entity declares, does not resolve, and callers only receive entities they are allowed to read. This release includes a database migration that adds a table for the index.
