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
  extractSchemaFromStep,
  getConditionalPropertyNames,
  getCrossStepConditions,
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

  it('keeps ui options of fields declared in cross-step conditional branches', () => {
    const inputSchema: JsonObject = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
      },
      allOf: [
        {
          if: {
            properties: {
              isMobileSdk: {
                const: true,
              },
            },
            required: ['isMobileSdk'],
          },
          then: {
            properties: {
              sdkName: {
                type: 'string',
                'ui:help': 'Package name',
              },
            },
          },
        },
      ],
      dependencies: {
        isMobileSdk: {
          oneOf: [
            {
              properties: {
                isMobileSdk: {
                  const: true,
                },
                sdkPlatform: {
                  type: 'string',
                  enum: ['android', 'ios'],
                  'ui:widget': 'radio',
                },
              },
            },
          ],
        },
      },
    };

    const { schema, uiSchema } = extractSchemaFromStep(inputSchema);

    expect(uiSchema).toMatchObject({
      sdkName: { 'ui:help': 'Package name' },
      sdkPlatform: { 'ui:widget': 'radio' },
    });

    const allOfItem = (schema.allOf as JsonObject[])[0];
    const thenProps = (allOfItem.then as JsonObject).properties as JsonObject;
    const sdkNameProp = thenProps.sdkName as JsonObject;
    const hasThenUi = Object.keys(sdkNameProp).some(k => k.startsWith('ui:'));
    expect(hasThenUi).toBe(false);

    const depBranch = (
      (schema.dependencies as JsonObject).isMobileSdk as JsonObject
    ).oneOf as JsonObject[];
    const sdkPlatformProp = (depBranch[0].properties as JsonObject)
      .sdkPlatform as JsonObject;
    const hasBranchUi = Object.keys(sdkPlatformProp).some(k =>
      k.startsWith('ui:'),
    );
    expect(hasBranchUi).toBe(false);
  });
});

describe('getConditionalPropertyNames', () => {
  it('should list properties declared only inside conditional branches', () => {
    const schema1: JsonObject = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
      },
      allOf: [
        {
          if: {
            properties: {
              flag: {
                const: true,
              },
            },
          },
          then: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
          else: {
            properties: {
              reason: {
                type: 'string',
              },
            },
          },
        },
      ],
      anyOf: [
        {
          properties: {
            extra: {
              type: 'string',
            },
          },
        },
      ],
      dependencies: {
        isMobileSdk: {
          oneOf: [
            {
              properties: {
                isMobileSdk: {
                  const: true,
                },
                sdkPlatform: {
                  type: 'string',
                },
              },
            },
          ],
        },
        team: ['owner'],
      },
    };

    const schema2: JsonObject = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
      },
    };

    expect([...getConditionalPropertyNames(schema1)].sort()).toEqual([
      'extra',
      'isMobileSdk',
      'reason',
      'sdkName',
      'sdkPlatform',
    ]);
    expect(getConditionalPropertyNames(schema2)).toEqual([]);
  });
});

describe('getCrossStepConditions', () => {
  it('should tell cross-step conditions apart from same-step ones', () => {
    const schema1: JsonObject = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        hasNotes: {
          type: 'boolean',
        },
      },
      allOf: [
        {
          if: {
            properties: {
              hasNotes: {
                const: true,
              },
            },
            required: ['hasNotes'],
          },
          then: {
            properties: {
              notes: {
                type: 'string',
              },
            },
          },
        },
        {
          if: {
            properties: {
              isMobileSdk: {
                const: true,
              },
            },
            required: ['isMobileSdk'],
          },
          then: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
          else: {
            properties: {
              reason: {
                type: 'string',
              },
            },
          },
        },
      ],
      dependencies: {
        description: {
          properties: {
            summary: {
              type: 'string',
            },
          },
        },
        region: {
          oneOf: [
            {
              properties: {
                region: {
                  const: 'eu',
                },
                zone: {
                  type: 'string',
                },
              },
            },
          ],
        },
        team: ['owner'],
      },
    };

    const schema2: JsonObject = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
        },
        hasNotes: {
          type: 'boolean',
        },
      },
      allOf: [
        {
          if: {
            properties: {
              hasNotes: {
                const: true,
              },
            },
            required: ['hasNotes'],
          },
          then: {
            properties: {
              notes: {
                type: 'string',
              },
            },
          },
        },
      ],
      dependencies: {
        description: {
          properties: {
            summary: {
              type: 'string',
            },
          },
        },
      },
    };

    const res1 = getCrossStepConditions(schema1);
    expect([...res1.keys].sort()).toEqual(['isMobileSdk', 'region']);
    expect([...res1.fields].sort()).toEqual(['reason', 'sdkName', 'zone']);
    expect([...res1.reads].sort()).toEqual(['isMobileSdk', 'region', 'zone']);

    const res2 = getCrossStepConditions(schema2);
    expect(res2).toEqual({ keys: [], fields: [], reads: [] });
  });

  it('should list same-step names read by a mixed cross-step condition', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
        },
      },
      allOf: [
        {
          if: {
            properties: {
              isMobileSdk: {
                const: true,
              },
              kind: {
                const: 'library',
              },
            },
            required: ['isMobileSdk', 'kind'],
          },
          then: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
        },
      ],
    };

    const res = getCrossStepConditions(schema);
    expect(res.keys).toEqual(['isMobileSdk']);
    expect(res.reads).toContain('isMobileSdk');
    expect(res.reads).toContain('kind');
    expect(res.fields).toEqual(['sdkName']);
  });
});
