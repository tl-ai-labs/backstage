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
import { customizeValidator } from '@rjsf/validator-ajv8';

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

const validator = customizeValidator();

export type ResolveStepSchemaOptions = {
  previousStepKeys?: Set<string>;
  resolveAll?: boolean;
};

function hasFieldMetadata(propDef: JsonObject): boolean {
  return (
    'title' in propDef ||
    'description' in propDef ||
    'properties' in propDef ||
    'items' in propDef ||
    'enumNames' in propDef ||
    'default' in propDef ||
    Object.keys(propDef).some(k => k.startsWith('ui:'))
  );
}

function isDiscriminatorConstraint(propDef: JsonObject): boolean {
  const keys = Object.keys(propDef);
  return (
    keys.length > 0 &&
    keys.every(key => key === 'const' || key === 'enum' || key === 'not')
  );
}

function cleanFormData(
  data: Partial<Record<string, JsonValue>>,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (isObject(value)) {
      result[key] = cleanFormData(value as Partial<Record<string, JsonValue>>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function extractConditionKeys(condSchema: JsonObject): Set<string> {
  const keys = new Set<string>();
  if (isObject(condSchema.properties)) {
    for (const key of Object.keys(condSchema.properties)) {
      keys.add(key);
    }
  }
  if (Array.isArray(condSchema.required)) {
    for (const key of condSchema.required) {
      if (typeof key === 'string') {
        keys.add(key);
      }
    }
  }
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    const list = condSchema[keyword];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (isObject(item)) {
          for (const key of extractConditionKeys(item)) {
            keys.add(key);
          }
        }
      }
    }
  }
  if (isObject(condSchema.not)) {
    for (const key of extractConditionKeys(condSchema.not)) {
      keys.add(key);
    }
  }
  return keys;
}

function getBranchConditionKeys(
  branch: JsonObject,
  ownKeys: Set<string>,
  previousStepKeys: Set<string>,
): Set<string> {
  const keys = new Set<string>();
  if (isObject(branch.if)) {
    for (const k of extractConditionKeys(branch.if)) {
      keys.add(k);
    }
  }
  if (isObject(branch.dependencies)) {
    for (const k of Object.keys(branch.dependencies)) {
      keys.add(k);
    }
  }
  if (isObject(branch.properties)) {
    for (const [k, v] of Object.entries(branch.properties)) {
      if (
        previousStepKeys.has(k) ||
        (isObject(v) && isDiscriminatorConstraint(v))
      ) {
        keys.add(k);
      }
    }
  }
  if (Array.isArray(branch.required)) {
    for (const k of branch.required) {
      if (typeof k === 'string' && previousStepKeys.has(k)) {
        keys.add(k);
      }
    }
  }
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    const val = branch[keyword];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isObject(item)) {
          for (const k of getBranchConditionKeys(
            item,
            ownKeys,
            previousStepKeys,
          )) {
            keys.add(k);
          }
        }
      }
    }
  }
  return keys;
}

function isCrossStepKeys(
  keys: Set<string>,
  ownKeys: Set<string>,
  previousStepKeys: Set<string>,
): boolean {
  for (const k of keys) {
    if (previousStepKeys.has(k) || !ownKeys.has(k)) {
      return true;
    }
  }
  return false;
}

