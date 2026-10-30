/*
 * Copyright 2026 The Backstage Authors
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
import { useLocation, useNavigate } from 'react-router-dom';
import useAsync from 'react-use/esm/useAsync';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { resolveFormerEntityRef } from '@backstage/catalog-client';
import { rootDocsRouteRef } from '../../../routes';

/**
 * Hook to handle former-ref redirects for TechDocs when an entity does not exist.
 *
 * @param entityRef - The requested entity reference to check for former ref resolution
 * @returns Object containing whether a redirect check or navigation is in progress
 *
 * @internal
 */
export function useFormerRefRedirect(entityRef: CompoundEntityRef): {
  shouldShowProgress: boolean;
} {
  const catalogApi = useApi(catalogApiRef);
  const navigate = useNavigate();
  const location = useLocation();
  const docsRoute = useRouteRef(rootDocsRouteRef);

  const entityKey = stringifyEntityRef(entityRef);
  const checkedEntityRef = useRef<string | null>(null);
  const shouldCheckForRedirect = checkedEntityRef.current !== entityKey;

  const redirectResult = useAsync(async () => {
    let existing;
    try {
      existing = await catalogApi.getEntityByRef(entityRef);
    } catch {
      return undefined;
    }

    if (existing) {
      return undefined;
    }

    try {
      const resolution = await resolveFormerEntityRef(catalogApi, entityKey);
      if (resolution.status === 'resolved') {
        return resolution;
      }
    } catch {
      // Swallow errors; this is a render path and must not throw.
    }

    return undefined;
  }, [entityKey, catalogApi]);

  useEffect(() => {
    if (!redirectResult.loading && redirectResult.value) {
      const resolution = redirectResult.value;
      const oldBase = docsRoute({
        namespace: entityRef.namespace.toLocaleLowerCase('en-US'),
        kind: entityRef.kind.toLocaleLowerCase('en-US'),
        name: entityRef.name,
      });

      const newBase = docsRoute({
        namespace: resolution.entity.metadata.namespace
          ? resolution.entity.metadata.namespace.toLocaleLowerCase('en-US')
          : 'default',
        kind: resolution.entity.kind.toLocaleLowerCase('en-US'),
        name: resolution.entity.metadata.name,
      });

      const currentPath = location.pathname;
      const subPath = currentPath.startsWith(oldBase)
        ? currentPath.slice(oldBase.length)
        : '';

      const target = `${newBase}${subPath}${location.search}${location.hash}`;

      navigate(target, {
        replace: true,
        state: { formerEntityRef: resolution.formerEntityRef },
      });
    }

    if (!redirectResult.loading && !redirectResult.value) {
      checkedEntityRef.current = entityKey;
    }
  }, [
    redirectResult.loading,
    redirectResult.value,
    navigate,
    entityKey,
    docsRoute,
    entityRef,
    location.pathname,
    location.search,
    location.hash,
  ]);

  const shouldShowProgress =
    (shouldCheckForRedirect && redirectResult.loading) ||
    !!redirectResult.value;

  return {
    shouldShowProgress,
  };
}
