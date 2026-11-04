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
  getSchemaPropertyKeys,
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

  it('collects property keys from conditional branches while ignoring pure discriminators and if blocks', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        baseField: { type: 'string' },
      },
      if: {
        properties: {
          ifOnlyField: { const: 'yes' },
        },
        required: ['ifOnlyField'],
      },
      then: {
        properties: {
          thenField: { type: 'string' },
        },
      },
      else: {
        properties: {
          elseField: { type: 'string' },
        },
      },
      dependencies: {
        controlProp: {
          oneOf: [
            {
              properties: {
                controlProp: { enum: ['a'] },
                depFieldA: { type: 'string', title: 'Dep A' },
              },
            },
          ],
        },
      },
      allOf: [
        {
          properties: {
            allOfField: { type: 'number' },
          },
        },
      ],
      oneOf: [
        {
          properties: {
            discriminator: { const: 'mode1' },
            oneOfField: { type: 'boolean' },
          },
        },
      ],
      anyOf: [
        {
          properties: {
            anyOfField: { type: 'string' },
          },
        },
      ],
    };

    expect(Array.from(getSchemaPropertyKeys(schema))).toEqual([
      'baseField',
      'thenField',
      'elseField',
      'allOfField',
      'anyOfField',
      'oneOfField',
      'depFieldA',
    ]);
  });

  it('resolves cross-step if/then/else when required condition on earlier step is met or unmet', () => {
    const stepSchema: JsonObject = {
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
      },
      if: {
        properties: {
          toggle: { const: true },
        },
        required: ['toggle'],
      },
      then: {
        properties: {
          conditionalField: { type: 'string' },
        },
        required: ['conditionalField'],
      },
      else: {
        properties: {
          fallbackField: { type: 'string' },
        },
      },
    };

    const previousStepKeys = new Set(['toggle']);

    const resolvedWhenTrue = resolveStepSchema(
      stepSchema,
      { toggle: true },
      { previousStepKeys },
    );
    expect(resolvedWhenTrue).toEqual({
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
        conditionalField: { type: 'string' },
      },
      required: ['conditionalField'],
    });

    const resolvedWhenFalse = resolveStepSchema(
      stepSchema,
      { toggle: false },
      { previousStepKeys },
    );
    expect(resolvedWhenFalse).toEqual({
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
        fallbackField: { type: 'string' },
      },
    });

    const resolvedWhenUndefined = resolveStepSchema(
      stepSchema,
      { toggle: undefined },
      { previousStepKeys },
    );
    expect(resolvedWhenUndefined).toEqual({
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
        fallbackField: { type: 'string' },
      },
    });
  });

  it('follows standard JSON Schema semantics when if omits required and flag is unset', () => {
    const stepSchema: JsonObject = {
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
      },
      if: {
        properties: {
          toggle: { const: true },
        },
      },
      then: {
        properties: {
          conditionalField: { type: 'string' },
        },
      },
      else: {
        properties: {
          fallbackField: { type: 'string' },
        },
      },
    };

    const resolved = resolveStepSchema(
      stepSchema,
      { toggle: undefined },
      { previousStepKeys: new Set(['toggle']) },
    );

    expect(resolved).toEqual({
      type: 'object',
      properties: {
        step2Field: { type: 'string' },
        conditionalField: { type: 'string' },
      },
    });
  });

  it('resolves cross-step dependencies oneOf without re-adding controlling property and preserves same-step dependencies', () => {
    const stepSchema: JsonObject = {
      type: 'object',
      properties: {
        localChoice: {
          type: 'string',
          enum: ['x', 'y'],
        },
      },
      dependencies: {
        cloudProvider: {
          oneOf: [
            {
              properties: {
                cloudProvider: { enum: ['aws'] },
                awsRegion: { type: 'string', title: 'AWS Region' },
              },
              required: ['awsRegion'],
            },
            {
              properties: {
                cloudProvider: { enum: ['gcp'] },
                gcpProject: { type: 'string', title: 'GCP Project' },
              },
            },
          ],
        },
        flagFromStep1: ['localChoice'],
        localChoice: {
          oneOf: [
            {
              properties: {
                localChoice: { enum: ['x'] },
                localExtra: { type: 'string' },
              },
            },
          ],
        },
      },
    };

    const previousStepKeys = new Set(['cloudProvider', 'flagFromStep1']);

    const resolvedWithAws = resolveStepSchema(
      stepSchema,
      { cloudProvider: 'aws', flagFromStep1: false },
      { previousStepKeys },
    );

    expect(resolvedWithAws).toEqual({
      type: 'object',
      properties: {
        localChoice: {
          type: 'string',
          enum: ['x', 'y'],
        },
        awsRegion: {
          type: 'string',
          title: 'AWS Region',
        },
      },
      required: ['awsRegion', 'localChoice'],
      dependencies: {
        localChoice: {
          oneOf: [
            {
              properties: {
                localChoice: { enum: ['x'] },
                localExtra: { type: 'string' },
              },
            },
          ],
        },
      },
    });

    const resolvedWhenUndefined = resolveStepSchema(
      stepSchema,
      { cloudProvider: undefined, flagFromStep1: undefined },
      { previousStepKeys },
    );

    expect(resolvedWhenUndefined).toEqual({
      type: 'object',
      properties: {
        localChoice: {
          type: 'string',
          enum: ['x', 'y'],
        },
      },
      dependencies: {
        localChoice: {
          oneOf: [
            {
              properties: {
                localChoice: { enum: ['x'] },
                localExtra: { type: 'string' },
              },
            },
          ],
        },
      },
    });
  });

  it('resolves allOf, oneOf, and anyOf across steps and when resolveAll is true', () => {
    const stepSchema: JsonObject = {
      type: 'object',
      properties: {
        ownField: { type: 'string' },
      },
      allOf: [
        {
          if: {
            properties: {
              env: { const: 'prod' },
            },
            required: ['env'],
          },
          then: {
            properties: {
              approver: { type: 'string' },
            },
            required: ['approver'],
          },
        },
      ],
      oneOf: [
        {
          properties: {
            tier: { const: 'premium' },
            slaLevel: { type: 'string' },
          },
          required: ['slaLevel'],
        },
        {
          properties: {
            tier: { const: 'free' },
          },
        },
      ],
      anyOf: [
        {
          properties: {
            enableAudit: { const: true },
            auditBucket: { type: 'string' },
          },
        },
      ],
    };

    const resolved = resolveStepSchema(
      stepSchema,
      { env: 'prod', tier: 'premium', enableAudit: true },
      {
        previousStepKeys: new Set(['env', 'tier', 'enableAudit']),
      },
    );

    expect(resolved).toEqual({
      type: 'object',
      properties: {
        ownField: { type: 'string' },
        approver: { type: 'string' },
        slaLevel: { type: 'string' },
        auditBucket: { type: 'string' },
      },
      required: ['approver', 'slaLevel'],
    });
  });

  it('resolves cross-step dependencies oneOf branch that adds an enum field', () => {
    const platform = {
      title: 'Platform',
      type: 'string',
      enum: ['ios', 'android'],
    };
    const schema: JsonObject = {
      properties: {
        sdkName: { type: 'string' },
      },
      dependencies: {
        isMobileSdk: {
          oneOf: [
            {
              properties: {
                isMobileSdk: { const: true },
                platform,
              },
              required: ['platform'],
            },
            {
              properties: {
                isMobileSdk: { const: false },
              },
            },
          ],
        },
      },
    };

    const resolvedTrue = resolveStepSchema(
      schema,
      { isMobileSdk: true },
      { previousStepKeys: new Set(['isMobileSdk']) },
    );

    expect(resolvedTrue.properties).toEqual({
      sdkName: { type: 'string' },
      platform,
    });
    expect(resolvedTrue.required).toEqual(['platform']);
    expect((resolvedTrue.properties as JsonObject).isMobileSdk).toBeUndefined();

    const resolvedFalse = resolveStepSchema(
      schema,
      { isMobileSdk: false },
      { previousStepKeys: new Set(['isMobileSdk']) },
    );

    expect(resolvedFalse.properties).toEqual({
      sdkName: { type: 'string' },
    });
    expect(resolvedFalse.required).toBeUndefined();
  });

  it('preserves multiple same-step allOf if/then items whose then holds an enum field and resolves them when resolveAll is true', () => {
    const platform = {
      title: 'Platform',
      type: 'string',
      enum: ['ios', 'android'],
    };
    const region = {
      title: 'Region',
      type: 'string',
      enum: ['eu', 'us'],
    };
    const schema: JsonObject = {
      properties: {
        flag: { type: 'boolean' },
        mode: { type: 'string' },
      },
      allOf: [
        {
          if: {
            properties: { flag: { const: true } },
            required: ['flag'],
          },
          then: {
            properties: { platform },
          },
        },
        {
          if: {
            properties: { mode: { const: 'x' } },
            required: ['mode'],
          },
          then: {
            properties: { region },
          },
        },
      ],
    };

    const resolvedSameStep = resolveStepSchema(schema, {
      flag: true,
      mode: 'x',
    });

    expect(resolvedSameStep.allOf).toEqual([
      {
        if: {
          properties: { flag: { const: true } },
          required: ['flag'],
        },
        then: {
          properties: { platform },
        },
      },
      {
        if: {
          properties: { mode: { const: 'x' } },
          required: ['mode'],
        },
        then: {
          properties: { region },
        },
      },
    ]);

    const resolvedAll = resolveStepSchema(
      schema,
      { flag: true, mode: 'x' },
      { resolveAll: true },
    );

    expect(resolvedAll.properties).toEqual({
      flag: { type: 'boolean' },
      mode: { type: 'string' },
      platform,
      region,
    });
  });

  it('falls back to the first oneOf/anyOf branch when branches have no discriminators and none match', () => {
    const depSchema: JsonObject = {
      type: 'object',
      dependencies: {
        projectType: {
          oneOf: [
            {
              properties: {
                artifact: { type: 'string' },
              },
            },
          ],
        },
      },
    };

    const resolvedDep = resolveStepSchema(
      depSchema,
      { projectType: 'library' },
      { previousStepKeys: new Set(['projectType']) },
    );

    expect(resolvedDep.properties).toEqual({
      artifact: { type: 'string' },
    });
    expect(resolvedDep.dependencies).toBeUndefined();

    const anyOfSchema: JsonObject = {
      type: 'object',
      anyOf: [
        {
          properties: {
            anyOfField: { type: 'string' },
          },
        },
      ],
    };

    const resolvedAnyOf = resolveStepSchema(
      anyOfSchema,
      {},
      { resolveAll: true },
    );

    expect(resolvedAnyOf.properties).toEqual({
      anyOfField: { type: 'string' },
    });
    expect(resolvedAnyOf.anyOf).toBeUndefined();
  });

  it('matches a partly filled oneOf option branch without falling back to the first branch', () => {
    const schema: JsonObject = {
      type: 'object',
      oneOf: [
        {
          title: 'New repo',
          properties: {
            repoName: { type: 'string' },
          },
          required: ['repoName'],
        },
        {
          title: 'Existing repo',
          properties: {
            existingRepo: { type: 'string' },
            branchName: { type: 'string' },
          },
          required: ['existingRepo', 'branchName'],
        },
      ],
    };

    const resolved = resolveStepSchema(
      schema,
      { existingRepo: 'org/repo' },
      { resolveAll: true },
    );

    expect(resolved.properties).toEqual({
      existingRepo: { type: 'string' },
      branchName: { type: 'string' },
    });
    expect((resolved.properties as JsonObject).repoName).toBeUndefined();
    expect(resolved.required).toEqual(['existingRepo', 'branchName']);
  });

  it('keeps a same-step conditional that depends on a field introduced by another same-step branch', () => {
    const schema: JsonObject = {
      type: 'object',
      properties: {
        isMobileSdk: { type: 'boolean' },
      },
      allOf: [
        {
          if: {
            properties: { isMobileSdk: { const: true } },
            required: ['isMobileSdk'],
          },
          then: {
            properties: {
              platform: {
                type: 'string',
                title: 'Platform',
                enum: ['ios', 'android'],
              },
            },
          },
        },
        {
          if: {
            properties: { platform: { const: 'ios' } },
            required: ['platform'],
          },
          then: {
            properties: {
              bundleId: { type: 'string', title: 'Bundle ID' },
            },
          },
        },
      ],
    };

    const preserved = resolveStepSchema(schema, {});
    expect(preserved.allOf).toHaveLength(2);
    expect(preserved.properties).toEqual({
      isMobileSdk: { type: 'boolean' },
    });

    const resolvedAll = resolveStepSchema(
      schema,
      { isMobileSdk: true, platform: 'ios' },
      { resolveAll: true },
    );
    expect(resolvedAll.allOf).toBeUndefined();
    expect(resolvedAll.properties).toEqual({
      isMobileSdk: { type: 'boolean' },
      platform: {
        type: 'string',
        title: 'Platform',
        enum: ['ios', 'android'],
      },
      bundleId: { type: 'string', title: 'Bundle ID' },
    });
  });

  it('preserves existing field metadata and nested properties when merging conditional branches', () => {
    const depSchema: JsonObject = {
      type: 'object',
      properties: {
        env: {
          type: 'string',
          enum: ['dev', 'prod'],
          enumNames: ['Development', 'Production'],
        },
      },
      dependencies: {
        env: {
          oneOf: [
            {
              properties: {
                env: { type: 'string', enum: ['dev'] },
              },
            },
            {
              properties: {
                env: { type: 'string', enum: ['prod'] },
                approver: { type: 'string' },
              },
            },
          ],
        },
      },
    };

    const resolvedDep = resolveStepSchema(
      depSchema,
      { env: 'prod', approver: 'alice' },
      { resolveAll: true },
    );

    expect(resolvedDep.properties).toEqual({
      env: {
        type: 'string',
        enum: ['dev', 'prod'],
        enumNames: ['Development', 'Production'],
      },
      approver: { type: 'string' },
    });

    const nestedSchema: JsonObject = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
      if: {
        properties: { flag: { const: true } },
        required: ['flag'],
      },
      then: {
        properties: {
          nested: {
            properties: {
              b: { type: 'string' },
            },
          },
        },
      },
    };

    const resolvedNested = resolveStepSchema(
      nestedSchema,
      { flag: true },
      { previousStepKeys: new Set(['flag']) },
    );

    expect(resolvedNested.properties).toEqual({
      nested: {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { type: 'string' },
        },
      },
    });
  });
});
