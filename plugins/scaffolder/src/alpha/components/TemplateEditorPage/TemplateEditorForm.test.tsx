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

import { act, fireEvent, screen } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import { rootRouteRef } from '../../../routes';
import { TemplateEditorForm } from './TemplateEditorForm';

const MOBILE_SDK_PARAMETERS_YAML = `
parameters:
  - title: Target Platform
    properties:
      mobile:
        type: boolean
        title: Is this a mobile SDK?
        default: false
  - title: Repository Details
    required:
      - repo
    properties:
      repo:
        type: string
        title: Repo
    dependencies:
      mobile:
        oneOf:
          - properties:
              mobile:
                const: false
          - properties:
              mobile:
                const: true
              sdkName:
                type: string
                title: SDK Name
            required:
              - sdkName
`;

describe('TemplateEditorForm', () => {
  const catalogApiMock = { getEntities: jest.fn().mockResolvedValue([]) };
  const scaffolderApiMock = {};

  it('shows a cross-step conditional field in the preview only when the governing answer is set', async () => {
    const setErrorText = jest.fn();

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [catalogApiRef, catalogApiMock],
          [scaffolderApiRef, scaffolderApiMock],
        ]}
      >
        <TemplateEditorForm
          content={MOBILE_SDK_PARAMETERS_YAML}
          contentIsSpec
          setErrorText={setErrorText}
          fieldExtensions={[]}
        />
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/': rootRouteRef,
        },
      },
    );

    // Initial render is debounced (250ms), so await the first step heading or label
    const mobileCheckbox = await screen.findByRole('checkbox', {
      name: /Is this a mobile SDK\?/i,
    });
    expect(mobileCheckbox).toBeInTheDocument();
    expect(setErrorText).not.toHaveBeenCalledWith(expect.any(String));

    // Advance to step 2 with mobile remaining unchecked (false)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    });

    expect(
      await screen.findByRole('textbox', { name: /Repo/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: /SDK Name/i }),
    ).not.toBeInTheDocument();

    // Go back to step 1
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    });

    // Check the mobile checkbox
    const mobileCheckboxStep1 = await screen.findByRole('checkbox', {
      name: /Is this a mobile SDK\?/i,
    });
    await act(async () => {
      fireEvent.click(mobileCheckboxStep1);
    });

    // Advance to step 2 again
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    });

    // Verify both Repo and SDK Name now appear
    expect(
      await screen.findByRole('textbox', { name: /Repo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /SDK Name/i }),
    ).toBeInTheDocument();

    expect(setErrorText).not.toHaveBeenCalledWith(expect.any(String));
  });
});
