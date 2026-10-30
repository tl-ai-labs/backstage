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

import { renderHook, waitFor } from '@testing-library/react';
import { useFormerRefRedirect } from './useFormerRefRedirect';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { resolveFormerEntityRef } from '@backstage/catalog-client';

const mockNavigate = jest.fn();
let mockLocation = {
  pathname: '/docs/default/component/old-component/sub/page',
  search: '?query=test',
  hash: '#heading-1',
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () =>
    jest.fn(
      ({ namespace, kind, name }) => `/docs/${namespace}/${kind}/${name}`,
    ),
}));

jest.mock('@backstage/catalog-client', () => ({
  ...jest.requireActual('@backstage/catalog-client'),
  resolveFormerEntityRef: jest.fn(),
}));

describe('useFormerRefRedirect', () => {
  const mockCatalogApi = {
    getEntityByRef: jest.fn(),
    queryEntities: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
      {children}
    </TestApiProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = {
      pathname: '/docs/default/component/old-component/sub/page',
      search: '?query=test',
      hash: '#heading-1',
    };
  });

  it('does nothing when the docs entity exists', async () => {
    const existingEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'my-component',
        namespace: 'default',
      },
    };
    mockCatalogApi.getEntityByRef.mockResolvedValue(existingEntity);

    const { result } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'my-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.shouldShowProgress).toBe(false);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(resolveFormerEntityRef).not.toHaveBeenCalled();
  });

  it('redirects a stale docs URL preserving the sub-path', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    (resolveFormerEntityRef as jest.Mock).mockResolvedValue({
      status: 'resolved',
      formerEntityRef: 'component:default/old-component',
      entity: {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'new-component',
          namespace: 'default',
        },
      },
    });

    const { result } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'old-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    expect(result.current.shouldShowProgress).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/docs/default/component/new-component/sub/page?query=test#heading-1',
      {
        replace: true,
        state: { formerEntityRef: 'component:default/old-component' },
      },
    );
  });

  it('leaves an unknown docs ref alone', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    (resolveFormerEntityRef as jest.Mock).mockResolvedValue({
      status: 'unknown',
    });

    const { result } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'missing-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.shouldShowProgress).toBe(false);
    });

    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('checks once per entity and survives a failing lookup', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    (resolveFormerEntityRef as jest.Mock).mockResolvedValue({
      status: 'unknown',
    });

    const { rerender, result } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'stable-ref',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.shouldShowProgress).toBe(false);
    });

    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);

    // Repeated re-renders for the same ref must not trigger another lookup
    rerender();
    expect(resolveFormerEntityRef).toHaveBeenCalledTimes(1);

    // A rejecting lookup does not throw and causes no navigation
    mockCatalogApi.getEntityByRef.mockRejectedValue(
      new Error('Catalog unavailable'),
    );

    const { result: rejectingResult } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'failing-ref',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(rejectingResult.current.shouldShowProgress).toBe(false);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not resolve or redirect when getEntityByRef rejects', async () => {
    mockCatalogApi.getEntityByRef.mockRejectedValue(
      new Error('Direct lookup failed'),
    );

    const { result } = renderHook(
      () =>
        useFormerRefRedirect({
          kind: 'Component',
          name: 'rejected-ref',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.shouldShowProgress).toBe(false);
    });

    expect(resolveFormerEntityRef).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
