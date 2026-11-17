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
import { customizeValidator } from '@rjsf/validator-ajv8';
import { type ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import {
  collectConditionalKeys,
  injectCrossStepDependencies,
  pruneConditionalFormData,
} from './conditionalSchema';

const validator = customizeValidator();

function makeStep(
  schema: ParsedTemplateSchema['schema'],
  uiSchema: ParsedTemplateSchema['uiSchema'] = {},
  title = 'Step',
): ParsedTemplateSchema {
  return {
    title,
    schema,
    uiSchema,
    mergedSchema: schema,
  };
}

describe('conditionalSchema', () => {
  describe('injectCrossStepDependencies', () => {
    it('injects an earlier step property into a later step dependencies schema as hidden without adding to required', () => {
      const step1 = makeStep({
        type: 'object',
        required: ['isMobileSdk'],
        properties: {
          isMobileSdk: {
            type: 'boolean',
            title: 'Is this a mobile SDK?',
          },
        },
      });
      const step2 = makeStep({
        type: 'object',
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: { const: true },
                  sdkBundleId: { type: 'string', title: 'SDK Bundle ID' },
                },
                required: ['sdkBundleId'],
              },
              {
                properties: {
                  isMobileSdk: { not: { const: true } },
                },
              },
            ],
          },
        },
      });

      const { steps, injectedKeysByStep } = injectCrossStepDependencies([
        step1,
        step2,
      ]);

      expect(injectedKeysByStep[0].size).toBe(0);
      expect(injectedKeysByStep[1]).toEqual(new Set(['isMobileSdk']));
      expect(steps[1].schema.properties).toEqual({
        isMobileSdk: {
          type: 'boolean',
          title: 'Is this a mobile SDK?',
        },
      });
      expect(steps[1].schema.required).toBeUndefined();
      expect(steps[1].uiSchema.isMobileSdk).toEqual({
        'ui:widget': 'hidden',
      });
      expect(steps[1].mergedSchema).toBe(step2.mergedSchema);
      expect(step2.schema.properties).toBeUndefined();
    });

    it('does not overwrite same-step properties or inject properties from later steps', () => {
      const step1 = makeStep({
        type: 'object',
        properties: {
          sameStepFlag: { type: 'boolean' },
        },
        dependencies: {
          sameStepFlag: {
            properties: { sameStepExtra: { type: 'string' } },
          },
          laterStepFlag: {
            properties: { shouldNotInject: { type: 'string' } },
          },
        },
      });
      const step2 = makeStep({
        type: 'object',
        properties: {
          laterStepFlag: { type: 'boolean' },
        },
      });

      const { steps, injectedKeysByStep } = injectCrossStepDependencies([
        step1,
        step2,
      ]);

      expect(injectedKeysByStep[0].size).toBe(0);
      expect(steps[0].schema.properties).toEqual({
        sameStepFlag: { type: 'boolean' },
      });
      expect(steps[0].uiSchema.sameStepFlag).toBeUndefined();
    });
  });

  describe('collectConditionalKeys', () => {
    it('collects top-level keys from dependencies, then/else, and nested combinators without collecting unconditional or nested object keys', () => {
      const steps = [
        makeStep({
          type: 'object',
          properties: {
            flag: { type: 'boolean' },
            nested: {
              type: 'object',
              properties: { inner: { type: 'string' } },
              dependencies: {
                inner: { properties: { innerExtra: { type: 'string' } } },
              },
            },
          },
          allOf: [
            {
              if: {
                properties: { flag: { const: true } },
                required: ['flag'],
              },
              then: {
                properties: { fromThen: { type: 'string' } },
              },
              else: {
                anyOf: [{ properties: { fromElseAnyOf: { type: 'string' } } }],
              },
            },
          ],
          dependencies: {
            flag: {
              oneOf: [
                {
                  properties: {
                    flag: { const: true },
                    fromDepOneOf: { type: 'string' },
                  },
                },
              ],
            },
          },
        }),
      ];

      const keys = collectConditionalKeys(steps);

      expect(keys).toEqual(
        new Set(['fromThen', 'fromElseAnyOf', 'flag', 'fromDepOneOf']),
      );
      expect(keys.has('nested')).toBe(false);
      expect(keys.has('innerExtra')).toBe(false);
    });
  });

  describe('pruneConditionalFormData', () => {
    it('prunes inactive conditional values while preserving active, unconditional, and undeclared keys', () => {
      const step1 = makeStep({
        type: 'object',
        properties: {
          isMobileSdk: { type: 'boolean', default: false },
          appName: { type: 'string' },
        },
      });
      const step2 = makeStep({
        type: 'object',
        if: {
          properties: { isMobileSdk: { const: true } },
          required: ['isMobileSdk'],
        },
        then: {
          properties: {
            sdkBundleId: { type: 'string' },
          },
          required: ['sdkBundleId'],
        },
        else: {
          properties: {
            webDomain: { type: 'string' },
          },
        },
      });

      const { steps, injectedKeysByStep } = injectCrossStepDependencies([
        step1,
        step2,
      ]);

      const prunedWhenFalse = pruneConditionalFormData(
        {
          isMobileSdk: false,
          appName: 'my-app',
          sdkBundleId: 'com.example.stale',
          webDomain: 'example.com',
          queryParamExtra: 'keep-me',
        },
        steps,
        validator,
        injectedKeysByStep,
      );

      expect(prunedWhenFalse).toEqual({
        isMobileSdk: false,
        appName: 'my-app',
        webDomain: 'example.com',
        queryParamExtra: 'keep-me',
      });

      const prunedWhenTrue = pruneConditionalFormData(
        {
          isMobileSdk: true,
          appName: 'my-app',
          sdkBundleId: 'com.example.sdk',
          webDomain: 'stale.example.com',
          queryParamExtra: 'keep-me',
        },
        steps,
        validator,
        injectedKeysByStep,
      );

      expect(prunedWhenTrue).toEqual({
        isMobileSdk: true,
        appName: 'my-app',
        sdkBundleId: 'com.example.sdk',
        queryParamExtra: 'keep-me',
      });
    });

    it('prunes chained cross-step dependencies until stable', () => {
      const step1 = makeStep({
        type: 'object',
        properties: {
          enableMobile: { type: 'boolean' },
        },
      });
      const step2 = makeStep({
        type: 'object',
        if: {
          properties: { enableMobile: { const: true } },
          required: ['enableMobile'],
        },
        then: {
          properties: {
            isMobileSdk: { type: 'boolean' },
          },
        },
      });
      const step3 = makeStep({
        type: 'object',
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: { const: true },
                  sdkBundleId: { type: 'string' },
                },
              },
              {
                properties: {
                  isMobileSdk: { not: { const: true } },
                },
              },
            ],
          },
        },
      });

      const { steps, injectedKeysByStep } = injectCrossStepDependencies([
        step1,
        step2,
        step3,
      ]);

      const pruned = pruneConditionalFormData(
        {
          enableMobile: false,
          isMobileSdk: true,
          sdkBundleId: 'com.example.sdk',
          undeclaredKey: 'preserve',
        },
        steps,
        validator,
        injectedKeysByStep,
      );

      expect(pruned).toEqual({
        enableMobile: false,
        undeclaredKey: 'preserve',
      });
    });

    it('preserves values from a step with a plain top-level oneOf', () => {
      const step = makeStep({
        type: 'object',
        oneOf: [
          {
            properties: {
              optionA: { type: 'string' },
            },
          },
          {
            properties: {
              optionB: { type: 'number' },
            },
          },
        ],
      });

      expect(collectConditionalKeys([step]).size).toBe(0);

      const pruned = pruneConditionalFormData(
        { optionA: 'hello', optionB: 42 },
        [step],
        validator,
      );

      expect(pruned).toEqual({ optionA: 'hello', optionB: 42 });
    });
  });
});
