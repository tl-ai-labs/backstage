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
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  EntityLoadingStatus,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);

  const {
    value: entity,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(async () => {
    const existing = await catalogApi.getEntityByRef({ kind, namespace, name });
    if (existing) {
      return existing;
    }
    if (!name) {
      return undefined;
    }

    const formerTarget = await catalogApi.getEntityByFormerRef?.({
      kind,
      namespace,
      name,
    });
    if (!formerTarget) {
      return undefined;
    }

    const targetKind = formerTarget.kind.toLocaleLowerCase('en-US');
    const targetNamespace = (
      formerTarget.metadata.namespace ?? DEFAULT_NAMESPACE
    ).toLocaleLowerCase('en-US');
    const targetName = formerTarget.metadata.name;
    const subPath = params['*'] ?? '';
    const currentSuffix = `/${namespace}/${kind}/${name}${
      subPath ? `/${subPath}` : ''
    }`;
    const mountPrefix = location.pathname.endsWith(currentSuffix)
      ? location.pathname.slice(
          0,
          location.pathname.length - currentSuffix.length,
        )
      : '/catalog';
    const targetPath = `${mountPrefix}/${targetNamespace}/${targetKind}/${targetName}${
      subPath ? `/${subPath}` : ''
    }${location.search}${location.hash}`;

    navigate(targetPath, {
      replace: true,
      state: {
        ...(typeof location.state === 'object' && location.state !== null
          ? location.state
          : {}),
        renamedFrom: stringifyEntityRef({ kind, namespace, name }),
      },
    });
    return formerTarget;
  }, [catalogApi, kind, namespace, name]);

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  return { entity, loading, error, refresh };
};
