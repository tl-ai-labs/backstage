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
import {
  hasErrors,
  pruneInactiveStepsState,
  resolveConditionalSchema,
  resolveStepSchema,
} from './utils';
import type { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';

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

describe('resolveStepSchema', () => {
  const steps: ParsedTemplateSchema[] = [
    {
      title: 'Step 1',
      schema: {
        type: 'object',
        properties: {
          isMobileSdk: {
            type: 'boolean',
            title: 'Is Mobile SDK',
          },
        },
      },
      uiSchema: {},
      mergedSchema: {
        type: 'object',
        properties: {
          isMobileSdk: {
            type: 'boolean',
            title: 'Is Mobile SDK',
          },
        },
      },
    },
    {
      title: 'Step 2',
      schema: {
        type: 'object',
        properties: {
          packageName: {
            type: 'string',
            title: 'Package Name',
          },
        },
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: {
                    enum: [true],
                  },
                  sdkPlatform: {
                    type: 'string',
                    title: 'SDK Platform',
                  },
                },
                required: ['sdkPlatform'],
              },
            ],
          },
        },
      },
      uiSchema: {},
      mergedSchema: {
        type: 'object',
        properties: {
          packageName: {
            type: 'string',
            title: 'Package Name',
          },
        },
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: {
                    enum: [true],
                  },
                  sdkPlatform: {
                    type: 'string',
                    title: 'SDK Platform',
                  },
                },
                required: ['sdkPlatform'],
              },
            ],
          },
        },
      },
    },
  ];

  it('evaluates cross-step dependencies without duplicating earlier-step properties when true', () => {
    const resolved = resolveStepSchema(steps[1].schema, steps, 1, {
      isMobileSdk: true,
    });

    expect(resolved.properties).toHaveProperty('packageName');
    expect(resolved.properties).toHaveProperty('sdkPlatform');
    expect(resolved.properties).not.toHaveProperty('isMobileSdk');
    expect(resolved.required).toEqual(['sdkPlatform']);
  });

  it('does not include conditional properties when condition is false or undefined', () => {
    const resolvedFalse = resolveStepSchema(steps[1].schema, steps, 1, {
      isMobileSdk: false,
    });
    expect(resolvedFalse.properties).toHaveProperty('packageName');
    expect(resolvedFalse.properties).not.toHaveProperty('sdkPlatform');
    expect(resolvedFalse.properties).not.toHaveProperty('isMobileSdk');
    expect(resolvedFalse.required ?? []).not.toContain('sdkPlatform');

    const resolvedUndefined = resolveStepSchema(steps[1].schema, steps, 1, {});
    expect(resolvedUndefined.properties).toHaveProperty('packageName');
    expect(resolvedUndefined.properties).not.toHaveProperty('sdkPlatform');
    expect(resolvedUndefined.properties).not.toHaveProperty('isMobileSdk');
    expect(resolvedUndefined.required ?? []).not.toContain('sdkPlatform');
  });

  it('evaluates top-level if/then/else across steps', () => {
    const ifThenSteps: ParsedTemplateSchema[] = [
      {
        title: 'Step 1',
        schema: {
          type: 'object',
          properties: {
            targetEnv: {
              type: 'string',
              enum: ['cloud', 'onprem'],
            },
          },
        },
        uiSchema: {},
        mergedSchema: {
          type: 'object',
          properties: {
            targetEnv: {
              type: 'string',
              enum: ['cloud', 'onprem'],
            },
          },
        },
      },
      {
        title: 'Step 2',
        schema: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
          },
          if: {
            properties: {
              targetEnv: { const: 'cloud' },
            },
          },
          then: {
            properties: {
              cloudRegion: { type: 'string' },
            },
            required: ['cloudRegion'],
          },
        },
        uiSchema: {},
        mergedSchema: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
          },
          if: {
            properties: {
              targetEnv: { const: 'cloud' },
            },
          },
          then: {
            properties: {
              cloudRegion: { type: 'string' },
            },
            required: ['cloudRegion'],
          },
        },
      },
    ];

    const resolvedCloud = resolveStepSchema(
      ifThenSteps[1].schema,
      ifThenSteps,
      1,
      {
        targetEnv: 'cloud',
      },
    );
    expect(resolvedCloud.properties).toHaveProperty('appName');
    expect(resolvedCloud.properties).toHaveProperty('cloudRegion');
    expect(resolvedCloud.properties).not.toHaveProperty('targetEnv');
    expect(resolvedCloud.required).toContain('cloudRegion');

    const resolvedOnprem = resolveStepSchema(
      ifThenSteps[1].schema,
      ifThenSteps,
      1,
      {
        targetEnv: 'onprem',
      },
    );
    expect(resolvedOnprem.properties).toHaveProperty('appName');
    expect(resolvedOnprem.properties).not.toHaveProperty('cloudRegion');
    expect(resolvedOnprem.properties).not.toHaveProperty('targetEnv');
  });
  it('evaluates allOf with if/then dependencies via resolveConditionalSchema', () => {
    const schema = {
      type: 'object',
      properties: {
        packageName: { type: 'string' },
      },
      dependencies: {
        isMobileSdk: {
          allOf: [
            {
              if: {
                properties: {
                  isMobileSdk: { const: true },
                },
              },
              then: {
                properties: {
                  sdkPlatform: { type: 'string' },
                },
                required: ['sdkPlatform'],
              },
            },
          ],
        },
      },
    };

    const resolved = resolveConditionalSchema(
      schema,
      { isMobileSdk: true },
      { earlierStepKeys: new Set(['isMobileSdk']) },
    );

    expect(resolved.properties).toHaveProperty('packageName');
    expect(resolved.properties).toHaveProperty('sdkPlatform');
    expect(resolved.properties).not.toHaveProperty('isMobileSdk');
    expect(resolved.required).toEqual(['sdkPlatform']);
  });
});