function buildBranchTestSchema(
  branch: JsonObject,
  _ownKeys: Set<string>,
  previousStepKeys: Set<string>,
  depKey?: string,
): { testSchema: JsonObject; discriminatorKeys: Set<string> } {
  const discriminatorKeys = new Set<string>();
  const testProperties: JsonObject = {};
  const testRequired = new Set<string>();

  if (isObject(branch.properties)) {
    for (const [k, v] of Object.entries(branch.properties)) {
      if (!isObject(v)) {
        continue;
      }
      const isDisc =
        k === depKey || previousStepKeys.has(k) || isDiscriminatorConstraint(v);
      if (isDisc) {
        discriminatorKeys.add(k);
        testProperties[k] = v;
        if ('const' in v || 'enum' in v) {
          testRequired.add(k);
        }
      }
    }
  }

  if (Array.isArray(branch.required)) {
    for (const req of branch.required) {
      if (
        typeof req === 'string' &&
        (req === depKey ||
          previousStepKeys.has(req) ||
          discriminatorKeys.has(req))
      ) {
        testRequired.add(req);
      }
    }
  }

  if (
    Object.keys(testProperties).length === 0 &&
    testRequired.size === 0 &&
    !isObject(branch.not) &&
    isObject(branch.properties)
  ) {
    const propKeys = Object.keys(branch.properties);
    if (propKeys.length > 0) {
      const anyOfReq = propKeys.map(key => ({ required: [key] }));
      const { anyOf, required: _req, ...restBranch } = branch;
      const testSchema: JsonObject = anyOf
        ? {
            ...restBranch,
            allOf: [{ anyOf }, { anyOf: anyOfReq }],
          }
        : {
            ...restBranch,
            anyOf: anyOfReq,
          };
      return { testSchema, discriminatorKeys };
    }
  }

  const testSchema: JsonObject = { type: 'object' };
  if (Object.keys(testProperties).length > 0) {
    testSchema.properties = testProperties;
  }
  if (testRequired.size > 0) {
    testSchema.required = Array.from(testRequired);
  }
  if (isObject(branch.not)) {
    testSchema.not = branch.not;
  }
  return { testSchema, discriminatorKeys };
}

function mergeBranchIntoSchema(
  target: JsonObject,
  branch: JsonObject,
  cleanData: Record<string, JsonValue>,
  ownKeys: Set<string>,
  previousStepKeys: Set<string>,
  excludedKeys: Set<string>,
  resolveAll: boolean,
) {
  const resolvedBranch = resolveSchemaNode(
    branch,
    cleanData,
    ownKeys,
    previousStepKeys,
    resolveAll,
  );

  if (isObject(resolvedBranch.properties)) {
    if (!isObject(target.properties)) {
      target.properties = {};
    }
    const targetProps = target.properties as JsonObject;
    for (const [k, v] of Object.entries(resolvedBranch.properties)) {
      if (excludedKeys.has(k) || previousStepKeys.has(k)) {
        continue;
      }
      if (isObject(v) && isDiscriminatorConstraint(v)) {
        continue;
      }
      if (isObject(targetProps[k]) && isObject(v)) {
        if (
          !hasFieldMetadata(v) &&
          ('const' in v || 'enum' in v || 'not' in v)
        ) {
          continue;
        }
        const existingObj = targetProps[k] as JsonObject;
        const mergedObj: JsonObject = {
          ...existingObj,
          ...v,
        };
        if (isObject(existingObj.properties) && isObject(v.properties)) {
          mergedObj.properties = {
            ...existingObj.properties,
            ...v.properties,
          };
        }
        if (Array.isArray(existingObj.required) && Array.isArray(v.required)) {
          mergedObj.required = Array.from(
            new Set([
              ...existingObj.required.filter(
                (r): r is string => typeof r === 'string',
              ),
              ...v.required.filter((r): r is string => typeof r === 'string'),
            ]),
          );
        }
        targetProps[k] = mergedObj;
      } else {
        targetProps[k] = v;
      }
      ownKeys.add(k);
    }
  }

  if (Array.isArray(resolvedBranch.required)) {
    const existingReq = Array.isArray(target.required)
      ? (target.required.filter(
          (r): r is string => typeof r === 'string',
        ) as string[])
      : [];
    const reqSet = new Set<string>(existingReq);
    for (const req of resolvedBranch.required) {
      if (
        typeof req === 'string' &&
        !excludedKeys.has(req) &&
        !previousStepKeys.has(req)
      ) {
        reqSet.add(req);
      }
    }
    if (reqSet.size > 0) {
      target.required = Array.from(reqSet);
    }
  }

  if (isObject(resolvedBranch.dependencies)) {
    if (!isObject(target.dependencies)) {
      target.dependencies = {};
    }
    Object.assign(target.dependencies, resolvedBranch.dependencies);
  }

  if (resolvedBranch.if !== undefined) {
    if (
      target.if === undefined &&
      target.then === undefined &&
      target.else === undefined
    ) {
      target.if = resolvedBranch.if;
      if (resolvedBranch.then !== undefined) {
        target.then = resolvedBranch.then;
      }
      if (resolvedBranch.else !== undefined) {
        target.else = resolvedBranch.else;
      }
    } else {
      const condItem: JsonObject = { if: resolvedBranch.if };
      if (resolvedBranch.then !== undefined) {
        condItem.then = resolvedBranch.then;
      }
      if (resolvedBranch.else !== undefined) {
        condItem.else = resolvedBranch.else;
      }
      if (!Array.isArray(target.allOf)) {
        target.allOf = [];
      }
      (target.allOf as JsonValue[]).push(condItem);
    }
  } else {
    for (const keyword of ['then', 'else'] as const) {
      if (
        resolvedBranch[keyword] !== undefined &&
        target[keyword] === undefined
      ) {
        target[keyword] = resolvedBranch[keyword];
      }
    }
  }

  if (Array.isArray(resolvedBranch.allOf)) {
    if (Array.isArray(target.allOf)) {
      (target.allOf as JsonValue[]).push(...resolvedBranch.allOf);
    } else {
      target.allOf = [...resolvedBranch.allOf];
    }
  }

  for (const keyword of ['oneOf', 'anyOf'] as const) {
    if (resolvedBranch[keyword] !== undefined) {
      if (target[keyword] === undefined) {
        target[keyword] = resolvedBranch[keyword];
      } else {
        if (!Array.isArray(target.allOf)) {
          target.allOf = [];
        }
        (target.allOf as JsonValue[]).push({
          [keyword]: resolvedBranch[keyword]!,
        });
      }
    }
  }
}

