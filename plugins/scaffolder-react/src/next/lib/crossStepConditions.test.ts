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
import { customizeValidator } from '@rjsf/validator-ajv8';
import { cloneDeep } from 'lodash';
import {
  getCrossStepConditionKeys,
  omitHiddenCrossStepValues,
  rewriteCrossStepDependencies,
} from './crossStepConditions';

const validator = customizeValidator();

const text: JsonObject = { type: 'string' };
const flagStep: JsonObject = { properties: { flag: { type: 'boolean' } } };
const flagOn: JsonObject = {
  properties: { flag: { const: true } },
  required: ['flag'],
};

describe('rewriteCrossStepDependencies', () => {
  it('returns the same schema when no dependency needs rewriting', () => {
    const dependency: JsonObject = { properties: { extra: text } };
    const firstStep: JsonObject = {
      properties: { flag: { type: 'boolean' } },
      dependencies: { flag: dependency },
    };
    expect(rewriteCrossStepDependencies([firstStep], 0)).toBe(firstStep);

    const ownKey: JsonObject = {
      properties: { own: text },
      dependencies: { own: dependency },
    };
    const sharedKey: JsonObject = {
      properties: { flag: { type: 'boolean' } },
      dependencies: { flag: dependency },
    };
    const sharedKeyInBranch: JsonObject = {
      allOf: [
        { if: { required: ['own'] }, then: { properties: { flag: text } } },
      ],
      dependencies: { flag: dependency },
    };
    const unknownKey: JsonObject = {
      properties: { own: text },
      dependencies: { unknown: dependency },
    };
    for (const step of [ownKey, sharedKey, sharedKeyInBranch, unknownKey]) {
      expect(rewriteCrossStepDependencies([flagStep, step], 1)).toBe(step);
    }

    const earlierStep: JsonObject = {
      properties: { flag: { type: 'boolean' }, name: text },
    };
    const arrayAndBoolean: JsonObject = {
      properties: { extra: text },
      dependencies: { flag: ['extra'], name: true },
    };
    const result = rewriteCrossStepDependencies(
      [earlierStep, arrayAndBoolean],
      1,
    );
    expect(result).toBe(arrayAndBoolean);
    expect(result.dependencies).toEqual({ flag: ['extra'], name: true });
  });

  it('moves a dependency on an earlier-step field into allOf', () => {
    const existing: JsonObject = {
      if: { required: ['own'] },
      then: { properties: { other: text } },
    };
    const earlierDependency: JsonObject = {
      allOf: [{ if: flagOn, then: { properties: { extra: text } } }],
    };
    const ownDependency: JsonObject = { properties: { ownExtra: text } };
    const step: JsonObject = {
      properties: { own: text },
      allOf: [existing],
      dependencies: { flag: earlierDependency, own: ownDependency },
    };
    const original = cloneDeep(step);

    expect(rewriteCrossStepDependencies([flagStep, step], 1)).toEqual({
      properties: { own: text },
      allOf: [
        existing,
        { if: { required: ['flag'] }, then: earlierDependency },
      ],
      dependencies: { own: ownDependency },
    });
    expect(step).toEqual(original);
  });

  it('turns each oneOf option into an if/then without the earlier field', () => {
    const step: JsonObject = {
      properties: { own: text },
      dependencies: {
        mode: {
          properties: { extra: text },
          oneOf: [
            { properties: { mode: { enum: ['a'] }, optionA: text } },
            { properties: { mode: { enum: ['b'] }, optionB: text } },
            { properties: { optionC: text } },
          ],
        },
      },
    };

    const result = rewriteCrossStepDependencies(
      [{ properties: { mode: text } }, step],
      1,
    );

    expect(result).toEqual({
      properties: { own: text },
      allOf: [
        {
          if: { required: ['mode'] },
          then: { properties: { extra: text } },
        },
        {
          if: { properties: { mode: { enum: ['a'] } }, required: ['mode'] },
          then: { properties: { optionA: text } },
        },
        {
          if: { properties: { mode: { enum: ['b'] } }, required: ['mode'] },
          then: { properties: { optionB: text } },
        },
      ],
    });
    expect(result).not.toHaveProperty('dependencies');
  });

  it('adds no allOf when a dependency yields no conditions', () => {
    const dependencies: JsonObject[] = [
      {},
      { oneOf: [{ properties: { optionA: text } }] },
    ];

    for (const dependency of dependencies) {
      const step: JsonObject = {
        properties: { own: text },
        dependencies: { flag: dependency },
      };

      const result = rewriteCrossStepDependencies([flagStep, step], 1);

      expect(result).toEqual({ properties: { own: text } });
      expect(result).not.toHaveProperty('allOf');
    }
  });

  it('rewrites a dependency that repeats its own key in properties', () => {
    const step: JsonObject = {
      properties: { own: text },
      dependencies: {
        flag: { properties: { flag: { type: 'boolean' }, extra: text } },
      },
    };

    expect(rewriteCrossStepDependencies([flagStep, step], 1)).toEqual({
      properties: { own: text },
      allOf: [
        {
          if: { required: ['flag'] },
          then: { properties: { extra: text } },
        },
      ],
    });
  });
});

