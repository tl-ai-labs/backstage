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

import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { errorApiRef } from '@backstage/core-plugin-api';
import { ApiProvider } from '@backstage/core-app-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TestApiRegistry } from '@backstage/test-utils';
import { mockApis } from '@backstage/frontend-test-utils';
import { useEntityFromUrl } from './useEntityFromUrl';

const mockNavigate = jest.fn();
const mockEntityRoute = jest.fn(
  ({
    kind,
    namespace,
    name,
  }: {
    kind: string;
    namespace: string;
    name: string;
  }) => `/catalog/${namespace}/${kind.toLowerCase()}/${name}`,
);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => mockEntityRoute,
}));

describe('useEntityFromUrl', () => {
  const mockCatalogApi = {
    getEntityByRef: jest.fn(),
    queryEntities: jest.fn(),
  };

  const apis = TestApiRegistry.from(
    [catalogApiRef, mockCatalogApi],
    [errorApiRef, mockApis.error()],
  );

  const createWrapper = (initialEntry: string) => {
    return ({ children }: { children: ReactNode }) => (
      <ApiProvider apis={apis}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/catalog/:namespace/:kind/:name/*"
              element={<>{children}</>}
            />
          </Routes>
        </MemoryRouter>
      </ApiProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues no extra request when the ref resolves directly', async () => {
    const existingEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'my-component',
        namespace: 'default',
      },
    };

    mockCatalogApi.getEntityByRef.mockResolvedValue(existingEntity);

    const { result } = renderHook(() => useEntityFromUrl(), {
      wrapper: createWrapper('/catalog/default/component/my-component'),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entity).toEqual(existingEntity);
    expect(mockCatalogApi.queryEntities).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects a stale ref preserving sub-path, query and fragment', async () => {
    const renamedEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        namespace: 'default',
      },
    };

    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.queryEntities.mockResolvedValue({
      items: [renamedEntity],
      totalItems: 1,
      pageInfo: {},
    });

    const { result } = renderHook(() => useEntityFromUrl(), {
      wrapper: createWrapper(
        '/catalog/default/component/old-name/docs?tab=x#frag',
      ),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    expect(result.current.entity).toBeUndefined();
    expect(mockCatalogApi.queryEntities).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/catalog/default/component/new-name/docs?tab=x#frag',
      {
        replace: true,
        state: { formerEntityRef: 'component:default/old-name' },
      },
    );
  });

  it('leaves an unknown ref on the not-found path', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.queryEntities.mockResolvedValue({
      items: [],
      totalItems: 0,
      pageInfo: {},
    });

    const { result } = renderHook(() => useEntityFromUrl(), {
      wrapper: createWrapper('/catalog/default/component/unknown-name'),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entity).toBeUndefined();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('attempts resolution at most once per ref', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.queryEntities.mockResolvedValue({
      items: [],
      totalItems: 0,
      pageInfo: {},
    });

    const wrapper = createWrapper(
      '/catalog/default/component/stale-unresolvable',
    );
    const { rerender } = renderHook(() => useEntityFromUrl(), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockCatalogApi.queryEntities).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();
    rerender();

    expect(mockCatalogApi.queryEntities).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not report not-found while former-ref resolution is running and releases loading on unresolvable', async () => {
    const recordedStatuses: Array<{
      loading: boolean;
      hasEntity: boolean;
      hasError: boolean;
    }> = [];

    let resolveFormerRef!: (value: any) => void;
    const queryEntitiesPromise = new Promise(resolve => {
      resolveFormerRef = resolve;
    });

    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.queryEntities.mockReturnValue(queryEntitiesPromise);

    const renamedEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        namespace: 'default',
      },
    };

    renderHook(
      () => {
        const status = useEntityFromUrl();
        recordedStatuses.push({
          loading: status.loading,
          hasEntity: Boolean(status.entity),
          hasError: Boolean(status.error),
        });
        return status;
      },
      {
        wrapper: createWrapper('/catalog/default/component/resolvable-stale'),
      },
    );

    await waitFor(() => {
      expect(mockCatalogApi.queryEntities).toHaveBeenCalledTimes(1);
    });

    expect(
      recordedStatuses.some(s => !s.loading && !s.hasEntity && !s.hasError),
    ).toBe(false);

    resolveFormerRef({
      items: [renamedEntity],
      totalItems: 1,
      pageInfo: {},
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    expect(
      recordedStatuses.some(s => !s.loading && !s.hasEntity && !s.hasError),
    ).toBe(false);

    // Unresolved/unknown ref: loading is released so not-found panel can render
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.queryEntities.mockResolvedValue({
      items: [],
      totalItems: 0,
      pageInfo: {},
    });

    const { result: unknownResult } = renderHook(() => useEntityFromUrl(), {
      wrapper: createWrapper('/catalog/default/component/unknown-settling'),
    });

    await waitFor(() => {
      expect(unknownResult.current.loading).toBe(false);
    });

    expect(unknownResult.current.entity).toBeUndefined();
    expect(unknownResult.current.error).toBeUndefined();
  });
});
