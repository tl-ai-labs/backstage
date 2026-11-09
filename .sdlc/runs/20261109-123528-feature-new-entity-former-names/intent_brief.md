# Intent Brief — feature-new — Catalog entity former names and rename redirects

## Context

Seed (interview Q1, the user's own words):
Remember an entity's former names in the Backstage catalog and redirect old entity-page and TechDocs links to the renamed entity, with a notice.

Brief (answers the remaining interview questions; Vaibhav's answer, verbatim):

Problem: A catalog entity's URL is built from its kind, namespace and name, so renaming a service (or moving it to another namespace) breaks every bookmark, wiki link and chat message that pointed at it, and the user just sees "Entity not found". Other plugins that key on the entity name, such as TechDocs URLs, break the same way. Request open since 2021 (backstage/backstage#5231).

Before: opening an old link such as /catalog/default/component/old-name shows the "Entity not found" page.
After: the same link lands on /catalog/default/component/new-name with a notice that the entity was renamed from old-name.

Where the work lands: packages/catalog-model (a way to declare former names, for example an annotation), plugins/catalog-backend (index former refs, resolve them in lookups without letting one entity hijack another's name, and handle conflicts), packages/catalog-client (lookup method), and plugins/catalog plus plugins/techdocs (redirect from the not-found path with a "this entity was renamed" notice).

Design questions to answer: who may claim a former name, what happens when a new entity takes an old name, permission checks on the redirect target, and keeping existing lookups fast.

Acceptance criteria: backend tests for former-name indexing, conflict handling and permissioned lookup; jsdom tests for the redirect and notice on the entity and docs routes; yarn tsc and lint pass.

Tests: unit tests in the backend plus jsdom tests in the frontend plugins.

Discovery notes: Yarn 4 TypeScript monorepo (Backstage). Entity lookup is `GET /entities/by-name/:kind/:namespace/:name` in `plugins/catalog-backend/src/service/createRouter.ts`; the REST API is OpenAPI-generated (`yarn --cwd plugins/catalog-backend generate` writes into the backend and catalog-client `schema/openapi/generated` folders). Newest migration `20261007000000_stitch_failure_count.js`. TechDocs already has redirect-notification UI (`TechDocsRedirectNotification`). `plugins/catalog-backend/CLAUDE.md` asks for the catalog-db-performance check on any catalog DB query/index/schema change.

## Goal

An entity can declare its former refs (e.g. via a well-known annotation in `metadata.annotations`). The catalog backend indexes those former refs, resolves an old ref to the current entity in a dedicated lookup (subject to permission checks on the target and conflict rules so no entity can hijack a live or another entity's name), and exposes it through the catalog client. When the entity page or the TechDocs reader hits "not found" for a ref, the frontend asks for a former-name match and redirects to the current entity's page / docs with a "this entity was renamed from <old-name>" notice. Existing by-name lookups stay as fast as today.

## Files in scope

- `packages/catalog-model/src/**`, `packages/catalog-model/report*.api.md`
- `plugins/catalog-backend/src/**` (including `src/schema/openapi.yaml` and `src/schema/openapi/generated/**` for codegen output)
- `plugins/catalog-backend/migrations/**` (new migration for the former-refs index)
- `plugins/catalog-backend/report*.api.md`, `plugins/catalog-backend/report.sql.md`
- `packages/catalog-client/src/**` (including `src/schema/openapi/generated/**`), `packages/catalog-client/report*.api.md`
- `plugins/catalog-react/src/**`, `plugins/catalog-react/report*.api.md` (shared not-found/notice helpers if needed)
- `plugins/catalog/src/**`, `plugins/catalog/report*.api.md`
- `plugins/techdocs/src/**`, `plugins/techdocs/report*.api.md`
- `docs/features/software-catalog/well-known-annotations.md`, `docs/features/software-catalog/**` and `docs/features/techdocs/**` (documentation of the feature)
- `.changeset/*.md` (new changesets for the affected published packages)

## Files off-limits

- Project defaults from `.sdlc/project.json` `off_limits_default`
- All detected AI configs: `.claude/**`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`, `.cursor/**`, `.github/copilot-instructions.md`
- Generated/build output: `**/dist/**`, `dist-types/**`, `dist-storybook/**`, `**/build/**`, `**/node_modules/**`, `.yarn/**`, `plugins/events-node/src/generated/**`; other packages' `schema/openapi/generated/**`
- `docs/releases/**`, `**/CHANGELOG.md`
- ESLint/Prettier/TS config: `.eslintrc.js`, `**/.eslintrc.js`, `.prettierignore`, `.eslintignore`, `tsconfig.json`

## Acceptance criteria

- Backend tests for former-name indexing, conflict handling and permissioned lookup.
- jsdom tests for the redirect and notice on the entity and docs routes.
- `yarn tsc` and lint pass.

## Run settings (Gate 0)

- Test command (exact): `CI=true yarn test plugins/catalog-backend plugins/catalog plugins/techdocs && yarn tsc && yarn lint:all`. Never run lint with `--fix`.
- Auth mode: estimated. Policy: opus55-plus-flash38-agsdk.
- Regulated-repo warning acknowledged: no regulated data in this repo.
- `.gitignore`: not modified; `.sdlc/` is not added (note in the final report).

## Non-goals

- Automatic detection of renames without an explicit declaration.
- Redirecting arbitrary non-catalog plugin routes beyond the entity page and TechDocs reader.
- Changing the existing by-name lookup semantics or performance characteristics.
