## Conventions

- Add the Backstage Apache 2.0 license header with Copyright 2026 The Backstage Authors on newly created source and migration files only; keep existing copyright headers on edited files unchanged.
- Format all TypeScript, JavaScript, YAML, and Markdown files with Prettier (2-space indentation, single quotes, trailing commas, 80-col wrap).
- Tag all new symbols exported from @backstage/catalog-model and @backstage/catalog-client with @public JSDoc comments so API Extractor reports succeed without warnings.
- In frontend tests, prefer screen and findBy* queries from @testing-library/react over waitFor, and do not introduce any data-testid attributes.
- Follow docs/contribute/doc-style-guide.md for documentation edits and use minor semver bumps across all five affected packages (@backstage/catalog-model, @backstage/catalog-client, @backstage/plugin-catalog-backend, @backstage/plugin-catalog, @backstage/plugin-techdocs) in five separate changeset files, each with a message about its own package only.

## Decisions

- ANNOTATION_PREVIOUS_NAMES constant and parser placement: Export ANNOTATION_PREVIOUS_NAMES = 'backstage.io/previous-names' from packages/catalog-model/src/entity/constants.ts and parseEntityPreviousNames(entity: Entity): string[] from packages/catalog-model/src/entity/ref.ts (re-exported via entity/index.ts and package root). (not Inline parsing separately inside catalog-backend and catalog-client) — Sharing the parser in @backstage/catalog-model ensures identical comma-splitting, trimming, defaultKind: entity.kind, defaultNamespace: entity.metadata.namespace || DEFAULT_NAMESPACE, same-kind validation, self-ref filtering, and deduplication across performStitching and InMemoryCatalogClient.
- Database schema for previous entity names: Create table final_entity_previous_names in migration 20261104000000_previous_entity_names.js with entity_id (notNullable, FK to final_entities.entity_id ON DELETE CASCADE) and previous_entity_ref (notNullable), unique constraint final_entity_previous_names_entity_id_ref_uniq on (entity_id, previous_entity_ref), index final_entity_previous_names_entity_id_idx on entity_id, and index final_entity_previous_names_previous_entity_ref_idx on previous_entity_ref. (not Querying the search table on relations/annotations at read time; not Modifying entitiesBatch or normal entity lookup queries) — Isolates former-name storage to a dedicated indexed table tied to stitched final_entities via ON DELETE CASCADE and keeps entitiesBatch and existing query shapes in queries.md completely untouched (AC-5).
- Redirect resolution and permission filtering in DefaultEntitiesCatalog and AuthorizedEntitiesCatalog: Add entityRedirect?(request: EntityRedirectRequest): Promise<EntityRedirectResponse | undefined> to EntitiesCatalog with filter?: FilterPredicate; DefaultEntitiesCatalog normalizes the requested entityRef, returns undefined if a stitched live entity exists in final_entities for that ref, queries final_entity_previous_names joined with final_entities (applying request.filter via applyEntityFilterToQuery as entitiesBatch does), and returns { entityRef } only when exactly one stitched authorized entity matches; AuthorizedEntitiesCatalog reads (await this.permissionApi.authorizeConditional(...))[0] and builds the FilterPredicate via this.permissionPredicate. (not Returning one of multiple matching entities arbitrarily; not Typing EntityRedirectRequest.filter as legacy EntityFilter instead of FilterPredicate) — Matches EntitiesBatchRequest.filter and AuthorizedEntitiesCatalog.entitiesBatch while guaranteeing live entity precedence (AC-3), 404 on ambiguous multi-claimants (AC-3), and permission enforcement on redirect targets (FR-6, AC-4).
- CatalogApi.getEntityRedirectByRef optionality on interface: Declare getEntityRedirectByRef?(entityRef: string | CompoundEntityRef, options?: CatalogRequestOptions): Promise<CatalogEntityRedirect | undefined> as an optional method on the CatalogApi interface while implementing it concretely on CatalogClient and InMemoryCatalogClient. (not Making getEntityRedirectByRef required on CatalogApi) — Keeps existing CatalogApi mocks outside the write allowlist (such as plugins/catalog-react/src/testUtils/catalogApiMock.ts) assignable to CatalogApi under yarn tsc while providing full implementations on CatalogClient and InMemoryCatalogClient.
- Frontend redirect notifications and route preservation in Catalog and TechDocs: In useEntityFromUrl (Catalog), preserve useRouteRefParams, useAsyncRetry with refresh, and the errorApi guard for missing name, adding the redirect lookup inside a try/catch only after getEntityByRef misses (falling back to the not-found state on redirect lookup errors) and hiding the entity only while a redirect is pending; in useExternalRedirect (TechDocs), use useLocation() and useParams() to preserve sub-path, query string, and hash when getEntityByRef misses, posting a transient info alert via useApiHolder().get(alertApiRef)?.post(...) and navigating with { replace: true }. (not Replacing useAsyncRetry with useAsync in useEntityFromUrl or letting getEntityRedirectByRef errors prevent the not-found fallback; not Using UNSAFE_LocationContext in useExternalRedirect) — Preserves the existing refresh and not-found fallback behavior in useEntityFromUrl, uses standard react-router-dom hooks, and satisfies FR-10, FR-11, FR-12, FR-13, AC-7, and AC-8.

## Files of this change

- `packages/catalog-model/src/entity/constants.ts` (U01, edit) — import: `import { ANNOTATION_PREVIOUS_NAMES } from '@backstage/catalog-model';`
  - `const ANNOTATION_PREVIOUS_NAMES(): string`
