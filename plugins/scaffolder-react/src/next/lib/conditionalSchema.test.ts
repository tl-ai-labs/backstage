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
import { JsonObject } from '@backstage/types';
import validator from '@rjsf/validator-ajv8';
import {
  omitInactiveConditionalValues,
  resolveExternalDependencies,
} from './conditionalSchema';
import { ParsedTemplateSchema } from '../hooks/useTemplateSchema';

const step = (schema: JsonObject): ParsedTemplateSchema => ({
  title: 'Step',
  schema,
  mergedSchema: schema,
  uiSchema: {},
});

describe('resolveExternalDependencies', () => {
  it('should resolve dependencies on properties of other steps only', () => {
    const schema: JsonObject = {
      properties: { name: { type: 'string' } },
      dependencies: {
        name: { properties: { alias: { type: 'string' } } },
        owner: ['name'],
        kind: {
          oneOf: [
            {
              properties: {
                kind: { const: 'service' },
                port: { type: 'number' },
              },
              required: ['port'],
            },
            { properties: { kind: { const: 'library' } } },
          ],
        },
      },
    };

    expect(resolveExternalDependencies(schema, {}, validator)).toEqual({
      properties: { name: { type: 'string' } },
      dependencies: {
        name: { properties: { alias: { type: 'string' } } },
      },
    });

    expect(
      resolveExternalDependencies(
        schema,
        { owner: 'me', kind: 'service' },
        validator,
      ),
    ).toEqual({
      properties: { name: { type: 'string' } },
      required: ['name'],
      allOf: [{ properties: { port: { type: 'number' } }, required: ['port'] }],
      dependencies: {
        name: { properties: { alias: { type: 'string' } } },
      },
    });

    expect(
      resolveExternalDependencies(schema, { kind: 'library' }, validator),
    ).toEqual({
      properties: { name: { type: 'string' } },
      dependencies: {
        name: { properties: { alias: { type: 'string' } } },
      },
    });
  });
});

describe('omitInactiveConditionalValues', () => {
  it('should only omit values of conditional fields whose condition does not hold', () => {
    const steps = [
      step({
        properties: {
          kind: { type: 'string' },
          choice: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
      }),
      step({
        properties: { name: { type: 'string' } },
        if: { properties: { kind: { const: 'service' } } },
        then: { properties: { port: { type: 'number' } } },
        else: { properties: { language: { type: 'string' } } },
        dependencies: {
          kind: {
            oneOf: [
              {
                properties: {
                  kind: { const: 'website' },
                  domain: { type: 'string' },
                },
              },
              { properties: { kind: { not: { const: 'website' } } } },
            ],
          },
        },
      }),
    ];

    const formData = {
      kind: 'library',
      choice: 1,
      name: 'my-lib',
      port: 8080,
      language: 'go',
      domain: 'example.com',
      fromQuery: 'kept',
    };

    expect(omitInactiveConditionalValues(steps, formData, validator)).toEqual({
      kind: 'library',
      choice: 1,
      name: 'my-lib',
      language: 'go',
      fromQuery: 'kept',
    });

    expect(
      omitInactiveConditionalValues(
        steps,
        { ...formData, kind: 'website' },
        validator,
      ),
    ).toEqual({
      kind: 'website',
      choice: 1,
      name: 'my-lib',
      language: 'go',
      domain: 'example.com',
      fromQuery: 'kept',
    });
  });
});
