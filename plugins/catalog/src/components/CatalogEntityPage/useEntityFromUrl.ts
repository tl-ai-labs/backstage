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

import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  errorApiRef,
  useApi,
  useRouteRef,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  EntityLoadingStatus,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const entityRoute = useRouteRef(entityRouteRef);
  const location = useLocation();
  const navigate = useNavigate();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);

  const {
    value,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async () => {
    const directEntity = await catalogApi.getEntityByRef({
      kind,
      namespace,
      name,
    });
    if (directEntity) {
      return { entity: directEntity, redirectedFrom: undefined };
    }

    const formerEntity = await catalogApi.getEntityByFormerRef?.({
      kind,
      namespace,
      name,
    });
    const requestedRef = stringifyEntityRef({
      kind: kind.toLocaleLowerCase('en-US'),
      namespace: namespace.toLocaleLowerCase('en-US'),
      name: name.toLocaleLowerCase('en-US'),
    });
    if (formerEntity) {
      const targetRef = stringifyEntityRef(formerEntity);
      return {
        entity: formerEntity,
        redirectedFrom: targetRef !== requestedRef ? requestedRef : undefined,
      };
    }

    return { entity: undefined, redirectedFrom: undefined };
  }, [catalogApi, kind, namespace, name]);

  const entity = value?.entity;

  useEffect(() => {
    const currentRef = stringifyEntityRef({
      kind: kind.toLocaleLowerCase('en-US'),
      namespace: namespace.toLocaleLowerCase('en-US'),
      name: name.toLocaleLowerCase('en-US'),
    });
    if (
      value?.entity &&
      value?.redirectedFrom &&
      value.redirectedFrom === currentRef
    ) {
      const currentBasePath = entityRoute({ kind, namespace, name });
      const subPath = location.pathname.startsWith(currentBasePath)
        ? location.pathname.slice(currentBasePath.length)
        : '';
      const targetBasePath = entityRoute({
        kind: value.entity.kind.toLocaleLowerCase('en-US'),
        namespace: (
          value.entity.metadata.namespace ?? DEFAULT_NAMESPACE
        ).toLocaleLowerCase('en-US'),
        name: value.entity.metadata.name,
      });
      const targetUrl = `${targetBasePath}${subPath}${location.search}${location.hash}`;
      navigate(targetUrl, {
        replace: true,
        state: {
          ...(typeof location.state === 'object' && location.state !== null
            ? location.state
            : {}),
          redirectedFrom: value.redirectedFrom,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entityRoute,
    kind,
    location.hash,
    location.pathname,
    location.search,
    name,
    namespace,
    navigate,
    value?.entity,
    value?.redirectedFrom,
  ]);

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  return { entity, loading, error, refresh };
};
