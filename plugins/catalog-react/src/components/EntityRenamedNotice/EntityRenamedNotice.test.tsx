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

import { renderInTestApp } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigate, Route, Routes } from 'react-router-dom';
import { EntityRenamedNotice } from './EntityRenamedNotice';

describe('<EntityRenamedNotice />', () => {
  it('shows the notice from navigation state and dismisses it', async () => {
    await renderInTestApp(
      <Routes>
        <Route
          path="/"
          element={
            <Navigate to="/target" state={{ entityRenamedFrom: 'old-name' }} />
          }
        />
        <Route path="/target" element={<EntityRenamedNotice />} />
      </Routes>,
    );

    expect(
      await screen.findByText('This entity was renamed from old-name.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(
      screen.queryByText('This entity was renamed from old-name.'),
    ).not.toBeInTheDocument();
  });

  it('ignores the URL', async () => {
    await renderInTestApp(<EntityRenamedNotice />, {
      routeEntries: ['/?entityRenamedFrom=old-name'],
    });

    expect(screen.queryByText(/was renamed from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/old-name/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Dismiss' }),
    ).not.toBeInTheDocument();
  });
});
