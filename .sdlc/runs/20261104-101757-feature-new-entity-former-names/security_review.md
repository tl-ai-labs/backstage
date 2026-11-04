# Security Review — pass1

## Summary

The `backstage.io/former-names` feature change across `@backstage/catalog-model`, `@backstage/plugin-catalog-backend`, `@backstage/catalog-client`, `@backstage/plugin-catalog-react`, `@backstage/plugin-catalog`, `@backstage/plugin-techdocs`, and documentation introduces no security vulnerabilities. Input validation, parameterized database queries, permission predicate enforcement, audit logging, and safe React text rendering are properly implemented across all touched files.

## Findings

| Severity | Category | Location | Issue                                        | Recommendation |
| -------- | -------- | -------- | -------------------------------------------- | -------------- |
| None     | —        | —        | No security issues found in the touched set. | —              |

## Passing checks

- **PII handling (encryption at rest / masking)**: n/a — not in the touched set.
- **Audit log ordering (`plugins/catalog-backend/src/service/createRouter.ts`)**: `auditor.createEvent` is invoked before `entitiesCatalog.entityByFormerRef` and records `.success()` / `.fail()` with actor request context and `entityRef` metadata.
- **Authn & authz (`plugins/catalog-backend/src/service/createRouter.ts`, `AuthorizedEntitiesCatalog.ts`, `DefaultEntitiesCatalog.ts`, `openapi.yaml`)**: `GET /entities/by-former-name/:kind/:namespace/:name` extracts caller credentials via `httpAuth.credentials(req)`, authorizes `catalogEntityReadPermission` via `AuthorizedEntitiesCatalog.entityByFormerRef`, enforces conditional permission filters on both live-entity precedence checks and former-ref lookups, and prevents cross-kind or ambiguous former-name hijacking.
- **SQL injection & input validation (`FieldFormatEntityPolicy.ts`, `buildEntitySearch.ts`, `DefaultEntitiesCatalog.ts`)**: Former entity refs are validated and normalized via `parseEntityRef`/`stringifyEntityRef` (restricting to same kind and rejecting self-references), and all database lookups use parameterized Knex bindings.
- **Frontend redirect & XSS safety (`useEntityFromUrl.ts`, `EntityLayout.tsx`, `useExternalRedirect.ts`, `TechDocsReaderPage.tsx`)**: Redirects target internal route refs (`entityRouteRef`, `rootDocsRouteRef`) and notice banners render `redirectedFrom` through React text nodes without unescaped HTML injection.
- **Password storage & JWT secret config**: n/a — not in the touched set.
- **Audit log table mutability**: n/a — not in the touched set.
- **Secrets & config (code, tests, docs)**: No hardcoded secrets or credentials in touched source files, test fixtures (`mockCredentials`), or documentation examples (`docs/features/software-catalog/well-known-annotations.md`).
- **Surface & headers (Helmet, rate limiting, global error filter)**: n/a — not in the touched set.
- **Dependency risk**: Unchanged — no package manifest or lockfile in the touched set.

## Required fixes before sign-off

- None.

Tool calls: 10
