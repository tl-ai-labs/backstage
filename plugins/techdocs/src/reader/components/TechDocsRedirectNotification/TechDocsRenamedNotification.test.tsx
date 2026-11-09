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

import {
  TechDocsRenamedNotification,
  getRenamedFromEntityRef,
} from '../TechDocsRedirectNotification/TechDocsRenamedNotification';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderInTestApp } from '@backstage/test-utils';
import { Navigate, Route, Routes } from 'react-router-dom';

describe('<TechDocsRenamedNotification />', () => {
  it('shows a dismissible notice after a rename redirect', async () => {
    await renderInTestApp(
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/docs/default/component/new-name/getting-started"
              replace
              state={{ renamedFromEntityRef: 'component:default/old-name' }}
            />
          }
        />
        <Route path="/docs/*" element={<TechDocsRenamedNotification />} />
      </Routes>,
    );

    expect(
      await screen.findByText(
        'This entity was renamed from component:default/old-name.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(
        screen.queryByText(
          'This entity was renamed from component:default/old-name.',
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('renders nothing without the marker', async () => {
    await renderInTestApp(
      <Routes>
        <Route path="/docs/*" element={<TechDocsRenamedNotification />} />
      </Routes>,
      { routeEntries: ['/docs/default/component/new-name'] },
    );

    expect(screen.queryByText(/was renamed from/)).not.toBeInTheDocument();
  });
});

describe('getRenamedFromEntityRef', () => {
  it('reads only a non-empty string marker', () => {
    expect(getRenamedFromEntityRef(undefined)).toBeUndefined();
    expect(getRenamedFromEntityRef(null)).toBeUndefined();
    expect(getRenamedFromEntityRef('x')).toBeUndefined();
    expect(getRenamedFromEntityRef({})).toBeUndefined();
    expect(
      getRenamedFromEntityRef({ renamedFromEntityRef: 1 }),
    ).toBeUndefined();
    expect(
      getRenamedFromEntityRef({ renamedFromEntityRef: '' }),
    ).toBeUndefined();
    expect(
      getRenamedFromEntityRef({
        renamedFromEntityRef: 'component:default/old',
      }),
    ).toBe('component:default/old');
  });
});
