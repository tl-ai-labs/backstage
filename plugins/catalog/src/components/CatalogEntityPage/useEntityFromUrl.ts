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
  entityRouteRef,
  resolveEntityRename,
} from '@backstage/plugin-catalog-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const location = useLocation();
  const entityRoute = useRouteRef(entityRouteRef);
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);
  const routeKey = `${kind}:${namespace}/${name}`;

  const {
    value,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async () => {
    const entity = await catalogApi.getEntityByRef({ kind, namespace, name });
    if (entity) {
      return { entity };
    }
    const redirect = await resolveEntityRename({
      catalogApi,
      entityRef: { kind, namespace, name },
      location,
      routeFunc: entityRoute,
    });
    return { redirect, routeKey };
  }, [catalogApi, kind, namespace, name]);

  const entity = value?.entity;
  const redirect = value?.redirect;
  const resolvedRouteKey = value?.routeKey;

  useEffect(() => {
    if (redirect && resolvedRouteKey === routeKey) {
      navigate(redirect.to, { replace: true, state: redirect.state });
    }
  }, [navigate, redirect, resolvedRouteKey, routeKey]);

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  return { entity, loading: loading || !!redirect, error, refresh };
};
