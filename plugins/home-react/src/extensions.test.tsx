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

import { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { errorApiRef } from '@backstage/core-plugin-api';
import { translationApiRef } from '@backstage/frontend-plugin-api';
import {
  TestApiProvider,
  mockApis,
  renderInTestApp,
} from '@backstage/test-utils';
import { CardExtension } from './extensions';

const NeverResolvingComponent = lazy(() => new Promise(() => {}));

const PlainContent = () => <div>Plain content</div>;
const SuspendingContent = () => <NeverResolvingComponent />;

describe('CardExtension', () => {
  it('renders without an app context and falls back to the core Progress', async () => {
    const { rerender } = render(
      <TestApiProvider
        apis={[
          [errorApiRef, { post: jest.fn() }],
          [translationApiRef, mockApis.translation()],
        ]}
      >
        <CardExtension title="Card Title" Content={PlainContent} />
      </TestApiProvider>,
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Plain content')).toBeInTheDocument();

    rerender(
      <TestApiProvider
        apis={[
          [errorApiRef, { post: jest.fn() }],
          [translationApiRef, mockApis.translation()],
        ]}
      >
        <CardExtension title="Card Title" Content={SuspendingContent} />
      </TestApiProvider>,
    );

    expect(await screen.findByTestId('progress')).toBeInTheDocument();
  });

  it("uses the app's Progress when an app context exists", async () => {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [errorApiRef, { post: jest.fn() }],
          [translationApiRef, mockApis.translation()],
        ]}
      >
        <CardExtension title="Card Title" Content={SuspendingContent} />
      </TestApiProvider>,
      {
        components: {
          Progress: () => <div>App progress</div>,
        },
      },
    );

    expect(await screen.findByText('App progress')).toBeInTheDocument();
  });
});