function resolveDependencyObject(
  target: JsonObject,
  depKey: string,
  depObj: JsonObject,
  cleanData: Record<string, JsonValue>,
  ownKeys: Set<string>,
  previousStepKeys: Set<string>,
  resolveAll: boolean,
) {
  const excluded = new Set<string>(previousStepKeys);
  if (!ownKeys.has(depKey)) {
    excluded.add(depKey);
  }

  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const branches = depObj[keyword];
    if (Array.isArray(branches)) {
      let matched = false;
      let firstObjectBranch: JsonObject | undefined;
      let firstDiscriminatorKeys: Set<string> | undefined;
      for (const branch of branches) {
        if (!isObject(branch)) {
          continue;
        }
        const { testSchema, discriminatorKeys } = buildBranchTestSchema(
          branch,
          ownKeys,
          previousStepKeys,
          depKey,
        );
        if (!firstObjectBranch) {
          firstObjectBranch = branch;
          firstDiscriminatorKeys = discriminatorKeys;
        }
        if (validator.isValid(testSchema, cleanData, target)) {
          matched = true;
          const branchExcluded = new Set<string>(excluded);
          for (const dk of discriminatorKeys) {
            if (!ownKeys.has(dk)) {
              branchExcluded.add(dk);
            }
          }
          mergeBranchIntoSchema(
            target,
            branch,
            cleanData,
            ownKeys,
            previousStepKeys,
            branchExcluded,
            resolveAll,
          );
          if (keyword === 'oneOf') {
            break;
          }
        }
      }
      if (
        !matched &&
        firstObjectBranch &&
        firstDiscriminatorKeys &&
        firstDiscriminatorKeys.size === 0
      ) {
        mergeBranchIntoSchema(
          target,
          firstObjectBranch,
          cleanData,
          ownKeys,
          previousStepKeys,
          excluded,
          resolveAll,
        );
      }
    }
  }

  const restDepObj: JsonObject = { ...depObj };
  delete restDepObj.oneOf;
  delete restDepObj.anyOf;
  if (Object.keys(restDepObj).length > 0) {
    mergeBranchIntoSchema(
      target,
      restDepObj,
      cleanData,
      ownKeys,
      previousStepKeys,
      excluded,
      resolveAll,
    );
  }
}

