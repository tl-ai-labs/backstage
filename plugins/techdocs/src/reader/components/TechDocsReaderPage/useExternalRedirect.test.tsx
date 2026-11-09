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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useExternalRedirect } from './useExternalRedirect';
import { TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TECHDOCS_EXTERNAL_ANNOTATION } from '@backstage/plugin-techdocs-common';

const mockNavigate = jest.fn();
const mockViewTechdocLink = jest.fn(() => '/docs');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useRouteRef: () => mockViewTechdocLink,
}));

describe('useExternalRedirect', () => {
  const mockCatalogApi = {
    getEntityByRef: jest.fn(),
    getEntityByFormerRef: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        {children}
      </TestApiProvider>
    </MemoryRouter>
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

  it('should redirect a former ref to the renamed entity docs', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.getEntityByFormerRef.mockResolvedValue({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        namespace: 'default',
      },
    });
    mockViewTechdocLink.mockReturnValueOnce('/docs/default/component/new-name');

    const redirectWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          '/docs/default/component/old-name/getting-started/?q=1#install',
        ]}
      >
        <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
          <Routes>
            <Route
              path="/docs/:namespace/:kind/:name/*"
              element={<>{children}</>}
            />
          </Routes>
        </TestApiProvider>
      </MemoryRouter>
    );

    const entityRef = {
      kind: 'Component',
      namespace: 'default',
      name: 'old-name',
    };

    const { result } = renderHook(() => useExternalRedirect(entityRef), {
      wrapper: redirectWrapper,
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/docs/default/component/new-name/getting-started/?q=1#install',
        {
          replace: true,
          state: { renamedFromEntityRef: 'component:default/old-name' },
        },
      );
    });

    expect(mockCatalogApi.getEntityByFormerRef).toHaveBeenCalledWith(entityRef);
    expect(result.current.shouldShowProgress).toBe(true);
  });

  it('should keep the not-found behaviour when no entity claims the ref', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
    mockCatalogApi.getEntityByFormerRef.mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'old-name',
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

  it('should not look up former refs after a rename redirect', async () => {
    mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);

    const renamedWrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/docs/default/component/old-name',
            state: { renamedFromEntityRef: 'component:default/older' },
          },
        ]}
      >
        <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
          {children}
        </TestApiProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        useExternalRedirect({
          kind: 'Component',
          name: 'old-name',
          namespace: 'default',
        }),
      { wrapper: renamedWrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCatalogApi.getEntityByFormerRef).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
