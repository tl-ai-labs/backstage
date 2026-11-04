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
import { Draft07 as JSONSchema } from 'json-schema-library';
import isEqual from 'lodash/isEqual';
import { stringify, parse } from 'flatted';
import { FieldValidation, UiSchema } from '@rjsf/utils';

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
    if (!isObject(uiSchema.items)) {
      uiSchema.items = {};
    }
    extractUiSchema(items, uiSchema.items as JsonObject);
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

export type ResolveSchemaOptions = {
  earlierStepKeys?: Set<string>;
  booleanKeys?: Set<string>;
};

export function isConditionOnlyProperty(
  propKey: string,
  propSchema: JsonObject,
  options?: {
    depKey?: string;
    baseProperties?: JsonObject;
    earlierStepKeys?: Set<string>;
  },
): boolean {
  if (options?.depKey === propKey) {
    return true;
  }
  if ('not' in propSchema || 'const' in propSchema) {
    return true;
  }
  if (
    !('type' in propSchema) &&
    !('title' in propSchema) &&
    !('ui:field' in propSchema) &&
    !('ui:widget' in propSchema) &&
    !('properties' in propSchema) &&
    !('items' in propSchema)
  ) {
    return true;
  }
  if (
    Boolean(options?.earlierStepKeys?.has(propKey)) &&
    !(options?.baseProperties && propKey in options.baseProperties) &&
    'enum' in propSchema &&
    !('title' in propSchema)
  ) {
    return true;
  }
  return false;
}

function hasDependencyValue(val: JsonValue | undefined): boolean {
  return (
    val !== undefined &&
    val !== null &&
    val !== false &&
    val !== '' &&
    (!Array.isArray(val) || val.length > 0)
  );
}

function matchesPropertyCondition(
  propKey: string,
  propCond: JsonObject,
  data: JsonObject,
  booleanKeys: Set<string>,
): boolean {
  const val = data[propKey];
  const isBooleanProp = booleanKeys.has(propKey);
  const effectiveVal = val === undefined && isBooleanProp ? false : val;

  if ('not' in propCond && isObject(propCond.not)) {
    const notCond = propCond.not as JsonObject;
    const innerMatches = matchesPropertyCondition(
      propKey,
      notCond,
      data,
      booleanKeys,
    );
    const keys = Object.keys(propCond);
    if (
      keys.every(k => k === 'not' || k === 'type') ||
      keys.length === 1 ||
      (keys.length === 2 && 'type' in propCond)
    ) {
      return !innerMatches;
    }
    if (innerMatches) {
      return false;
    }
  }

  if (Array.isArray(propCond.allOf)) {
    const allMatches = propCond.allOf.every(
      sub =>
        isObject(sub) &&
        matchesPropertyCondition(propKey, sub, data, booleanKeys),
    );
    if (!allMatches) {
      return false;
    }
  }

  if (Array.isArray(propCond.anyOf)) {
    const anyMatches = propCond.anyOf.some(
      sub =>
        isObject(sub) &&
        matchesPropertyCondition(propKey, sub, data, booleanKeys),
    );
    if (!anyMatches) {
      return false;
    }
  }

  if (Array.isArray(propCond.oneOf)) {
    const oneMatches =
      propCond.oneOf.filter(
        sub =>
          isObject(sub) &&
          matchesPropertyCondition(propKey, sub, data, booleanKeys),
      ).length === 1;
    if (!oneMatches) {
      return false;
    }
  }

  if ('const' in propCond) {
    return isEqual(effectiveVal, propCond.const);
  }

  if ('enum' in propCond && Array.isArray(propCond.enum)) {
    return (
      effectiveVal !== undefined &&
      propCond.enum.some(item => isEqual(effectiveVal, item))
    );
  }

  if ('properties' in propCond || 'required' in propCond) {
    return (
      isObject(effectiveVal) &&
      matchesCondition(propCond, effectiveVal, booleanKeys)
    );
  }

  const standardKeys = new Set([
    'not',
    'allOf',
    'anyOf',
    'oneOf',
    'const',
    'enum',
    'properties',
    'required',
    'title',
    'description',
  ]);
  const hasOtherKeywords = Object.keys(propCond).some(
    k => !standardKeys.has(k),
  );

  if (hasOtherKeywords) {
    if (val === undefined) {
      return false;
    }
    const validator = new JSONSchema({
      type: 'object',
      properties: { [propKey]: propCond },
      required: [propKey],
    });
    return validator.validate({ [propKey]: effectiveVal }).length === 0;
  }

  return true;
}

