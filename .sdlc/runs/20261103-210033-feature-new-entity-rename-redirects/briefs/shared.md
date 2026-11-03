## Conventions

- Every new .ts or .tsx source file must begin with the 2026 Apache-2.0 Backstage license header comment block.
- Format code with Prettier (@backstage/cli/config/prettier: single quotes, trailing commas, 2-space indentation).
- Use TypeScript strict typing; never use @ts-ignore or @ts-expect-error in production code.
- Normalise entity references with parseEntityRef and stringifyEntityRef from @backstage/catalog-model using en-US lowercase for kind and namespace.
- User-facing strings in @backstage/plugin-catalog and @backstage/plugin-techdocs must be defined in each plugin's translation ref and accessed via useTranslationRef.
- Never hand-edit generated OpenAPI files (src/schema/openapi/generated/**) or API reports (report*.api.md); regenerate them via tooling steps.

## Decisions

- Former-names annotation constant and value format: Export ANNOTATION_FORMER_NAMES = 'backstage.io/former-names' from @backstage/catalog-model; value is a comma-separated list of entity refs where each trimmed entry defaults missing kind and namespace to the declaring entity's kind and namespace (or DEFAULT_NAMESPACE), must share the declaring entity's kind (case-insensitive), and is validated in FieldFormatEntityPolicy. (not Allowing cross-kind former-name claims (e.g. a Group or User claiming a retired Component's name); not YAML array in metadata.annotations (annotations in Backstage entity descriptors are string-to-string maps); not Separate spec.formerNames field (requires altering base Entity schema across all kinds instead of metadata annotations)) — Requiring same-kind refs in comma-separated string format matches Backstage annotation conventions while preventing cross-kind name hijacking.
- Legitimacy of former-name claims, conflict handling, and database query performance: (1) Legitimacy: a former-name claim for ref R by live entity E is legitimate only when (a) R has the same kind as E (and is not E's own current ref), (b) no live stitched entity exists at R in final_entities, and (c) whenever a former occupant row exists for R in refresh_state (such as an orphaned or not-yet-purged entity), E's provenance matches it on non-empty refresh_state.location_key, metadata.annotations['backstage.io/managed-by-origin-location'], or metadata.annotations['backstage.io/managed-by-location'] (in that precedence order; a claimant lacking the former occupant's provenance key is rejected). (2) Contested names: when two or more live entities in final_entities claim R, if all claimants share the same non-empty provenance key (location_key, origin-location, or managed-by-location) only if there is a single unique legitimate claimant does it resolve — whenever multiple claimants exist (whether from different sources or the same source), resolution refuses the ambiguous claim and returns { entity: undefined } (HTTP 404) rather than letting a newcomer win by sort order. (3) Database & migrations: no new table or Knex migration is needed because buildEntitySearch indexes legitimate same-kind former refs under key 'metadata.annotations.backstage.io/former-names' in the existing search(key, value) index and DefaultEntitiesCatalog.entityByFormerRef queries final_entities + refresh_state + search (LIMIT 2) only on a lookup miss, keeping primary entity lookups completely untouched. (not Allowing any entity from any source to claim any retired name and breaking multi-claimant ties by sorting on entity_ref ASC (lets a newly registered entity hijack another entity's old links if its ref sorts earlier); not Adding a new database table and Knex migration for former names; not Modifying primary entity lookup queries (GET /entities/by-name or POST /entities/by-refs) to join former names on every lookup) — Enforcing same-kind + provenance matching against any retained refresh_state row and refusing ambiguous multi-claimant redirects (returning 404 when >1 claimant exists) prevents any newcomer from hijacking a retired or contested name by sort order, while reusing the indexed search(key, value) and refresh_state tables requires no migration and adds zero overhead to live lookups.
- Catalog backend route, permission enforcement, and CatalogClient method: Expose GET /entities/by-former-name/{kind}/{namespace}/{name} (operationId GetEntityByFormerName) in plugins/catalog-backend/src/schema/openapi.yaml and createRouter.ts, backed by EntitiesCatalog.entityByFormerRef; AuthorizedEntitiesCatalog.entityByFormerRef enforces catalogEntityReadPermission on the unique legitimate target entity and returns { entity: undefined } (HTTP 404) when denied; expose optional getEntityByFormerRef?(entityRef, options) on CatalogApi and implement it on CatalogClient and InMemoryCatalogClient. (not Returning 301/302 or 403 from GET /entities/by-name/:kind/:namespace/:name when a former name matches; not Falling through to a secondary claimant when a claimant is denied by permissions or when claims conflict) — A dedicated endpoint keeps programmatic getEntityByRef calls exact, prevents leaking the existence or new name of an unauthorized rename target (returning 404), and making getEntityByFormerRef optional on the CatalogApi interface preserves backwards compatibility with partial test mocks while providing full support in CatalogClient and InMemoryCatalogClient.
- Frontend and TechDocs rename redirect and notice mechanics: Both @backstage/plugin-catalog (in useEntityFromUrl) and @backstage/plugin-techdocs (in useExternalRedirect + TechDocsReaderPage) resolve former names on the frontend by calling catalogApi.getEntityByFormerRef?.(entityRef) only when getEntityByRef returns undefined; on a hit, they replace-navigate to the target entity's route while preserving any sub-route/sub-path and display an info Alert banner naming the former entity reference. (not Resolving former names inside techdocs-backend metadata routes without redirecting the browser URL; not Showing the rename banner when navigating directly to the entity's current URL) — Frontend resolution via catalogApi avoids duplicating catalog lookup logic in techdocs-backend, updates the browser URL to the canonical entity or docs route with sub-path preserved, and shows the rename notice only when arriving via a former name.

## Files of this change

- `packages/catalog-model/src/entity/constants.ts` (U01, edit) — import: `import { ANNOTATION_FORMER_NAMES } from '@backstage/catalog-model';`
  - `const ANNOTATION_FORMER_NAMES(): string`
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (U02, edit) — import: `import { FieldFormatEntityPolicy } from '@backstage/catalog-model';`
  - `class FieldFormatEntityPolicy(): FieldFormatEntityPolicy`
- `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.ts` (U03, edit) — import: `import { buildEntitySearch } from '../database/operations/stitcher/buildEntitySearch';`
  - `function buildEntitySearch(entityId: string, entity: Entity): DbSearchRow[]`
- `plugins/catalog-backend/src/catalog/types.ts` (U04, edit) — import: `import { EntitiesCatalog, EntityByFormerRefRequest, EntityByFormerRefResponse } from '../catalog/types';`
  - `interface EntityByFormerRefRequest(): EntityByFormerRefRequest`
  - `interface EntityByFormerRefResponse(): EntityByFormerRefResponse`
  - `interface EntitiesCatalog(): EntitiesCatalog`
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.ts` (U05, edit) — import: `import { DefaultEntitiesCatalog } from './DefaultEntitiesCatalog';`
  - `class DefaultEntitiesCatalog(): DefaultEntitiesCatalog`
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.ts` (U06, edit) — import: `import { AuthorizedEntitiesCatalog } from './AuthorizedEntitiesCatalog';`
  - `class AuthorizedEntitiesCatalog(): AuthorizedEntitiesCatalog`
- `plugins/catalog-backend/src/schema/openapi.yaml` (U07, edit)
- `plugins/catalog-backend/src/service/createRouter.ts` (U09, edit) — import: `import { createRouter } from './createRouter';`
  - `function createRouter(options: RouterOptions): Promise< express.Router >`
- `packages/catalog-client/src/types/api.ts` (U10, edit) — import: `import { CatalogApi } from '@backstage/catalog-client';`
  - `interface CatalogApi(): CatalogApi`
- `packages/catalog-client/src/CatalogClient.ts` (U11, edit) — import: `import { CatalogClient } from '@backstage/catalog-client';`
  - `class CatalogClient(): CatalogClient`
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.ts` (U12, edit) — import: `import { InMemoryCatalogClient } from '@backstage/catalog-client/testUtils';`
  - `class InMemoryCatalogClient(): InMemoryCatalogClient`
- `plugins/catalog/src/alpha/translation.ts` (U13, edit) — import: `import { catalogTranslationRef } from '../../alpha/translation';`
  - `const catalogTranslationRef(): TranslationRef`
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.ts` (U14, edit) — import: `import { useEntityFromUrl } from './useEntityFromUrl';`
  - `function useEntityFromUrl(): EntityLoadingStatus`
- `plugins/catalog/src/components/EntityLayout/EntityLayout.tsx` (U15, edit) — import: `import { EntityLayout } from './EntityLayout';`
  - `function EntityLayout(props: EntityLayoutProps): JSX.Element`
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayout.tsx` (U16, edit) — import: `import { EntityLayout } from './EntityLayout';`
  - `function EntityLayout(props: EntityLayoutProps): JSX.Element`
- `plugins/catalog/src/alpha/components/EntityLayout/EntityLayoutBui.tsx` (U17, edit) — import: `import { EntityLayoutBui } from './EntityLayout/EntityLayoutBui';`
  - `function EntityLayoutBui(props: object): JSX.Element`
- `plugins/techdocs/src/translation.ts` (U18, edit) — import: `import { techdocsTranslationRef } from '../../../translation';`
  - `const techdocsTranslationRef(): TranslationRef`
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.ts` (U19, edit) — import: `import { useExternalRedirect } from './useExternalRedirect';`
  - `function useExternalRedirect(entityRef: CompoundEntityRef): { loading: boolean; shouldShowProgress: boolean; renamedFrom?: string; resolvedEntityRef?: CompoundEntityRef }`
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.tsx` (U20, edit) — import: `import { TechDocsReaderPage } from './TechDocsReaderPage';`
  - `function TechDocsReaderPage(props: TechDocsReaderPageProps): JSX.Element`
- `.changeset/entity-rename-redirects.md` (U22, create)
- `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.test.ts` (U23, edit)
- `plugins/catalog-backend/src/database/operations/stitcher/buildEntitySearch.test.ts` (U24, edit)
- `plugins/catalog-backend/src/service/DefaultEntitiesCatalog.test.ts` (U25, edit)
- `plugins/catalog-backend/src/service/AuthorizedEntitiesCatalog.test.ts` (U26, edit)
- `plugins/catalog-backend/src/service/createRouter.test.ts` (U27, edit)
- `packages/catalog-client/src/CatalogClient.test.ts` (U28, edit)
- `packages/catalog-client/src/testUtils/InMemoryCatalogClient.test.ts` (U29, edit)
- `plugins/catalog/src/components/CatalogEntityPage/useEntityFromUrl.test.tsx` (U30, create)
- `plugins/catalog/src/components/EntityLayout/EntityLayout.test.tsx` (U31, edit)
- `plugins/catalog/src/alpha/pages.test.tsx` (U32, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.test.tsx` (U33, edit)
- `plugins/techdocs/src/reader/components/TechDocsReaderPage/TechDocsReaderPage.test.tsx` (U34, edit)
- `docs/features/software-catalog/well-known-annotations.md` (U35, edit)
- `docs/features/software-catalog/references.md` (U36, edit)
- `docs/features/software-catalog/life-of-an-entity.md` (U37, edit)
- `docs/features/software-catalog/faq.md` (U38, edit)
- `docs/features/techdocs/how-to-guides.md` (U39, edit)
- `docs/features/techdocs/FAQ.md` (U40, edit)
