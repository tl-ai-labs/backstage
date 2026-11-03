/*
 * Copyright 2020 The Backstage Authors
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

import { JsonObject } from '@backstage/types';
import {
  collectCrossStepHiddenKeys,
  extractSchemaFromStep,
  resolveConditionalSchema,
  resolveStepSchema,
} from './schema';

describe('extractSchemaFromStep', () => {
  it('transforms deep schema', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      'ui:welp': 'warp',
      properties: {
        field1: {
          type: 'string',
          'ui:derp': 'herp',
        },
        field2: {
          type: 'object',
          properties: {
            fieldX: {
              type: 'string',
              'ui:derp': 'xerp',
            },
          },
        },
      },
    };
    const expectedSchema = {
      type: 'object',
      properties: {
        field1: {
          type: 'string',
        },
        field2: {
          type: 'object',
          properties: {
            fieldX: {
              type: 'string',
            },
          },
        },
      },
    };
    const expectedUiSchema = {
      'ui:welp': 'warp',
      field1: {
        'ui:derp': 'herp',
      },
      field2: {
        fieldX: {
          'ui:derp': 'xerp',
        },
      },
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });

  it('transforms schema with anyOf fields', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      anyOf: [
        {
          properties: {
            field3: {
              type: 'string',
              default: 'Value 1',
              'ui:readonly': true,
            },
          },
        },
        {
          properties: {
            field3: {
              type: 'string',
              default: 'Value 2',
              'ui:readonly': true,
            },
          },
        },
      ],
      oneOf: [
        {
          properties: {
            field4: {
              type: 'string',
              default: 'Value 1',
              'ui:readonly': true,
            },
          },
        },
      ],
      allOf: [
        {
          properties: {
            field5: {
              type: 'string',
              default: 'Value 1',
              'ui:readonly': true,
            },
          },
        },
      ],
      properties: {
        field1: {
          type: 'object',
          anyOf: [
            {
              properties: {
                field3: {
                  type: 'string',
                  default: 'Value 1',
                  'ui:readonly': true,
                },
              },
            },
            {
              properties: {
                field3: {
                  type: 'string',
                  default: 'Value 2',
                  'ui:readonly': true,
                },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                field4: {
                  type: 'string',
                  default: 'Value 1',
                  'ui:readonly': true,
                },
              },
            },
          ],
          allOf: [
            {
              properties: {
                field5: {
                  type: 'string',
                  default: 'Value 1',
                  'ui:readonly': true,
                },
              },
            },
          ],
        },
        field2: {
          type: 'string',
          'ui:derp': 'xerp',
        },
      },
    };
    const expectedSchema = {
      type: 'object',
      anyOf: [
        {
          properties: {
            field3: {
              type: 'string',
              default: 'Value 1',
            },
          },
        },
        {
          properties: {
            field3: {
              type: 'string',
              default: 'Value 2',
            },
          },
        },
      ],
      oneOf: [
        {
          properties: {
            field4: {
              type: 'string',
              default: 'Value 1',
            },
          },
        },
      ],
      allOf: [
        {
          properties: {
            field5: {
              type: 'string',
              default: 'Value 1',
            },
          },
        },
      ],
      properties: {
        field1: {
          type: 'object',
          anyOf: [
            {
              properties: {
                field3: {
                  type: 'string',
                  default: 'Value 1',
                },
              },
            },
            {
              properties: {
                field3: {
                  type: 'string',
                  default: 'Value 2',
                },
              },
            },
          ],
          oneOf: [
            {
              properties: {
                field4: {
                  type: 'string',
                  default: 'Value 1',
                },
              },
            },
          ],
          allOf: [
            {
              properties: {
                field5: {
                  type: 'string',
                  default: 'Value 1',
                },
              },
            },
          ],
        },
        field2: {
          type: 'string',
        },
      },
    };
    const expectedUiSchema = {
      field3: {
        'ui:readonly': true,
      },
      field4: {
        'ui:readonly': true,
      },
      field5: {
        'ui:readonly': true,
      },
      field1: {
        field3: {
          'ui:readonly': true,
        },
        field4: {
          'ui:readonly': true,
        },
        field5: {
          'ui:readonly': true,
        },
      },
      field2: {
        'ui:derp': 'xerp',
      },
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });

  it('transforms schema with dependencies', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        credit_card: {
          type: 'number',
        },
      },
      required: ['name'],
      dependencies: {
        credit_card: {
          properties: {
            billing_address: {
              type: 'string',
              'ui:widget': 'textarea',
            },
          },
          required: ['billing_address'],
        },
      },
    };
    const expectedSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        credit_card: {
          type: 'number',
        },
      },
      required: ['name'],
      dependencies: {
        credit_card: {
          properties: {
            billing_address: {
              type: 'string',
            },
          },
          required: ['billing_address'],
        },
      },
    };
    const expectedUiSchema = {
      billing_address: {
        'ui:widget': 'textarea',
      },
      credit_card: {},
      name: {},
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });

  it('transforms schema with array items', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        person: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              address: {
                type: 'string',
                'ui:widget': 'textarea',
              },
            },
          },
        },
        accountNumber: {
          type: 'number',
        },
      },
    };
    const expectedSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              address: {
                type: 'string',
              },
            },
          },
        },
        accountNumber: {
          type: 'number',
        },
      },
    };
    const expectedUiSchema = {
      accountNumber: {},
      person: {
        items: {
          name: {},
          address: {
            'ui:widget': 'textarea',
          },
        },
      },
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });

  it('doesnt override existing uiSchema with things from dependencies', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      title:
        "Field 2 depend on field 1, field 1 is a radio button but it's visible as a field",
      required: ['exampleField1'],
      properties: {
        exampleField0: {
          title: 'Radio button that is not a dependency',
          type: 'string',
          enum: ['foo', 'bar'],
          'ui:widget': 'radio',
        },
        exampleField1: {
          title: 'Radio button input that is a dependency',
          type: 'string',
          enum: ['visible', 'hidden'],
          'ui:widget': 'radio',
        },
      },
      dependencies: {
        exampleField1: {
          oneOf: [
            {
              properties: {
                exampleField1: {
                  enum: ['visible'],
                },
                exampleField2: {
                  title: 'FIELD 2',
                  type: 'string',
                  description: 'Explanation',
                },
              },
            },
            {
              properties: {
                exampleField1: {
                  enum: ['hidden'],
                },
              },
            },
          ],
        },
      },
    };

    const expectedSchema = {
      type: 'object',
      title:
        "Field 2 depend on field 1, field 1 is a radio button but it's visible as a field",
      required: ['exampleField1'],
      properties: {
        exampleField0: {
          title: 'Radio button that is not a dependency',
          type: 'string',
          enum: ['foo', 'bar'],
        },
        exampleField1: {
          title: 'Radio button input that is a dependency',
          type: 'string',
          enum: ['visible', 'hidden'],
        },
      },
      dependencies: {
        exampleField1: {
          oneOf: [
            {
              properties: {
                exampleField1: {
                  enum: ['visible'],
                },
                exampleField2: {
                  title: 'FIELD 2',
                  type: 'string',
                  description: 'Explanation',
                },
              },
            },
            {
              properties: {
                exampleField1: {
                  enum: ['hidden'],
                },
              },
            },
          ],
        },
      },
    };

    const expectedUiSchema = {
      exampleField0: {
        'ui:widget': 'radio',
      },
      exampleField1: {
        'ui:widget': 'radio',
      },
      exampleField2: {},
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });

  it('transforms conditional schema', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        flag: {
          type: 'boolean',
        },
      },
      if: {
        properties: {
          flag: {
            const: true,
          },
        },
      },
      then: {
        properties: {
          user: {
            type: 'string',
            'ui:field': 'EntityPicker',
            'ui:options': {
              catalogFilter: [{ kind: 'User' }],
            },
          },
        },
      },
      else: {
        properties: {
          email: {
            type: 'string',
          },
        },
      },
    };
    const expectedSchema = {
      type: 'object',
      properties: {
        flag: {
          type: 'boolean',
        },
      },
      if: {
        properties: {
          flag: {
            const: true,
          },
        },
      },
      then: {
        properties: {
          user: {
            type: 'string',
          },
        },
      },
      else: {
        properties: {
          email: {
            type: 'string',
          },
        },
      },
    };
    const expectedUiSchema = {
      flag: {},
      user: {
        'ui:field': 'EntityPicker',
        'ui:options': {
          catalogFilter: [{ kind: 'User' }],
        },
      },
      email: {},
    };

    expect(extractSchemaFromStep(inputSchema)).toEqual({
      schema: expectedSchema,
      uiSchema: expectedUiSchema,
    });
  });
});

describe('resolveConditionalSchema and collectCrossStepHiddenKeys', () => {
  type Step = Parameters<typeof collectCrossStepHiddenKeys>[0][number];

  const makeStep = (mergedSchema: JsonObject): Step => {
    const { schema, uiSchema } = extractSchemaFromStep(mergedSchema);
    return {
      title: 'Step',
      mergedSchema,
      schema,
      uiSchema,
    } as unknown as Step;
  };

  it('resolves cross-step dependencies and if/then/else when condition is satisfied or unsatisfied', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        local: { type: 'string' },
      },
      dependencies: {
        choice: {
          oneOf: [
            {
              properties: {
                choice: { enum: ['a'] },
                extraA: { type: 'string' },
              },
              required: ['extraA'],
            },
            {
              properties: {
                choice: { enum: ['b'] },
                extraB: { type: 'string' },
              },
            },
          ],
        },
        local: {
          properties: {
            localExtra: { type: 'string' },
          },
        },
      },
      allOf: [
        {
          if: { properties: { mode: { const: 'x' } } },
          then: {
            properties: { allOfThen: { type: 'string' } },
            required: ['allOfThen'],
          },
        },
      ],
      if: { properties: { toggle: { const: true } } },
      then: { properties: { thenField: { type: 'string' } } },
      else: { properties: { elseField: { type: 'string' } } },
    };
    const prior = new Set(['choice', 'mode', 'toggle']);

    const satisfied = resolveConditionalSchema(
      schema,
      { choice: 'a', mode: 'x', toggle: true },
      prior,
    );
    const props = satisfied.properties as JsonObject;
    expect(props.extraA).toEqual({ type: 'string' });
    expect(props.extraB).toBeUndefined();
    expect(props.allOfThen).toEqual({ type: 'string' });
    expect(props.thenField).toEqual({ type: 'string' });
    expect(props.elseField).toBeUndefined();
    expect(satisfied.required).toEqual(
      expect.arrayContaining(['extraA', 'allOfThen']),
    );
    expect(satisfied.if).toBeUndefined();
    expect(satisfied.then).toBeUndefined();
    expect(satisfied.else).toBeUndefined();
    expect(satisfied.allOf).toBeUndefined();
    expect(satisfied.dependencies).toEqual({
      local: { properties: { localExtra: { type: 'string' } } },
    });

    const unsatisfied = resolveConditionalSchema(
      schema,
      { choice: 'b', mode: 'y', toggle: false },
      prior,
    );
    const props2 = unsatisfied.properties as JsonObject;
    expect(props2.extraA).toBeUndefined();
    expect(props2.extraB).toEqual({ type: 'string' });
    expect(props2.allOfThen).toBeUndefined();
    expect(props2.thenField).toBeUndefined();
    expect(props2.elseField).toEqual({ type: 'string' });
    expect(unsatisfied.required ?? []).not.toContain('extraA');

    const sameStep: JsonObject = {
      type: 'object',
      properties: { flag: { type: 'boolean' } },
      if: { properties: { flag: { const: true } } },
      then: { properties: { more: { type: 'string' } } },
    };
    expect(resolveConditionalSchema(sameStep, {}, new Set())).toEqual(sameStep);

    const step = makeStep(schema);
    const resolved = resolveStepSchema(
      step,
      { choice: 'a', mode: 'y', toggle: false },
      prior,
    );
    const resolvedProps = (resolved.schema as JsonObject)
      .properties as JsonObject;
    expect(resolvedProps.extraA).toBeDefined();
    expect(resolvedProps.elseField).toBeDefined();
    expect(resolvedProps.thenField).toBeUndefined();
  });

  it('collects only cross-step hidden keys and preserves same-step hidden keys', () => {
    const step1 = makeStep({
      type: 'object',
      properties: {
        toggle: { type: 'boolean' },
        sameFlag: { type: 'boolean' },
      },
      if: { properties: { sameFlag: { const: true } } },
      then: { properties: { sameField: { type: 'string' } } },
    });
    const step2 = makeStep({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      if: { properties: { toggle: { const: true } } },
      then: { properties: { crossField: { type: 'string' } } },
    });

    const hidden = collectCrossStepHiddenKeys([step1, step2], {
      toggle: false,
      sameFlag: false,
    });
    expect(hidden.has('crossField')).toBe(true);
    expect(hidden.has('sameField')).toBe(false);
    expect(hidden.has('name')).toBe(false);

    const visible = collectCrossStepHiddenKeys([step1, step2], {
      toggle: true,
      sameFlag: false,
    });
    expect(visible.has('crossField')).toBe(false);
  });
});
