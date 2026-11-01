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

import { lazy, ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { CardExtension, type RendererProps } from './extensions';

describe('CardExtension', () => {
  it('renders a custom Renderer without app context', () => {
    const Renderer = ({ title, Content }: RendererProps) => (
      <section>
        <h2>{title}</h2>
        <Content />
      </section>
    );

    render(
      <CardExtension
        title="Custom title"
        Renderer={Renderer}
        Content={() => <div>Custom content</div>}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Custom title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('renders the default card with its title, content, actions and context provider', async () => {
    await renderInTestApp(
      <CardExtension
        title="Default title"
        Content={() => <div>Default content</div>}
        Actions={() => <div>Default actions</div>}
        ContextProvider={({ children }: { children: ReactNode }) => (
          <section aria-label="Card context">{children}</section>
        )}
      />,
    );

    const context = within(
      await screen.findByRole('region', { name: 'Card context' }),
    );
    expect(context.getByText('Default title')).toBeInTheDocument();
    expect(context.getByText('Default content')).toBeInTheDocument();
    expect(context.getByText('Default actions')).toBeInTheDocument();
  });

  it('opens the settings modal from the default card', async () => {
    await renderInTestApp(
      <CardExtension
        title="Default title"
        Content={() => <div>Default content</div>}
        Settings={() => <div>Settings content</div>}
      />,
    );

    expect(screen.queryByText('Settings content')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button'));

    expect(await screen.findByText('Settings content')).toBeInTheDocument();
  });

  it('uses the app Progress as the fallback on the default path', async () => {
    const Content = lazy(
      () => new Promise<never>(() => {}),
    ) as unknown as RendererProps['Content'];

    await renderInTestApp(<CardExtension Content={Content} />, {
      components: { Progress: () => <div>App progress</div> },
    });

    expect(await screen.findByText('App progress')).toBeInTheDocument();
  });
});
