# SDLC Run Ledger

| Run | Intent | Date | Policy | Auth | Files | Tests | Cost (true) | Outcome |
|---|---|---|---|---|---|---|---|---|
| `20261030-072000-feature-new-entity-former-names` | feature-new | 2026-10-30 | `flash-agsdk-only-v38` | vendor | 41 project (+6 records) | 5004 pass, 47 skip | $111.23 (provisional) | accepted |

## 20261030-072000-feature-new-entity-former-names — Entity former names with link redirects

Entities declare prior refs in a `backstage.io/former-entity-refs` annotation; the backend indexes
each parsed ref as a synthetic row in the existing `search` table; stale entity-page and TechDocs
URLs resolve to the renamed entity and land with a notice, in both frontend systems.

- **Pre-run state:** `b1fde597` (not the branch tip — three out-of-session commits sit between it
  and `be26a07330b4`: `d5be1572`, `0e21607e`, `be26a073`)
- **Packages:** catalog-model, catalog-client, catalog-backend, catalog-react, catalog, techdocs
- **Verification:** `CI=true yarn test` across all six + `yarn tsc` + `yarn lint:all` — exit 0;
  `yarn build:api-reports` exit 0. Every package gained tests, none lost any.
- **No** new table, migration, route, or query shape; no member added to `CatalogApi`.
- **Reviews:** senior found 3 majors, security found 1 High + 2 Mediums. The High (TechDocs
  live-entity gate sitting on an optional parameter its only call site never passed) was fixed
  structurally by removing the parameter.
- **Known limitations:** viewer-relative anti-hijack (accepted trade, documented for adopters);
  over-long refs (>~147 chars) dropped silently; already-tracked `.sdlc/` artifacts stay committed.
- **No** commit, push, or pull request.
- **Record:** `.sdlc/runs/20261030-072000-feature-new-entity-former-names/`
