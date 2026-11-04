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

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CardExtension } from './extensions';

describe('CardExtension', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders CardExtension Content and title without AppContext', async () => {
    await act(async () => {
      root.render(
        <CardExtension
          title="Sample Card"
          Content={() => <div>Sample content</div>}
        />,
      );
    });

    expect(container.textContent).toContain('Sample Card');
    expect(container.textContent).toContain('Sample content');
  });

  it('renders CardExtension Actions and ContextProvider without AppContext', async () => {
    await act(async () => {
      root.render(
        <CardExtension
          title="Card With Extras"
          Content={() => <div>Body text</div>}
          Actions={() => <button type="button">Action Button</button>}
          ContextProvider={({ children }: { children: JSX.Element }) => (
            <section aria-label="custom-provider">{children}</section>
          )}
        />,
      );
    });

    expect(
      container.querySelector('section[aria-label="custom-provider"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('Body text');
    expect(container.textContent).toContain('Action Button');
  });

  it('renders custom Renderer with Settings, Actions, and ContextProvider without AppContext', async () => {
    await act(async () => {
      root.render(
        <CardExtension
          title="Custom Rendered Card"
          Content={() => <div>Rendered content</div>}
          Actions={() => <span>Rendered actions</span>}
          Settings={() => <span>Rendered settings</span>}
          ContextProvider={({ children }: { children: JSX.Element }) => (
            <div data-provider="yes">{children}</div>
          )}
          Renderer={({
            title,
            Content,
            Actions,
            Settings,
            ContextProvider,
          }) => {
            const inner = (
              <div>
                <h1>{title}</h1>
                <Content />
                {Actions && <Actions />}
                {Settings && <Settings />}
              </div>
            );
            return ContextProvider ? (
              <ContextProvider>{inner}</ContextProvider>
            ) : (
              inner
            );
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Custom Rendered Card');
    expect(container.textContent).toContain('Rendered content');
    expect(container.textContent).toContain('Rendered actions');
    expect(container.textContent).toContain('Rendered settings');
  });
});
