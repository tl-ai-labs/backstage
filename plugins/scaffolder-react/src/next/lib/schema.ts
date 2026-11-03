/*
 * Copyright 2022 The Backstage Authors
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
import { stringify, parse } from 'flatted';
import { FieldValidation, UiSchema } from '@rjsf/utils';
import { Draft07 as JSONSchema } from 'json-schema-library';
import { merge } from 'lodash';
import type { ParsedTemplateSchema } from '../hooks/useTemplateSchema';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractUiSchema(schema: JsonObject, uiSchema: JsonObject) {
  if (!isObject(schema)) {
    return;
  }

  const {
    properties,
    items,
    anyOf,
    oneOf,
    allOf,
    dependencies,
    then,
    else: _else,
  } = schema;

  for (const propName in schema) {
    if (!schema.hasOwnProperty(propName)) {
      continue;
    }

    if (propName.startsWith('ui:')) {
      uiSchema[propName] = schema[propName];
      delete schema[propName];
    }
  }

  if (isObject(properties)) {
    for (const propName in properties) {
      if (!properties.hasOwnProperty(propName)) {
        continue;
      }

      const schemaNode = properties[propName];
      if (!isObject(schemaNode)) {
        continue;
      }

      if (!isObject(uiSchema[propName])) {
        const innerUiSchema = {};
        uiSchema[propName] = innerUiSchema;
      }

      extractUiSchema(schemaNode, uiSchema[propName] as JsonObject);
    }
  }

  if (isObject(items)) {
    const innerUiSchema = {};
    uiSchema.items = innerUiSchema;
    extractUiSchema(items, innerUiSchema);
  }

  if (Array.isArray(anyOf)) {
    for (const schemaNode of anyOf) {
      if (!isObject(schemaNode)) {
        continue;
      }
      extractUiSchema(schemaNode, uiSchema);
    }
  }

  if (Array.isArray(oneOf)) {
    for (const schemaNode of oneOf) {
      if (!isObject(schemaNode)) {
        continue;
      }
      extractUiSchema(schemaNode, uiSchema);
    }
  }

  if (Array.isArray(allOf)) {
    for (const schemaNode of allOf) {
      if (!isObject(schemaNode)) {
        continue;
      }
      extractUiSchema(schemaNode, uiSchema);
    }
  }

  if (isObject(dependencies)) {
    for (const depName of Object.keys(dependencies)) {
      const schemaNode = dependencies[depName];
      if (!isObject(schemaNode)) {
        continue;
      }
      extractUiSchema(schemaNode, uiSchema);
    }
  }

  if (isObject(then)) {
    extractUiSchema(then, uiSchema);
  }

  if (isObject(_else)) {
    extractUiSchema(_else, uiSchema);
  }
}

/**
 * Takes a step from a Backstage Template Manifest and converts it to a JSON Schema and UI Schema for rjsf
 * @alpha
 */
export const extractSchemaFromStep = (
  inputStep: JsonObject,
): { uiSchema: UiSchema; schema: JsonObject } => {
  const uiSchema: UiSchema = {};
  const returnSchema: JsonObject = parse(stringify(inputStep));
  extractUiSchema(returnSchema, uiSchema);
  return { uiSchema, schema: returnSchema };
};

/**
 * Creates a field validation object for use in react jsonschema form
 * @alpha
 */
export const createFieldValidation = (): FieldValidation => {
  const fieldValidation: FieldValidation = {
    __errors: [] as string[],
    addError: (message: string) => {
      fieldValidation.__errors?.push(message);
    },
  };

  return fieldValidation;
};

const isString = (value: JsonValue | undefined): value is string =>
  typeof value === 'string';

function stripUndefined(data: JsonObject): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    result[key] = isObject(value) ? stripUndefined(value) : value;
  }
  return result;
}

function normalizeConditionSchema(schema: JsonObject): JsonObject {
  const result: JsonObject = parse(stringify(schema));
  const props = result.properties;
  if (isObject(props)) {
    result.type = 'object';
    const required = new Set<string>(
      Array.isArray(result.required) ? result.required.filter(isString) : [],
    );
    for (const [key, value] of Object.entries(props)) {
      if (isObject(value)) {
        if (!('not' in value)) {
          required.add(key);
        }
        props[key] = normalizeConditionSchema(value);
      }
    }
    result.required = Array.from(required);
  }
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    const list = result[keyword];
    if (Array.isArray(list)) {
      result[keyword] = list.map(item =>
        isObject(item) ? normalizeConditionSchema(item) : item,
      );
    }
  }
  return result;
}

