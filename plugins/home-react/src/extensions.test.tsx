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
import { createRoot, Root } from 'react-dom/client';
import { CardExtension } from './extensions';

jest.mock('@backstage/frontend-plugin-api', () => ({
  ...jest.requireActual('@backstage/frontend-plugin-api'),
  useTranslationRef: () => ({
    t: (key: string) => key,
  }),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const Content = () => <div>Test content</div>;

describe('extensions', () => {
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
  });

  it('renders CardExtension without AppContext', async () => {
    await act(async () => {
      root.render(<CardExtension title="Test title" Content={Content} />);
    });

    expect(container.textContent).toContain('Test title');
    expect(container.textContent).toContain('Test content');
  });

  it('renders CardExtension with a custom Renderer without AppContext', async () => {
    await act(async () => {
      root.render(
        <CardExtension
          title="Custom title"
          Content={Content}
          Renderer={({ title, Content: InnerContent }) => (
            <div>
              <h2>{title}</h2>
              <InnerContent />
            </div>
          )}
        />,
      );
    });

    expect(container.textContent).toContain('Custom title');
    expect(container.textContent).toContain('Test content');
  });
});
