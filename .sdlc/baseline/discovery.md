# Discovery: 20261104-101757-feature-new-entity-former-names

Mode: first-time. Built 2026-11-04T04:50:30Z by mmo 0.10.1 discovery (Tier 1 plus Tier 2b stack profile).
Intent: feature-new. Seed: "Remember an entity's former names in the Backstage catalog and redirect old entity-page and TechDocs links to the renamed entity, with a notice."

## Git state

- HEAD `f20fd9b598285c88401406b3812fe00d7708136c` on branch `BS-NF-12/argon4-plus-flash38`. The working tree is clean.
- Remote `origin` is `git@github.com:tl-ai-labs/backstage.git`.
- `.gitignore` does not list `.sdlc/`. `.git/info/exclude` does list `.sdlc/`, so in this clone it is ignored locally.

## Topology

Yarn-workspaces monorepo (`packages/*`, `plugins/*`): 74 packages and 162 plugins, about 12.4k tracked files.
Top-level folders: `packages/`, `plugins/`, `docs/`, `docs-ui/`, `microsite/`, `beps/`, `contrib/`, `scripts/`, `workspaces/`, `.changeset/`, `.patches/`, `.github/`, `.storybook/`.
Entry points: `packages/app/src/index.tsx` (new frontend system), `packages/app-legacy/src/index.tsx` (legacy), `packages/backend/src/index.ts`.

## Detected stacks

- `package.json` is node-typescript: TypeScript ~5.7, Node 22 or 24, Yarn 4.18.1.
- Framework: Backstage's in-house plugin framework, with React 18 on the frontend and Express plus knex on the backend.
- Testing uses Jest 30 through `backstage-cli`. Playwright handles e2e and Storybook handles UI.
- No pre-authored adapter matches (only generic, nest and python exist), so the Tier 2b stack profile ran and was written to `.sdlc/baseline/stack-profile.md`.

## Test command

- Proposed command: `CI=1 yarn test <path>`.
  - Source: `.claude/CLAUDE.md`, section "Development Flow".
  - The root `package.json` `scripts.test` is `backstage-cli repo test`.
- Always pass a path and never run the whole suite.
- Other checks: `yarn tsc` (repo root, no options), `yarn lint --fix`, `yarn prettier --write <files>`, `yarn build:api-reports`.
- Never run `yarn build`, `yarn release`, or the changesets CLI.

## Docs present

- Root: `README.md` (plus translations), `CONTRIBUTING.md`, `STYLE.md`, `REVIEWING.md`, `SECURITY.md`.
- Agent instructions: `AGENTS.md`, `.claude/CLAUDE.md`, `plugins/catalog-backend/CLAUDE.md`.
- `plugins/catalog-backend/CLAUDE.md` says to run the DB query battery `/catalog-db-performance` when schema or queries change.
- `docs/architecture-decisions/` holds adr001 to adr015. adr009 (entity references) is relevant here.
- `docs/contribute/doc-style-guide.md`, and the BEPs under `beps/`.

## Detected AI/agent setup

- `.claude/`, containing `CLAUDE.md`, `settings.local.json` and `skills/` (`backstage-release-notes`, `catalog-db-performance.md`).
- `.cursor/rules/`, containing `backstage-project.mdc` and `tests`.
- `.github/copilot-instructions.md`.
- `AGENTS.md`, plus `plugins/catalog-backend/CLAUDE.md`.
- None found: `.mcp.json`, Aider config, `.continue/`, `.roo/`, `routing-policy.yaml`, gemini configs.

## Env keys (names only)

- No `.env*` files at repo root or depth 3 or less.
- Code references 113 distinct `process.env.*` names. The in-scope packages use only `NODE_ENV`, `LOG_LEVEL`, `PERFORMANCE_TEST`, `PERFORMANCE_TRACE` and `HAS_REACT_DOM_CLIENT`.

## Monorepo / submodules / LFS / infra

