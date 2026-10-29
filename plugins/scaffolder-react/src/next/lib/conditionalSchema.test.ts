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
import {
  resolveStepSchema,
  pruneUnreachableFormState,
  pickConditionData,
} from './conditionalSchema';

describe('conditionalSchema', () => {
  const mobileStep1: JsonObject = {
    type: 'object',
    properties: {
      mobile: {
        type: 'boolean',
      },
    },
  };

  const mobileStep2: JsonObject = {
    type: 'object',
    properties: {
      repo: {
        type: 'string',
      },
    },
    dependencies: {
      mobile: {
        oneOf: [
          {
            properties: {
              mobile: {
                const: true,
              },
              sdkName: {
                type: 'string',
              },
            },
            required: ['sdkName'],
          },
          {
            properties: {
              mobile: {
                const: false,
              },
            },
          },
        ],
      },
    },
  };

  describe('resolveStepSchema', () => {
    it('surfaces a cross-step dependency field when the earlier answer satisfies it', () => {
      const step2Snapshot = JSON.parse(JSON.stringify(mobileStep2));
      const result = resolveStepSchema(mobileStep2, {
        mobile: true,
        repo: 'r',
      });

      expect(result.properties).toEqual({
        repo: {
          type: 'string',
        },
        sdkName: {
          type: 'string',
        },
      });
      expect(result.required).toEqual(['sdkName']);
      expect(result.dependencies).toBeUndefined();
      expect(mobileStep2).toEqual(step2Snapshot);
    });

    it('omits the field and its required entry when the earlier answer does not satisfy the condition', () => {
      const result = resolveStepSchema(mobileStep2, {
        mobile: false,
        repo: 'r',
      });

      expect(result.properties).toEqual({
        repo: {
          type: 'string',
        },
      });
      expect(result.required).toBeUndefined();
      expect(result.dependencies).toBeUndefined();
    });

    it('treats a governing key answered in no step as not holding and does not throw', () => {
      const stepWithUndeclaredGoverningKey: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        dependencies: {
          neverAnswered: {
            properties: {
              extra: {
                type: 'string',
              },
            },
            required: ['extra'],
          },
        },
      };

      let result1: JsonObject | undefined;
      let result2: JsonObject | undefined;

      expect(() => {
        result1 = resolveStepSchema(mobileStep2, { repo: 'r' });
        result2 = resolveStepSchema(stepWithUndeclaredGoverningKey, {
          repo: 'r',
        });
      }).not.toThrow();

      expect(result1?.properties).toEqual({
        repo: {
          type: 'string',
        },
      });
      expect(result1?.required).toBeUndefined();

      expect(result2?.properties).toEqual({
        repo: {
          type: 'string',
        },
      });
      expect(result2?.required).toBeUndefined();
    });

    it('resolves a root-level if/then that references an earlier steps answer', () => {
      const stepWithIfThen: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        if: {
          properties: {
            mobile: {
              const: true,
            },
          },
          required: ['mobile'],
        },
        then: {
          properties: {
            sdkName: {
              type: 'string',
            },
          },
          required: ['sdkName'],
        },
      };

      const trueResult = resolveStepSchema(stepWithIfThen, { mobile: true });
      expect(trueResult.properties).toEqual({
        repo: {
          type: 'string',
        },
        sdkName: {
          type: 'string',
        },
      });
      expect(trueResult.required).toEqual(['sdkName']);
      expect(trueResult.if).toBeUndefined();
      expect(trueResult.then).toBeUndefined();
      expect(trueResult.else).toBeUndefined();

      const falseResult = resolveStepSchema(stepWithIfThen, { mobile: false });
      expect(falseResult.properties).toEqual({
        repo: {
          type: 'string',
        },
      });
      expect(falseResult.required).toBeUndefined();
      expect(falseResult.if).toBeUndefined();
      expect(falseResult.then).toBeUndefined();
      expect(falseResult.else).toBeUndefined();
    });

    it('resolves a dependency whose branch only adds required entries', () => {
      const stepWithRequiredDependency: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
          sdkName: {
            type: 'string',
          },
        },
        dependencies: {
          mobile: ['sdkName'],
        },
      };

      const result = resolveStepSchema(stepWithRequiredDependency, {
        mobile: true,
      });

      expect(result.properties).toEqual({
        repo: {
          type: 'string',
        },
        sdkName: {
          type: 'string',
        },
      });
      expect(result.required).toEqual(['sdkName']);
      expect(result.dependencies).toBeUndefined();
    });

    it('returns the identical object for a step with no cross-step condition', () => {
      const stepNoConditions: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
      };

      const stepSameStepCondition: JsonObject = {
        type: 'object',
        properties: {
          creditCard: {
            type: 'number',
          },
        },
        dependencies: {
          creditCard: {
            properties: {
              billingAddress: {
                type: 'string',
              },
            },
          },
        },
      };

      const stepDependenciesOnlyNoProperties: JsonObject = {
        type: 'object',
        dependencies: {
          mobile: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
        },
      };

      expect(resolveStepSchema(stepNoConditions, { repo: 'r' })).toBe(
        stepNoConditions,
      );
      expect(
        resolveStepSchema(stepSameStepCondition, {
          creditCard: 1234,
        }),
      ).toBe(stepSameStepCondition);
      expect(
        resolveStepSchema(stepDependenciesOnlyNoProperties, {
          mobile: true,
        }),
      ).toBe(stepDependenciesOnlyNoProperties);
    });

    it('filters surfaced properties and required entries according to isPropertyEnabled option', () => {
      const stepWithIfThen: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        if: {
          properties: {
            mobile: {
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
          required: ['sdkName'],
        },
      };

      const disabledResult = (
        resolveStepSchema as (
          schema: JsonObject,
          state: JsonObject,
          options?: { isPropertyEnabled?: (name: string) => boolean },
        ) => JsonObject
      )(
        stepWithIfThen,
        { mobile: true },
        { isPropertyEnabled: name => name !== 'sdkName' },
      );

      expect(disabledResult.properties).not.toHaveProperty('sdkName');
      expect(disabledResult.required).toBeUndefined();

      const enabledResult = resolveStepSchema(stepWithIfThen, { mobile: true });
      expect(enabledResult.properties).toHaveProperty('sdkName');
      expect(enabledResult.required).toEqual(['sdkName']);

      const stepNoCrossStep: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
      };
      expect(resolveStepSchema(stepNoCrossStep, { repo: 'r' })).toBe(
        stepNoCrossStep,
      );
    });
  });

  describe('pruneUnreachableFormState', () => {
    it('drops only the answer whose governing condition stopped holding', () => {
      const state = { mobile: false, repo: 'r', sdkName: 's' };
      const pruned = pruneUnreachableFormState(
        [mobileStep1, mobileStep2],
        state,
      );

      expect(pruned).toEqual({ mobile: false, repo: 'r' });
    });

    it('keeps a conditional answer while its condition still holds and returns the identical state when nothing is unreachable', () => {
      const validState = { mobile: true, repo: 'r', sdkName: 's' };
      const prunedValid = pruneUnreachableFormState(
        [mobileStep1, mobileStep2],
        validState,
      );
      expect(prunedValid).toEqual(validState);

      const unconditionalSteps: JsonObject[] = [
        {
          type: 'object',
          properties: {
            step1Field: { type: 'string' },
          },
        },
        {
          type: 'object',
          properties: {
            step2Field: { type: 'string' },
          },
        },
      ];
      const unconditionalState = {
        step1Field: 'val1',
        step2Field: 'val2',
      };

      const prunedUnconditional = pruneUnreachableFormState(
        unconditionalSteps,
        unconditionalState,
      );
      expect(prunedUnconditional).toBe(unconditionalState);
    });

    it('correctly handles mixed same-step and cross-step conditions', () => {
      const step1: JsonObject = {
        type: 'object',
        properties: {
          mobile: {
            type: 'boolean',
          },
        },
      };

      const mixedStep: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
          creditCard: {
            type: 'boolean',
          },
        },
        dependencies: {
          creditCard: {
            properties: {
              billingAddress: {
                type: 'string',
              },
            },
          },
        },
        if: {
          properties: {
            mobile: {
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
      };

      const activeState = {
        mobile: true,
        repo: 'r',
        creditCard: true,
        billingAddress: '1 Main St',
        sdkName: 'MySDK',
      };

      const activePruned = pruneUnreachableFormState(
        [step1, mixedStep],
        activeState,
      );
      expect(activePruned.billingAddress).toBe('1 Main St');
      expect(activePruned.sdkName).toBe('MySDK');

      const inactiveState = {
        mobile: false,
        repo: 'r',
        creditCard: true,
        billingAddress: '1 Main St',
      };

      const inactivePruned = pruneUnreachableFormState(
        [step1, mixedStep],
        inactiveState,
      );
      expect(inactivePruned.billingAddress).toBe('1 Main St');
      expect(inactivePruned.sdkName).toBeUndefined();
    });

    it('does not drop conditional properties belonging to a step returned by identity or governing keys not declared at top level', () => {
      // 1. Same-step dependencies shape
      const sameStepDeps: JsonObject = {
        type: 'object',
        properties: {
          creditCard: {
            type: 'string',
          },
        },
        dependencies: {
          creditCard: {
            properties: {
              billingAddress: {
                type: 'string',
              },
            },
          },
        },
      };
      const creditCardState = {
        creditCard: '4111',
        billingAddress: '1 High St',
      };
      expect(pruneUnreachableFormState([sameStepDeps], creditCardState)).toBe(
        creditCardState,
      );

      // 2. Dependencies-only shape with NO own properties key
      const depsOnlyNoProps: JsonObject = {
        type: 'object',
        dependencies: {
          mobile: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
        },
      };
      const depsOnlyState = {
        mobile: true,
        sdkName: 'ArcKit',
      };
      expect(pruneUnreachableFormState([depsOnlyNoProps], depsOnlyState)).toBe(
        depsOnlyState,
      );

      // 3. Same-step root if/then shape
      const sameStepIfThen: JsonObject = {
        type: 'object',
        properties: {
          mobile: {
            type: 'boolean',
          },
        },
        if: {
          properties: {
            mobile: {
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
      };
      const sameStepIfThenState = {
        mobile: true,
        sdkName: 'ArcKit',
      };
      expect(
        pruneUnreachableFormState([sameStepIfThen], sameStepIfThenState),
      ).toBe(sameStepIfThenState);

      // 4. Governing key present in formState but declared in no step's top-level properties
      const stepWithUndeclaredGoverningKey: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        dependencies: {
          undeclaredGoverning: {
            properties: {
              extraField: {
                type: 'string',
              },
            },
          },
        },
      };
      const stateWithUndeclaredGoverning = {
        repo: 'my-repo',
        undeclaredGoverning: 'some-value',
        extraField: 'extra',
      };
      const prunedUndeclared = pruneUnreachableFormState(
        [stepWithUndeclaredGoverningKey],
        stateWithUndeclaredGoverning,
      );
      expect(prunedUndeclared.undeclaredGoverning).toBe('some-value');
    });
  });

  describe('pickConditionData', () => {
    it('copies only the keys a steps conditions test', () => {
      const stepWithDeps: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        dependencies: {
          mobile: {
            properties: {
              sdkName: {
                type: 'string',
              },
            },
          },
        },
      };

      const stepWithIf: JsonObject = {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
        },
        if: {
          properties: {
            mobile: {
              const: true,
            },
          },
          required: ['mobile'],
        },
        then: {
          properties: {
            sdkName: {
              type: 'string',
            },
          },
        },
      };

      const fullState = { mobile: true, repo: 'r', unrelated: 1 };
      expect(pickConditionData(stepWithDeps, fullState)).toEqual({
        mobile: true,
      });
      expect(pickConditionData(stepWithIf, fullState)).toEqual({
        mobile: true,
      });

      const missingState = { repo: 'r', unrelated: 1 };
      expect(() => {
        expect(pickConditionData(stepWithDeps, missingState)).toEqual({});
        expect(pickConditionData(stepWithIf, missingState)).toEqual({});
      }).not.toThrow();
    });
  });
});
