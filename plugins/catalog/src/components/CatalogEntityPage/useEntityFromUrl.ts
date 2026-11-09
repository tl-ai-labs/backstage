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
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';
import { getRenamedFromEntityRef } from './EntityRenamedNotification';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const { '*': subPath = '' } = useParams();
  const location = useLocation();
  const entityRoute = useRouteRef(entityRouteRef);
  const navigate = useNavigate();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);
  const renamedFromEntityRef = getRenamedFromEntityRef(location.state);
  const renamedFromRef = useRef(renamedFromEntityRef);
  renamedFromRef.current = renamedFromEntityRef;

  const {
    value,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async (): Promise<{
    entity?: Entity;
    renamedTo?: Entity;
    formerRef?: string;
  }> => {
    const entity = await catalogApi.getEntityByRef({
      kind,
      namespace,
      name,
    });

    if (entity || renamedFromRef.current || !catalogApi.getEntityByFormerRef) {
      return { entity };
    }

    try {
      const renamedTo = await catalogApi.getEntityByFormerRef({
        kind,
        namespace,
        name,
      });
      return {
        renamedTo,
        formerRef: stringifyEntityRef({ kind, namespace, name }),
      };
    } catch {
      return {};
    }
  }, [catalogApi, kind, namespace, name]);

  useEffect(() => {
    if (
      value?.renamedTo &&
      value.formerRef &&
      (!renamedFromEntityRef ||
        stringifyEntityRef({ kind, namespace, name }) === value.formerRef)
    ) {
      navigate(
        `${entityRoute(
          entityRouteParams(value.renamedTo, { encodeParams: true }),
        )}${subPath ? `/${subPath}` : ''}${location.search}${location.hash}`,
        {
          replace: true,
          state: {
            renamedFromEntityRef: value.formerRef,
          },
        },
      );
    }
  }, [
    value,
    entityRoute,
    navigate,
    subPath,
    location.search,
    location.hash,
    kind,
    namespace,
    name,
    renamedFromEntityRef,
  ]);

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, value, name]);

  return {
    entity: value?.entity,
    loading: loading || Boolean(value?.renamedTo),
    error,
    refresh,
  };
};