function matchesSchemaCondition(
  conditionSchema: JsonObject,
  formData: JsonObject,
): boolean {
  const cleanData = stripUndefined(formData);
  const normalized = normalizeConditionSchema(conditionSchema);
  return new JSONSchema(
    normalized as unknown as ConstructorParameters<typeof JSONSchema>[0],
  ).isValid(cleanData);
}

function isDependencyTruthy(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null || value === false) {
    return false;
  }
  if (value === '') {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

function getConditionKeys(conditionSchema: JsonObject): string[] {
  const keys = new Set<string>();
  if (isObject(conditionSchema.properties)) {
    Object.keys(conditionSchema.properties).forEach(k => keys.add(k));
  }
  if (Array.isArray(conditionSchema.required)) {
    conditionSchema.required.filter(isString).forEach(k => keys.add(k));
  }
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    const list = conditionSchema[keyword];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (isObject(item)) {
          getConditionKeys(item).forEach(k => keys.add(k));
        }
      }
    }
  }
  if (isObject(conditionSchema.not)) {
    getConditionKeys(conditionSchema.not).forEach(k => keys.add(k));
  }
  return Array.from(keys);
}

function collectKeysFrom(schema: JsonValue | undefined, keys: Set<string>) {
  if (!isObject(schema)) {
    return;
  }
  if (isObject(schema.properties)) {
    Object.keys(schema.properties).forEach(k => keys.add(k));
  }
  if (isObject(schema.dependencies)) {
    for (const value of Object.values(schema.dependencies)) {
      collectKeysFrom(value, keys);
    }
  }
  collectKeysFrom(schema.then, keys);
  collectKeysFrom(schema.else, keys);
  for (const keyword of ['allOf', 'oneOf', 'anyOf']) {
    const list = schema[keyword];
    if (Array.isArray(list)) {
      list.forEach(item => collectKeysFrom(item, keys));
    }
  }
}

/**
 * Collects every property key defined by the steps, including keys defined in
 * conditional branches but excluding keys only referenced in `if` blocks.
 */
export function collectAllSchemaKeys(
  steps: Pick<ParsedTemplateSchema, 'mergedSchema'>[],
): Set<string> {
  const keys = new Set<string>();
  for (const step of steps) {
    collectKeysFrom(step.mergedSchema, keys);
  }
  return keys;
}

function mergeResolved(
  target: JsonObject,
  source: JsonObject,
  exclude: Set<string>,
) {
  if (isObject(source.properties)) {
    const props: JsonObject = isObject(target.properties)
      ? target.properties
      : {};
    let added = false;
    for (const [key, value] of Object.entries(source.properties)) {
      if (!exclude.has(key)) {
        props[key] = value;
        added = true;
      }
    }
    if (added) {
      target.properties = props;
    }
  }
  if (Array.isArray(source.required)) {
    const required = new Set<string>(
      Array.isArray(target.required) ? target.required.filter(isString) : [],
    );
    source.required
      .filter(isString)
      .filter(k => !exclude.has(k))
      .forEach(k => required.add(k));
    if (required.size > 0) {
      target.required = Array.from(required);
    }
  }
}

