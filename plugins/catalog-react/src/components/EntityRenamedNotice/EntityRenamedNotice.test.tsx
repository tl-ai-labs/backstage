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

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { EntityRenamedNotice } from './EntityRenamedNotice';

const NavigateWithState = ({ state }: { state?: unknown }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/catalog/default/component/new-service', {
      replace: true,
      state,
    });
  }, [navigate, state]);
  return null;
};

describe('EntityRenamedNotice', () => {
  it('names the former ref and can be dismissed in both UI vocabularies', async () => {
    const formerRef = 'component:default/old-service';

    // 1. Default legacy UI
    const { unmount: unmountLegacy } = await renderInTestApp(
      <>
        <EntityRenamedNotice />
        <NavigateWithState state={{ formerEntityRef: formerRef }} />
      </>,
      {
        routeEntries: ['/catalog/default/component/new-service'],
      },
    );

    const legacyNotice = await screen.findByText(new RegExp(formerRef));
    expect(legacyNotice).toBeInTheDocument();

    const legacyCloseButton = screen.getByRole('button', {
      name: /close/i,
    });
    fireEvent.click(legacyCloseButton);
    expect(screen.queryByText(new RegExp(formerRef))).toBeNull();

    unmountLegacy();

    // 2. BUI vocabulary
    const { unmount: unmountBui } = await renderInTestApp(
      <>
        <EntityRenamedNotice ui="bui" />
        <NavigateWithState state={{ formerEntityRef: formerRef }} />
      </>,
      {
        routeEntries: ['/catalog/default/component/new-service'],
      },
    );

    const buiNotice = await screen.findByText(new RegExp(formerRef));
    expect(buiNotice).toBeInTheDocument();

    const buiCloseButton = screen.getByRole('button', {
      name: /dismiss|close/i,
    });
    fireEvent.click(buiCloseButton);
    expect(screen.queryByText(new RegExp(formerRef))).toBeNull();

    unmountBui();
  });

  it('renders nothing without a usable former ref in state', async () => {
    const testCases: Array<{ state?: unknown }> = [
      {}, // no state
      { state: {} }, // empty object
      { state: { formerEntityRef: '' } }, // empty string
      { state: 'not-an-object' }, // non-object state
    ];

    for (const { state } of testCases) {
      const { unmount } = await renderInTestApp(
        <>
          <EntityRenamedNotice />
          <NavigateWithState state={state} />
        </>,
        {
          routeEntries: ['/catalog/default/component/new-service'],
        },
      );

      expect(screen.queryByRole('alert')).toBeNull();
      expect(
        screen.queryByRole('button', { name: /close|dismiss/i }),
      ).toBeNull();

      unmount();
    }
  });
});
