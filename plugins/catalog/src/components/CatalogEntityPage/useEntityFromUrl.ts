/*
 * Copyright 2022 The Backstage Authors
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

import { stringifyEntityRef } from '@backstage/catalog-model';
import { resolveFormerEntityRef } from '@backstage/catalog-client';
import {
  errorApiRef,
  useApi,
  useRouteRef,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  EntityLoadingStatus,
  entityRouteParams,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAsync from 'react-use/esm/useAsync';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);

  const requestedRef =
    kind && namespace && name
      ? stringifyEntityRef({ kind, namespace, name })
      : undefined;

  const {
    value: lookupResult,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(
    async () => ({
      ref: requestedRef,
      entity: await catalogApi.getEntityByRef({ kind, namespace, name }),
    }),
    [catalogApi, kind, namespace, name, requestedRef],
  );

  const entity =
    lookupResult?.ref === requestedRef ? lookupResult?.entity : undefined;
  const isStale =
    requestedRef !== undefined && lookupResult?.ref !== requestedRef;
  const isLookupLoading = loading || (isStale && !error);
  const entityRoute = useRouteRef(entityRouteRef);
  const location = useLocation();
  const attemptedRefRef = useRef<string | null>(null);
  const navigatedRefRef = useRef<string | null>(null);

  // Tracks settlement of former-ref resolution for requestedRef.
  // When a direct lookup misses, resolution becomes pending until it settles.
  const [resolutionStatus, setResolutionStatus] = useState<{
    ref: string | undefined;
    settled: boolean;
  }>({ ref: undefined, settled: false });

  const resolution = useAsync(async () => {
    if (
      !requestedRef ||
      !name ||
      isLookupLoading ||
      error ||
      lookupResult?.ref !== requestedRef ||
      lookupResult?.entity ||
      attemptedRefRef.current === requestedRef
    ) {
      return undefined;
    }
    attemptedRefRef.current = requestedRef;
    try {
      return await resolveFormerEntityRef(catalogApi, requestedRef);
    } finally {
      setResolutionStatus({ ref: requestedRef, settled: true });
    }
  }, [catalogApi, requestedRef, lookupResult, isLookupLoading, error, name]);

  const directMiss =
    Boolean(requestedRef) &&
    Boolean(name) &&
    !isLookupLoading &&
    !error &&
    lookupResult?.ref === requestedRef &&
    !lookupResult?.entity;

  const isResolutionPending =
    directMiss &&
    (resolutionStatus.ref !== requestedRef || !resolutionStatus.settled);

  const isResolvedPendingNav =
    directMiss &&
    resolution.value?.status === 'resolved' &&
    navigatedRefRef.current !== resolution.value.formerEntityRef;

  const isLoading =
    isLookupLoading || isResolutionPending || isResolvedPendingNav;

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  useEffect(() => {
    if (
      requestedRef &&
      resolution.value?.status === 'resolved' &&
      navigatedRefRef.current !== resolution.value.formerEntityRef
    ) {
      navigatedRefRef.current = resolution.value.formerEntityRef;
      const oldBase = entityRoute({ kind, namespace, name });
      const newBase = entityRoute(entityRouteParams(resolution.value.entity));
      const targetPathname = location.pathname.startsWith(oldBase)
        ? `${newBase}${location.pathname.slice(oldBase.length)}`
        : newBase;
      const target = `${targetPathname}${location.search}${location.hash}`;
      navigate(target, {
        replace: true,
        state: { formerEntityRef: resolution.value.formerEntityRef },
      });
    }
  }, [
    requestedRef,
    resolution.value,
    entityRoute,
    kind,
    namespace,
    name,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  return { entity, loading: isLoading, error, refresh };
};
