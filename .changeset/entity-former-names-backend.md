---
'@backstage/plugin-catalog-backend': minor
---

Entities can now declare their former entity refs through the `backstage.io/former-entity-refs` annotation. The catalog records and validates these claims and reports any problems as entity processing errors, without blocking ingestion of the entity. A new permissioned `GET /entities/by-former-name/:kind/:namespace/:name` endpoint returns the entity that currently holds a former ref.

This change adds a database migration.
