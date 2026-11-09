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
import { JsonObject } from '@backstage/types';
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

// Returns property names declared inside conditional branches of the schema
export function getConditionalPropertyNames(schema: JsonObject): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  function walk(node: JsonObject) {
    const { allOf, anyOf, oneOf, then, else: _else, dependencies } = node;

    if (Array.isArray(allOf)) {
      for (const item of allOf) {
        if (isObject(item)) {
          inspectAndRecurse(item);
        }
      }
    }

    if (Array.isArray(anyOf)) {
      for (const item of anyOf) {
        if (isObject(item)) {
          inspectAndRecurse(item);
        }
      }
    }

    if (Array.isArray(oneOf)) {
      for (const item of oneOf) {
        if (isObject(item)) {
          inspectAndRecurse(item);
        }
      }
    }

    if (isObject(then)) {
      inspectAndRecurse(then);
    }

    if (isObject(_else)) {
      inspectAndRecurse(_else);
    }

    if (isObject(dependencies)) {
      for (const depName of Object.keys(dependencies)) {
        const depNode = dependencies[depName];
        if (isObject(depNode)) {
          inspectAndRecurse(depNode);
        }
      }
    }
  }

  function inspectAndRecurse(subschema: JsonObject) {
    if (isObject(subschema.properties)) {
      for (const propName of Object.keys(subschema.properties)) {
        if (
          subschema.properties.hasOwnProperty(propName) &&
          !seen.has(propName)
        ) {
          seen.add(propName);
          result.push(propName);
        }
      }
    }
    walk(subschema);
  }

  walk(schema);
  return result;
}

// Tells cross-step conditions apart from same-step conditions in a step schema
export function getCrossStepConditions(schema: JsonObject): {
  keys: string[];
  fields: string[];
  reads: string[];
} {
  function declaredHere(name: string): boolean {
    if (isObject(schema.properties) && schema.properties.hasOwnProperty(name)) {
      return true;
    }

    let schemaWithoutDep: JsonObject = schema;
    if (isObject(schema.dependencies)) {
      const { [name]: _omitted, ...remainingDependencies } =
        schema.dependencies;
      schemaWithoutDep = {
        ...schema,
        dependencies: remainingDependencies,
      };
    }

    return getConditionalPropertyNames(schemaWithoutDep).includes(name);
  }

  function getBranchNames(branch: JsonObject): string[] {
    const names: string[] = [];
    if (isObject(branch.properties)) {
      for (const propName of Object.keys(branch.properties)) {
        if (branch.properties.hasOwnProperty(propName)) {
          names.push(propName);
        }
      }
    }
    names.push(...getConditionalPropertyNames(branch));
    return names;
  }

  interface ConditionInfo {
    readNames: string[];
    branchNames: string[];
  }

  const conditions: ConditionInfo[] = [];

  function inspectIfNode(node: JsonObject) {
    if (isObject(node.if)) {
      const readNames: string[] = [];
      if (isObject(node.if.properties)) {
        for (const propName of Object.keys(node.if.properties)) {
          if (node.if.properties.hasOwnProperty(propName)) {
            readNames.push(propName);
          }
        }
      }
      if (Array.isArray(node.if.required)) {
        for (const req of node.if.required) {
          if (typeof req === 'string' && !readNames.includes(req)) {
            readNames.push(req);
          }
        }
      }

      const branchNames: string[] = [];
      if (isObject(node.then)) {
        branchNames.push(...getBranchNames(node.then));
      }
      if (isObject(node.else)) {
        branchNames.push(...getBranchNames(node.else));
      }

      conditions.push({ readNames, branchNames });
    }
  }

  inspectIfNode(schema);

  if (Array.isArray(schema.allOf)) {
    for (const item of schema.allOf) {
      if (isObject(item)) {
        inspectIfNode(item);
      }
    }
  }

  function inspectDependencyBranches(
    depValue: JsonObject,
    testedNames: string[],
  ) {
    const branches = [
      ...(Array.isArray(depValue.oneOf) ? depValue.oneOf : []),
      ...(Array.isArray(depValue.anyOf) ? depValue.anyOf : []),
    ];
    for (const branch of branches) {
      if (!isObject(branch)) {
        continue;
      }
      if (isObject(branch.properties)) {
        for (const propName of Object.keys(branch.properties)) {
          if (
            branch.properties.hasOwnProperty(propName) &&
            !testedNames.includes(propName)
          ) {
            testedNames.push(propName);
          }
        }
      }
      if (Array.isArray(branch.required)) {
        for (const req of branch.required) {
          if (typeof req === 'string' && !testedNames.includes(req)) {
            testedNames.push(req);
          }
        }
      }
    }
  }

  if (isObject(schema.dependencies)) {
    for (const depKey of Object.keys(schema.dependencies)) {
      if (!schema.dependencies.hasOwnProperty(depKey)) {
        continue;
      }
      const depValue = schema.dependencies[depKey];
      if (isObject(depValue)) {
        const readNames = [depKey];
        inspectDependencyBranches(depValue, readNames);
        conditions.push({
          readNames,
          branchNames: getBranchNames(depValue),
        });
      }
    }
  }

  const keys: string[] = [];
  const reads: string[] = [];
  const crossBranchNames: string[] = [];
  const sameBranchNames = new Set<string>();

  for (const cond of conditions) {
    const isCrossStep = cond.readNames.some(name => !declaredHere(name));
    if (isCrossStep) {
      for (const name of cond.readNames) {
        if (!reads.includes(name)) {
          reads.push(name);
        }
        if (!declaredHere(name) && !keys.includes(name)) {
          keys.push(name);
        }
      }
      for (const field of cond.branchNames) {
        if (!crossBranchNames.includes(field)) {
          crossBranchNames.push(field);
        }
      }
    } else {
      for (const field of cond.branchNames) {
        sameBranchNames.add(field);
      }
    }
  }

  const topLevelProperties = new Set<string>(
    isObject(schema.properties) ? Object.keys(schema.properties) : [],
  );
  const keysSet = new Set<string>(keys);

  const fields = crossBranchNames.filter(
    field =>
      !sameBranchNames.has(field) &&
      !keysSet.has(field) &&
      !topLevelProperties.has(field),
  );

  return { keys, fields, reads };
}