function resolveSchemaNode(
  schema: JsonObject,
  cleanData: Record<string, JsonValue>,
  ownKeys: Set<string>,
  previousStepKeys: Set<string>,
  resolveAll: boolean,
): JsonObject {
  if (isObject(schema.properties)) {
    for (const k of Object.keys(schema.properties)) {
      if (previousStepKeys.has(k)) {
        delete schema.properties[k];
      } else {
        ownKeys.add(k);
      }
    }
  }

  // 1. Resolve allOf
  if (Array.isArray(schema.allOf)) {
    const remainingAllOf: JsonValue[] = [];
    for (const item of schema.allOf) {
      if (!isObject(item)) {
        remainingAllOf.push(item);
        continue;
      }
      const condKeys = getBranchConditionKeys(item, ownKeys, previousStepKeys);
      const shouldResolve =
        resolveAll ||
        condKeys.size === 0 ||
        isCrossStepKeys(condKeys, ownKeys, previousStepKeys);
      if (shouldResolve) {
        const excluded = new Set<string>(previousStepKeys);
        for (const k of condKeys) {
          if (!ownKeys.has(k)) {
            excluded.add(k);
          }
        }
        mergeBranchIntoSchema(
          schema,
          item,
          cleanData,
          ownKeys,
          previousStepKeys,
          excluded,
          resolveAll,
        );
      } else {
        remainingAllOf.push(item);
      }
    }
    if (remainingAllOf.length > 0) {
      schema.allOf = remainingAllOf;
    } else {
      delete schema.allOf;
    }
  }

  // 2. Resolve if / then / else
  if (isObject(schema.if)) {
    const condKeys = extractConditionKeys(schema.if);
    const shouldResolve =
      resolveAll || isCrossStepKeys(condKeys, ownKeys, previousStepKeys);
    if (shouldResolve) {
      const isMatch = validator.isValid(schema.if, cleanData, schema);
      const chosenBranch = isMatch ? schema.then : schema.else;
      delete schema.if;
      delete schema.then;
      delete schema.else;
      if (isObject(chosenBranch)) {
        const excluded = new Set<string>(previousStepKeys);
        for (const k of condKeys) {
          if (!ownKeys.has(k)) {
            excluded.add(k);
          }
        }
        mergeBranchIntoSchema(
          schema,
          chosenBranch,
          cleanData,
          ownKeys,
          previousStepKeys,
          excluded,
          resolveAll,
        );
      }
    }
  }

  // 3. Resolve dependencies
  if (isObject(schema.dependencies)) {
    const depEntries = Object.entries(schema.dependencies);
    for (const [depKey, depVal] of depEntries) {
      const isCrossStep = previousStepKeys.has(depKey) || !ownKeys.has(depKey);
      if (!resolveAll && !isCrossStep) {
        continue;
      }
      delete schema.dependencies[depKey];
      const depPresent = depKey in cleanData;
      if (!depPresent) {
        continue;
      }
      if (Array.isArray(depVal)) {
        const existingReq = Array.isArray(schema.required)
          ? (schema.required.filter(
              (r): r is string => typeof r === 'string',
            ) as string[])
          : [];
        const reqSet = new Set<string>(existingReq);
        for (const req of depVal) {
          if (typeof req === 'string' && !previousStepKeys.has(req)) {
            reqSet.add(req);
          }
        }
        if (reqSet.size > 0) {
          schema.required = Array.from(reqSet);
        }
      } else if (isObject(depVal)) {
        resolveDependencyObject(
          schema,
          depKey,
          depVal,
          cleanData,
          ownKeys,
          previousStepKeys,
          resolveAll,
        );
      }
    }
    if (Object.keys(schema.dependencies).length === 0) {
      delete schema.dependencies;
    }
  }

  // 4. Resolve root oneOf / anyOf
  for (const keyword of ['oneOf', 'anyOf'] as const) {
    const branches = schema[keyword];
    if (Array.isArray(branches)) {
      const hasCrossStep = branches.some(
        b =>
          isObject(b) &&
          isCrossStepKeys(
            getBranchConditionKeys(b, ownKeys, previousStepKeys),
            ownKeys,
            previousStepKeys,
          ),
      );
      if (resolveAll || hasCrossStep) {
        delete schema[keyword];
        let matched = false;
        let firstObjectBranch: JsonObject | undefined;
        let firstDiscriminatorKeys: Set<string> | undefined;
        for (const branch of branches) {
          if (!isObject(branch)) {
            continue;
          }
          const { testSchema, discriminatorKeys } = buildBranchTestSchema(
            branch,
            ownKeys,
            previousStepKeys,
          );
          if (!firstObjectBranch) {
            firstObjectBranch = branch;
            firstDiscriminatorKeys = discriminatorKeys;
          }
          if (validator.isValid(testSchema, cleanData, schema)) {
            matched = true;
            const excluded = new Set<string>(previousStepKeys);
            for (const dk of discriminatorKeys) {
              if (!ownKeys.has(dk)) {
                excluded.add(dk);
              }
            }
            mergeBranchIntoSchema(
              schema,
              branch,
              cleanData,
              ownKeys,
              previousStepKeys,
              excluded,
              resolveAll,
            );
            if (keyword === 'oneOf') {
              break;
            }
          }
        }
        if (
          !matched &&
          firstObjectBranch &&
          firstDiscriminatorKeys &&
          firstDiscriminatorKeys.size === 0
        ) {
          const excluded = new Set<string>(previousStepKeys);
          mergeBranchIntoSchema(
            schema,
            firstObjectBranch,
            cleanData,
            ownKeys,
            previousStepKeys,
            excluded,
            resolveAll,
          );
        }
      }
    }
  }

  // 5. Recursively resolve nested object properties when resolveAll is true
  if (resolveAll && isObject(schema.properties)) {
    for (const [propKey, propSchema] of Object.entries(schema.properties)) {
      if (
        isObject(propSchema) &&
        (propSchema.type === 'object' ||
          isObject(propSchema.properties) ||
          isObject(propSchema.dependencies) ||
          isObject(propSchema.if) ||
          Array.isArray(propSchema.allOf) ||
          Array.isArray(propSchema.oneOf) ||
          Array.isArray(propSchema.anyOf))
      ) {
        const nestedData = isObject(cleanData[propKey])
          ? (cleanData[propKey] as Record<string, JsonValue>)
          : {};
        const nestedOwnKeys = new Set<string>(
          isObject(propSchema.properties)
            ? Object.keys(propSchema.properties)
            : [],
        );
        schema.properties[propKey] = resolveSchemaNode(
          propSchema,
          nestedData,
          nestedOwnKeys,
          new Set<string>(),
          true,
        );
      }
    }
  }

  return schema;
}

