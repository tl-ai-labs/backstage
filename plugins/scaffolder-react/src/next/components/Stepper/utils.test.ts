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
import { expandCrossStepDependencies, hasErrors } from './utils';

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

describe('expandCrossStepDependencies', () => {
  it('should leave schemas without cross-step dependencies unchanged', () => {
    const schemaWithoutDependencies = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    expect(expandCrossStepDependencies(schemaWithoutDependencies)).toBe(
      schemaWithoutDependencies,
    );

    const schemaWithSameStepDependency = {
      type: 'object',
      properties: {
        moreInfo: { type: 'boolean' },
      },
      dependencies: {
        moreInfo: ['details'],
      },
    };
    expect(expandCrossStepDependencies(schemaWithSameStepDependency)).toBe(
      schemaWithSameStepDependency,
    );

    const schemaWithNoProperties = {
      type: 'object',
      dependencies: {
        foo: ['bar'],
      },
    };
    expect(expandCrossStepDependencies(schemaWithNoProperties)).toBe(
      schemaWithNoProperties,
    );

    const schemaWithSameStepChain = {
      type: 'object',
      properties: {
        a: { type: 'boolean' },
      },
      dependencies: {
        a: {
          oneOf: [
            {
              properties: {
                a: { const: true },
                b: { type: 'string' },
              },
            },
          ],
        },
        b: ['c'],
      },
    };
    expect(expandCrossStepDependencies(schemaWithSameStepChain)).toBe(
      schemaWithSameStepChain,
    );
  });

  it('should rewrite cross-step dependencies into if/then entries', () => {
    const sdkName = { type: 'string' };
    const zone = { type: 'string' };
    const schema = {
      type: 'object',
      properties: {
        description: { type: 'string' },
      },
      allOf: [{ required: ['description'] }],
      dependencies: {
        isMobileSdk: {
          oneOf: [
            {
              properties: {
                isMobileSdk: { const: true },
                sdkName,
              },
              required: ['sdkName'],
            },
            {
              properties: {
                isMobileSdk: { const: false },
              },
            },
          ],
        },
        team: ['owner'],
        region: {
          properties: {
            zone: { type: 'string' },
          },
        },
      },
    };

    const copy = JSON.parse(JSON.stringify(schema));
    const result = expandCrossStepDependencies(schema);

    expect(result.allOf).toEqual([
      { required: ['description'] },
      {
        if: {
          properties: { isMobileSdk: { const: true } },
          required: ['isMobileSdk'],
        },
        then: {
          properties: { sdkName },
          required: ['sdkName'],
        },
      },
      {
        if: {
          properties: { isMobileSdk: { const: false } },
          required: ['isMobileSdk'],
        },
        then: {
          properties: {},
        },
      },
      {
        if: { required: ['team'] },
        then: { required: ['owner'] },
      },
      {
        if: { required: ['region'] },
        then: { properties: { zone } },
      },
    ]);
    expect(result.dependencies).toEqual(schema.dependencies);
    expect(result.properties).toEqual(schema.properties);
    expect(schema).toEqual(copy);
  });
});