function matchesCondition(
  cond: JsonObject,
  data: JsonObject,
  booleanKeys: Set<string>,
): boolean {
  if ('not' in cond && isObject(cond.not)) {
    if (matchesCondition(cond.not as JsonObject, data, booleanKeys)) {
      return false;
    }
  }

  if (Array.isArray(cond.allOf)) {
    if (
      !cond.allOf.every(
        sub => isObject(sub) && matchesCondition(sub, data, booleanKeys),
      )
    ) {
      return false;
    }
  }

  if (Array.isArray(cond.anyOf)) {
    if (
      !cond.anyOf.some(
        sub => isObject(sub) && matchesCondition(sub, data, booleanKeys),
      )
    ) {
      return false;
    }
  }

  if (Array.isArray(cond.oneOf)) {
    const matchesCount = cond.oneOf.filter(
      sub => isObject(sub) && matchesCondition(sub, data, booleanKeys),
    ).length;
    if (matchesCount !== 1) {
      return false;
    }
  }

  if (Array.isArray(cond.required)) {
    for (const reqKey of cond.required) {
      if (typeof reqKey === 'string') {
        const hasPropCond =
          isObject(cond.properties) && isObject(cond.properties[reqKey]);
        if (!hasPropCond && !hasDependencyValue(data[reqKey])) {
          return false;
        }
      }
    }
  }

  if (isObject(cond.properties)) {
    for (const [propKey, propCond] of Object.entries(cond.properties)) {
      if (
        isObject(propCond) &&
        !matchesPropertyCondition(propKey, propCond, data, booleanKeys)
      ) {
        return false;
      }
    }
  }

  return true;
}

