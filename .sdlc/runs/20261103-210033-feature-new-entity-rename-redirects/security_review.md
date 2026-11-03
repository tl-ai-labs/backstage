# Security Review — pass1

## Summary
The entity rename redirects feature (`backstage.io/former-names`) is well-hardened against unauthorized information disclosure, entity name hijacking, and open redirects across all touched backend, client, frontend, test, and documentation files. Permission checks on `GET /entities/by-former-name/:kind/:namespace/:name` evaluate `catalogEntityReadPermission` against the resolved target entity and return `404 Not Found` (referencing only the queried former ref) when access is denied, preventing any leak of the new entity name. Former-name claims are restricted to the same kind, never shadow a live entity, verify location provenance (`location_key`, `backstage.io/origin-location`, `backstage.io/managed-by-location`) against retained `refresh_state` records, and deterministically reject contested claims. Frontend redirects in Catalog and TechDocs construct internal router paths and sanitize sub-paths. No blocking security findings were identified.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No security vulnerabilities found in the touched files. | — |

## Passing checks
- **Authn & authz — Route protection & permission enforcement**: `plugins/catalog-backend/src/service/createRouter.ts` (`GET /entities/by-former-name/:kind/:namespace/:name`) authenticates callers via `httpAuth.credentials(req)`, and `AuthorizedEntitiesCatalog.entityByFormerRef` (`plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts`) enforces `catalogEntityReadPermission` (returning `{ entity: undefined }` on `DENY` or when the target fails the conditional permission filter in `DefaultEntitiesCatalog.ts`, which produces a 404 without leaking the new entity name).
- **Authn & authz — Anti-hijacking & claim legitimacy**: `FieldFormatEntityPolicy.ts` and `buildEntitySearch.ts` enforce valid, same-kind entity references and skip self-references; `DefaultEntitiesCatalog.entityByFormerRef` (`plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`) ensures live entities always take precedence, verifies `location_key` / origin / location provenance against retained `refresh_state` rows, and rejects contested claims when `legitimateCandidates.length !== 1`.
- **Authn & authz — `reports_to` / JWT secret / password hashing**: n/a — not in the touched set.
- **PII handling**: n/a — not in the touched set.
- **Audit log integrity**: `plugins/catalog-backend/src/service/createRouter.ts` creates an `entity-fetch` (`queryType: 'by-former-name'`) event via `auditor.createEvent` before executing `entitiesCatalog.entityByFormerRef` and records `success()` or `fail()`; audit table mutation rules are n/a — not in the touched set.
- **Secrets & config**: No secrets or credentials present in touched source, test fixtures, or documentation examples; `.env` configuration is n/a — not in the touched set.
- **Surface & headers — Open-redirect & XSS prevention**: `useEntityFromUrl.ts` and `useExternalRedirect.ts` navigate via internal `react-router-dom` routes (`viewTechdocLink` / mount prefix) with leading slashes stripped from `subPath`, and `EntityLayout` / `TechDocsReaderPage` render `renamedFrom` through React-escaped text/props; Helmet, rate limiting, and global error filters are n/a — not in the touched set.
- **Dependency risk**: Unchanged — no manifest or lockfile in the touched set.

## Required fixes before sign-off
- None

Tool calls: 23