describe('pruneInactiveStepsState', () => {
  const steps: ParsedTemplateSchema[] = [
    {
      title: 'Step 1',
      schema: {
        type: 'object',
        properties: {
          isMobileSdk: {
            type: 'boolean',
            title: 'Is Mobile SDK',
          },
          owner: {
            type: 'string',
            title: 'Owner',
          },
        },
      },
      uiSchema: {},
      mergedSchema: {
        type: 'object',
        properties: {
          isMobileSdk: {
            type: 'boolean',
            title: 'Is Mobile SDK',
          },
          owner: {
            type: 'string',
            title: 'Owner',
          },
        },
      },
    },
    {
      title: 'Step 2',
      schema: {
        type: 'object',
        properties: {
          packageName: {
            type: 'string',
            title: 'Package Name',
          },
        },
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: {
                    enum: [true],
                  },
                  sdkPlatform: {
                    type: 'string',
                    title: 'SDK Platform',
                  },
                },
              },
            ],
          },
        },
      },
      uiSchema: {},
      mergedSchema: {
        type: 'object',
        properties: {
          packageName: {
            type: 'string',
            title: 'Package Name',
          },
        },
        dependencies: {
          isMobileSdk: {
            oneOf: [
              {
                properties: {
                  isMobileSdk: {
                    enum: [true],
                  },
                  sdkPlatform: {
                    type: 'string',
                    title: 'SDK Platform',
                  },
                },
              },
            ],
          },
        },
      },
    },
  ];

  it('removes values of conditional fields whose cross-step condition is no longer satisfied', () => {
    const state = {
      isMobileSdk: false,
      owner: 'team-a',
      packageName: 'my-package',
      sdkPlatform: 'ios',
    };

    const pruned = pruneInactiveStepsState(steps, state);

    expect(pruned).toEqual({
      isMobileSdk: false,
      owner: 'team-a',
      packageName: 'my-package',
    });
    expect(pruned).not.toHaveProperty('sdkPlatform');
  });

  it('retains conditional fields when the condition is met', () => {
    const state = {
      isMobileSdk: true,
      owner: 'team-a',
      packageName: 'my-package',
      sdkPlatform: 'ios',
    };

    const pruned = pruneInactiveStepsState(steps, state);

    expect(pruned).toEqual({
      isMobileSdk: true,
      owner: 'team-a',
      packageName: 'my-package',
      sdkPlatform: 'ios',
    });
  });

  it('retains undefined unconditional properties', () => {
    const state = {
      isMobileSdk: false,
      owner: undefined,
      packageName: 'my-package',
      sdkPlatform: 'ios',
    };

    const pruned = pruneInactiveStepsState(steps, state as any);

    expect(pruned).toHaveProperty('owner');
    expect(pruned.owner).toBeUndefined();
    expect(pruned).not.toHaveProperty('sdkPlatform');
  });
});
