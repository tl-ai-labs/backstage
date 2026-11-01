/*
 * Copyright 2022 The Backstage Authors
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
import { JsonValue } from '@backstage/types';
import type { RJSFValidationError } from '@rjsf/utils';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';

import { FieldExtensionComponentProps } from '../../../extensions';
import { LayoutTemplate } from '../../../layouts';
import { SecretsContextProvider } from '../../../secrets';
import { TemplateParameterSchema } from '../../../types';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('should render the step titles for each step of the manifest', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'React JSON Schema Form Test',
    };

    const { getByText } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    for (const step of manifest.steps) {
      expect(getByText(step.title)).toBeInTheDocument();
    }
  });

  it('should render next / review button', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'React JSON Schema Form Test',
    };

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    expect(getByRole('button', { name: 'Next' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    expect(getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('should remember the state of the form when cycling through the pages', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
        {
          title: 'Step 2',
          schema: {
            properties: {
              description: {
                type: 'string',
              },
            },
          },
        },
      ],
      title: 'React JSON Schema Form Test',
    };

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'name' }), {
        target: { value: 'im a test value' },
      });
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Back' }));
    });

    expect(getByRole('textbox', { name: 'name' })).toHaveValue(
      'im a test value',
    );
  });

  it('should remember the state of the form when cycling through the pages by directly clicking on the step labels', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
        {
          title: 'Step 2',
          schema: {
            properties: {
              description: {
                type: 'string',
              },
            },
          },
        },
      ],
      title: 'React JSON Schema Form Test',
    };

    const { getByRole, getByLabelText } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'name' }), {
        target: { value: 'im a test value' },
      });
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    await act(async () => {
      fireEvent.click(getByLabelText('Step 1'));
    });

    expect(getByRole('textbox', { name: 'name' })).toHaveValue(
      'im a test value',
    );
  });

  // This test is currently broken, and needs rethinking how we fix this.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should omit properties that are no longer pertinent to the current step', async () => {
    const manifest: TemplateParameterSchema = {
      title: 'Conditional Input Form',
      steps: [
        {
          title: 'Conditional Input step',
          schema: {
            type: 'object',
            properties: {
              moreInfo: {
                type: 'boolean',
                title: 'More info',
              },
            },
            dependencies: {
              moreInfo: {
                oneOf: [
                  {
                    properties: {
                      moreInfo: {
                        const: true,
                      },
                      description: {
                        type: 'string',
                        title: 'Description',
                      },
                    },
                    required: ['description'],
                  },
                  {
                    properties: {
                      moreInfo: {
                        not: {
                          const: true,
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    };

    const onCreate = jest.fn();

    const { getByRole, queryByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          onCreate={onCreate}
          extensions={[]}
          formProps={{ omitExtraData: true, liveOmit: true }}
        />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.click(getByRole('checkbox', { name: 'More info' }));
      fireEvent.change(getByRole('textbox', { name: 'Description' }), {
        target: { value: 'My Test Description' },
      });
      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    expect(
      getByRole('cell', { name: 'My Test Description' }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Back' }));
    });

    await act(async () => {
      fireEvent.click(getByRole('checkbox', { name: 'More info' }));
      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    expect(
      queryByRole('cell', { name: 'My Test Description' }),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Create' }));
    });

    expect(onCreate).toHaveBeenCalledWith({ moreInfo: false });
  });

  it('should merge and overwrite nested formData correctly', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              foo: {
                type: 'string',
                title: 'Foo - 1',
              },
            },
          },
        },
        {
          title: 'Step 2',
          schema: {
            properties: {
              foo: {
                type: 'string',
                title: 'Foo - 2',
              },
              bar: {
                type: 'string',
                title: 'Bar - 2',
              },
            },
          },
        },
      ],
      title: 'React JSON Schema Form Test',
    };

    const onCreate = jest.fn();

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} onCreate={onCreate} extensions={[]} />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'Foo - 1' }), {
        target: { value: 'value 1' },
      });
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'Foo - 2' }), {
        target: { value: 'value 2' },
      });
      fireEvent.change(getByRole('textbox', { name: 'Bar - 2' }), {
        target: { value: 'value 2' },
      });
      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Create' }));
    });

    expect(onCreate).toHaveBeenCalledWith({
      foo: 'value 2',
      bar: 'value 2',
    });
  });

  it('should render custom field extensions properly', async () => {
    const MockComponent = () => {
      return <h1>im a custom field extension</h1>;
    };

    const manifest: TemplateParameterSchema = {
      title: 'Custom Fields',
      steps: [
        {
          title: 'Test',
          schema: {
            properties: {
              name: {
                type: 'string',
                'ui:field': 'Mock',
              },
            },
          },
        },
      ],
    };

    const { getByText } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          extensions={[{ name: 'Mock', component: MockComponent }]}
          onCreate={jest.fn()}
        />
      </SecretsContextProvider>,
    );

    expect(getByText('im a custom field extension')).toBeInTheDocument();
  });

  it('should disable the form with progress when async validators are running', async () => {
    const MockComponent = () => {
      return <h1>im a custom field extension</h1>;
    };

    const manifest: TemplateParameterSchema = {
      title: 'Custom Fields',
      steps: [
        {
          title: 'Test',
          schema: {
            properties: {
              name: {
                type: 'string',
                'ui:field': 'Mock',
              },
            },
          },
        },
      ],
    };

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          extensions={[
            {
              name: 'Mock',
              component: MockComponent,
              validation: async () => new Promise(r => setTimeout(r, 1000)),
            },
          ]}
          onCreate={jest.fn()}
        />
      </SecretsContextProvider>,
    );
    fireEvent.click(getByRole('button', { name: 'Review' }));
    await waitFor(() => {
      expect(getByRole('progressbar')).toBeInTheDocument(); // Check if progress bar is rendered
      expect(getByRole('button', { name: 'Review' })).toBeDisabled(); // Check if the button is disabled
    });
  });

  it('should transform default error message', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              postcode: {
                type: 'string',
                pattern: '[A-Z][0-9][A-Z] [0-9][A-Z][0-9]',
              },
            },
          },
        },
      ],
      title: 'transformErrors Form Test',
    };

    const transformErrors = (errors: RJSFValidationError[]) => {
      return errors.map(err =>
        err.property === '.postcode'
          ? { ...err, message: 'invalid postcode' }
          : err,
      );
    };

    const { getByText, getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          extensions={[]}
          onCreate={jest.fn()}
          formProps={{ transformErrors }}
        />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'postcode' }), {
        target: { value: 'invalid' },
      });
      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    expect(getByText('invalid postcode')).toBeInTheDocument();
  });

  it('should render ajv-errors message', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              postcode: {
                type: 'string',
                pattern: '[A-Z][0-9][A-Z] [0-9][A-Z][0-9]',
              },
            },
            errorMessage: {
              properties: {
                postcode: 'invalid postcode',
              },
            },
          },
        },
      ],
      title: 'transformErrors Form Test',
    };

    const { getByText, getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.change(getByRole('textbox', { name: 'postcode' }), {
        target: { value: 'invalid' },
      });

      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    expect(getByText('invalid postcode')).toBeInTheDocument();
  });

  it('should grab the initial formData from the query', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              firstName: {
                type: 'string',
              },
            },
          },
        },
      ],
      title: 'initialize formData',
    };

    const mockFormData = { firstName: 'John' };

    // Use history.replaceState to set the query string (jsdom 27 doesn't allow redefining window.location)
    window.history.replaceState(
      {},
      '',
      `?formData=${JSON.stringify(mockFormData)}`,
    );

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    expect(getByRole('textbox', { name: 'firstName' })).toHaveValue('John');
  });

  it('should initialize formState with undefined form values', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        {
          title: 'Step 1',
          schema: {
            properties: {
              firstName: {
                type: 'string',
              },
            },
          },
        },
      ],
      title: 'initialize formData',
    };

    const onCreate = jest.fn(async (values: Record<string, JsonValue>) => {
      expect(values).toHaveProperty('firstName');
    });

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={onCreate} />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Review' }));
    });

    expect(getByRole('button', { name: 'Create' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Create' }));
    });

    // flush promises
    return new Promise(process.nextTick);
  });

  it('should override the Create and Review button text', async () => {
    const manifest: TemplateParameterSchema = {
      title: 'Custom Fields',
      steps: [
        {
          title: 'Test',
          schema: {
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
      ],
    };

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          onCreate={jest.fn()}
          extensions={[]}
          components={{
            createButtonText: <b>Make</b>,
            reviewButtonText: <i>Inspect</i>,
          }}
        />
      </SecretsContextProvider>,
    );

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Inspect' }));
    });

    expect(getByRole('button', { name: 'Make' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Make' }));
    });
  });

  it('should allow overrides to the uiSchema and formContext correctly', async () => {
    const manifest: TemplateParameterSchema = {
      title: 'Custom Fields',
      steps: [
        {
          title: 'Test',
          schema: {
            properties: {
              name: {
                type: 'string',
                'ui:placeholder': 'Enter your name',
              },
              age: {
                type: 'number',
                'ui:placeholder': 'Enter your age',
              },
            },
          },
        },
      ],
    };

    const uiSchema = {
      name: {
        'ui:readonly': true,
        'ui:placeholder': 'Should be overwritten',
      },
    };

    const formContext = {
      readOnlyAsDisabled: true,
    };

    const { getByRole } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper
          manifest={manifest}
          onCreate={jest.fn()}
          extensions={[]}
          formProps={{ uiSchema, formContext }}
          initialState={{ name: 'Some Name', age: 40 }}
        />
      </SecretsContextProvider>,
    );

    expect(getByRole('textbox', { name: 'name' })).toHaveValue('Some Name');
    expect(getByRole('textbox', { name: 'name' })).toBeDisabled();
    expect(getByRole('textbox', { name: 'name' })).toHaveAttribute(
      'placeholder',
      'Enter your name',
    );

    expect(getByRole('spinbutton', { name: 'age' })).toHaveValue(40);
    expect(getByRole('spinbutton', { name: 'age' })).toBeEnabled();
    expect(getByRole('spinbutton', { name: 'age' })).toHaveAttribute(
      'placeholder',
      'Enter your age',
    );
  });

  it('should scroll the window to top on step change when there is no <main> element', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'Scroll Test (no main)',
    };

    // Apps on the new frontend system render no <main> element. With none
    // present, the Stepper should fall back to scrolling the window.
    // (jsdom does not implement window.scrollTo, so we stub it.)
    const scrollToSpy = jest
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {});

    const { getByRole, unmount } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    scrollToSpy.mockClear();
    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    scrollToSpy.mockRestore();
    unmount();
  });

  it('should scroll the nearest scrollable ancestor to top when activeStep changes', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'Scroll Test',
    };

    const windowScrollSpy = jest
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {});

    const { getByRole, container, unmount } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    const scrollableAncestor = container as HTMLElement;
    const scrollToMock = jest.fn();
    scrollableAncestor.scrollTo = scrollToMock;
    scrollableAncestor.style.overflowY = 'auto';
    Object.defineProperty(scrollableAncestor, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(scrollableAncestor, 'clientHeight', {
      configurable: true,
      value: 500,
    });

    windowScrollSpy.mockClear();
    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(windowScrollSpy).not.toHaveBeenCalled();

    windowScrollSpy.mockRestore();
    unmount();
  });

  it('should scroll the window when a non-scrollable <main> exists', async () => {
    const manifest: TemplateParameterSchema = {
      steps: [
        { title: 'Step 1', schema: { properties: {} } },
        { title: 'Step 2', schema: { properties: {} } },
      ],
      title: 'Scroll Test (non-scrollable main)',
    };

    const main = document.createElement('main');
    document.body.appendChild(main);
    const mainScrollTo = jest.fn();
    main.scrollTo = mainScrollTo;

    const windowScrollSpy = jest
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => {});

    const { getByRole, unmount } = await renderInTestApp(
      <SecretsContextProvider>
        <Stepper manifest={manifest} extensions={[]} onCreate={jest.fn()} />
      </SecretsContextProvider>,
    );

    // Ignore the initial mount effect call; only measure the step change.
    windowScrollSpy.mockClear();

    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Next' }));
    });

    expect(mainScrollTo).not.toHaveBeenCalled();
    expect(windowScrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    windowScrollSpy.mockRestore();
    document.body.removeChild(main);
    unmount();
  });

  describe('Scaffolder Layouts', () => {
    it('should render the step in the scaffolder layout', async () => {
      const ScaffolderLayout: LayoutTemplate = ({ properties }) => (
        <>
          <h1>A Scaffolder Layout</h1>
          {properties.map((prop, i) => (
            <div key={i}>{prop.content}</div>
          ))}
        </>
      );

      const manifest: TemplateParameterSchema = {
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              'ui:ObjectFieldTemplate': 'Layout',
              properties: {
                field1: {
                  type: 'string',
                },
              },
            },
          },
        ],
        title: 'scaffolder layouts',
      };

      const { getByText, getByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifest}
            extensions={[]}
            onCreate={jest.fn()}
            layouts={[{ name: 'Layout', component: ScaffolderLayout }]}
          />
        </SecretsContextProvider>,
      );

      expect(getByText('A Scaffolder Layout')).toBeInTheDocument();
      expect(getByRole('textbox', { name: 'field1' })).toBeInTheDocument();
    });
  });

  describe('state tracking', () => {
    it('should render perfectly when using field extensions that may do some strange things', async () => {
      const FieldExtension = ({
        formData,
        onChange,
      }: FieldExtensionComponentProps<{ repoOrg?: string }>) => {
        useEffect(() => {
          if (!formData?.repoOrg) onChange({ repoOrg: 'backstage' });
        }, [formData, onChange]);

        return (
          <>
            Some field
            <input
              type="text"
              value={formData?.repoOrg ?? ''}
              onChange={e => onChange({ repoOrg: e.target.value })}
            />
          </>
        );
      };

      const manifest: TemplateParameterSchema = {
        title: 'Custom Fields',
        steps: [
          {
            title: 'Test',
            schema: {
              properties: {
                thing: {
                  type: 'object',
                  'ui:field': 'FieldExtension',
                  properties: {
                    repoOrg: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        ],
      };

      // `onCreate` must be async to mock the submit button disabled behavior
      const onCreate = jest.fn(
        () => new Promise<void>(resolve => setTimeout(resolve, 0)),
      );

      const { getByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifest}
            onCreate={onCreate}
            extensions={[
              {
                name: 'FieldExtension',
                component: FieldExtension,
              },
            ]}
          />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      fireEvent.click(getByRole('button', { name: 'Create' }));

      await waitFor(() =>
        expect(getByRole('button', { name: 'Create' })).toBeDisabled(),
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Create' }));
      });

      expect(onCreate).toHaveBeenCalledTimes(1);

      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          thing: { repoOrg: 'backstage' },
        }),
      );
    });
  });

  describe('cross-step conditions', () => {
    const flagStep = {
      title: 'Step 1',
      schema: {
        type: 'object',
        properties: {
          flag: { type: 'boolean', title: 'Flag', default: false },
        },
      },
    };

    const flagIsOn = {
      properties: { flag: { const: true } },
      required: ['flag'],
    };

    const reasonDependency = {
      flag: {
        allOf: [
          {
            if: { properties: { flag: { const: true } } },
            then: {
              properties: { reason: { type: 'string', title: 'Reason' } },
              required: ['reason'],
            },
          },
        ],
      },
    };

    const reasonManifest: TemplateParameterSchema = {
      title: 'Cross-step conditions',
      steps: [
        flagStep,
        {
          title: 'Step 2',
          schema: {
            type: 'object',
            properties: { detail: { type: 'string', title: 'Detail' } },
            dependencies: reasonDependency,
          },
        },
      ],
    };

    const renderStepper = async (manifest: TemplateParameterSchema) => {
      const onCreate = jest.fn();
      await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifest}
            extensions={[]}
            onCreate={onCreate}
            initialState={{}}
          />
        </SecretsContextProvider>,
      );
      return onCreate;
    };

    const clickButton = async (name: string) => {
      const button = await screen.findByRole('button', { name });
      await act(async () => {
        fireEvent.click(button);
      });
    };

    const clickButtons = async (...names: string[]) => {
      for (const name of names) {
        await clickButton(name);
      }
    };

    const toggle = async (name: string) => {
      const checkbox = await screen.findByRole('checkbox', { name });
      await act(async () => {
        fireEvent.click(checkbox);
      });
    };

    const fill = async (name: string, value: string) => {
      const textbox = await screen.findByRole('textbox', { name });
      await act(async () => {
        fireEvent.change(textbox, { target: { value } });
      });
    };

    const expectBlocked = () => {
      expect(
        screen.queryByRole('button', { name: 'Create' }),
      ).not.toBeInTheDocument();
    };

    it('shows, requires and drops a dependencies field from an earlier step', async () => {
      const onCreate = await renderStepper(reasonManifest);

      await clickButton('Next');
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument();

      await clickButton('Review');
      expect(
        await screen.findByRole('button', { name: 'Create' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await toggle('Flag');
      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Reason' }),
      ).toBeInTheDocument();

      await clickButton('Review');
      expectBlocked();

      await fill('Reason', 'because');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'because' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await toggle('Flag');
      await clickButtons('Next', 'Review');
      expect(
        await screen.findByRole('button', { name: 'Create' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'because' }),
      ).not.toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({ flag: false });
    });

    it('handles the oneOf form of dependencies across steps', async () => {
      const onCreate = await renderStepper({
        title: 'Cross-step conditions',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  title: 'Kind',
                  enum: ['service', 'library'],
                  'ui:widget': 'radio',
                },
              },
            },
          },
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: {},
              dependencies: {
                kind: {
                  oneOf: [
                    {
                      properties: {
                        kind: { const: 'service' },
                        port: { type: 'string', title: 'Port' },
                      },
                      required: ['port'],
                    },
                    {
                      properties: {
                        kind: { const: 'library' },
                        language: { type: 'string', title: 'Language' },
                      },
                      required: ['language'],
                    },
                  ],
                },
              },
            },
          },
        ],
      });

      const chooseKind = async (name: string) => {
        const radio = await screen.findByRole('radio', { name });
        await act(async () => {
          fireEvent.click(radio);
        });
      };

      await chooseKind('service');
      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Port' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Language' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();

      await clickButton('Review');
      expectBlocked();

      await fill('Port', '8080');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: '8080' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await chooseKind('library');
      await clickButton('Next');
      expect(
        screen.queryByRole('textbox', { name: 'Port' }),
      ).not.toBeInTheDocument();

      await fill('Language', 'go');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'go' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: '8080' }),
      ).not.toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({
        kind: 'library',
        language: 'go',
      });
    });

    it('resolves top-level if/then and if inside allOf across steps', async () => {
      const onCreate = await renderStepper({
        title: 'Cross-step conditions',
        steps: [
          flagStep,
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: {},
              if: flagIsOn,
              then: {
                properties: { reason: { type: 'string', title: 'Reason' } },
                required: ['reason'],
              },
              else: {
                properties: {
                  fallback: { type: 'string', title: 'Fallback' },
                },
                required: ['fallback'],
              },
              allOf: [
                {
                  if: flagIsOn,
                  then: {
                    properties: {
                      ticket: { type: 'string', title: 'Ticket' },
                    },
                    required: ['ticket'],
                  },
                },
              ],
            },
          },
        ],
      });

      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Fallback' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Ticket' }),
      ).not.toBeInTheDocument();

      await clickButton('Review');
      expectBlocked();

      await fill('Fallback', 'plan b');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'plan b' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await toggle('Flag');
      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Reason' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Fallback' }),
      ).not.toBeInTheDocument();

      await clickButton('Review');
      expectBlocked();

      await fill('Reason', 'because');
      await fill('Ticket', 'ABC-1');
      await clickButton('Review');
      expect(await screen.findByText('Reason')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'because' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'ABC-1' })).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await toggle('Flag');
      await clickButtons('Next', 'Review');
      expect(
        await screen.findByRole('cell', { name: 'plan b' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'because' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'ABC-1' }),
      ).not.toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({
        flag: false,
        fallback: 'plan b',
      });
    });

    it('keeps Review and onCreate in step for kept and mixed keys', async () => {
      const onCreate = await renderStepper({
        title: 'Cross-step conditions',
        steps: [
          flagStep,
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: { mode: { type: 'string', title: 'Mode' } },
              allOf: [
                {
                  if: flagIsOn,
                  then: {
                    properties: {
                      shared: { type: 'string', title: 'Shared' },
                    },
                  },
                },
                {
                  if: {
                    properties: {
                      flag: { const: true },
                      mode: { const: 'advanced' },
                    },
                    required: ['flag', 'mode'],
                  },
                  then: {
                    properties: {
                      mixed: { type: 'string', title: 'Mixed' },
                    },
                  },
                },
              ],
            },
          },
          {
            title: 'Step 3',
            schema: {
              type: 'object',
              properties: { shared: { type: 'string', title: 'Shared' } },
            },
          },
        ],
      });

      await toggle('Flag');
      await clickButton('Next');
      await fill('Mode', 'advanced');
      await fill('Mixed', 'mixed value');
      await fill('Shared', 'kept');
      await clickButtons('Next', 'Review');
      expect(
        await screen.findByRole('cell', { name: 'mixed value' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back', 'Back');
      await toggle('Flag');
      await clickButton('Next');
      expect(
        screen.queryByRole('textbox', { name: 'Mixed' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Shared' }),
      ).not.toBeInTheDocument();

      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Shared' }),
      ).toHaveValue('kept');

      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'kept' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'mixed value' }),
      ).not.toBeInTheDocument();

      const expected = { flag: false, mode: 'advanced', shared: 'kept' };
      expect(screen.getAllByRole('row')).toHaveLength(
        Object.keys(expected).length,
      );

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith(expected);
    });

    it('keeps same-step conditions and their stale values as they are today', async () => {
      const onCreate = await renderStepper({
        title: 'Cross-step conditions',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                withDetail: {
                  type: 'boolean',
                  title: 'With detail',
                  default: false,
                },
                withNote: {
                  type: 'boolean',
                  title: 'With note',
                  default: false,
                },
              },
              dependencies: {
                withDetail: {
                  oneOf: [
                    {
                      properties: {
                        withDetail: { const: true },
                        detail: { type: 'string', title: 'Detail' },
                      },
                    },
                    { properties: { withDetail: { const: false } } },
                  ],
                },
              },
              if: {
                properties: { withNote: { const: true } },
                required: ['withNote'],
              },
              then: {
                properties: { note: { type: 'string', title: 'Note' } },
              },
            },
          },
        ],
      });

      await toggle('With detail');
      await toggle('With note');
      await fill('Detail', 'stale detail');
      await fill('Note', 'stale note');

      await toggle('With detail');
      await toggle('With note');
      expect(
        screen.queryByRole('textbox', { name: 'Detail' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Note' }),
      ).not.toBeInTheDocument();

      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'stale detail' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('cell', { name: 'stale note' }),
      ).toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({
        withDetail: false,
        withNote: false,
        detail: 'stale detail',
        note: 'stale note',
      });
    });

    it('keeps earlier-step fields out of later steps', async () => {
      const OwnerField = ({
        formData,
      }: FieldExtensionComponentProps<string>) => (
        <input aria-label="Owner" value={formData ?? ''} readOnly />
      );
      const validation = jest.fn();
      const onCreate = jest.fn();

      const manifest: TemplateParameterSchema = {
        title: 'Cross-step conditions',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                flag: { type: 'boolean', title: 'Flag', default: false },
                owner: {
                  type: 'string',
                  title: 'Owner',
                  default: 'team-a',
                  'ui:field': 'OwnerField',
                },
              },
            },
          },
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              'ui:order': ['detail', 'reason'],
              properties: { detail: { type: 'string', title: 'Detail' } },
              dependencies: reasonDependency,
            },
          },
        ],
      };

      await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifest}
            extensions={[
              { name: 'OwnerField', component: OwnerField, validation },
            ]}
            onCreate={onCreate}
            initialState={{}}
          />
        </SecretsContextProvider>,
      );

      await toggle('Flag');
      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Detail' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Flag' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Owner' }),
      ).not.toBeInTheDocument();

      await fill('Reason', 'because');
      await clickButton('Review');
      expect(
        await screen.findAllByRole('cell', { name: 'team-a' }),
      ).toHaveLength(1);
      expect(screen.getAllByText('Flag')).toHaveLength(1);
      expect(screen.getAllByText('Owner')).toHaveLength(1);
      expect(validation).toHaveBeenCalledTimes(1);
      expect(validation.mock.calls[0][0]).toBe('team-a');

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({
        flag: true,
        owner: 'team-a',
        reason: 'because',
      });
    });

    it('restores a hidden value when its condition returns', async () => {
      const onCreate = await renderStepper(reasonManifest);

      await toggle('Flag');
      await clickButton('Next');
      await fill('Reason', 'because');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'because' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back');
      await toggle('Flag');
      await clickButton('Next');
      expect(
        screen.queryByRole('textbox', { name: 'Reason' }),
      ).not.toBeInTheDocument();

      await clickButton('Back');
      await toggle('Flag');
      await clickButton('Next');
      expect(
        await screen.findByRole('textbox', { name: 'Reason' }),
      ).toHaveValue('because');

      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'because' }),
      ).toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({
        flag: true,
        reason: 'because',
      });
    });

    it('re-evaluates chained conditions after going back', async () => {
      const onCreate = await renderStepper({
        title: 'Cross-step conditions',
        steps: [
          flagStep,
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: {},
              dependencies: reasonDependency,
            },
          },
          {
            title: 'Step 3',
            schema: {
              type: 'object',
              properties: {},
              dependencies: {
                reason: {
                  properties: { last: { type: 'string', title: 'Last' } },
                  required: ['last'],
                },
              },
            },
          },
        ],
      });

      await toggle('Flag');
      await clickButton('Next');
      await fill('Reason', 'because');
      await clickButton('Next');
      await fill('Last', 'final');
      await clickButton('Review');
      expect(
        await screen.findByRole('cell', { name: 'final' }),
      ).toBeInTheDocument();

      await clickButtons('Back', 'Back', 'Back');
      await toggle('Flag');
      await clickButtons('Next', 'Next');
      expect(
        screen.queryByRole('textbox', { name: 'Last' }),
      ).not.toBeInTheDocument();

      await clickButton('Review');
      expect(
        await screen.findByRole('button', { name: 'Create' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'because' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('cell', { name: 'final' }),
      ).not.toBeInTheDocument();

      await clickButton('Create');
      expect(onCreate).toHaveBeenCalledWith({ flag: false });
    });
  });
});