describe('getCrossStepConditionKeys', () => {
  it('lists only the keys read by cross-step conditions', () => {
    const steps: JsonObject[] = [
      { properties: { first: text, second: text } },
      {
        properties: { own: text, local: text },
        allOf: [
          {
            if: { properties: { local: { const: 'yes' } } },
            then: { properties: { sameStep: text } },
          },
          {
            if: {
              properties: { first: { const: 'yes' }, own: { const: 'yes' } },
              required: ['first'],
            },
            then: { properties: { cross: text } },
          },
        ],
        dependencies: {
          first: { properties: { fromFirst: text } },
          second: { properties: { fromSecond: text } },
        },
      },
    ];

    expect(getCrossStepConditionKeys(steps, 1).sort()).toEqual([
      'first',
      'own',
      'second',
    ]);
    expect(getCrossStepConditionKeys(steps, 0)).toEqual([]);
  });

  it('counts a key repeated by its own dependency as cross-step', () => {
    const step: JsonObject = {
      properties: { own: text },
      allOf: [{ if: flagOn, then: { properties: { other: text } } }],
      dependencies: {
        flag: { properties: { flag: { type: 'boolean' }, extra: text } },
      },
    };

    expect(getCrossStepConditionKeys([flagStep, step], 1)).toEqual(['flag']);
  });
});