/**
 * Collects all top-level property keys defined directly or in conditional branches of a step schema,
 * excluding pure discriminator constraints and `if` condition schemas.
 */
export function getSchemaPropertyKeys(schema: JsonObject): Set<string> {
  const keys = new Set<string>();

  function collect(node: JsonObject, isInsideBranch: boolean) {
    if (isObject(node.properties)) {
      for (const [k, v] of Object.entries(node.properties)) {
        if (isInsideBranch && isObject(v) && isDiscriminatorConstraint(v)) {
          continue;
        }
        keys.add(k);
      }
    }
    if (isObject(node.then)) {
      collect(node.then, true);
    }
    if (isObject(node.else)) {
      collect(node.else, true);
    }
    for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
      const list = node[keyword];
      if (Array.isArray(list)) {
        for (const item of list) {
          if (isObject(item)) {
            collect(item, true);
          }
        }
      }
    }
    if (isObject(node.dependencies)) {
      for (const depVal of Object.values(node.dependencies)) {
        if (isObject(depVal)) {
          collect(depVal, true);
        }
      }
    }
  }

  collect(schema, false);
  return keys;
}

/**
 * Resolves cross-step (or all) JSON Schema conditional constructs (`if`/`then`/`else`,
 * `dependencies`, `allOf`, `oneOf`, `anyOf`) against the provided `formData`.
 */
export function resolveStepSchema(
  inputSchema: JsonObject,
  formData: Partial<Record<string, JsonValue>> = {},
  options?: ResolveStepSchemaOptions,
): JsonObject {
  const clonedSchema: JsonObject = parse(stringify(inputSchema));
  const previousStepKeys = new Set<string>(options?.previousStepKeys);
  const resolveAll = options?.resolveAll ?? false;
  const cleanData = cleanFormData(formData);

  const ownKeys = new Set<string>();
  if (isObject(clonedSchema.properties)) {
    for (const k of Object.keys(clonedSchema.properties)) {
      ownKeys.add(k);
      previousStepKeys.delete(k);
    }
  }
  for (const k of getSchemaPropertyKeys(clonedSchema)) {
    if (!previousStepKeys.has(k)) {
      ownKeys.add(k);
    }
  }

  return resolveSchemaNode(
    clonedSchema,
    cleanData,
    ownKeys,
    previousStepKeys,
    resolveAll,
  );
}
