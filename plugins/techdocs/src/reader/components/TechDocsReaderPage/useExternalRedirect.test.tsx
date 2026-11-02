/*
 * Copyright 2025 The Backstage Authors
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
import { useExternalRedirect } from './useExternalRedirect';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TECHDOCS_EXTERNAL_ANNOTATION } from '@backstage/plugin-techdocs-common';

const mockNavigate = jest.fn();
const mockViewTechdocLink = jest.fn((_params?: any) => '/docs');
const mockLocation = { pathname: '/docs', search: '', hash: '' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => mockViewTechdocLink,
}));

describe('useExternalRedirect', () => {
  const mockCatalogApi = {
    getEntityByRef: jest.fn(),
    resolveFormerEntityRef: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
      {children}
    </TestApiProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show progress when entity has no external annotation', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
      },
    });

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shouldShowProgress).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate when entity has external annotation', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
        annotations: {
          [TECHDOCS_EXTERNAL_ANNOTATION]: 'component:external/docs',
        },
      },
    });

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shouldShowProgress).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), {
      replace: true,
    });
  });

  it('should handle catalog API errors gracefully', async () => {
    mockCatalogApi.getEntityByRef.mockRejectedValue(
      new Error('Catalog API error'),
    );

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shouldShowProgress).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not re-check when entity key stays the same', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
      },
    });

    const { rerender } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(1);
    });

    // Rerender with the same entity - should not trigger another API call
    rerender();

    expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(1);
  });

  it('should handle deep linking with techdocs-entity-path annotation', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
        annotations: {
          'backstage.io/techdocs-entity': 'component:external/docs',
          'backstage.io/techdocs-entity-path': '/inner-component-docs',
        },
      },
    });

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should navigate with the path appended (handled by buildTechDocsURL)
    expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), {
      replace: true,
    });
    expect(result.current.shouldShowProgress).toBe(true);
  });

  it('should handle empty external annotation value', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'test-component',
        namespace: 'default',
        annotations: {
          'backstage.io/techdocs-entity': '',
        },
      },
    });

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'test-component',
          namespace: 'default',
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Empty annotation should be treated as no redirect
    expect(result.current.shouldShowProgress).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should re-check when entity changes', async () => {
    mockCatalogApi.getEntityByRef
      .mockResolvedValueOnce({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'first-component',
          namespace: 'default',
        },
      })
      .mockResolvedValueOnce({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'second-component',
          namespace: 'default',
        },
      });

    const { rerender } = renderHook(
      ({ entityRef }) => useExternalRedirect(entityRef),
      {
        wrapper,
        initialProps: {
          entityRef: {
            kind: 'Component',
            name: 'first-component',
            namespace: 'default',
          },
        },
      },
    );

    await waitFor(() => {
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(1);
    });

    // Change to a different entity
    rerender({
      entityRef: {
        kind: 'Component',
        name: 'second-component',
        namespace: 'default',
      },
    });

    await waitFor(() => {
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(2);
    });
  });

  describe('former names', () => {
    const oldRef = {
      kind: 'component',
      name: 'old-name',
      namespace: 'default',
    };

    beforeEach(() => {
      Object.assign(mockLocation, {
        pathname: '/docs/default/component/old-name/sub/page',
        search: '?a=1',
        hash: '#h',
      });
      mockViewTechdocLink.mockImplementation(
        p => `/docs/${p?.namespace}/${p?.kind}/${p?.name}`,
      );
    });

    afterEach(() => {
      Object.assign(mockLocation, { pathname: '/docs', search: '', hash: '' });
      mockViewTechdocLink.mockImplementation(() => '/docs');
    });

    it('redirects with replace and keeps the docs sub-path', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValueOnce(undefined);
      mockCatalogApi.resolveFormerEntityRef.mockResolvedValueOnce(
        'component:default/new-name',
      );

      const { result } = renderHook(() => useExternalRedirect(oldRef), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/docs/default/component/new-name/sub/page?a=1#h',
        { replace: true, state: { entityRenamedFrom: 'old-name' } },
      );
      expect(result.current.shouldShowProgress).toBe(true);
    });

    it("leaves today's behaviour on a miss or a resolver error", async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValueOnce(undefined);
      mockCatalogApi.resolveFormerEntityRef.mockResolvedValueOnce(undefined);

      const first = renderHook(() => useExternalRedirect(oldRef), { wrapper });

      await waitFor(() => {
        expect(first.result.current.loading).toBe(false);
      });
      expect(mockCatalogApi.resolveFormerEntityRef).toHaveBeenCalledTimes(1);
      expect(first.result.current.shouldShowProgress).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();

      mockCatalogApi.getEntityByRef.mockResolvedValueOnce(undefined);
      mockCatalogApi.resolveFormerEntityRef.mockRejectedValueOnce(
        new Error('boom'),
      );

      const second = renderHook(() => useExternalRedirect(oldRef), {
        wrapper,
      });

      await waitFor(() => {
        expect(second.result.current.loading).toBe(false);
      });
      expect(mockCatalogApi.resolveFormerEntityRef).toHaveBeenCalledTimes(2);
      expect(second.result.current.shouldShowProgress).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not ask the resolver for a found entity or a failed lookup', async () => {
      mockCatalogApi.getEntityByRef.mockResolvedValueOnce({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'old-name',
          namespace: 'default',
          annotations: {
            [TECHDOCS_EXTERNAL_ANNOTATION]: 'component:external/docs',
          },
        },
      });

      const external = renderHook(() => useExternalRedirect(oldRef), {
        wrapper,
      });

      await waitFor(() => {
        expect(external.result.current.loading).toBe(false);
      });
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), {
        replace: true,
      });
      mockNavigate.mockClear();

      mockCatalogApi.getEntityByRef.mockResolvedValueOnce({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'old-name', namespace: 'default' },
      });

      const plain = renderHook(() => useExternalRedirect(oldRef), { wrapper });

      await waitFor(() => {
        expect(plain.result.current.loading).toBe(false);
      });
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(2);
      expect(mockNavigate).not.toHaveBeenCalled();

      mockCatalogApi.getEntityByRef.mockRejectedValueOnce(new Error('fail'));

      const failed = renderHook(() => useExternalRedirect(oldRef), {
        wrapper,
      });

      await waitFor(() => {
        expect(failed.result.current.loading).toBe(false);
      });
      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(3);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockCatalogApi.resolveFormerEntityRef).not.toHaveBeenCalled();
    });

    it('does not redirect an embedded reader', async () => {
      mockLocation.pathname = '/catalog/default/component/other/docs';
      mockCatalogApi.getEntityByRef.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useExternalRedirect(oldRef), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCatalogApi.resolveFormerEntityRef).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
