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
  alertApiRef,
  errorApiRef,
  useApi,
  useRouteRef,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  catalogApiRef,
  EntityLoadingStatus,
  entityRouteParams,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/esm/useAsync';
import useAsyncRetry from 'react-use/esm/useAsyncRetry';
import { catalogTranslationRef } from '../../alpha/translation';

export const useEntityFromUrl = (): EntityLoadingStatus => {
  const { kind, namespace, name } = useRouteRefParams(entityRouteRef);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const splat = params['*'] ?? '';
  const alertApi = useApi(alertApiRef);
  const errorApi = useApi(errorApiRef);
  const catalogApi = useApi(catalogApiRef);
  const entityRoute = useRouteRef(entityRouteRef);
  const { t } = useTranslationRef(catalogTranslationRef);
  const handledRenamedFrom = useRef<string | null>(null);

  const {
    value: entity,
    error,
    loading,
    retry: refresh,
  } = useAsyncRetry(
    () => catalogApi.getEntityByRef({ kind, namespace, name }),
    [catalogApi, kind, namespace, name],
  );

  const currentRef = name
    ? stringifyEntityRef({ kind, namespace, name })
    : undefined;
  const applicable =
    !!name &&
    !loading &&
    !error &&
    !entity &&
    !!catalogApi.getEntityRefByFormerRef;

  const formerLookup = useAsync(async () => {
    const getFormer = catalogApi.getEntityRefByFormerRef;
    if (!applicable || !currentRef || !getFormer) {
      return undefined;
    }
    try {
      const toRef = await getFormer.call(catalogApi, {
        kind,
        namespace,
        name,
      });
      return { fromRef: currentRef, toRef };
    } catch {
      return { fromRef: currentRef, toRef: undefined };
    }
  }, [catalogApi, kind, namespace, name, applicable, currentRef]);

  const redirectTo =
    applicable && formerLookup.value?.fromRef === currentRef
      ? formerLookup.value?.toRef
      : undefined;

  useEffect(() => {
    if (redirectTo) {
      const targetBase = entityRoute(
        entityRouteParams(redirectTo, { encodeParams: true }),
      );
      const path = splat ? `${targetBase}/${splat}` : targetBase;
      const searchParams = new URLSearchParams(location.search);
      searchParams.set(
        'renamedFrom',
        stringifyEntityRef({ kind, namespace, name }),
      );
      const search = searchParams.toString();
      navigate(`${path}${search ? `?${search}` : ''}${location.hash}`, {
        replace: true,
      });
    }
  }, [
    redirectTo,
    entityRoute,
    splat,
    location.search,
    location.hash,
    kind,
    namespace,
    name,
    navigate,
  ]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const formerRef = searchParams.get('renamedFrom');
    if (entity && formerRef && handledRenamedFrom.current !== formerRef) {
      handledRenamedFrom.current = formerRef;
      alertApi.post({
        message: t('entityPage.renamedNotice', { formerRef }),
        severity: 'info',
      });
      searchParams.delete('renamedFrom');
      const rest = searchParams.toString();
      navigate(
        `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`,
        {
          replace: true,
        },
      );
    }
  }, [
    entity,
    location.search,
    location.pathname,
    location.hash,
    alertApi,
    t,
    navigate,
  ]);

  useEffect(() => {
    if (!name) {
      errorApi.post(new Error('No name provided!'));
      navigate('/');
    }
  }, [errorApi, navigate, error, loading, entity, name]);

  return {
    entity,
    loading:
      loading ||
      (applicable && formerLookup.value?.fromRef !== currentRef) ||
      Boolean(redirectTo),
    error,
    refresh,
  };
};
