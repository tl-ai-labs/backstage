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

import { ReviewState } from './ReviewState';
import { render, screen } from '@testing-library/react';
import { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';

describe('ReviewState', () => {
  it('should render the text as normal with no options', () => {
    const formState = {
      name: 'John Doe',
      test: 'bob',
    };

    const { getByRole } = render(
      <ReviewState formState={formState} schemas={[]} />,
    );

    expect(getByRole('row', { name: 'Name John Doe' })).toBeInTheDocument();
    expect(getByRole('row', { name: 'Test bob' })).toBeInTheDocument();
  });

  it('should mask password ui:fields', () => {
    const formState = {
      name: 'John Doe',
      test: 'bob',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'ui:widget': 'password',
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
        description: 'asd',
      },
    ];

    const { getByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(getByRole('row', { name: 'Name ******' })).toBeInTheDocument();
  });

  it('should hide from review if show is not set', async () => {
    const formState = {
      name: 'John Doe',
      test: 'bob',
      nest: {
        foo: 'bar',
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'ui:widget': 'password',
              'ui:backstage': {
                review: {
                  show: false,
                },
              },
            },
            nest: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  'ui:widget': 'password',
                  'ui:backstage': {
                    review: {
                      show: false,
                    },
                  },
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
        description: 'asd',
      },
    ];

    const { queryByRole, getAllByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );
    expect(getAllByRole('row').length).toEqual(1);
    expect(queryByRole('row', { name: 'Name ******' })).not.toBeInTheDocument();
    expect(queryByRole('row', { name: 'Foo ******' })).not.toBeInTheDocument();
  });

  it('should allow for masking an option with a set text', () => {
    const formState = {
      name: 'John Doe',
      test: 'bob',
      nest: {
        foo: 'bar',
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              'ui:widget': 'password',
              'ui:backstage': {
                review: {
                  mask: 'lols',
                },
              },
            },
            nest: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  'ui:widget': 'password',
                  'ui:backstage': {
                    review: {
                      mask: 'lols',
                    },
                  },
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
        description: 'asd',
      },
    ];

    const { getByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(getByRole('row', { name: 'Name lols' })).toBeInTheDocument();
    expect(getByRole('row', { name: 'Test bob' })).toBeInTheDocument();
    expect(getByRole('row', { name: 'Nest > Foo lols' })).toBeInTheDocument();
  });

  it('should display enum label from enumNames', async () => {
    const formState = {
      name: 'type2',
      nest: {
        foo: 'type2',
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: 'type1',
              enum: ['type1', 'type2', 'type3'],
              enumNames: ['Label-type1', 'Label-type2', 'Label-type3'],
            },
            nest: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  default: 'type1',
                  enum: ['type1', 'type2', 'type3'],
                  enumNames: ['Label-type1', 'Label-type2', 'Label-type3'],
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
        description: 'asd',
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(
      queryByRole('row', { name: 'Name Label-type2' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Nest > Foo Label-type2' }),
    ).toBeInTheDocument();
  });

  it('should display enum value if no corresponding enumNames', async () => {
    const formState = {
      name: 'type4',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: 'type1',
              enum: ['type1', 'type2', 'type3', 'type4'],
              enumNames: ['Label-type1', 'Label-type2', 'Label-type3'],
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
        description: 'asd',
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(queryByRole('row', { name: 'Name type4' })).toBeInTheDocument();
  });

  it('should display object in separate rows', async () => {
    const formState = {
      name: {
        foo: 'type3',
        bar: 'type4',
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  default: 'type1',
                },
                bar: {
                  type: 'string',
                  default: 'type2',
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(
      queryByRole('row', { name: 'Name > Foo type3' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Bar type4' }),
    ).toBeInTheDocument();
  });

  it('should display nested objects in separate rows', async () => {
    const formState = {
      name: {
        foo: 'type3',
        bar: 'type4',
        example: {
          test: 'type6',
          foo: 'type7',
        },
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  default: 'type1',
                },
                bar: {
                  type: 'string',
                  default: 'type2',
                },
                example: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                    foo: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(
      queryByRole('row', { name: 'Name > Foo type3' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Bar type4' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Example > Test type6' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Example > Foo type7' }),
    ).toBeInTheDocument();
  });

  it('should display partially nested objects', async () => {
    const formState = {
      name: {
        foo: 'type3',
        bar: 'type4',
        example: {
          test: 'type6',
        },
      },
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  default: 'type1',
                },
                bar: {
                  type: 'string',
                  default: 'type2',
                },
                example: {
                  type: 'object',
                  'ui:backstage': {
                    review: {
                      explode: false,
                    },
                  },
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(
      queryByRole('row', { name: 'Name > Foo type3' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Bar type4' }),
    ).toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Name > Example > Test type6' }),
    ).not.toBeInTheDocument();
  });

  it('should allow using the title property', async () => {
    const formState = {
      foo: 'test',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              title: 'Test Thing',
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(queryByRole('row', { name: 'Test Thing test' })).toBeInTheDocument();
  });

  it('should allow custom review name', async () => {
    const formState = {
      foo: 'test',
      providedAPIs: 'api1,api2',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              'ui:backstage': {
                review: {
                  name: 'Bar',
                },
              },
            },
            providedAPIs: {
              type: 'string',
              'ui:backstage': {
                review: {
                  name: 'Provided APIs',
                },
              },
            },
          },
        },
        schema: {},
        title: 'test',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    expect(queryByRole('row', { name: 'Bar test' })).toBeInTheDocument();
    expect(queryByRole('row', { name: 'Foo test' })).not.toBeInTheDocument();
    expect(
      queryByRole('row', { name: 'Provided APIs api1,api2' }),
    ).toBeInTheDocument();
  });

  it('should handle options in multiple schemas', async () => {
    const formState = {
      foo1: 'bar1',
      foo2: 'bar2',
      foo3: {
        foo4: 'bar4',
      },
      foo5: 'bar5',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            foo1: {
              type: 'string',
              'ui:backstage': {
                review: {
                  name: 'Test 1',
                },
              },
            },
          },
        },
        schema: {},
        title: 'Schema 1',
        uiSchema: {},
      },
      {
        mergedSchema: {
          type: 'object',
          properties: {
            foo2: {
              type: 'string',
              'ui:backstage': {
                review: {
                  name: 'Test 2',
                },
              },
            },
            foo3: {
              type: 'object',
              properties: {
                foo4: {
                  type: 'string',
                  'ui:backstage': {
                    review: {
                      name: 'Test 4',
                    },
                  },
                },
              },
            },
          },
        },
        schema: {},
        title: 'Schema 2',
        uiSchema: {},
      },
      {
        mergedSchema: {
          type: 'object',
          dependencies: {
            foo1: {
              oneOf: [
                {
                  properties: {
                    foo5: {
                      type: 'string',
                      'ui:backstage': {
                        review: {
                          name: 'Test 5',
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        schema: {},
        title: 'Schema 3',
        uiSchema: {},
      },
    ];

    const { queryByRole } = render(
      <ReviewState formState={formState} schemas={schemas} />,
    );

    // handles options in first schema
    expect(queryByRole('row', { name: 'Test 1 bar1' })).toBeInTheDocument();

    // handles options in second schema
    expect(queryByRole('row', { name: 'Test 2 bar2' })).toBeInTheDocument();

    // handles options for nested object in second schema
    expect(queryByRole('row', { name: 'Test 4 bar4' })).toBeInTheDocument();

    // handles options for property in dependencies in third schema
    expect(queryByRole('row', { name: 'Test 5 bar5' })).toBeInTheDocument();
  });

  it('should render active cross-step conditional fields and omit inactive ones in ReviewState', async () => {
    const formState = {
      choice: 'a',
      mode: 'off',
      kind: 'x',
      extra: 'e1',
      onlyOn: 'hidden-value',
      thenField: 't1',
      elseField: 'e2',
    };

    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            choice: { type: 'string', enum: ['a', 'b'] },
            mode: { type: 'string', enum: ['on', 'off'] },
            kind: { type: 'string', enum: ['x', 'y'] },
          },
        },
        schema: {},
        title: 'Schema 1',
        uiSchema: {},
      },
      {
        mergedSchema: {
          type: 'object',
          dependencies: {
            choice: {
              oneOf: [
                {
                  properties: {
                    choice: { enum: ['a'] },
                    extra: {
                      type: 'string',
                      title: 'Extra Field',
                    },
                  },
                },
                {
                  properties: {
                    choice: { enum: ['b'] },
                  },
                },
              ],
            },
            mode: {
              oneOf: [
                {
                  properties: {
                    mode: { enum: ['on'] },
                    onlyOn: {
                      type: 'string',
                      title: 'Only On Field',
                    },
                  },
                },
                {
                  properties: {
                    mode: { enum: ['off'] },
                  },
                },
              ],
            },
          },
          if: {
            properties: { kind: { const: 'x' } },
          },
          then: {
            properties: {
              thenField: {
                type: 'string',
                'ui:backstage': { review: { name: 'Then Field' } },
              },
            },
          },
          else: {
            properties: {
              elseField: {
                type: 'string',
                title: 'Else Field',
              },
            },
          },
        },
        schema: {},
        title: 'Schema 2',
        uiSchema: {},
      },
    ];

    render(<ReviewState formState={formState} schemas={schemas} />);

    // satisfied cross-step dependency renders with its schema title
    expect(
      screen.getByRole('row', { name: 'Extra Field e1' }),
    ).toBeInTheDocument();

    // satisfied if/then branch renders with its review options
    expect(
      screen.getByRole('row', { name: 'Then Field t1' }),
    ).toBeInTheDocument();

    // unsatisfied cross-step dependency is omitted
    expect(
      screen.queryByRole('row', { name: 'Only On Field hidden-value' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('hidden-value')).not.toBeInTheDocument();

    // unsatisfied else branch is omitted
    expect(
      screen.queryByRole('row', { name: 'Else Field e2' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('e2')).not.toBeInTheDocument();
  });

  it('should omit cross-step hidden fields while displaying same-step hidden fields with their formatted key', () => {
    const schemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            isMobileSdk: { type: 'boolean' },
            sameStepFlag: { type: 'boolean' },
          },
          dependencies: {
            sameStepFlag: {
              oneOf: [
                {
                  properties: {
                    sameStepFlag: { const: true },
                    sameStepExtra: {
                      type: 'string',
                      title: 'Same Step Extra Title',
                    },
                  },
                },
                {
                  properties: {
                    sameStepFlag: { const: false },
                  },
                },
              ],
            },
          },
        },
        schema: {},
        title: 'Step 1',
        uiSchema: {},
      },
      {
        mergedSchema: {
          type: 'object',
          dependencies: {
            isMobileSdk: {
              oneOf: [
                {
                  properties: {
                    isMobileSdk: { const: true },
                    sdkName: {
                      type: 'string',
                      title: 'SDK Name',
                    },
                  },
                },
                {
                  properties: {
                    isMobileSdk: { const: false },
                  },
                },
              ],
            },
          },
        },
        schema: {},
        title: 'Step 2',
        uiSchema: {},
      },
    ];

    const { rerender } = render(
      <ReviewState
        schemas={schemas}
        formState={{
          isMobileSdk: false,
          sameStepFlag: false,
          sameStepExtra: 'kept-value',
          sdkName: 'hidden-sdk',
        }}
      />,
    );

    expect(screen.queryByText('SDK Name')).toBeNull();
    expect(screen.queryByText('hidden-sdk')).toBeNull();
    expect(screen.getByText('Same Step Extra')).toBeInTheDocument();
    expect(screen.getByText('kept-value')).toBeInTheDocument();

    rerender(
      <ReviewState
        schemas={schemas}
        formState={{
          isMobileSdk: true,
          sameStepFlag: false,
          sameStepExtra: 'kept-value',
          sdkName: 'hidden-sdk',
        }}
      />,
    );

    expect(screen.getByText('SDK Name')).toBeInTheDocument();
    expect(screen.getByText('hidden-sdk')).toBeInTheDocument();
    expect(screen.getByText('Same Step Extra')).toBeInTheDocument();
    expect(screen.getByText('kept-value')).toBeInTheDocument();
  });
});
