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

function childSchemas(
  node: JsonObject,
  skipDependency?: string,
): (JsonValue | undefined)[] {
  const children: (JsonValue | undefined)[] = [node.then, node.else];
  for (const name of ['allOf', 'anyOf', 'oneOf']) {
    const list = node[name];
    if (Array.isArray(list)) {
      children.push(...list);
    }
  }
  if (isObject(node.dependencies)) {
    for (const [name, dependency] of Object.entries(node.dependencies)) {
      if (name !== skipDependency) {
        children.push(dependency);
      }
    }
  }
  return children;
}

function declaresKey(node: JsonValue | undefined, key: string): boolean {
  if (!isObject(node)) {
    return false;
  }
  if (
    isObject(node.properties) &&
    Object.prototype.hasOwnProperty.call(node.properties, key)
  ) {
    return true;
  }
  return childSchemas(node).some(child => declaresKey(child, key));
}

function liftDependency(key: string, value: JsonValue): JsonObject {
  const condition = { required: [key] };

  if (Array.isArray(value)) {
    return { if: condition, then: { required: value } };
  }

  if (!isObject(value)) {
    return { if: condition, then: value };
  }

  const { oneOf, ...rest } = value;
  if (!Array.isArray(oneOf)) {
    return { if: condition, then: value };
  }

  const branches: JsonObject[] = [];
  for (const branch of oneOf) {
    if (
      !isObject(branch) ||
      !isObject(branch.properties) ||
      !Object.prototype.hasOwnProperty.call(branch.properties, key)
    ) {
      continue;
    }

    const { [key]: keyProperty, ...otherProperties } = branch.properties;
    branches.push({
      if: { properties: { [key]: keyProperty }, required: [key] },
      then: { ...branch, properties: otherProperties },
    });
  }

  return {
    if: condition,
    then: {
      ...rest,
      allOf: [...(Array.isArray(rest.allOf) ? rest.allOf : []), ...branches],
    },
  };
}

/**
 * Rewrites top-level dependencies that are keyed on a field the step does not
 * declare into allOf if/then entries, so that they resolve against the whole
 * form state instead of being skipped by rjsf.
 */
export const liftCrossStepDependencies = (schema: JsonObject): JsonObject => {
  const { properties, dependencies } = schema;
  if (!isObject(properties) || !isObject(dependencies)) {
    return schema;
  }

  const remaining: JsonObject = {};
  const lifted: JsonObject[] = [];
  for (const [key, value] of Object.entries(dependencies)) {
    const isOwnKey =
      Object.prototype.hasOwnProperty.call(properties, key) ||
      childSchemas(schema, key).some(child => declaresKey(child, key));
    if (isOwnKey || (!Array.isArray(value) && !isObject(value))) {
      remaining[key] = value;
    } else {
      lifted.push(liftDependency(key, value));
    }
  }

  if (lifted.length === 0) {
    return schema;
  }

  const result: JsonObject = {
    ...schema,
    allOf: [...(Array.isArray(schema.allOf) ? schema.allOf : []), ...lifted],
  };
  if (Object.keys(remaining).length > 0) {
    result.dependencies = remaining;
  } else {
    delete result.dependencies;
  }

  return result;
};
