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
import { useRouteRef } from './useRouteRef';
import { createRouteRef } from './RouteRef';
import { createSubRouteRef } from './SubRouteRef';
import { createBrowserHistory } from 'history';
import { TestApiProvider } from '@backstage/test-utils';
import { routeResolutionApiRef, RouteResolutionApi } from '../apis';

describe('v1 consumer', () => {
  const context = createVersionedContextForTesting('routing-context');

  afterEach(() => {
    context.reset();
  });

  it('should infer all nested sub-route parameters', () => {
    const rootRouteRef = createRouteRef();
    const revisionRouteRef = createSubRouteRef({
      parent: rootRouteRef,
      path: '/:name/:revision',
    });
    const attachmentRouteRef = createSubRouteRef({
      parent: revisionRouteRef,
      path: '/attachments/:attachmentId',
    });

    function useAttachmentRoute() {
      const route = useRouteRef(attachmentRouteRef);
      route?.({ name: '', revision: '', attachmentId: '' });
      // @ts-expect-error
      route?.({ name: '', revision: '' });
      // @ts-expect-error
      route?.({ attachmentId: '' });
      return route;
    }

    expect(useAttachmentRoute).toEqual(expect.any(Function));
  });

  it('should resolve routes', () => {
    const resolve = jest.fn(() => () => '/hello');

    const routeRef = createRouteRef();

    const renderedHook = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, { resolve }]]}>
          <MemoryRouter initialEntries={['/my-page']} children={children} />
        </TestApiProvider>
      ),
    });

    const routeFunc = renderedHook.result.current;
    expect(routeFunc?.()).toBe('/hello');
    expect(resolve).toHaveBeenCalledWith(
      routeRef,
      expect.objectContaining({
        sourcePath: '/my-page',
      }),
    );
  });

  it('should ignore missing routes', () => {
    const routeRef = createRouteRef();

    const renderedHook = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider
          apis={[[routeResolutionApiRef, { resolve: () => undefined }]]}
        >
          <MemoryRouter initialEntries={['/my-page']} children={children} />
        </TestApiProvider>
      ),
    });

    const routeFunc = renderedHook.result.current;
    expect(routeFunc).toBeUndefined();
  });

  it('re-resolves the routeFunc when the search parameters change', () => {
    const resolve = jest.fn(() => () => '/hello');

    const routeRef = createRouteRef();
    const history = createBrowserHistory();
    history.push('/my-page');

    const { rerender } = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, { resolve }]]}>
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        </TestApiProvider>
      ),
    });

    expect(resolve).toHaveBeenCalledTimes(1);

    history.push('/my-new-page');
    rerender();

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('does not re-resolve the routeFunc the location pathname does not change', () => {
    const resolve = jest.fn(() => () => '/hello');
    const api = { resolve };

    const routeRef = createRouteRef();
    const history = createBrowserHistory();
    history.push('/my-page');

    const { rerender } = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, api]]}>
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        </TestApiProvider>
      ),
    });

    expect(resolve).toHaveBeenCalledTimes(1);

    history.push('/my-page');
    rerender();

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('does not re-resolve the routeFunc when the search parameter changes', () => {
    const resolve = jest.fn(() => () => '/hello');
    const api = { resolve };

    const routeRef = createRouteRef();
    const history = createBrowserHistory();
    history.push('/my-page');

    const { rerender } = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, api]]}>
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        </TestApiProvider>
      ),
    });

    expect(resolve).toHaveBeenCalledTimes(1);

    history.push('/my-page?foo=bar');
    rerender();

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('does not re-resolve the routeFunc when the hash parameter changes', () => {
    const resolve = jest.fn(() => () => '/hello');
    const api = { resolve };

    const routeRef = createRouteRef();
    const history = createBrowserHistory();
    history.push('/my-page');

    const { rerender } = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, api]]}>
          <Router
            location={history.location}
            navigator={history}
            children={children}
          />
        </TestApiProvider>
      ),
    });

    expect(resolve).toHaveBeenCalledTimes(1);

    history.push('/my-page#foo');
    rerender();

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('should re-resolve once across finalization and not re-render for APIs without finalization support', async () => {
    let finalized = false;
    const listeners = new Set<() => void>();
    const resolve = jest.fn(() => (finalized ? () => '/ready' : undefined));
    const apiWithFinalization: RouteResolutionApi = {
      resolve,
      isFinalized: () => finalized,
      onFinalized: listener => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    const routeRef = createRouteRef();
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useRouteRef(routeRef);
      },
      {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider
            apis={[[routeResolutionApiRef, apiWithFinalization]]}
          >
            <MemoryRouter initialEntries={['/my-page']} children={children} />
          </TestApiProvider>
        ),
      },
    );

    expect(result.current).toBeUndefined();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(renders).toBe(1);
    expect(listeners.size).toBe(1);

    act(() => {
      finalized = true;
      listeners.forEach(l => l());
      listeners.clear();
    });

    expect(result.current?.()).toBe('/ready');
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(renders).toBe(2);
    expect(listeners.size).toBe(0);

    let plainRenders = 0;
    const plainResolve = jest.fn(() => () => '/plain');
    const plainApi = { resolve: plainResolve };
    const { result: plainResult } = renderHook(
      () => {
        plainRenders += 1;
        return useRouteRef(routeRef);
      },
      {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider apis={[[routeResolutionApiRef, plainApi]]}>
            <MemoryRouter initialEntries={['/my-page']} children={children} />
          </TestApiProvider>
        ),
      },
    );

    expect(plainResult.current?.()).toBe('/plain');
    expect(plainRenders).toBe(1);
    expect(plainResolve).toHaveBeenCalledTimes(1);

    await act(async () => {});

    expect(plainResult.current?.()).toBe('/plain');
    expect(plainRenders).toBe(1);
    expect(plainResolve).toHaveBeenCalledTimes(1);

    const thirdListeners = new Set<() => void>();
    const thirdApi: RouteResolutionApi = {
      resolve: jest.fn(() => undefined),
      isFinalized: () => false,
      onFinalized: listener => {
        thirdListeners.add(listener);
        return () => {
          thirdListeners.delete(listener);
        };
      },
    };

    const { unmount } = renderHook(() => useRouteRef(routeRef), {
      wrapper: ({ children }: PropsWithChildren<{}>) => (
        <TestApiProvider apis={[[routeResolutionApiRef, thirdApi]]}>
          <MemoryRouter initialEntries={['/my-page']} children={children} />
        </TestApiProvider>
      ),
    });

    expect(thirdListeners.size).toBe(1);
    unmount();
    expect(thirdListeners.size).toBe(0);
  });

  it('should not miss a finalization that happens while subscribing across finalization', () => {
    let finalized = false;
    const resolveA = jest.fn(() => (finalized ? () => '/ready' : undefined));
    const isFinalizedA = jest.fn(() => finalized);
    const onFinalizedA = jest.fn(() => {
      finalized = true;
      return () => {};
    });

    const apiA: RouteResolutionApi = {
      resolve: resolveA,
      isFinalized: isFinalizedA,
      onFinalized: onFinalizedA,
    };

    const routeRef = createRouteRef();
    let rendersA = 0;
    const { result: resultA } = renderHook(
      () => {
        rendersA += 1;
        return useRouteRef(routeRef);
      },
      {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider apis={[[routeResolutionApiRef, apiA]]}>
            <MemoryRouter initialEntries={['/my-page']} children={children} />
          </TestApiProvider>
        ),
      },
    );

    expect(onFinalizedA).toHaveBeenCalledTimes(1);
    expect(resultA.current?.()).toBe('/ready');
    expect(rendersA).toBeLessThanOrEqual(2);

    const resolveB = jest.fn(() => () => '/done');
    const onFinalizedB = jest.fn();
    const apiB: RouteResolutionApi = {
      resolve: resolveB,
      isFinalized: () => true,
      onFinalized: onFinalizedB,
    };

    let rendersB = 0;
    const { result: resultB } = renderHook(
      () => {
        rendersB += 1;
        return useRouteRef(routeRef);
      },
      {
        wrapper: ({ children }: PropsWithChildren<{}>) => (
          <TestApiProvider apis={[[routeResolutionApiRef, apiB]]}>
            <MemoryRouter initialEntries={['/my-page']} children={children} />
          </TestApiProvider>
        ),
      },
    );

    expect(onFinalizedB).not.toHaveBeenCalled();
    expect(resultB.current?.()).toBe('/done');
    expect(rendersB).toBe(1);
  });
});
