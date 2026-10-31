/*
 * Copyright 2020 The Backstage Authors
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

import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { MemoryRouter, Router } from 'react-router-dom';
import { createVersionedContextForTesting } from '@backstage/version-bridge';
import {
  routeResolutionApiRef,
  RouteResolutionApi,
  RouteFunc,
} from '@backstage/frontend-plugin-api';
import { useRouteRef } from './useRouteRef';
import { createRouteRef } from './RouteRef';
import { createExternalRouteRef } from './ExternalRouteRef';
import { createBrowserHistory } from 'history';
import { TestApiProvider, withLogCollector } from '@backstage/test-utils';

describe('useRouteRef', () => {
  describe('old app system', () => {
    const context = createVersionedContextForTesting('routing-context');

    afterEach(() => {
      context.reset();
    });

    it('should resolve routes', () => {
      const resolve = jest.fn(() => () => '/hello');
      context.set({ 1: { resolve } });

      const routeRef = createRouteRef({ id: 'ref1' });

      const renderedHook = renderHook(() => useRouteRef(routeRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <MemoryRouter initialEntries={['/my-page']} children={children} />
        ),
      });

      const routeFunc = renderedHook.result.current;
      expect(routeFunc()).toBe('/hello');
      expect(resolve).toHaveBeenCalledWith(
        routeRef,
        expect.objectContaining({
          pathname: '/my-page',
        }),
      );
    });

    it('re-resolves the routeFunc when the search parameters change', () => {
      const resolve = jest.fn(() => () => '/hello');
      context.set({ 1: { resolve } });

      const routeRef = createRouteRef({ id: 'ref1' });
      const history = createBrowserHistory();
      history.push('/my-page');

      const { rerender } = renderHook(() => useRouteRef(routeRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        ),
      });

      expect(resolve).toHaveBeenCalledTimes(1);

      history.push('/my-new-page');
      rerender();

      expect(resolve).toHaveBeenCalledTimes(2);
    });

    it('does not re-resolve the routeFunc the location pathname does not change', () => {
      const resolve = jest.fn(() => () => '/hello');
      context.set({ 1: { resolve } });

      const routeRef = createRouteRef({ id: 'ref1' });
      const history = createBrowserHistory();
      history.push('/my-page');

      const { rerender } = renderHook(() => useRouteRef(routeRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        ),
      });

      expect(resolve).toHaveBeenCalledTimes(1);

      history.push('/my-page');
      rerender();

      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('does not re-resolve the routeFunc when the search parameter changes', () => {
      const resolve = jest.fn(() => () => '/hello');
      context.set({ 1: { resolve } });

      const routeRef = createRouteRef({ id: 'ref1' });
      const history = createBrowserHistory();
      history.push('/my-page');

      const { rerender } = renderHook(() => useRouteRef(routeRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        ),
      });

      expect(resolve).toHaveBeenCalledTimes(1);

      history.push('/my-page?foo=bar');
      rerender();

      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('does not re-resolve the routeFunc when the hash parameter changes', () => {
      const resolve = jest.fn(() => () => '/hello');
      context.set({ 1: { resolve } });

      const routeRef = createRouteRef({ id: 'ref1' });
      const history = createBrowserHistory();
      history.push('/my-page');

      const { rerender } = renderHook(() => useRouteRef(routeRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        ),
      });

      expect(resolve).toHaveBeenCalledTimes(1);

      history.push('/my-page#foo');
      rerender();

      expect(resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('new app system', () => {
    it('should resolve routes using routeResolutionApi', () => {
      const routeRef = createRouteRef({ id: 'ref1' });
      const mockRouteFunc: RouteFunc<any> = jest.fn(() => '/new-route');

      const mockRouteResolutionApi: RouteResolutionApi = {
        resolve: jest.fn(() => mockRouteFunc),
      };

      const wrapper = ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider
          apis={[[routeResolutionApiRef, mockRouteResolutionApi]]}
        >
          <MemoryRouter initialEntries={['/my-page']}>{children}</MemoryRouter>
        </TestApiProvider>
      );

      const renderedHook = renderHook(() => useRouteRef(routeRef), { wrapper });

      const routeFunc = renderedHook.result.current;
      expect(routeFunc).toBe(mockRouteFunc);
      expect(mockRouteResolutionApi.resolve).toHaveBeenCalledWith(
        expect.anything(),
        { sourcePath: '/my-page' },
      );
      expect(routeFunc()).toBe('/new-route');
    });

    it('should handle optional external route refs', () => {
      const externalRouteRef = createExternalRouteRef({
        id: 'external-ref',
        optional: true,
      });

      const mockRouteResolutionApi: RouteResolutionApi = {
        resolve: jest.fn(() => undefined),
      };

      const wrapper = ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider
          apis={[[routeResolutionApiRef, mockRouteResolutionApi]]}
        >
          <MemoryRouter initialEntries={['/my-page']}>{children}</MemoryRouter>
        </TestApiProvider>
      );

      const renderedHook = renderHook(() => useRouteRef(externalRouteRef), {
        wrapper,
      });

      expect(renderedHook.result.current).toBeUndefined();
    });

    it('should return an empty link during bootstrap and re-resolve across finalization', () => {
      let finalized = false;
      const listeners = new Set<() => void>();
      const mockRouteResolutionApi: RouteResolutionApi = {
        resolve: jest.fn(() => (finalized ? () => '/ready' : undefined)),
        isFinalized: () => finalized,
        onFinalized: listener => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
      };

      const routeRef = createRouteRef({ id: 'ref1' });
      let renderCount = 0;
      const renderedHook = renderHook(
        () => {
          renderCount += 1;
          return useRouteRef(routeRef);
        },
        {
          wrapper: ({ children }: PropsWithChildren<{}>) => (
            <TestApiProvider
              apis={[[routeResolutionApiRef, mockRouteResolutionApi]]}
            >
              <MemoryRouter initialEntries={['/my-page']}>
                {children}
              </MemoryRouter>
            </TestApiProvider>
          ),
        },
      );

      expect(renderedHook.result.current()).toBe('');
      expect(renderedHook.result.current()).toBe('');
      expect(renderCount).toBe(1);

      const externalRouteRef = createExternalRouteRef({
        id: 'external-ref',
        optional: true,
      });
      const optionalHook = renderHook(() => useRouteRef(externalRouteRef), {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider
            apis={[
              [
                routeResolutionApiRef,
                {
                  resolve: () => undefined,
                  isFinalized: () => false,
                  onFinalized: () => () => {},
                },
              ],
            ]}
          >
            <MemoryRouter initialEntries={['/my-page']}>
              {children}
            </MemoryRouter>
          </TestApiProvider>
        ),
      });
      expect(optionalHook.result.current).toBeUndefined();

      act(() => {
        finalized = true;
        listeners.forEach(l => l());
      });

      expect(renderedHook.result.current!()).toBe('/ready');
      expect(mockRouteResolutionApi.resolve).toHaveBeenCalledTimes(2);
      expect(renderCount).toBe(2);

      const finalizedApi: RouteResolutionApi = {
        isFinalized: () => true,
        onFinalized: jest.fn(),
        resolve: () => undefined,
      };
      withLogCollector(['error'], () => {
        expect(() =>
          renderHook(() => useRouteRef(routeRef), {
            wrapper: ({ children }: PropsWithChildren<{}>) => (
              <TestApiProvider apis={[[routeResolutionApiRef, finalizedApi]]}>
                <MemoryRouter initialEntries={['/my-page']}>
                  {children}
                </MemoryRouter>
              </TestApiProvider>
            ),
          }),
        ).toThrow('No path for routeRef{type=absolute,id=ref1}');
      });

      const plainApi: RouteResolutionApi = {
        resolve: () => undefined,
      };
      withLogCollector(['error'], () => {
        expect(() =>
          renderHook(() => useRouteRef(routeRef), {
            wrapper: ({ children }: PropsWithChildren<{}>) => (
              <TestApiProvider apis={[[routeResolutionApiRef, plainApi]]}>
                <MemoryRouter initialEntries={['/my-page']}>
                  {children}
                </MemoryRouter>
              </TestApiProvider>
            ),
          }),
        ).toThrow('No path for routeRef{type=absolute,id=ref1}');
      });
    });

    it('should keep renders bounded across finalization', async () => {
      let finalized = false;
      const mockApiA: RouteResolutionApi = {
        resolve: jest.fn(() => (finalized ? () => '/ready' : undefined)),
        isFinalized: jest.fn(() => finalized),
        onFinalized: jest.fn(() => {
          finalized = true;
          return () => {};
        }),
      };

      const routeRef = createRouteRef({ id: 'ref1' });
      let rendersA = 0;
      const hookA = renderHook(
        () => {
          rendersA += 1;
          return useRouteRef(routeRef);
        },
        {
          wrapper: ({ children }: PropsWithChildren<{}>) => (
            <TestApiProvider apis={[[routeResolutionApiRef, mockApiA]]}>
              <MemoryRouter initialEntries={['/my-page']}>
                {children}
              </MemoryRouter>
            </TestApiProvider>
          ),
        },
      );

      expect(mockApiA.onFinalized).toHaveBeenCalledTimes(1);
      expect(hookA.result.current!()).toBe('/ready');
      expect(rendersA).toBeLessThanOrEqual(2);

      let rendersB = 0;
      const mockApiB: RouteResolutionApi = {
        resolve: jest.fn(() => () => '/plain'),
      };
      const hookB = renderHook(
        () => {
          rendersB += 1;
          return useRouteRef(routeRef);
        },
        {
          wrapper: ({ children }: PropsWithChildren<{}>) => (
            <TestApiProvider apis={[[routeResolutionApiRef, mockApiB]]}>
              <MemoryRouter initialEntries={['/my-page']}>
                {children}
              </MemoryRouter>
            </TestApiProvider>
          ),
        },
      );

      await act(async () => {});
      expect(hookB.result.current!()).toBe('/plain');
      expect(rendersB).toBe(1);
      expect(mockApiB.resolve).toHaveBeenCalledTimes(1);
    });
  });
});
