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
import { UiSchema, ValidatorType } from '@rjsf/utils';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function subSchemas(value: JsonValue | undefined): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

/**
 * Collects the names of all properties that are declared anywhere in the
 * schema, including inside conditional branches.
 */
function collectDeclaredKeys(schema: JsonValue | undefined, out: Set<string>) {
  if (!isObject(schema)) {
    return;
  }
  if (isObject(schema.properties)) {
    Object.keys(schema.properties).forEach(key => out.add(key));
  }
  if (isObject(schema.dependencies)) {
    Object.values(schema.dependencies).forEach(dep =>
      collectDeclaredKeys(dep, out),
    );
  }
  collectDeclaredKeys(schema.then, out);
  collectDeclaredKeys(schema.else, out);
  for (const list of [schema.allOf, schema.anyOf, schema.oneOf]) {
    subSchemas(list).forEach(sub => collectDeclaredKeys(sub, out));
  }
}

/**
 * Collects the names of the properties that are declared by the schema given
 * the current data, following only the conditional branches that are active.
 */
function collectActiveKeys(
  schema: JsonValue | undefined,
  data: JsonObject,
  validator: ValidatorType,
  rootSchema: JsonObject,
  out: Set<string>,
) {
  if (!isObject(schema)) {
    return;
  }
  const recurse = (sub: JsonValue | undefined) =>
    collectActiveKeys(sub, data, validator, rootSchema, out);

  if (isObject(schema.properties)) {
    Object.keys(schema.properties).forEach(key => out.add(key));
  }

  if (isObject(schema.dependencies)) {
    for (const [key, dep] of Object.entries(schema.dependencies)) {
      if (data[key] === undefined || !isObject(dep)) {
        continue;
      }
      const { oneOf, ...rest } = dep;
      recurse(rest);
      for (const sub of subSchemas(oneOf)) {
        const conditionSchema = isObject(sub.properties)
          ? sub.properties[key]
          : undefined;
        if (
          isObject(conditionSchema) &&
          validator.isValid(conditionSchema, data[key], rootSchema)
        ) {
          recurse(sub);
        }
      }
    }
  }

  if (isObject(schema.if)) {
    recurse(
      validator.isValid(schema.if, data, rootSchema)
        ? schema.then
        : schema.else,
    );
  }

  for (const list of [schema.allOf, schema.anyOf]) {
    subSchemas(list).forEach(recurse);
  }
  subSchemas(schema.oneOf).forEach(recurse);
}

/**
 * Collects the names of the properties that conditions in the schema refer to,
 * i.e. the keys of `dependencies` and the properties used inside `if`.
 */
export function collectConditionKeys(
  schema: JsonValue | undefined,
  out: Set<string> = new Set(),
): Set<string> {
  if (!isObject(schema)) {
    return out;
  }
  if (isObject(schema.dependencies)) {
    for (const [key, dep] of Object.entries(schema.dependencies)) {
      out.add(key);
      collectConditionKeys(dep, out);
    }
  }
  if (isObject(schema.if)) {
    if (isObject(schema.if.properties)) {
      Object.keys(schema.if.properties).forEach(key => out.add(key));
    }
    if (Array.isArray(schema.if.required)) {
      schema.if.required.forEach(
        key => typeof key === 'string' && out.add(key),
      );
    }
  }
  collectConditionKeys(schema.then, out);
  collectConditionKeys(schema.else, out);
  for (const list of [schema.allOf, schema.anyOf, schema.oneOf]) {
    subSchemas(list).forEach(sub => collectConditionKeys(sub, out));
  }
  return out;
}

/**
 * Drops the answers that are only declared inside conditional branches that
 * are not active given the current answers of all steps. Answers that are not
 * declared by any step are kept as they are.
 */
export function pruneInactiveAnswers<T extends JsonObject>(
  answers: T,
  stepSchemas: JsonObject[],
  validator: ValidatorType,
): T {
  const declared = new Set<string>();
  const active = new Set<string>();
  for (const schema of stepSchemas) {
    collectDeclaredKeys(schema, declared);
    collectActiveKeys(schema, answers, validator, schema, active);
  }
  return Object.fromEntries(
    Object.entries(answers).filter(
      ([key]) => !declared.has(key) || active.has(key),
    ),
  ) as T;
}

/**
 * The form library only evaluates `dependencies` for properties that exist in
 * the schema being rendered. For dependencies on a primitive property that is
 * declared by an earlier step, this adds a hidden placeholder property so the
 * dependency is evaluated against the answer given in the earlier step,
 * without rendering a field for it.
 */
export function withCrossStepDependencies(
  schema: JsonObject,
  uiSchema: UiSchema,
  earlierSchemas: JsonObject[],
): { schema: JsonObject; uiSchema: UiSchema } {
  if (!isObject(schema.dependencies)) {
    return { schema, uiSchema };
  }
  const properties = isObject(schema.properties) ? schema.properties : {};
  const placeholders: JsonObject = {};
  const hidden: UiSchema = {};

  for (const key of Object.keys(schema.dependencies)) {
    if (key in properties) {
      continue;
    }
    for (const earlier of earlierSchemas) {
      const definition = isObject(earlier.properties)
        ? earlier.properties[key]
        : undefined;
      if (
        isObject(definition) &&
        typeof definition.type === 'string' &&
        ['string', 'number', 'integer', 'boolean'].includes(definition.type)
      ) {
        placeholders[key] = { type: definition.type };
        hidden[key] = { 'ui:widget': 'hidden' };
        break;
      }
    }
  }

  if (Object.keys(placeholders).length === 0) {
    return { schema, uiSchema };
  }
  return {
    schema: { ...schema, properties: { ...properties, ...placeholders } },
    uiSchema: { ...hidden, ...uiSchema },
  };
}
