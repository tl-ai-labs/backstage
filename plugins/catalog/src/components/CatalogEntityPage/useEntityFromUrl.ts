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
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  alertApiRef,
  errorApiRef,
  useApi,
  useApiHolder,
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
  const {
    kind,
    namespace = DEFAULT_NAMESPACE,
    name,
  } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const location = useLocation();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);
  const apiHolder = useApiHolder();
  const entityRoute = useRouteRef(entityRouteRef);

  const {
    value,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async () => {
    const foundEntity = await catalogApi.getEntityByRef({
      kind,
      namespace,
      name,
    });
    if (foundEntity) {
      return { entity: foundEntity, redirectUrl: undefined };
    }

    if (name) {
      try {
        const redirect = await catalogApi.getEntityRedirectByRef?.({
          kind,
          namespace,
          name,
        });
        if (redirect?.entityRef) {
          const targetRef = parseEntityRef(redirect.entityRef);
          const currentRef = stringifyEntityRef({ kind, namespace, name });
          const targetRefStr = stringifyEntityRef(targetRef);
          if (targetRefStr !== currentRef) {
            const currentBase = entityRoute({ kind, namespace, name });
            const targetBase = entityRoute({
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            });
            const suffix = location.pathname.startsWith(currentBase)
              ? location.pathname.slice(currentBase.length)
              : '';
            const redirectUrl = `${targetBase}${suffix}${location.search}${location.hash}`;
            apiHolder.get(alertApiRef)?.post({
              message: `Redirected from ${currentRef} to ${targetRefStr} as the entity was renamed.`,
              severity: 'info',
              display: 'transient',
            });
            return { entity: undefined, redirectUrl };
          }
        }
      } catch {
        // ignore redirect lookup errors and fall back to not-found state
      }
    }

    return { entity: undefined, redirectUrl: undefined };
  }, [catalogApi, kind, namespace, name]);

  const entity = value?.entity;
  const redirectUrl = value?.redirectUrl;

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  useEffect(() => {
    if (redirectUrl) {
      navigate(redirectUrl, { replace: true });
    }
  }, [redirectUrl, navigate]);

  return {
    entity: redirectUrl ? undefined : entity,
    loading: loading || Boolean(redirectUrl),
    error,
    refresh,
  };
};