export function resolveConditionalSchema(
  schema: JsonObject,
  formData: JsonObject,
  options?: ResolveSchemaOptions,
): JsonObject {
  const result: JsonObject = parse(stringify(schema));
  const effectiveData: JsonObject = { ...formData };
  const booleanKeys = new Set<string>(options?.booleanKeys);

  const baseProps = isObject(result.properties) ? result.properties : {};

  for (const [propKey, propSchema] of Object.entries(baseProps)) {
    if (isObject(propSchema)) {
      if (propSchema.type === 'boolean') {
        booleanKeys.add(propKey);
      }
      if (effectiveData[propKey] === undefined && 'default' in propSchema) {
        effectiveData[propKey] = propSchema.default as JsonValue;
      }
    }
  }

  const resolvedProperties: JsonObject = { ...baseProps };
  const resolvedRequired = new Set<string>(
    Array.isArray(result.required) ? (result.required as string[]) : [],
  );

  function mergeBranch(branch: JsonObject, depKey?: string) {
    const resolvedBranch = resolveConditionalSchema(branch, effectiveData, {
      ...options,
      booleanKeys,
    });

    if (isObject(resolvedBranch.properties)) {
      for (const [key, propDef] of Object.entries(resolvedBranch.properties)) {
        if (
          isObject(propDef) &&
          !isConditionOnlyProperty(key, propDef, {
            depKey,
            baseProperties: baseProps,
            earlierStepKeys: options?.earlierStepKeys,
          })
        ) {
          resolvedProperties[key] = propDef;
          if (propDef.type === 'boolean') {
            booleanKeys.add(key);
          }
          if (effectiveData[key] === undefined && 'default' in propDef) {
            effectiveData[key] = propDef.default as JsonValue;
          }
        }
      }
    }

    if (Array.isArray(resolvedBranch.required)) {
      for (const reqKey of resolvedBranch.required) {
        if (typeof reqKey === 'string') {
          if (
            reqKey !== depKey &&
            (reqKey in resolvedProperties ||
              !options?.earlierStepKeys?.has(reqKey))
          ) {
            resolvedRequired.add(reqKey);
          }
        }
      }
    }
  }

  if (Array.isArray(result.allOf)) {
    for (const sub of result.allOf) {
      if (isObject(sub)) {
        mergeBranch(sub);
      }
    }
    delete result.allOf;
  }

  if (isObject(result.if)) {
    const ifCond = result.if as JsonObject;
    const matches = matchesCondition(ifCond, effectiveData, booleanKeys);
    if (matches && isObject(result.then)) {
      mergeBranch(result.then as JsonObject);
    } else if (!matches && isObject(result.else)) {
      mergeBranch(result.else as JsonObject);
    }
    delete result.if;
    delete result.then;
    delete result.else;
  }

  if (isObject(result.dependencies)) {
    for (const [depKey, depValue] of Object.entries(result.dependencies)) {
      if (Array.isArray(depValue)) {
        if (hasDependencyValue(effectiveData[depKey])) {
          for (const reqKey of depValue) {
            if (typeof reqKey === 'string') {
              resolvedRequired.add(reqKey);
            }
          }
        }
      } else if (isObject(depValue)) {
        if (Array.isArray(depValue.oneOf)) {
          for (const branch of depValue.oneOf) {
            if (isObject(branch)) {
              if (
                isObject(branch.properties) &&
                isObject(branch.properties[depKey])
              ) {
                if (
                  matchesPropertyCondition(
                    depKey,
                    branch.properties[depKey] as JsonObject,
                    effectiveData,
                    booleanKeys,
                  )
                ) {
                  mergeBranch(branch, depKey);
                }
              } else if (hasDependencyValue(effectiveData[depKey])) {
                mergeBranch(branch, depKey);
              }
            }
          }
        } else if (Array.isArray(depValue.anyOf)) {
          for (const branch of depValue.anyOf) {
            if (isObject(branch)) {
              if (
                isObject(branch.properties) &&
                isObject(branch.properties[depKey])
              ) {
                if (
                  matchesPropertyCondition(
                    depKey,
                    branch.properties[depKey] as JsonObject,
                    effectiveData,
                    booleanKeys,
                  )
                ) {
                  mergeBranch(branch, depKey);
                }
              } else if (hasDependencyValue(effectiveData[depKey])) {
                mergeBranch(branch, depKey);
              }
            }
          }
        } else if (Array.isArray(depValue.allOf)) {
          if (hasDependencyValue(effectiveData[depKey])) {
            for (const branch of depValue.allOf) {
              if (isObject(branch)) {
                mergeBranch(branch, depKey);
              }
            }
          }
        } else if (isObject(depValue.if)) {
          if (hasDependencyValue(effectiveData[depKey])) {
            mergeBranch(depValue, depKey);
          }
        } else if (hasDependencyValue(effectiveData[depKey])) {
          mergeBranch(depValue, depKey);
        }
      }
    }
    delete result.dependencies;
  }

  function isConditionalVariants(variants: unknown[]): boolean {
    return variants.some(
      variant =>
        isObject(variant) &&
        ('if' in variant ||
          (isObject(variant.properties) &&
            Object.entries(variant.properties).some(([k, propDef]) =>
              isObject(propDef)
                ? isConditionOnlyProperty(k, propDef, {
                    baseProperties: baseProps,
                    earlierStepKeys: options?.earlierStepKeys,
                  })
                : false,
            ))),
    );
  }

  if (Array.isArray(result.oneOf) && isConditionalVariants(result.oneOf)) {
    for (const branch of result.oneOf) {
      if (isObject(branch)) {
        let branchMatches = true;
        if (isObject(branch.properties)) {
          for (const [k, propDef] of Object.entries(branch.properties)) {
            if (
              isObject(propDef) &&
              isConditionOnlyProperty(k, propDef, {
                baseProperties: baseProps,
                earlierStepKeys: options?.earlierStepKeys,
              })
            ) {
              if (
                !matchesPropertyCondition(
                  k,
                  propDef,
                  effectiveData,
                  booleanKeys,
                )
              ) {
                branchMatches = false;
                break;
              }
            }
          }
        }
        if (isObject(branch.if)) {
          branchMatches =
            branchMatches &&
            matchesCondition(
              branch.if as JsonObject,
              effectiveData,
              booleanKeys,
            );
        }
        if (branchMatches) {
          mergeBranch(branch);
        }
      }
    }
    delete result.oneOf;
  }

  if (Array.isArray(result.anyOf) && isConditionalVariants(result.anyOf)) {
    for (const branch of result.anyOf) {
      if (isObject(branch)) {
        let branchMatches = true;
        if (isObject(branch.properties)) {
          for (const [k, propDef] of Object.entries(branch.properties)) {
            if (
              isObject(propDef) &&
              isConditionOnlyProperty(k, propDef, {
                baseProperties: baseProps,
                earlierStepKeys: options?.earlierStepKeys,
              })
            ) {
              if (
                !matchesPropertyCondition(
                  k,
                  propDef,
                  effectiveData,
                  booleanKeys,
                )
              ) {
                branchMatches = false;
                break;
              }
            }
          }
        }
        if (isObject(branch.if)) {
          branchMatches =
            branchMatches &&
            matchesCondition(
              branch.if as JsonObject,
              effectiveData,
              booleanKeys,
            );
        }
        if (branchMatches) {
          mergeBranch(branch);
        }
      }
    }
    delete result.anyOf;
  }

  for (const [propKey, propDef] of Object.entries(resolvedProperties)) {
    if (isObject(propDef) && propDef.type === 'object') {
      const nestedData = isObject(effectiveData[propKey])
        ? (effectiveData[propKey] as JsonObject)
        : {};
      resolvedProperties[propKey] = resolveConditionalSchema(
        propDef,
        nestedData,
        options,
      );
    }
  }

  result.properties = resolvedProperties;
  if (resolvedRequired.size > 0) {
    result.required = Array.from(resolvedRequired);
  } else {
    delete result.required;
  }

  return result;
}

