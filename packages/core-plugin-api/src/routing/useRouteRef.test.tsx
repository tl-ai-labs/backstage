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
import { TestApiProvider } from '@backstage/test-utils';

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

    it('should keep its errors without a route resolution API', () => {
      const routeRef = createRouteRef({ id: 'ref1' });
      const wrapper = ({ children }: PropsWithChildren<{}>) => (
        <MemoryRouter initialEntries={['/my-page']} children={children} />
      );

      context.set({ 1: { resolve: () => undefined } });
      expect(() =>
        renderHook(() => useRouteRef(routeRef), { wrapper }),
      ).toThrow('No path for');

      context.reset();
      expect(() =>
        renderHook(() => useRouteRef(routeRef), { wrapper }),
      ).toThrow('Routing context is not available');
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

    it('should throw for an unresolved route when the API has no lifecycle signal', () => {
      const routeRef = createRouteRef({ id: 'ref1' });

      const mockRouteResolutionApi: RouteResolutionApi = {
        resolve: () => undefined,
      };

      const wrapper = ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider
          apis={[[routeResolutionApiRef, mockRouteResolutionApi]]}
        >
          <MemoryRouter initialEntries={['/my-page']}>{children}</MemoryRouter>
        </TestApiProvider>
      );

      expect(() =>
        renderHook(() => useRouteRef(routeRef), { wrapper }),
      ).toThrow('No path for');
    });

    describe('during app bootstrap', () => {
      it('returns a stable placeholder and then the real route function', () => {
        const routeRef = createRouteRef({ id: 'ref1' });
        const resolve = jest.fn((): RouteFunc<any> | undefined => undefined);
        const listeners = new Set<() => void>();
        let finalized = false;

        const finalize = () => {
          finalized = true;
          listeners.forEach(listener => listener());
        };

        const lifecycleKey = Symbol.for(
          '@backstage/frontend-plugin-api:route-resolution-lifecycle',
        );
        const fakeApi = {
          resolve,
          [lifecycleKey]: {
            isFinalized: () => finalized,
            subscribe: (listener: () => void) => {
              listeners.add(listener);
              return () => {
                listeners.delete(listener);
              };
            },
          },
        };

        const wrapper = ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider apis={[[routeResolutionApiRef, fakeApi]]}>
            <MemoryRouter initialEntries={['/my-page']}>
              {children}
            </MemoryRouter>
          </TestApiProvider>
        );

        let renders = 0;
        const { result, rerender } = renderHook(
          () => {
            renders += 1;
            return useRouteRef(routeRef);
          },
          { wrapper },
        );

        const placeholder = result.current;
        expect(placeholder()).toBe('#');

        rerender();
        expect(result.current).toBe(placeholder);

        const rendersBeforeFinalize = renders;
        resolve.mockReturnValue(() => '/target');
        act(() => finalize());

        expect(result.current()).toBe('/target');
        expect(renders).toBe(rendersBeforeFinalize + 1);
      });
    });
  });
});
