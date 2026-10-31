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
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';

// useRouteRef throws if unresolved; in a Router its hook order stays the same
function useOptionalEntityRoute() {
  try {
    return useRouteRef(entityRouteRef);
  } catch {
    return undefined;
  }
}

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);
  const location = useLocation();
  const entityRoute = useOptionalEntityRoute();

  const {
    value,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async () => {
    const exactMatch = await catalogApi.getEntityByRef({
      kind,
      namespace,
      name,
    });
    if (exactMatch) {
      return { entity: exactMatch };
    }
    if (!entityRoute) {
      return {};
    }

    try {
      const renamed = await catalogApi.getEntityByFormerRef?.({
        kind,
        namespace,
        name,
      });
      if (!renamed) {
        return {};
      }

      const oldPath = entityRoute(
        entityRouteParams({ kind, namespace, name }, { encodeParams: true }),
      );
      const subPath = location.pathname
        .toLowerCase()
        .startsWith(oldPath.toLowerCase())
        ? location.pathname.slice(oldPath.length)
        : '';

      return {
        redirect: {
          to:
            entityRoute(entityRouteParams(renamed, { encodeParams: true })) +
            subPath +
            location.search +
            location.hash,
          formerEntityRef: stringifyEntityRef({ kind, namespace, name }),
        },
      };
    } catch {
      return {};
    }
  }, [catalogApi, kind, namespace, name]);

  const entity = value?.entity;
  const redirect = value?.redirect;

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  useEffect(() => {
    if (redirect) {
      const currentRef = stringifyEntityRef({ kind, namespace, name });
      if (redirect.formerEntityRef === currentRef) {
        navigate(redirect.to, {
          replace: true,
          state: { formerEntityRef: redirect.formerEntityRef },
        });
      }
    }
  }, [navigate, redirect, kind, namespace, name]);

  return { entity, loading: loading || !!redirect, error, refresh };
};
