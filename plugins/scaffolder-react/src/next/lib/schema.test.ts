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
import { extractSchemaFromStep, liftCrossStepDependencies } from './schema';

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

describe('liftCrossStepDependencies', () => {
  it('leaves schemas without cross-step dependencies untouched', () => {
    const sameStepSchema: JsonObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      dependencies: {
        name: ['other'],
      },
    };
    const noPropsSchema: JsonObject = {
      type: 'object',
      dependencies: {
        isMobile: ['name'],
      },
    };
    const noDepsSchema: JsonObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    expect(liftCrossStepDependencies(sameStepSchema)).toBe(sameStepSchema);
    expect(liftCrossStepDependencies(noPropsSchema)).toBe(noPropsSchema);
    expect(liftCrossStepDependencies(noDepsSchema)).toBe(noDepsSchema);
  });

  it('lifts array and plain schema dependencies on an earlier-step key', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      allOf: [
        {
          properties: {
            existing: { type: 'string' },
          },
        },
      ],
      dependencies: {
        isMobile: ['name'],
        platform: {
          properties: {
            sdkName: {
              type: 'string',
              'ui:widget': 'textarea',
            },
          },
          required: ['sdkName'],
        },
      },
    };
    const inputClone = structuredClone(inputSchema);

    const result = liftCrossStepDependencies(inputSchema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      allOf: [
        {
          properties: {
            existing: { type: 'string' },
          },
        },
        {
          if: { required: ['isMobile'] },
          then: { required: ['name'] },
        },
        {
          if: { required: ['platform'] },
          then: {
            properties: {
              sdkName: {
                type: 'string',
                'ui:widget': 'textarea',
              },
            },
            required: ['sdkName'],
          },
        },
      ],
    });
    expect(result).not.toHaveProperty('dependencies');
    expect(inputSchema).toEqual(inputClone);
  });

  it('lifts oneOf dependency branches into one if/then per branch', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      dependencies: {
        isMobile: {
          oneOf: [
            {
              properties: {
                isMobile: { const: true },
                sdkName: { type: 'string' },
              },
              required: ['sdkName'],
            },
            {
              properties: {
                isMobile: { const: false },
              },
            },
            {
              properties: {
                other: { type: 'string' },
              },
            },
          ],
        },
        name: ['isMobile'],
      },
    };

    const result = liftCrossStepDependencies(inputSchema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      dependencies: {
        name: ['isMobile'],
      },
      allOf: [
        {
          if: {
            properties: { isMobile: { const: true } },
            required: ['isMobile'],
          },
          then: {
            properties: { sdkName: { type: 'string' } },
            required: ['sdkName'],
          },
        },
        {
          if: {
            properties: { isMobile: { const: false } },
            required: ['isMobile'],
          },
          then: {
            properties: {},
          },
        },
      ],
    });
  });

  it('keeps ui options of lifted branches extractable', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        repoUrl: { type: 'string' },
      },
      dependencies: {
        owner: {
          oneOf: [
            {
              properties: {
                owner: { const: 'custom' },
                entity: {
                  type: 'string',
                  'ui:field': 'EntityPicker',
                },
              },
            },
          ],
        },
      },
    };

    const lifted = liftCrossStepDependencies(inputSchema);
    const extracted = extractSchemaFromStep(lifted);

    expect(extracted.uiSchema).toEqual({
      repoUrl: {},
      entity: {
        'ui:field': 'EntityPicker',
      },
    });

    const liftedThenProperties = (
      (lifted.allOf as JsonObject[])[0].then as JsonObject
    ).properties as JsonObject;
    expect(liftedThenProperties.entity).toHaveProperty('ui:field');

    const extractedThenProperties = (
      (extracted.schema.allOf as JsonObject[])[0].then as JsonObject
    ).properties as JsonObject;
    expect(extractedThenProperties.entity).not.toHaveProperty('ui:field');
  });
});
