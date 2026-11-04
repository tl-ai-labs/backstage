# Security Review — pass1

## Summary
Audited all touched source, migration, OpenAPI schema/generated, test, and documentation files for the entity rename redirect feature (`backstage.io/previous-names`). The new `GET /entities/by-name/:kind/:namespace/:name/redirect` endpoint properly authenticates callers via `httpAuth.credentials`, enforces `catalog.entity.read` permissions (including conditional permission predicates applied directly to the database query), emits audit events prior to data access with success/failure tracking, prevents redirect hijacking when a live entity exists or multiple entities claim the same former name, and uses parameterized Knex queries and internal route refs (`entityRouteRef` / `rootDocsRouteRef`) preventing SQL injection and open redirects. No security issues were introduced.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No findings introduced in the touched set. | — |

## Passing checks
- PII handling (`government_id`, `bank_account`, `salary_base` encryption & masking): n/a — not in the touched set.
- Audit logging order & integrity (`plugins/catalog-backend/src/service/createRouter.ts`): `auditor.createEvent` (`eventId: 'entity-fetch'`, `queryType: 'by-previous-name'`) is invoked before `httpAuth.credentials` and `entitiesCatalog.entityRedirect`, with `.success()` and `.fail({ error })` recorded appropriately.
- Authn & authz on controller routes (`plugins/catalog-backend/src/service/createRouter.ts`, `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts`, `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`): Route extracts caller credentials via `httpAuth.credentials(req)` and authorizes `catalogEntityReadPermission` via `permissionApi.authorizeConditional`, returning 404 on `DENY` or unauthorized conditional filter results.
- Input validation & injection prevention (`packages/catalog-model/src/entity/ref.ts`, `plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts`, `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`): Previous entity names are validated with `KubernetesValidatorFunctions` and restricted to the same entity kind; all SQL queries use parameterized Knex bindings; frontend redirects build internal paths via `useRouteRef`.
- JWT secret & password storage (bcrypt/argon2): n/a — not in the touched set.
- Secrets & config (`.env`, committed code, docs, tests): No secrets or real credentials in touched source files, documentation examples (`docs/features/software-catalog/*.md`, `.changeset/*.md`), or test fixtures (`*.test.ts`, `*.test.tsx`).
- Surface & headers (Helmet, auth rate limiting, global error filter): n/a — not in the touched set; route errors delegate to the existing router error handling (`NotFoundError`).
- Dependency risk: Unchanged — no package manifests or lockfiles in the touched set.

## Required fixes before sign-off
- None

Tool calls: 16
