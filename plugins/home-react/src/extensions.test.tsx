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
import { errorApiRef, translationApiRef } from '@backstage/frontend-plugin-api';
import { mockApis, TestApiProvider } from '@backstage/frontend-test-utils';
import { CardExtension } from './extensions';

describe('CardExtension', () => {
  it('renders CardExtension without a Backstage AppContext', async () => {
    render(
      <TestApiProvider
        apis={[
          [errorApiRef, mockApis.error()],
          [translationApiRef, mockApis.translation()],
        ]}
      >
        <CardExtension
          title="Test Card"
          Content={() => <div>Widget Body</div>}
        />
      </TestApiProvider>,
    );

    expect(await screen.findByText('Test Card')).toBeInTheDocument();
    expect(await screen.findByText('Widget Body')).toBeInTheDocument();
  });

  it('renders custom title when passed to CardExtension', async () => {
    const defaultTitle = 'Default Card Title';
    const customTitle = 'Custom Card Title';

    render(
      <TestApiProvider
        apis={[
          [errorApiRef, mockApis.error()],
          [translationApiRef, mockApis.translation()],
        ]}
      >
        <CardExtension
          title={customTitle || defaultTitle}
          Content={() => <div>Widget Body</div>}
        />
      </TestApiProvider>,
    );

    expect(await screen.findByText('Custom Card Title')).toBeInTheDocument();
    expect(screen.queryByText('Default Card Title')).not.toBeInTheDocument();
  });
});
