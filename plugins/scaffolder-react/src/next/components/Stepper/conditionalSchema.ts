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
import { JsonObject, JsonValue } from '@backstage/types';
import {
  retrieveSchema,
  type RJSFSchema,
  type ValidatorType,
} from '@rjsf/utils';
import { type ParsedTemplateSchema } from '../../hooks/useTemplateSchema';
import { isObject } from './utils';

export interface CrossStepDependencyResult {
  steps: ParsedTemplateSchema[];
  injectedKeysByStep: Set<string>[];
}

/**
 * For each step's render schema, if a top-level `dependencies` key is not
 * present in that step's `properties` but is defined in an earlier step's
 * `properties`, injects that property's definition into the step's render
 * schema `properties` and marks it hidden in `uiSchema` (`ui:widget: 'hidden'`)
 * without adding it to `required`.
 */
export function injectCrossStepDependencies(
  steps: ParsedTemplateSchema[],
): CrossStepDependencyResult {
  const priorProperties: Record<string, JsonValue> = {};
  const injectedKeysByStep: Set<string>[] = [];

  const updatedSteps = steps.map(step => {
    const ownProperties = isObject(step.schema.properties)
      ? step.schema.properties
      : undefined;
    const dependencies = isObject(step.schema.dependencies)
      ? step.schema.dependencies
      : undefined;

    const injectedKeys = new Set<string>();
    injectedKeysByStep.push(injectedKeys);

    let resultStep = step;

    if (dependencies) {
      const injectedProperties: Record<string, JsonValue> = {};
      const injectedUiSchema: Record<string, JsonObject> = {};

      for (const depKey of Object.keys(dependencies)) {
        const isOwnProperty =
          ownProperties !== undefined &&
          Object.prototype.hasOwnProperty.call(ownProperties, depKey);

        if (
          !isOwnProperty &&
          Object.prototype.hasOwnProperty.call(priorProperties, depKey)
        ) {
          injectedKeys.add(depKey);
          injectedProperties[depKey] = priorProperties[depKey];
          const existingUi = isObject(step.uiSchema[depKey])
            ? (step.uiSchema[depKey] as JsonObject)
            : {};
          injectedUiSchema[depKey] = {
            ...existingUi,
            'ui:widget': 'hidden',
          };
        }
      }

      if (injectedKeys.size > 0) {
        resultStep = {
          ...step,
          schema: {
            ...step.schema,
            properties: {
              ...(ownProperties ?? {}),
              ...injectedProperties,
            },
          },
          uiSchema: {
            ...step.uiSchema,
            ...injectedUiSchema,
          },
        };
      }
    }

    if (ownProperties) {
      Object.assign(priorProperties, ownProperties);
    }

    return resultStep;
  });

  return { steps: updatedSteps, injectedKeysByStep };
}

function collectConditionalKeysFromNode(
  node: JsonObject,
  inConditionalBranch: boolean,
  keys: Set<string>,
): void {
  if (inConditionalBranch && isObject(node.properties)) {
    for (const key of Object.keys(node.properties)) {
      keys.add(key);
    }
  }

  if (isObject(node.then)) {
    collectConditionalKeysFromNode(node.then, true, keys);
  }
  if (isObject(node.else)) {
    collectConditionalKeysFromNode(node.else, true, keys);
  }
  if (isObject(node.dependencies)) {
    for (const depValue of Object.values(node.dependencies)) {
      if (isObject(depValue)) {
        collectConditionalKeysFromNode(depValue, true, keys);
      }
    }
  }
  if (Array.isArray(node.oneOf)) {
    for (const item of node.oneOf) {
      if (isObject(item)) {
        collectConditionalKeysFromNode(item, inConditionalBranch, keys);
      }
    }
  }
  if (Array.isArray(node.anyOf)) {
    for (const item of node.anyOf) {
      if (isObject(item)) {
        collectConditionalKeysFromNode(item, inConditionalBranch, keys);
      }
    }
  }
  if (Array.isArray(node.allOf)) {
    for (const item of node.allOf) {
      if (isObject(item)) {
        collectConditionalKeysFromNode(item, inConditionalBranch, keys);
      }
    }
  }
}

/**
 * Collects top-level property keys declared inside any step's conditional
 * branch (`dependencies` subschemas, `then`/`else`, including inside
 * `allOf`/`anyOf`/`oneOf`).
 */
export function collectConditionalKeys(
  steps: ParsedTemplateSchema[],
): Set<string> {
  const keys = new Set<string>();
  for (const step of steps) {
    if (isObject(step.schema)) {
      collectConditionalKeysFromNode(step.schema, false, keys);
    }
  }
  return keys;
}

/**
 * Returns a copy of `formData` with stale conditional values removed.
 * A top-level key is pruned only if it is declared inside some step's
 * conditional branch and is not present in any step's resolved schema for the
 * current data. Repeats until stable so chained conditions are handled.
 */
export function pruneConditionalFormData(
  formData: Record<string, JsonValue>,
  steps: ParsedTemplateSchema[],
  validator: ValidatorType,
  injectedKeysByStep?: Set<string>[],
): Record<string, JsonValue> {
  const conditionalKeys = collectConditionalKeys(steps);
  if (conditionalKeys.size === 0) {
    return formData;
  }

  let currentData: Record<string, JsonValue> = { ...formData };
  const maxIterations = Object.keys(currentData).length + 1;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const activeKeys = new Set<string>();

    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const step = steps[stepIndex];
      const injectedKeys = injectedKeysByStep?.[stepIndex];
      const resolved = retrieveSchema(
        validator,
        step.schema as RJSFSchema,
        step.schema as RJSFSchema,
        currentData,
      );
      const resolvedProperties = resolved?.properties;
      if (
        typeof resolvedProperties === 'object' &&
        resolvedProperties !== null &&
        !Array.isArray(resolvedProperties)
      ) {
        for (const key of Object.keys(resolvedProperties)) {
          if (!injectedKeys?.has(key)) {
            activeKeys.add(key);
          }
        }
      }
    }

    let prunedAny = false;
    const nextData: Record<string, JsonValue> = {};
    for (const [key, value] of Object.entries(currentData)) {
      if (conditionalKeys.has(key) && !activeKeys.has(key)) {
        prunedAny = true;
      } else {
        nextData[key] = value;
      }
    }

    if (!prunedAny) {
      return currentData;
    }

    currentData = nextData;
  }

  return currentData;
}