describe('omitHiddenCrossStepValues', () => {
  const crossStep: JsonObject = {
    allOf: [{ if: flagOn, then: { properties: { extra: text } } }],
  };

  it('returns the input object when nothing is hidden', () => {
    const noBranch = { flag: false, own: 'value' };
    expect(
      omitHiddenCrossStepValues(
        [flagStep, { properties: { own: text } }],
        noBranch,
        validator,
      ),
    ).toBe(noBranch);

    const selected = { flag: true, extra: 'value' };
    expect(
      omitHiddenCrossStepValues([flagStep, crossStep], selected, validator),
    ).toBe(selected);

    const noValue = { flag: false };
    expect(
      omitHiddenCrossStepValues([flagStep, crossStep], noValue, validator),
    ).toBe(noValue);
  });

  it('drops values of unselected cross-step branches', () => {
    const steps: JsonObject[] = [
      { properties: { flag: { type: 'boolean' }, mode: text, name: text } },
      {
        properties: { own: text },
        dependencies: {
          flag: {
            allOf: [{ if: flagOn, then: { properties: { dependent: text } } }],
          },
          mode: {
            oneOf: [
              { properties: { mode: { enum: ['a'] }, optionA: text } },
              { properties: { mode: { enum: ['b'] }, optionB: text } },
            ],
          },
        },
      },
      {
        if: flagOn,
        then: { properties: { thenField: text } },
        else: { properties: { elseField: text } },
      },
      { allOf: [{ if: flagOn, then: { properties: { allOfField: text } } }] },
      {
        properties: { toggle: { type: 'boolean' } },
        if: {
          properties: { flag: { const: true }, toggle: { const: true } },
          required: ['flag', 'toggle'],
        },
        then: { properties: { mixedField: text } },
      },
    ];

    expect(
      omitHiddenCrossStepValues(
        steps,
        {
          flag: false,
          mode: 'b',
          name: 'kept',
          own: 'kept',
          toggle: true,
          dependent: 'stale',
          optionA: 'stale',
          optionB: 'kept',
          thenField: 'stale',
          elseField: 'kept',
          allOfField: 'stale',
          mixedField: 'stale',
        },
        validator,
      ),
    ).toEqual({
      flag: false,
      mode: 'b',
      name: 'kept',
      own: 'kept',
      toggle: true,
      optionB: 'kept',
      elseField: 'kept',
    });
  });

  it('keeps values another rule protects', () => {
    const steps: JsonObject[] = [
      flagStep,
      {
        allOf: [
          {
            if: flagOn,
            then: { properties: { shared: text, anyField: text } },
          },
        ],
      },
      {
        properties: { toggle: { type: 'boolean' }, shared: text },
        if: { properties: { toggle: { const: true } }, required: ['toggle'] },
        then: { properties: { localField: text } },
      },
      { anyOf: [{ properties: { anyField: text } }] },
    ];
    const formData = {
      flag: false,
      toggle: false,
      localField: 'stale',
      shared: 'kept',
      anyField: 'kept',
      outside: 'kept',
    };

    expect(omitHiddenCrossStepValues(steps, formData, validator)).toEqual({
      flag: false,
      toggle: false,
      localField: 'stale',
      shared: 'kept',
      anyField: 'kept',
      outside: 'kept',
    });
  });

  it('does not count additionalProperties stubs as resolved', () => {
    const steps: JsonObject[] = [
      flagStep,
      crossStep,
      { properties: { other: text }, additionalProperties: true },
    ];

    expect(
      omitHiddenCrossStepValues(
        steps,
        { flag: false, extra: 'stale' },
        validator,
      ),
    ).toEqual({ flag: false });
  });

  it('follows chained conditions until nothing more drops', () => {
    const steps: JsonObject[] = [
      flagStep,
      { allOf: [{ if: flagOn, then: { properties: { middle: text } } }] },
      {
        allOf: [
          {
            if: {
              properties: { middle: { const: 'go' } },
              required: ['middle'],
            },
            then: { properties: { last: text } },
          },
        ],
      },
    ];

    expect(
      omitHiddenCrossStepValues(
        steps,
        { flag: false, middle: 'go', last: 'stale' },
        validator,
      ),
    ).toEqual({ flag: false });
  });

  it('ignores conditions inside a nested object', () => {
    const steps: JsonObject[] = [
      { properties: { name: text } },
      {
        properties: {
          settings: {
            type: 'object',
            properties: { mode: text },
            if: {
              properties: { name: { const: 'match' } },
              required: ['name'],
            },
            then: { properties: { nestedField: text } },
          },
        },
      },
    ];
    const formData = {
      name: 'other',
      settings: { mode: 'value', nestedField: 'value' },
    };

    const result = omitHiddenCrossStepValues(steps, formData, validator);

    expect(result).toBe(formData);
    expect(result.settings).toEqual({ mode: 'value', nestedField: 'value' });
  });

  it('returns the input when a step cannot be resolved', () => {
    const steps: JsonObject[] = [
      flagStep,
      crossStep,
      { $ref: '#/definitions/missing' },
    ];
    const formData = { flag: false, extra: 'stale' };

    expect(omitHiddenCrossStepValues(steps, formData, validator)).toBe(
      formData,
    );
  });
});