function resolveInner(
  schema: JsonObject,
  formData: JsonObject,
  priorStepKeys: Set<string>,
  inheritedKeys: Set<string>,
): JsonObject {
  const cloned: JsonObject = parse(stringify(schema));
  const ownKeys = new Set<string>(inheritedKeys);
  if (isObject(cloned.properties)) {
    Object.keys(cloned.properties).forEach(k => ownKeys.add(k));
  }
  const foreignPrior = Array.from(priorStepKeys).filter(k => !ownKeys.has(k));

  const mergeBranch = (branch: JsonValue | undefined, exclude: Set<string>) => {
    if (!isObject(branch)) {
      return;
    }
    const resolved = resolveInner(branch, formData, priorStepKeys, ownKeys);
    mergeResolved(cloned, resolved, exclude);
  };

  if (isObject(cloned.dependencies)) {
    const deps = cloned.dependencies;
    for (const [depKey, depValue] of Object.entries(deps)) {
      if (ownKeys.has(depKey)) {
        continue;
      }
      delete deps[depKey];
      const exclude = new Set<string>([depKey, ...foreignPrior]);
      const trigger = formData[depKey];

      if (Array.isArray(depValue)) {
        if (isDependencyTruthy(trigger)) {
          const required = new Set<string>(
            Array.isArray(cloned.required) ? cloned.required.filter(isString) : [],
          );
          depValue
            .filter(isString)
            .filter(k => !exclude.has(k))
            .forEach(k => required.add(k));
          cloned.required = Array.from(required);
        }
      } else if (isObject(depValue)) {
        const hasBranches =
          Array.isArray(depValue.oneOf) || Array.isArray(depValue.anyOf);
        for (const keyword of ['oneOf', 'anyOf']) {
          const branches = depValue[keyword];
          if (!Array.isArray(branches)) {
            continue;
          }
          for (const branch of branches) {
            if (!isObject(branch)) {
              continue;
            }
            let matched: boolean;
            if (isObject(branch.properties) && depKey in branch.properties) {
              matched = matchesSchemaCondition(
                {
                  type: 'object',
                  properties: { [depKey]: branch.properties[depKey] },
                },
                formData,
              );
            } else if (isObject(branch.if)) {
              matched = matchesSchemaCondition(branch, formData);
            } else {
              matched = isDependencyTruthy(trigger);
            }
            if (matched) {
              mergeBranch(branch, exclude);
              if (keyword === 'oneOf') {
                break;
              }
            }
          }
        }
        if (Array.isArray(depValue.allOf)) {
          depValue.allOf.forEach(item => mergeBranch(item, exclude));
        }
        if (isObject(depValue.if)) {
          const matched = matchesSchemaCondition(depValue.if, formData);
          mergeBranch(matched ? depValue.then : depValue.else, exclude);
        } else if (
          !hasBranches &&
          (depValue.properties || depValue.required) &&
          isDependencyTruthy(trigger)
        ) {
          mergeResolved(cloned, depValue, exclude);
        }
      }
    }
    if (Object.keys(deps).length === 0) {
      delete cloned.dependencies;
    }
  }

  if (
    isObject(cloned.if) &&
    getConditionKeys(cloned.if).some(k => !ownKeys.has(k))
  ) {
    const condition = cloned.if;
    const thenBranch = cloned.then;
    const elseBranch = cloned.else;
    delete cloned.if;
    delete cloned.then;
    delete cloned.else;
    const matched = matchesSchemaCondition(condition, formData);
    mergeBranch(matched ? thenBranch : elseBranch, new Set(foreignPrior));
  }

  const referencesForeign = (item: JsonObject): boolean => {
    if (isObject(item.if)) {
      if (getConditionKeys(item.if).some(k => !ownKeys.has(k))) {
        return true;
      }
    }
    if (isObject(item.dependencies)) {
      if (Object.keys(item.dependencies).some(k => !ownKeys.has(k))) {
        return true;
      }
    }
    return ['oneOf', 'anyOf'].some(keyword => {
      const list = item[keyword];
      return (
        Array.isArray(list) &&
        list.some(
          branch =>
            isObject(branch) &&
            getConditionKeys(branch).some(
              k => priorStepKeys.has(k) && !ownKeys.has(k),
            ),
        )
      );
    });
  };

  if (Array.isArray(cloned.allOf)) {
    const keep: JsonValue[] = [];
    for (const item of cloned.allOf) {
      if (isObject(item) && referencesForeign(item)) {
        mergeBranch(item, new Set(foreignPrior));
      } else {
        keep.push(item);
      }
    }
    if (keep.length > 0) {
      cloned.allOf = keep;
    } else {
      delete cloned.allOf;
    }
  }

  const foreignSet = new Set(foreignPrior);
  for (const keyword of ['oneOf', 'anyOf']) {
    const branches = cloned[keyword];
    if (
      !Array.isArray(branches) ||
      !branches.some(
        b => isObject(b) && getConditionKeys(b).some(k => foreignSet.has(k)),
      )
    ) {
      continue;
    }
    delete cloned[keyword];
    for (const branch of branches) {
      if (!isObject(branch)) {
        continue;
      }
      const picked: JsonObject = {};
      if (isObject(branch.properties)) {
        for (const [key, value] of Object.entries(branch.properties)) {
          if (foreignSet.has(key)) {
            picked[key] = value;
          }
        }
      }
      if (matchesSchemaCondition({ properties: picked }, formData)) {
        mergeBranch(branch, foreignSet);
        if (keyword === 'oneOf') {
          break;
        }
      }
    }
  }

  return cloned;
}

