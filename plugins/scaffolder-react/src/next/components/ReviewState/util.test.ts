/*
 * Copyright 2024 The Backstage Authors
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

import { isJsonObject, formatKey, findSchemaForKey } from './util';
import { ParsedTemplateSchema } from '../../hooks/useTemplateSchema';

describe('isJsonObject', () => {
  it('should return true for non-null objects', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject({ key: 'value' })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject([1, 2, 3])).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isJsonObject('string')).toBe(false);
    expect(isJsonObject(123)).toBe(false);
    expect(isJsonObject(true)).toBe(false);
    expect(isJsonObject(undefined)).toBe(false);
  });

  it('should return false for null values', () => {
    expect(isJsonObject(null)).toBe(false);
  });
});

describe('formatKey', () => {
  it('should replace / with > globally in the key', () => {
    expect(formatKey('simple/key')).toBe('Simple > Key');
  });

  it('should leave a top-level key untouched', () => {
    expect(formatKey('topLevel')).toBe('Top Level');
  });

  it('should handle keys with a leading slash', () => {
    expect(formatKey('/simple/key')).toBe('Simple > Key');
  });

  it('should handle keys with trailing slash', () => {
    expect(formatKey('parent/child/')).toBe('Parent > Child');
  });

  it('should handle empty string', () => {
    expect(formatKey('')).toBe('');
  });

  it('should handle keys with multiple consecutive slashes', () => {
    expect(formatKey('parent//child')).toBe('Parent > Child');
  });

  it('should handle keys with only slashes', () => {
    expect(formatKey('////')).toBe('');
  });

  it('should handle keys with spaces', () => {
    expect(formatKey('parent/child with spaces')).toBe(
      'Parent > Child With Spaces',
    );
  });

  it('should remove special characters', () => {
    expect(formatKey('parent/child@!#$%^&*()')).toBe('Parent > Child');
  });
});

describe('findSchemaForKey', () => {
  const schemas: ParsedTemplateSchema[] = [
    {
      mergedSchema: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
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
          bar: {
            type: 'string',
          },
          hello: {
            type: 'object',
            properties: {
              world: {
                type: 'string',
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
          foo: {
            oneOf: [
              {
                properties: {
                  artifact: {
                    type: 'string',
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

  const formState = {
    foo: 'value',
    bar: 'value',
    hello: { world: 'value' },
    artifact: 'value',
  };

  it('should return the schema for the direct key', () => {
    const result = findSchemaForKey('foo', schemas, formState);
    expect(result).toBe(schemas[0]);
  });

  it('should return the schema for a key in dependencies', () => {
    const result = findSchemaForKey('artifact', schemas, formState);
    expect(result).toBe(schemas[2]);
  });

  it('should return null if the key does not exist', () => {
    const result = findSchemaForKey('nonexistentKey', schemas, formState);
    expect(result).toBeNull();
  });

  it('should return the schema for a key in the second schema', () => {
    const result = findSchemaForKey('bar', schemas, formState);
    expect(result).toBe(schemas[1]);
  });

  it('should return the schema for an object key', () => {
    const result = findSchemaForKey('hello', schemas, formState);
    expect(result).toBe(schemas[1]);
  });

  describe('cross-step conditions', () => {
    const crossStepSchemas: ParsedTemplateSchema[] = [
      {
        mergedSchema: {
          type: 'object',
          properties: {
            enableFeature: {
              type: 'boolean',
            },
            environment: {
              type: 'string',
              enum: ['production', 'development'],
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
          if: {
            properties: {
              enableFeature: {
                const: true,
              },
            },
          },
          then: {
            properties: {
              featureConfig: {
                type: 'string',
              },
            },
          },
          else: {
            properties: {
              fallbackReason: {
                type: 'string',
              },
            },
          },
          allOf: [
            {
              if: {
                properties: {
                  environment: {
                    const: 'production',
                  },
                },
              },
              then: {
                properties: {
                  prodCluster: {
                    type: 'string',
                  },
                },
              },
            },
          ],
        },
        schema: {},
        title: 'Step 2',
        uiSchema: {},
      },
    ];

    it('should return the schema for a key in cross-step if/then/else when active and null when inactive', () => {
      // Condition met: enableFeature === true
      expect(
        findSchemaForKey('featureConfig', crossStepSchemas, {
          enableFeature: true,
          featureConfig: 'active-value',
        }),
      ).toBe(crossStepSchemas[1]);

      // Else branch is inactive when condition is met
      expect(
        findSchemaForKey('fallbackReason', crossStepSchemas, {
          enableFeature: true,
          fallbackReason: 'stale-value',
        }),
      ).toBeNull();

      // Condition not met: enableFeature === false
      expect(
        findSchemaForKey('featureConfig', crossStepSchemas, {
          enableFeature: false,
          featureConfig: 'stale-value',
        }),
      ).toBeNull();

      // Else branch is active when condition is false
      expect(
        findSchemaForKey('fallbackReason', crossStepSchemas, {
          enableFeature: false,
          fallbackReason: 'active-value',
        }),
      ).toBe(crossStepSchemas[1]);

      // Condition undefined (treated as false for boolean const)
      expect(
        findSchemaForKey('featureConfig', crossStepSchemas, {
          featureConfig: 'stale-value',
        }),
      ).toBeNull();

      expect(
        findSchemaForKey('fallbackReason', crossStepSchemas, {
          fallbackReason: 'active-value',
        }),
      ).toBe(crossStepSchemas[1]);
    });

    it('should return the schema for cross-step allOf conditions when satisfied and null when unsatisfied', () => {
      expect(
        findSchemaForKey('prodCluster', crossStepSchemas, {
          environment: 'production',
          prodCluster: 'prod-1',
        }),
      ).toBe(crossStepSchemas[1]);

      expect(
        findSchemaForKey('prodCluster', crossStepSchemas, {
          environment: 'development',
          prodCluster: 'stale-prod',
        }),
      ).toBeNull();

      expect(
        findSchemaForKey('prodCluster', crossStepSchemas, {
          prodCluster: 'stale-prod',
        }),
      ).toBeNull();
    });

    it('should return null for conditional dependency key when condition in formState is not satisfied even with stale value', () => {
      const depSchemas: ParsedTemplateSchema[] = [
        {
          mergedSchema: {
            type: 'object',
            properties: {
              useDatabase: {
                type: 'boolean',
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
              useDatabase: {
                oneOf: [
                  {
                    properties: {
                      useDatabase: {
                        enum: [false],
                      },
                    },
                  },
                  {
                    properties: {
                      useDatabase: {
                        enum: [true],
                      },
                      dbHost: {
                        type: 'string',
                      },
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

      expect(
        findSchemaForKey('dbHost', depSchemas, {
          useDatabase: true,
          dbHost: 'db.example.com',
        }),
      ).toBe(depSchemas[1]);

      expect(
        findSchemaForKey('dbHost', depSchemas, {
          useDatabase: false,
          dbHost: 'stale.example.com',
        }),
      ).toBeNull();

      expect(
        findSchemaForKey('dbHost', depSchemas, {
          dbHost: 'stale.example.com',
        }),
      ).toBeNull();
    });
  });
});
