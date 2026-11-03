/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/esm/useAsync';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  CompoundEntityRef,
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { buildTechDocsURL } from '@backstage/plugin-techdocs-react';
import { TECHDOCS_EXTERNAL_ANNOTATION } from '@backstage/plugin-techdocs-common';
import { rootDocsRouteRef } from '../../../routes';

/**
 * Hook to handle external TechDocs redirects based on entity annotations.
 * Checks if an entity has the `backstage.io/techdocs-entity` annotation and
 * redirects to the external TechDocs URL if present. If the entity is not
 * found, it also checks whether the ref is a former name of another entity
 * and redirects to that entity's TechDocs, preserving any sub-path.
 *
 * @param entityRef - The entity reference to check for external redirects
 * @returns Object containing loading state, whether a redirect is in progress,
 * and rename information when arriving through a former entity name
 *
 * @internal
 */
export function useExternalRedirect(entityRef: CompoundEntityRef): {
  loading: boolean;
  shouldShowProgress: boolean;
  renamedFrom?: string;
  resolvedEntityRef?: CompoundEntityRef;
} {
  const catalogApi = useApi(catalogApiRef);
  const navigate = useNavigate();
  const viewTechdocLink = useRouteRef(rootDocsRouteRef);
  const params = useParams();
  const subPath = params['*'] ?? '';

  // Create a stable string key for the entity to use as a dependency.
  // This ensures the useAsync hook only re-runs when the entity changes,
  // preventing redundant API calls during sub-page navigation within the same entity's documentation.
  const entityKey = stringifyEntityRef(entityRef);
  // Track which entity we've already checked to avoid redundant checks
  // when navigating between pages within the same entity's documentation.
  const checkedEntityRef = useRef<string | null>(null);
  const shouldCheckForRedirect = checkedEntityRef.current !== entityKey;
  // Remembers a former-name redirect so the rename notice survives the
  // navigation to the entity's current route.
  const renameInfoRef = useRef<{
    from: string;
    to: string;
    targetEntityRef: CompoundEntityRef;
  } | null>(null);

  // Check if this entity should redirect to external TechDocs
  const externalRedirectResult = useAsync(async (): Promise<
    | {
        redirectUrl: string;
        isFormerRedirect: boolean;
        renamedFrom?: string;
        targetEntityRef?: CompoundEntityRef;
      }
    | undefined
  > => {
    try {
      const catalogEntity = await catalogApi.getEntityByRef(entityRef);

      if (catalogEntity) {
        if (
          catalogEntity.metadata?.annotations?.[TECHDOCS_EXTERNAL_ANNOTATION]
        ) {
          const redirectUrl = buildTechDocsURL(catalogEntity, viewTechdocLink);
          if (redirectUrl) {
            return {
              redirectUrl,
              isFormerRedirect: false,
            };
          }
        }
        return undefined;
      }

      const formerEntity = await catalogApi.getEntityByFormerRef?.(entityRef);
      if (formerEntity) {
        const targetEntityRef: CompoundEntityRef = {
          kind: formerEntity.kind.toLocaleLowerCase('en-US'),
          namespace: (
            formerEntity.metadata.namespace ?? DEFAULT_NAMESPACE
          ).toLocaleLowerCase('en-US'),
          name: formerEntity.metadata.name,
        };
        const baseUrl =
          (formerEntity.metadata?.annotations?.[TECHDOCS_EXTERNAL_ANNOTATION]
            ? buildTechDocsURL(formerEntity, viewTechdocLink)
            : undefined) ?? viewTechdocLink(targetEntityRef);
        const redirectUrl = `${baseUrl}${
          subPath ? `/${subPath.replace(/^\/+/, '')}` : ''
        }`;

        renameInfoRef.current = {
          from: entityKey,
          to: stringifyEntityRef(targetEntityRef),
          targetEntityRef,
        };

        return {
          redirectUrl,
          isFormerRedirect: true,
          renamedFrom: entityKey,
          targetEntityRef,
        };
      }
    } catch (error) {
      // Ignore errors and allow the current entity's TechDocs to load.
      // This handles cases where the catalog API is unavailable or the entity doesn't exist.
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey, catalogApi]);

  useEffect(() => {
    // Navigate to the target TechDocs if a redirect URL is available
    if (!externalRedirectResult.loading && externalRedirectResult.value) {
      navigate(externalRedirectResult.value.redirectUrl, { replace: true });
    }

    // Mark entity as checked once we've determined there's no redirect needed
    // (or a former-name redirect has been resolved).
    // This prevents the entire page from unmounting/remounting (showing Progress spinner)
    // on subsequent sub-page navigation within the same entity.
    if (
      !externalRedirectResult.loading &&
      (!externalRedirectResult.value ||
        externalRedirectResult.value.isFormerRedirect)
    ) {
      checkedEntityRef.current = entityKey;
    }
  }, [
    externalRedirectResult.loading,
    externalRedirectResult.value,
    navigate,
    entityKey,
  ]);

  // Determine if we should show a loading indicator (which replaces the entire page with a Progress spinner).
  // Only show it when: 1) checking a new/unchecked entity, or 2) we have an external redirect URL and are navigating.
  const shouldShowProgress =
    (shouldCheckForRedirect && externalRedirectResult.loading) ||
    (!!externalRedirectResult.value?.redirectUrl &&
      !externalRedirectResult.value.isFormerRedirect);

  const renameInfo = renameInfoRef.current;

  return {
    loading: externalRedirectResult.loading,
    shouldShowProgress,
    renamedFrom:
      externalRedirectResult.value?.renamedFrom ??
      (renameInfo &&
      (renameInfo.to === entityKey || renameInfo.from === entityKey)
        ? renameInfo.from
        : undefined),
    resolvedEntityRef:
      externalRedirectResult.value?.targetEntityRef ??
      (renameInfo && renameInfo.from === entityKey
        ? renameInfo.targetEntityRef
        : undefined),
  };
}
