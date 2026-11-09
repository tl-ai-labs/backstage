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

import '@testing-library/jest-dom';
import { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { TestApiProvider, MockErrorApi, mockApis } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { translationApiRef } from '@backstage/core-plugin-api/alpha';
import { CardExtension } from './extensions';

describe('CardExtension', () => {
  it('renders a card extension without an app context', async () => {
    const Content = () => <>Card content</>;

    render(
      <TestApiProvider
        apis={[
          [translationApiRef, mockApis.translation()],
          [errorApiRef, new MockErrorApi()],
        ]}
      >
        <CardExtension title="My card" Content={Content} />
      </TestApiProvider>,
    );

    expect(await screen.findByText('My card')).toBeInTheDocument();
    expect(await screen.findByText('Card content')).toBeInTheDocument();
  });

  it('renders lazy content without an app context', async () => {
    const Content = lazy(async () => ({
      default: () => <>Lazy content</>,
    })) as unknown as (props?: any) => JSX.Element;

    render(
      <TestApiProvider
        apis={[
          [translationApiRef, mockApis.translation()],
          [errorApiRef, new MockErrorApi()],
        ]}
      >
        <CardExtension title="Lazy card" Content={Content} />
      </TestApiProvider>,
    );

    expect(await screen.findByText('Lazy card')).toBeInTheDocument();
    expect(await screen.findByText('Lazy content')).toBeInTheDocument();
  });
});