export function collectAllSchemaPropertyKeys(
  schema: JsonObject,
  earlierStepKeys?: Set<string>,
  depKey?: string,
): Set<string> {
  const keys = new Set<string>();

  const baseProps = isObject(schema.properties) ? schema.properties : undefined;

  function visit(node: unknown, currentDepKey?: string) {
    if (!isObject(node)) {
      return;
    }

    if (isObject(node.properties)) {
      for (const [propKey, propDef] of Object.entries(node.properties)) {
        if (
          isObject(propDef) &&
          !isConditionOnlyProperty(propKey, propDef, {
            depKey: currentDepKey ?? depKey,
            baseProperties: baseProps,
            earlierStepKeys,
          })
        ) {
          keys.add(propKey);
        }
      }
    }

    if (isObject(node.then)) {
      visit(node.then, currentDepKey);
    }
    if (isObject(node.else)) {
      visit(node.else, currentDepKey);
    }
    if (Array.isArray(node.allOf)) {
      node.allOf.forEach(sub => visit(sub, currentDepKey));
    }
    if (Array.isArray(node.oneOf)) {
      node.oneOf.forEach(sub => visit(sub, currentDepKey));
    }
    if (Array.isArray(node.anyOf)) {
      node.anyOf.forEach(sub => visit(sub, currentDepKey));
    }
    if (isObject(node.dependencies)) {
      for (const [dKey, depValue] of Object.entries(node.dependencies)) {
        if (isObject(depValue)) {
          visit(depValue, dKey);
        }
      }
    }
  }

  visit(schema, depKey);
  return keys;
}
