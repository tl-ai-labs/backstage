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

  describe('cross-step conditional fields', () => {
    beforeEach(() => {
      window.history.replaceState({}, '', '/');
    });

    const mobileSdkManifest: TemplateParameterSchema = {
      title: 'Mobile SDK Form',
      steps: [
        {
          title: 'Step 1',
          schema: {
            type: 'object',
            properties: {
              mobile: {
                type: 'boolean',
                title: 'Is this a mobile SDK?',
              },
            },
          },
        },
        {
          title: 'Step 2',
          schema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                title: 'Repo',
              },
            },
            dependencies: {
              mobile: {
                oneOf: [
                  {
                    properties: {
                      mobile: {
                        const: true,
                      },
                      sdkName: {
                        type: 'string',
                        title: 'SDK Name',
                      },
                    },
                    required: ['sdkName'],
                  },
                  {
                    properties: {
                      mobile: {
                        const: false,
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

    it('should show a step 2 field only when the step 1 flag is set', async () => {
      const { getByRole, queryByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={mobileSdkManifest}
            onCreate={jest.fn()}
            extensions={[]}
          />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      expect(getByRole('textbox', { name: 'Repo' })).toBeInTheDocument();
      expect(
        queryByRole('textbox', { name: 'SDK Name' }),
      ).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Back' }));
      });

      await act(async () => {
        fireEvent.click(
          getByRole('checkbox', { name: 'Is this a mobile SDK?' }),
        );
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      expect(getByRole('textbox', { name: 'Repo' })).toBeInTheDocument();
      expect(getByRole('textbox', { name: 'SDK Name' })).toBeInTheDocument();
    });

    it('should apply the conditional required rule only when the flag is set', async () => {
      const { getByRole, queryByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={mobileSdkManifest}
            onCreate={jest.fn()}
            extensions={[]}
          />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      await act(async () => {
        fireEvent.change(getByRole('textbox', { name: 'Repo' }), {
          target: { value: 'my-org/my-repo' },
        });
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      expect(getByRole('button', { name: 'Create' })).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Back' }));
      });
      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Back' }));
      });

      await act(async () => {
        fireEvent.click(
          getByRole('checkbox', { name: 'Is this a mobile SDK?' }),
        );
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      expect(queryByRole('button', { name: 'Create' })).not.toBeInTheDocument();
      expect(getByRole('textbox', { name: 'SDK Name' })).toBeInTheDocument();

      await act(async () => {
        fireEvent.change(getByRole('textbox', { name: 'SDK Name' }), {
          target: { value: 'MySDK' },
        });
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      expect(getByRole('button', { name: 'Create' })).toBeInTheDocument();
    });

    it('should drop the dependent answer from the review step and the payload when the governing answer changes back', async () => {
      const onCreate = jest.fn();

      const { getByRole, queryByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={mobileSdkManifest}
            onCreate={onCreate}
            extensions={[]}
          />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(
          getByRole('checkbox', { name: 'Is this a mobile SDK?' }),
        );
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      await act(async () => {
        fireEvent.change(getByRole('textbox', { name: 'Repo' }), {
          target: { value: 'my-org/my-repo' },
        });
        fireEvent.change(getByRole('textbox', { name: 'SDK Name' }), {
          target: { value: 'MySDK' },
        });
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      expect(getByRole('cell', { name: 'MySDK' })).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Back' }));
      });
      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Back' }));
      });

      await act(async () => {
        fireEvent.click(
          getByRole('checkbox', { name: 'Is this a mobile SDK?' }),
        );
        fireEvent.click(getByRole('button', { name: 'Next' }));
      });

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      expect(queryByRole('cell', { name: 'MySDK' })).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Create' }));
      });

      expect(onCreate).toHaveBeenCalledWith({
        mobile: false,
        repo: 'my-org/my-repo',
      });
    });

    it('should not render a property whose feature flag is inactive', async () => {
      const manifestWithFeatureFlag: TemplateParameterSchema = {
        title: 'Feature Flag Form',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                flaggedField: {
                  type: 'string',
                  title: 'Flagged Field',
                  'ui:backstage': {
                    featureFlag: 'test-inactive-flag',
                  },
                },
                unflaggedField: {
                  type: 'string',
                  title: 'Unflagged Field',
                },
              },
            },
          },
        ],
      };

      const { getByRole, queryByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifestWithFeatureFlag}
            onCreate={jest.fn()}
            extensions={[]}
          />
        </SecretsContextProvider>,
      );

      expect(
        getByRole('textbox', { name: 'Unflagged Field' }),
      ).toBeInTheDocument();
      expect(
        queryByRole('textbox', { name: 'Flagged Field' }),
      ).not.toBeInTheDocument();
    });

    it('should retain same-step conditional value across keystrokes and through submission', async () => {
      const sameStepManifest: TemplateParameterSchema = {
        title: 'Same Step Conditional Form',
        steps: [
          {
            title: 'Payment Details',
            schema: {
              type: 'object',
              properties: {
                creditCard: {
                  type: 'boolean',
                  title: 'Pay with credit card',
                },
              },
              dependencies: {
                creditCard: {
                  properties: {
                    billingAddress: {
                      type: 'string',
                      title: 'Billing address',
                    },
                  },
                  required: ['billingAddress'],
                },
              },
            },
          },
        ],
      };

      const onCreate = jest.fn();

      const { getByRole } = await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={sameStepManifest}
            onCreate={onCreate}
            extensions={[]}
          />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(
          getByRole('checkbox', { name: 'Pay with credit card' }),
        );
      });

      const billingInput = getByRole('textbox', { name: 'Billing address' });
      expect(billingInput).toBeInTheDocument();

      await act(async () => {
        fireEvent.change(billingInput, {
          target: { value: '123 Main St' },
        });
      });

      expect(billingInput).toHaveValue('123 Main St');

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Review' }));
      });

      await act(async () => {
        fireEvent.click(getByRole('button', { name: 'Create' }));
      });

      expect(onCreate).toHaveBeenCalledWith({
        creditCard: true,
        billingAddress: '123 Main St',
      });
    });

    it('should invoke field extension validation callback on step progression', async () => {
      const validateSpy = jest.fn();
      const FieldExtension = ({
        formData,
        onChange,
      }: FieldExtensionComponentProps<string>) => (
        <input
          aria-label="Custom Field"
          type="text"
          value={formData ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );

      const manifest: TemplateParameterSchema = {
        title: 'Validation Form',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                custom: {
                  type: 'string',
                  title: 'Custom Field',
                  'ui:field': 'CustomField',
                },
              },
            },
          },
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: {
                repo: {
                  type: 'string',
                  title: 'Repo',
                },
              },
            },
          },
        ],
      };

      await renderInTestApp(
        <SecretsContextProvider>
          <Stepper
            manifest={manifest}
            extensions={[
              {
                name: 'CustomField',
                component: FieldExtension,
                validation: validateSpy,
              },
            ]}
            onCreate={jest.fn()}
          />
        </SecretsContextProvider>,
      );

      const input = await screen.findByRole('textbox', {
        name: 'Custom Field',
      });
      await act(async () => {
        fireEvent.change(input, { target: { value: 'some value' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      });

      expect(validateSpy).toHaveBeenCalled();
    });

    it('should not render a feature-flagged-off property inside a cross-step then branch', async () => {
      const manifest: TemplateParameterSchema = {
        title: 'Flagged Then Form',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                enableFeature: {
                  type: 'boolean',
                  title: 'Enable Feature',
                },
              },
            },
          },
          {
            title: 'Step 2',
            schema: {
              type: 'object',
              properties: {},
              if: {
                properties: {
                  enableFeature: { const: true },
                },
              },
              then: {
                properties: {
                  flaggedThenField: {
                    type: 'string',
                    title: 'Flagged Then Field',
                    'ui:backstage': {
                      featureFlag: 'test-inactive-flag',
                    },
                  },
                  unflaggedThenField: {
                    type: 'string',
                    title: 'Unflagged Then Field',
                  },
                },
              },
            },
          },
        ],
      };

      await renderInTestApp(
        <SecretsContextProvider>
          <Stepper manifest={manifest} onCreate={jest.fn()} extensions={[]} />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(
          await screen.findByRole('checkbox', { name: 'Enable Feature' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      });

      expect(
        await screen.findByRole('textbox', { name: 'Unflagged Then Field' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Flagged Then Field' }),
      ).not.toBeInTheDocument();
    });

    it('should not render a feature-flagged-off property inside a dependencies subschema', async () => {
      const manifest: TemplateParameterSchema = {
        title: 'Flagged Dep Form',
        steps: [
          {
            title: 'Step 1',
            schema: {
              type: 'object',
              properties: {
                enableFeature: {
                  type: 'boolean',
                  title: 'Enable Feature',
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
                enableFeature: {
                  oneOf: [
                    {
                      properties: {
                        enableFeature: { const: true },
                        flaggedDepField: {
                          type: 'string',
                          title: 'Flagged Dep Field',
                          'ui:backstage': {
                            featureFlag: 'test-inactive-flag',
                          },
                        },
                        unflaggedDepField: {
                          type: 'string',
                          title: 'Unflagged Dep Field',
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

      await renderInTestApp(
        <SecretsContextProvider>
          <Stepper manifest={manifest} onCreate={jest.fn()} extensions={[]} />
        </SecretsContextProvider>,
      );

      await act(async () => {
        fireEvent.click(
          await screen.findByRole('checkbox', { name: 'Enable Feature' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      });

      expect(
        await screen.findByRole('textbox', { name: 'Unflagged Dep Field' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('textbox', { name: 'Flagged Dep Field' }),
      ).not.toBeInTheDocument();
    });
  });
});
