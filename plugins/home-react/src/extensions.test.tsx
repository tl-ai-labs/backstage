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
import { render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { TestApiProvider, mockApis, MockErrorApi } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { translationApiRef } from '@backstage/core-plugin-api/alpha';
import { CardExtension } from './extensions';

describe('CardExtension', () => {
  it('renders the card title and content without app context', async () => {
    render(
      <TestApiProvider
        apis={[
          [translationApiRef, mockApis.translation()],
          [errorApiRef, new MockErrorApi()],
        ]}
      >
        <CardExtension
          title="Test card"
          Content={() => <div>Card content</div>}
        />
      </TestApiProvider>,
    );

    expect(screen.getByText('Test card')).toBeInTheDocument();
    expect(await screen.findByText('Card content')).toBeInTheDocument();
  });

  it('renders a progress indicator while the content is loading without app context', async () => {
    const SuspendingContent = lazy(() => new Promise(() => {}));

    render(
      <TestApiProvider
        apis={[
          [translationApiRef, mockApis.translation()],
          [errorApiRef, new MockErrorApi()],
        ]}
      >
        <CardExtension
          title="Loading card"
          Content={() => <SuspendingContent />}
        />
      </TestApiProvider>,
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });
});
