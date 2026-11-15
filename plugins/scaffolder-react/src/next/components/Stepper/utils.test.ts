/*
 * Copyright 2023 The Backstage Authors
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
import { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import {
  hasErrors,
  pruneExtraData,
  resolveCrossStepDependencies,
} from './utils';

describe('hasErrors', () => {
  it('should return false for empty _errors', () => {
    expect(
      hasErrors({
        name: {
          __errors: [],
          addError: jest.fn(),
        },
      }),
    ).toBe(false);
  });

  it('should return true for a single error', () => {
    expect(
      hasErrors({
        name: {
          __errors: ['an error'],
          addError: jest.fn(),
        },
      }),
    ).toBe(true);
  });

  it('should return true for more than one error', () => {
    expect(
      hasErrors({
        name: {
          __errors: [],
          addError: jest.fn(),
        },
        general: {
          address: {
            __errors: [],
            addError: jest.fn(),
          },
          name: {
            __errors: ['something is broken here!'],
            addError: jest.fn(),
          },
        },
      }),
    ).toBe(true);
  });

  it('should not return false when the error is an empty object', () => {
    const errors = {
      something: {},
      otherThing: {},
      someName: {
        __errors: [
          'Accepts alphanumeric values along with _(underscore) and -(hyphen) as special characters',
        ],
        addError: jest.fn(),
      },
      someOtherName: {
        __errors: ['Must start with an alphabet & not contain .(period)'],
        addError: jest.fn(),
      },
      aName: {
        __errors: [],
        addError: jest.fn(),
      },
      bName: {
        __errors: [],
        addError: jest.fn(),
      },
      cName: {
        __errors: [],
        addError: jest.fn(),
      },
    };

    expect(hasErrors(errors)).toBe(true);
  });
});

describe('resolveCrossStepDependencies', () => {
  it('injects hidden properties from earlier steps for cross-step dependencies and preserves ui:order', () => {
    const steps: ParsedTemplateSchema[] = [
      {
        title: 'Step 1',
        mergedSchema: {},
        uiSchema: {},
        schema: {
          type: 'object',
          properties: {
            isMobileSdk: { type: 'boolean', title: 'Is this a mobile SDK?' },
          },
        },
      },
      {
        title: 'Step 2',
        mergedSchema: {},
        uiSchema: { 'ui:order': ['appName', 'sdkPlatform'] },
        schema: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
          },
          dependencies: {
            isMobileSdk: {
              allOf: [
                {
                  if: { properties: { isMobileSdk: { const: true } } },
                  then: {
                    properties: { sdkPlatform: { type: 'string' } },
                    required: ['sdkPlatform'],
                  },
                },
              ],
            },
          },
        },
      },
    ];

    const resolved = resolveCrossStepDependencies(steps);

    expect(resolved[0]).toBe(steps[0]);
    expect(resolved[1].schema.properties).toEqual({
      appName: { type: 'string' },
      isMobileSdk: { type: 'boolean', title: 'Is this a mobile SDK?' },
    });
    expect(resolved[1].uiSchema).toEqual({
      'ui:order': ['appName', 'sdkPlatform', 'isMobileSdk'],
      isMobileSdk: { 'ui:widget': 'hidden' },
    });
  });

  it('leaves same-step dependencies untouched', () => {
    const steps: ParsedTemplateSchema[] = [
      {
        title: 'Step 1',
        mergedSchema: {},
        uiSchema: {},
        schema: {
          type: 'object',
          properties: {
            flag: { type: 'boolean' },
          },
          dependencies: {
            flag: {
              properties: { extra: { type: 'string' } },
            },
          },
        },
      },
    ];

    const resolved = resolveCrossStepDependencies(steps);
    expect(resolved[0]).toBe(steps[0]);
  });
});

describe('pruneExtraData', () => {
  const validator = customizeValidator();

  it('removes conditional fields whose condition is no longer satisfied while keeping active fields', () => {
    const steps = resolveCrossStepDependencies([
      {
        title: 'Step 1',
        mergedSchema: {},
        uiSchema: {},
        schema: {
          type: 'object',
          properties: {
            isMobileSdk: { type: 'boolean' },
          },
        },
      },
      {
        title: 'Step 2',
        mergedSchema: {},
        uiSchema: {},
        schema: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
            customObj: { type: 'object' },
          },
          dependencies: {
            isMobileSdk: {
              allOf: [
                {
                  if: { properties: { isMobileSdk: { const: true } } },
                  then: {
                    properties: { sdkPlatform: { type: 'string' } },
                  },
                },
              ],
            },
          },
        },
      },
    ]);

    expect(
      pruneExtraData(steps, validator, {
        isMobileSdk: true,
        appName: 'my-app',
        sdkPlatform: 'iOS',
        customObj: { nested: 'kept' },
      }),
    ).toEqual({
      isMobileSdk: true,
      appName: 'my-app',
      sdkPlatform: 'iOS',
      customObj: { nested: 'kept' },
    });

    expect(
      pruneExtraData(steps, validator, {
        isMobileSdk: false,
        appName: 'my-app',
        sdkPlatform: 'iOS',
        customObj: { nested: 'kept' },
      }),
    ).toEqual({
      isMobileSdk: false,
      appName: 'my-app',
      customObj: { nested: 'kept' },
    });
  });
});