/**
 * Resolves conditions (dependencies, if/then/else, allOf, oneOf, anyOf) that
 * are controlled by properties from other steps, leaving same-step conditions
 * untouched for rjsf to handle.
 */
export function resolveConditionalSchema(
  schema: JsonObject,
  formData: JsonObject,
  priorStepKeys: Set<string> = new Set(),
): JsonObject {
  return resolveInner(schema, formData, priorStepKeys, new Set());
}

/**
 * Resolves cross-step conditions of a step and re-extracts its schema and uiSchema.
 */
export function resolveStepSchema(
  step: ParsedTemplateSchema,
  formData: JsonObject,
  priorStepKeys: Set<string> = new Set(),
): ParsedTemplateSchema {
  const resolvedMerged = resolveConditionalSchema(
    step.mergedSchema,
    formData,
    priorStepKeys,
  );
  const { schema: extractedSchema, uiSchema: extractedUiSchema } =
    extractSchemaFromStep(resolvedMerged);
  delete extractedSchema.title;

  const mergedProps = step.mergedSchema.properties;
  const stepProps = step.schema.properties;
  if (
    isObject(extractedSchema.properties) &&
    isObject(mergedProps) &&
    isObject(stepProps)
  ) {
    const props = extractedSchema.properties;
    for (const key of Object.keys(props)) {
      if (key in mergedProps && !(key in stepProps)) {
        delete props[key];
      }
    }
  }

  if (isObject(extractedSchema.properties) || !extractedSchema.dependencies) {
    extractedSchema.type = 'object';
    if (!isObject(extractedSchema.properties)) {
      extractedSchema.properties = {};
    }
  }

  const mergedUiSchema: UiSchema = merge({}, extractedUiSchema, step.uiSchema);
  const order = mergedUiSchema['ui:order'];
  if (Array.isArray(order) && !order.includes('*')) {
    const newOrder = [...order];
    if (isObject(extractedSchema.properties)) {
      for (const key of Object.keys(extractedSchema.properties)) {
        if (!newOrder.includes(key)) {
          newOrder.push(key);
        }
      }
    }
    mergedUiSchema['ui:order'] = newOrder;
  }

  return {
    ...step,
    mergedSchema: resolvedMerged,
    schema: extractedSchema,
    uiSchema: mergedUiSchema,
  };
}

/**
 * Returns the keys defined in some step that are not active in any step once
 * cross-step conditions are resolved against the given form data.
 */
export function collectCrossStepHiddenKeys(
  steps: ParsedTemplateSchema[],
  formData: JsonObject,
): Set<string> {
  const priorStepKeys = new Set<string>();
  const candidateKeys = new Set<string>();
  const activeKeys = new Set<string>();

  for (const step of steps) {
    const ownProps: JsonObject = isObject(step.mergedSchema.properties)
      ? step.mergedSchema.properties
      : {};
    const stepCandidateKeys = Array.from(collectAllSchemaKeys([step])).filter(
      k => !priorStepKeys.has(k) || k in ownProps,
    );
    const resolvedMerged = resolveConditionalSchema(
      step.mergedSchema,
      formData,
      priorStepKeys,
    );
    collectAllSchemaKeys([{ mergedSchema: resolvedMerged }]).forEach(k =>
      activeKeys.add(k),
    );
    stepCandidateKeys.forEach(k => {
      priorStepKeys.add(k);
      candidateKeys.add(k);
    });
  }

  return new Set(Array.from(candidateKeys).filter(k => !activeKeys.has(k)));
}
