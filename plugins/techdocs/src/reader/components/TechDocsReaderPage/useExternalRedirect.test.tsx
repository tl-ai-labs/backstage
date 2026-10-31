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
const mockViewTechdocLink = jest.fn(() => '/docs');

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

  describe('with a former ref', () => {
    const oldEntityRef = {
      kind: 'component',
      namespace: 'default',
      name: 'old',
    };

    const newEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: { name: 'new', namespace: 'default' },
    };

    const wrapperWith =
      (catalogApi: typeof mockCatalogApi) =>
      ({ children }: { children: React.ReactNode }) =>
        (
          <TestApiProvider apis={[[catalogApiRef, catalogApi]]}>
            {children}
          </TestApiProvider>
        );

    afterEach(() => {
      Object.assign(mockLocation, { pathname: '/docs', search: '', hash: '' });
      mockViewTechdocLink.mockImplementation(() => '/docs');
    });

    it('follows a former ref and keeps sub-path, query and hash', async () => {
      Object.assign(mockLocation, {
        pathname: '/docs/default/component/old/sub/page',
        search: '?x=1',
        hash: '#y',
      });
      (mockViewTechdocLink as jest.Mock).mockImplementation(
        ({ kind, namespace, name }) => `/docs/${namespace}/${kind}/${name}`,
      );
      mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);

      let resolveLookup: (entity: typeof newEntity) => void = () => {};
      const getEntityByFormerRef = jest.fn(
        () =>
          new Promise<typeof newEntity>(resolve => {
            resolveLookup = resolve;
          }),
      );

      const { result } = renderHook(
        () => useExternalRedirect(oldEntityRef, { followFormerRef: true }),
        {
          wrapper: wrapperWith({
            ...mockCatalogApi,
            getEntityByFormerRef,
          } as typeof mockCatalogApi),
        },
      );

      await waitFor(() => {
        expect(getEntityByFormerRef).toHaveBeenCalledTimes(1);
      });

      expect(result.current.shouldShowProgress).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();

      resolveLookup(newEntity);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/docs/default/Component/new/sub/page?x=1#y',
          {
            replace: true,
            state: { formerEntityRef: 'component:default/old' },
          },
        );
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.shouldShowProgress).toBe(true);
    });

    it('never looks up a former ref without the option or after an exact hit', async () => {
      const getEntityByFormerRef = jest.fn();
      const wrapperWithLookup = wrapperWith({
        ...mockCatalogApi,
        getEntityByFormerRef,
      } as typeof mockCatalogApi);

      mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);
      const withoutOption = renderHook(
        () => useExternalRedirect(oldEntityRef),
        { wrapper: wrapperWithLookup },
      );

      await waitFor(() => {
        expect(withoutOption.result.current.loading).toBe(false);
      });

      mockCatalogApi.getEntityByRef.mockResolvedValue(newEntity);
      const afterHit = renderHook(
        () => useExternalRedirect(oldEntityRef, { followFormerRef: true }),
        { wrapper: wrapperWithLookup },
      );

      await waitFor(() => {
        expect(afterHit.result.current.loading).toBe(false);
      });

      expect(mockCatalogApi.getEntityByRef).toHaveBeenCalledTimes(2);
      expect(getEntityByFormerRef).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each([
      ['a client with no method', () => ({})],
      [
        'a lookup resolving undefined',
        () => ({ getEntityByFormerRef: jest.fn(async () => undefined) }),
      ],
      [
        'a lookup that rejects',
        () => ({
          getEntityByFormerRef: jest.fn(async () => {
            throw new Error('Catalog API error');
          }),
        }),
      ],
    ])('stays put with %s', async (_name, createLookup) => {
      mockCatalogApi.getEntityByRef.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useExternalRedirect(oldEntityRef, { followFormerRef: true }),
        { wrapper: wrapperWith({ ...mockCatalogApi, ...createLookup() }) },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.shouldShowProgress).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
