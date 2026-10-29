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
import { act, lazy } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CardExtension } from './extensions';

jest.mock('@backstage/frontend-plugin-api', () => ({
  ...jest.requireActual('@backstage/frontend-plugin-api'),
  useTranslationRef: () => ({ t: (key: string) => key }),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('CardExtension', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.useRealTimers();
  });

  it('renders the card title and content without app context', () => {
    const Content = () => <div>Card body</div>;

    expect(() => {
      act(() => {
        root.render(<CardExtension title="My card" Content={Content} />);
      });
    }).not.toThrow();

    expect(container.textContent).toContain('My card');
    expect(container.textContent).toContain('Card body');
  });

  it('shows the default progress indicator while lazy content loads without app context', async () => {
    jest.useFakeTimers();

    let resolve!: (module: { default: () => JSX.Element }) => void;
    const promise = new Promise<{ default: () => JSX.Element }>(res => {
      resolve = res;
    });
    const LazyBody = lazy(() => promise);
    const Content = () => <LazyBody />;

    act(() => {
      root.render(<CardExtension title="My card" Content={Content} />);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Lazy body');

    await act(async () => {
      resolve({ default: () => <div>Lazy body</div> });
    });

    expect(container.textContent).toContain('Lazy body');
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });
});
