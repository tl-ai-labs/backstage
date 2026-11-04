## Conventions

- Every new .ts, .tsx, or .js file must start with the 2026 Apache-2.0 license header (Copyright 2026 The Backstage Authors); never alter the copyright year in existing files.
- Formatting uses Prettier with singleQuote: true, trailingComma: 'all', arrowParens: 'avoid', and 80-column print width.
- Public exports in @backstage/_ packages must carry TSDoc comments with a release tag (@public or @alpha) and stay in sync with each package's report_.api.md file.
- Frontend user-facing strings must be registered in the plugin's createTranslationRef messages object (catalogTranslationRef in plugins/catalog/src/alpha/translation.ts and techdocsTranslationRef in plugins/techdocs/src/translation.ts) and read with useTranslationRef.
- Tests use Jest and @testing-library/react with renderInTestApp and TestApiProvider from @backstage/test-utils.

## Decisions

- Former-names annotation constant, syntax, and validation: Export @public ANNOTATION_FORMER_NAMES = 'backstage.io/former-names' from @backstage/catalog-model; value is a comma-separated list of entity names or references ([<kind>:][<namespace>/]<name>) resolved against the declaring entity's own kind and metadata.namespace (or 'default'), restricted to the same kind and excluding self-references. (not Dedicated metadata.formerNames array field on the Entity envelope; not Allowing cross-kind former-name claims) — Well-known annotations require no Entity schema migration, and restricting claims to the same kind prevents cross-kind URL hijacking.
- Backend persistence and indexing of former entity refs: Index normalized lowercase former entity refs (kind:namespace/name) in the existing search table under key FORMER_NAME_SEARCH_KEY = 'formerrefs' inside buildEntitySearch. (not Adding a new entity_former_refs SQL table and migration) — The search table already has ON DELETE CASCADE from final_entities, composite index (key, value, entity_id), atomic sync during performStitching via syncSearchRows, and automatic reuse in InMemoryCatalogClient.
- Precedence, conflict resolution, and permission enforcement: In DefaultEntitiesCatalog.entityByFormerRef and InMemoryCatalogClient.getEntityByFormerRef, a live entity in final_entities matching the requested ref always takes precedence; if no live entity exists at that ref, query search rows with key 'formerrefs' and value equal to the normalized ref (limit 2), returning the entity only when exactly 1 live entity claims it and returning undefined when 0 or >=2 live entities claim it; AuthorizedEntitiesCatalog.entityByFormerRef enforces catalogEntityReadPermission (including conditional permission predicates) on the resolved entity. (not First-come-first-served or lexicographical tie-breaking on conflicting former-name claims; not Mutating GET /entities/by-name/:kind/:namespace/:name to return a differently named entity) — Returning undefined on >=2 claimants prevents silent hijacking on ambiguous claims, and keeping GET /entities/by-name exact preserves zero extra query cost on direct hits.
- OpenAPI route and CatalogApi lookup contract: Add GET /entities/by-former-name/{kind}/{namespace}/{name} (operationId: GetEntityByFormerName) to plugins/catalog-backend/src/schema/openapi.yaml, regenerate OpenAPI server/client code via yarn generate in plugins/catalog-backend, wire router.get('/entities/by-former-name/:kind/:namespace/:name') in createRouter.ts with entity-fetch auditing (queryType: 'by-former-name'), and expose getEntityByFormerRef(entityRef, options) on CatalogApi, CatalogClient, InMemoryCatalogClient, and catalogApiMock. (not Overloading queryEntities filter predicates in frontend hooks without a dedicated CatalogApi method) — A dedicated endpoint and CatalogApi method encapsulates precedence, conflict detection, and permission checks on the backend while keeping direct getEntityByRef calls untouched.
- Frontend redirect and dismissible notice state in Catalog and TechDocs: On a direct getEntityByRef miss in useEntityFromUrl (catalog) and useExternalRedirect (techdocs), call catalogApi.getEntityByFormerRef?.(entityRef); if a renamed entity is returned, navigate with { replace: true, state: { ...location.state, redirectedFrom: requestedRef } } preserving sub-route path, search, and hash, and render a dismissible MUI Alert (severity='info') when location.state.redirectedFrom is set. (not Passing redirectedFrom via URL query parameters; not Module-level global state for redirect notices) — React Router location.state keeps the canonical redirected URL clean while surviving the replace navigation and scoping the notice to the redirected history entry.

## Files of this change

- `packages/catalog-model/src/entity/constants.ts` (U01, edit) — import: `import { ANNOTATION_FORMER_NAMES } from '@backstage/catalog-model';`
  - `const ANNOTATION_FORMER_NAMES(): 'backstage.io/former-names'`
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U02, edit)
- `packages/catalog-model/report.api.md` (U03, edit)
- `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.ts` (U04, edit) — import: `import { FORMER_NAME_SEARCH_KEY, buildEntitySearch } from '../database/operations/stitcher/buildEntitySearch';`
  - `const FORMER_NAME_SEARCH_KEY(): 'formerrefs'`
- `plugins/catalog-backend/src/catalog/types.ts` (U05, edit) — import: `import { EntityByFormerRefRequest, EntityByFormerRefResponse } from '../catalog/types';`
  - `interface EntityByFormerRefRequest(): { entityRef: string; filter?: FilterPredicate; credentials: BackstageCredentials }`
  - `interface EntityByFormerRefResponse(): { entity: Entity | undefined }`
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts` (U06, edit)
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts` (U07, edit)
- `plugins/catalog-backend/src/schema/openapi.yaml` (U08, edit)
- `plugins/catalog-backend/src/service/createRouter.ts` (U10, edit)
- `packages/catalog-client/src/types/api.ts` (U11, edit)
- `packages/catalog-client/src/CatalogClient.ts` (U12, edit)
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.ts` (U13, edit)
- `packages/catalog-client/report.api.md` (U14, edit)
- `packages/catalog-client/report-testUtils.api.md` (U15, edit)
- `plugins/catalog-react/src/testUtils/catalogApiMock.ts` (U16, edit)
- `plugins/catalog/src/alpha/translation.ts` (U17, edit)
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` (U18, edit)
- `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx` (U19, edit) — import: `import { EntityRenamedNotice } from '../../../components/EntityLayout/EntityLayout';`
  - `function EntityRenamedNotice(): JSX.Element | null`
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayout.tsx` (U20, edit)
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.tsx` (U21, edit)
- `plugins/techdocs/src/translation.ts` (U22, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` (U23, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx` (U24, edit)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.test.ts` (U26, edit)
- `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.test.ts` (U27, edit)
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.test.ts` (U28, edit)
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.test.ts` (U29, edit)
- `plugins/catalog-backend/src/service/createRouter.test.ts` (U30, edit)
- `packages/catalog-client/src/CatalogClient.test.ts` (U31, edit)
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.test.ts` (U32, edit)
- `plugins/catalog-react/src/testUtils/catalogApiMock.test.ts` (U33, edit)
- `plugins/catalog/src/components/EntityLayout/EntityLayout.test.tsx` (U34, edit)
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.test.tsx` (U35, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.test.tsx` (U36, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.test.tsx` (U37, edit)
- `docs/features/software-catalog/well-known-annotations.md` (U38, edit)