- Yarn workspaces. Per-package tests use `CI=1 yarn test plugins/<pkg>` or a file path.
- No submodules. No LFS.
- Infra: `docker-compose.deps.yml` and `.github/workflows/` (49 files). No Dockerfile at root, no terraform.

## Regulated-repo signals

- `SECURITY.md` (kind: SECURITY.md) is the standard OSS vulnerability-disclosure policy, not a compliance marker.
- No HIPAA, PCI, SOC2 or GDPR files or folders, and no compliance CODEOWNERS entries.
- `regulated_repo_warning_required: true` is set, per the rule, so Gate 0 shows the standard notice. This is low risk.

## Intent-relevant code map (former names / rename redirects)

### catalog-model (`@backstage/catalog-model` 1.10.2)

- `packages/catalog-model/src/entity/Entity.ts`: the `EntityMeta` type (name, namespace, uid, title, annotations, links and so on). A new metadata field would be typed here.
- `packages/catalog-model/src/schema/EntityMeta.schema.json`: JSON schema for metadata (`additionalProperties: true`). A typed field like `formerNames` would be documented and validated here.
- `packages/catalog-model/src/entity/constants.ts`: well-known `ANNOTATION_*` constants (view-url, edit-url, kubernetes). A new annotation such as `backstage.io/former-names` would go here if that route is chosen.
- `packages/catalog-model/src/location/annotation.ts`: location annotations (managed-by-location, origin, source-location).
- `packages/catalog-model/src/entity/ref.ts`: `parseEntityRef` / `stringifyEntityRef`, used to normalize former-name refs.
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts`: field format validation for metadata.
- No existing rename, alias or former-name concept exists anywhere in catalog-model, catalog-backend, catalog, catalog-react or techdocs.
- The only nearby precedent is the `backstage.io/techdocs-entity` annotation, an external TechDocs redirect that already exists.

### catalog-backend (`@backstage/plugin-catalog-backend` 4.0.3-next.0)

- `plugins/catalog-backend/src/service/createRouter.ts`: Express routes.
  - `GET /entities/by-name/:kind/:namespace/:name` is at line ~423 and uses `entitiesCatalog.entitiesBatch` and then `writeSingleEntityResponse`.
  - `POST /entities/by-refs` is at line ~497.
  - This is the place to add a by-former-name fallback or redirect hint.
- `plugins/catalog-backend/src/service/response/write.ts`: `writeSingleEntityResponse` throws `NotFoundError` when nothing is found.
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts`: knex queries over `final_entities` (`entitiesBatch` at line ~322, keyed by `final_entities.entity_ref`).
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts`: permission wrapper around the catalog.
- `plugins/catalog-backend/src/catalog/types.ts`: the `EntitiesCatalog` interface (`entitiesBatch`, `queryEntities` and so on).
- `plugins/catalog-backend/src/database/tables.ts`: DB row types (`DbFinalEntitiesRow`, `DbRefreshStateRow`, `DbSearchRow` and others).
- `plugins/catalog-backend/migrations/*.js`: knex migrations (latest `20261007000000_stitch_failure_count.js`). They use the `// @ts-check` JS `up`/`down` pattern. They are applied by `src/database/migrations.ts` and tested by `src/tests/migrations.test.ts`.
- `plugins/catalog-backend/src/database/DefaultProcessingDatabase.ts` and `database/operations/refreshState/checkLocationKeyConflict.ts`: refresh_state writes and entity_ref conflicts. This is where a rename (new entity_ref, same location) is observable.
- `plugins/catalog-backend/src/stitching/DefaultStitcher.ts` and `database/operations/stitcher/performStitching.ts` / `buildEntitySearch.ts`: stitching into `final_entities` and the `search` table. Metadata fields are indexed into `search`, which a former-name lookup could use.
- `plugins/catalog-backend/src/database/operations/util/deleteOrphanedEntities.ts`: orphan cleanup when an old name disappears.
- `plugins/catalog-backend/src/schema/openapi.yaml`: the OpenAPI spec (`/entities/by-name/{kind}/{namespace}/{name}` at line ~975).
- `plugins/catalog-backend/src/schema/openapi/generated/`: generated server router and models. Do not hand-edit.
- Generator: `plugins/catalog-backend/package.json` script `"generate": "backstage-repo-tools package schema openapi generate --server --client-package packages/catalog-client"`.
- `plugins/catalog-backend/report.sql.md`: SQL report updated by `yarn build:api-reports` (`--sql-reports`).
- `plugins/catalog-backend/src/tests/performance/query-battery/`: the query battery the plugin CLAUDE.md requires updating when queries or schema change.

### catalog-client (`@backstage/catalog-client` 1.16.3)

- `packages/catalog-client/src/CatalogClient.ts`: `getEntityByRef` (line ~468) and `getEntitiesByRefs` (line ~236).
- `packages/catalog-client/src/types/api.ts`: the `CatalogApi` interface (`getEntityByRef` at line ~696).
- `packages/catalog-client/src/schema/openapi/generated/`: generated client, regenerated from the catalog-backend spec.

### plugin-catalog frontend (`@backstage/plugin-catalog` 2.0.11-next.0)

- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts`: the shared hook that calls `catalogApi.getEntityByRef({kind,namespace,name})` from route params. Both systems use it, so it is the main hook point for a former-name redirect.
- `plugins/catalog/src/components/CatalogEntityPage/CatalogEntityPage.tsx`: legacy page, `AsyncEntityProvider {...useEntityFromUrl()}`.
- `plugins/catalog/src/alpha/components/CatalogEntityPage.tsx`: new-frontend-system page that uses the same hook.
- `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx`: the legacy layout. It renders the not-found `WarningPanel` (`entityPage.notFoundMessage`) at line ~386.
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayout.tsx` and `EntityLayoutBui.tsx`: new-system layouts (MUI and BUI) with the same not-found handling.
- `plugins/catalog/src/components/EntityNotFound/EntityNotFound.tsx`: a standalone not-found illustration component.
- `plugins/catalog/src/components/EntityOrphanWarning/EntityOrphanWarning.tsx`: precedent for an entity-page notice banner.
- `plugins/catalog/src/alpha/pages.tsx`: the new-system entity page at route `/catalog/:namespace/:kind/:name` (line ~197).
- `plugins/catalog/src/alpha/translation.ts`: the i18n messages (`entityPage.notFoundMessage` and others) where notice text belongs.
- `plugins/catalog-react/src/hooks/useEntity.tsx`: `AsyncEntityProvider`, `useAsyncEntity`, `EntityLoadingStatus`. Not-found is `!loading && !error && !entity`.
- `plugins/catalog-react/src/translation.ts`: catalog-react i18n.

### TechDocs

- `plugins/techdocs/src/Router.tsx`: reader route `/:namespace/:kind/:name/*`, plus `TechDocsReaderRouter` and `EmbeddedDocsRouter`.
- `plugins/techdocs/src/routes.ts`: `rootDocsRouteRef` and the other route refs.
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx`: the legacy reader page. It calls `useExternalRedirect(entityRef)` at line ~201.
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts`: already looks up the entity via `catalogApi.getEntityByRef` and `navigate(..., {replace:true})` for the `backstage.io/techdocs-entity` annotation. This is the closest existing pattern for a former-name redirect.
- `plugins/techdocs/src/reader/components/TechDocsRedirectNotification/TechDocsRedirectNotification.tsx`: MUI Snackbar redirect notice, used by `reader/transformers/handleMetaRedirects.tsx`. It can be reused for the "renamed" notice.
- `plugins/techdocs/src/reader/components/TechDocsNotFound.tsx`: the TechDocs not-found view.
- `plugins/techdocs/src/alpha/components/TechDocsReaderPage.tsx` and `TechDocsReaderLayout.tsx`: new-system reader. It wraps `TechDocsReaderRouter`, so it shares the legacy reader internals.
- `plugins/techdocs/src/translation.ts`: techdocs i18n (`redirectNotification.*`).
- `plugins/techdocs/src/client.ts`: the frontend TechDocs storage and metadata client (`getEntityMetadata`, `getEntityDocs`).
- `plugins/techdocs-backend/src/service/router.ts`: `/metadata/techdocs/:namespace/:kind/:name`, `/metadata/entity/...`, `/sync/...` and the static docs middleware. Each uses `entityLoader.load` and throws `NotFoundError`.
- `plugins/techdocs-backend/src/service/CachedEntityLoader.ts`: the cached `catalog.getEntityByRef` used by the techdocs backend.
- `plugins/techdocs-common/src/constants.ts`: TechDocs annotation constants (`TECHDOCS_EXTERNAL_ANNOTATION`).

### Docs

- `docs/features/software-catalog/descriptor-format.md`: the "Common to All Kinds: The Metadata" section (line ~208). A new `metadata` field would be documented here.
- `docs/features/software-catalog/well-known-annotations.md`: the annotation list (techdocs-entity at line ~102). A new annotation would be documented here.
- `docs/features/software-catalog/references.md`: the entity reference docs, which the not-found message links to.
- `docs/features/software-catalog/life-of-an-entity.md`: ingestion, stitching and orphaning. Relevant to rename semantics.
- `docs/features/software-catalog/api.md`: the catalog REST API docs.
- `docs/features/techdocs/how-to-guides.md`, `troubleshooting.md`, `FAQ.md`: TechDocs docs for describing the redirect.
- `docs/contribute/doc-style-guide.md`: the required style for docs edits.

### Changesets

- `.changeset/*.md` files use YAML front matter mapping a package to a bump, then one plain-language paragraph for adopters.
  - Example: `'@backstage/plugin-auth-backend': patch`.
  - Names are kebab-case, either descriptive or random (for example `calm-roots-link.md`, `catalog-rules-url-canonical-matching.md`).
  - `.changeset/config.json` has baseBranch `master`. `pre.json` is present, which means pre-release (`next`) mode.
- Bump rules (from CLAUDE.md):
  - A new feature is `minor` for packages at 1.0 or above and `patch` for packages below 1.0.
  - A breaking change is `major` at 1.0 or above and `minor` below 1.0.
  - Packages here are all 1.0 or above except `@backstage/plugin-techdocs-common` (0.1.2).
- Use separate changesets when packages need different messages. Never mention internal symbols.
- Write changesets by hand. Never use the changeset CLI.

## Coexistence risks

- Cursor rules at `.cursor/rules/` (backstage-project.mdc, tests). The plugin will never touch them, but if Cursor's auto-lint runs on save, our changes may trigger it.
- `.gitignore` does not cover `.sdlc/`. In this clone `.git/info/exclude` lists `.sdlc/`, so `git add -A` will not stage run artifacts. Adding `.sdlc/` to `.gitignore` is not needed here, and it would be an unrelated diff to an upstream OSS repo.
- The OpenAPI generated code under `plugins/catalog-backend/src/schema/openapi/generated/` and `packages/catalog-client/src/schema/openapi/generated/` must come from the `generate` script after editing `openapi.yaml`, never from hand edits.
- `plugins/catalog-backend/CLAUDE.md` requires running `/catalog-db-performance` and updating the query battery if DB queries or schema change.
- CLAUDE.md requires an Apache-2.0 header with the year 2026 on new `.ts`/`.tsx`/`.js` files (migrations included). Do not change years on existing files.

## Proposed off-limits

`.env`, `.env.*`, `.claude/**`, `plugins/catalog-backend/CLAUDE.md`, `AGENTS.md`, `.cursor/**`, `.github/copilot-instructions.md`, `.mcp.json`, `node_modules/**`, `dist/**`, `dist-types/**`, `build/**`, `vendor/**`, `third_party/**`, `**/schema/openapi/generated/**` (regenerate only), `docs/releases/**`, ESLint/Prettier/TS configs (`.eslintrc.js`, `tsconfig.json`), `.yarn/**`, `yarn.lock`, `.git/**`, `.sdlc/**`.