- `packages/catalog-model/src/entity/ref.ts` (U02, edit) — import: `import { parseEntityPreviousNames } from '@backstage/catalog-model';`
  - `function parseEntityPreviousNames(entity: Entity): string[]`
- `packages/catalog-model/src/entity/index.ts` (U03, edit) — import: `import { ANNOTATION_PREVIOUS_NAMES, parseEntityPreviousNames } from '@backstage/catalog-model';`
  - `function parseEntityPreviousNames(entity: Entity): string[]`
- `plugins/catalog-backend/migrations/20261104000000_previous_entity_names.js` (U04, create)
  - `function exports.up(knex: import('knex').Knex): Promise<void>`
  - `function exports.down(knex: import('knex').Knex): Promise<void>`
- `plugins/catalog-backend/src/database/tables.ts` (U05, edit) — import: `import { DbFinalEntityPreviousNamesRow } from '../database/tables';`
  - `type DbFinalEntityPreviousNamesRow(): { entity_id: string; previous_entity_ref: string }`
- `plugins/catalog-backend/src/database/operations/stitcher/performStitching.ts` (U06, edit) — import: `import { performStitching } from './performStitching';`
- `plugins/catalog-backend/src/catalog/types.ts` (U07, edit) — import: `import { EntitiesCatalog, EntityRedirectRequest, EntityRedirectResponse } from '../catalog/types';`
  - `type EntityRedirectRequest(): { entityRef: string; filter?: FilterPredicate; credentials: BackstageCredentials }`
  - `type EntityRedirectResponse(): { entityRef: string }`
  - `interface EntitiesCatalog(): EntitiesCatalog`
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts` (U08, edit) — import: `import { DefaultEntitiesCatalog } from './DefaultEntitiesCatalog';`
  - `method DefaultEntitiesCatalog.entityRedirect(request: EntityRedirectRequest): Promise<EntityRedirectResponse | undefined>`
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts` (U09, edit) — import: `import { AuthorizedEntitiesCatalog } from './AuthorizedEntitiesCatalog';`
  - `method AuthorizedEntitiesCatalog.entityRedirect(request: EntityRedirectRequest): Promise<EntityRedirectResponse | undefined>`
- `plugins/catalog-backend/src/schema/openapi.yaml` (U10, edit)
- `plugins/catalog-backend/src/service/createRouter.ts` (U12, edit) — import: `import { createRouter } from './createRouter';`
- `packages/catalog-client/src/types/api.ts` (U13, edit) — import: `import { CatalogApi, CatalogEntityRedirect } from './types/api';`
  - `type CatalogEntityRedirect(): { entityRef: string }`
  - `interface CatalogApi(): CatalogApi`
- `packages/catalog-client/src/types/index.ts` (U14, edit) — import: `import { CatalogApi, CatalogEntityRedirect } from '@backstage/catalog-client';`
  - `type CatalogEntityRedirect(): { entityRef: string }`
- `packages/catalog-client/src/CatalogClient.ts` (U15, edit) — import: `import { CatalogClient } from '@backstage/catalog-client';`
  - `method CatalogClient.getEntityRedirectByRef(entityRef: string | CompoundEntityRef, options: CatalogRequestOptions | undefined): Promise<CatalogEntityRedirect | undefined>`
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.ts` (U16, edit) — import: `import { InMemoryCatalogClient } from '@backstage/catalog-client/testUtils';`
  - `method InMemoryCatalogClient.getEntityRedirectByRef(entityRef: string | CompoundEntityRef): Promise<CatalogEntityRedirect | undefined>`
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` (U17, edit) — import: `import { useEntityFromUrl } from './useEntityFromUrl';`
  - `function useEntityFromUrl(): EntityLoadingStatus`
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` (U18, edit) — import: `import { useExternalRedirect } from './useExternalRedirect';`
  - `function useExternalRedirect(entityRef: CompoundEntityRef): { loading: boolean; shouldShowProgress: boolean }`
- `packages/catalog-model/src/entity/ref.test.ts` (U20, edit)
- `plugins/catalog-backend/src/database/operations/stitcher/performStitching.test.ts` (U21, edit)
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.test.ts` (U22, edit)
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.test.ts` (U23, edit)
- `plugins/catalog-backend/src/service/createRouter.test.ts` (U24, edit)
- `packages/catalog-client/src/CatalogClient.test.ts` (U25, edit)
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.test.ts` (U26, edit)
- `plugins/catalog/src/components/EntityLayout/EntityLayout.test.tsx` (U27, edit)
- `plugins/catalog/src/alpha/pages.test.tsx` (U28, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.test.tsx` (U29, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.test.tsx` (U30, edit)
- `plugins/techdocs/src/alpha/components/TechDocsReaderPage.test.tsx` (U31, edit)
- `docs/features/software-catalog/well-known-annotations.md` (U32, edit)
- `docs/features/software-catalog/api.md` (U33, edit)
- `docs/features/software-catalog/audit-events.md` (U34, edit)
- `.changeset/catalog-model-previous-names.md` (U35, create)
- `.changeset/catalog-client-entity-redirect.md` (U36, create)
- `.changeset/catalog-backend-entity-redirect.md` (U37, create)
- `.changeset/catalog-entity-redirect.md` (U38, create)
- `.changeset/techdocs-entity-redirect.md` (U39, create)
