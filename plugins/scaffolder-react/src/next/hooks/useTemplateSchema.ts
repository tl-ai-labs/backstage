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
import { featureFlagsApiRef, useApi } from '@backstage/core-plugin-api';
import { TemplatePresentationV1beta3 } from '@backstage/plugin-scaffolder-common';
import { JsonObject, JsonValue } from '@backstage/types';
import { UiSchema } from '@rjsf/utils';
import { TemplateParameterSchema } from '@backstage/plugin-scaffolder-react';
import { extractSchemaFromStep } from '../lib';

/**
 * This is the parsed template schema that is returned from the {@link useTemplateSchema} hook.
 * @alpha
 */
export interface ParsedTemplateSchema {
  uiSchema: UiSchema;
  mergedSchema: JsonObject;
  schema: JsonObject;
  title: string;
  description?: string;
}

/**
 * This hook will parse the template schema and return the steps with the
 * parsed schema and uiSchema. Filtering out any steps or properties that
 * are not enabled with feature flags.
 * @alpha
 */
export const useTemplateSchema = (
  manifest: TemplateParameterSchema,
): {
  steps: ParsedTemplateSchema[];
  presentation?: TemplatePresentationV1beta3;
} => {
  const featureFlags = useApi(featureFlagsApiRef);
  const steps = manifest.steps.map(({ title, description, schema }) => ({
    title,
    description,
    mergedSchema: schema,
    ...extractSchemaFromStep(schema),
  }));

  const returningSteps = steps
    // Filter out steps that are not enabled with the feature flags
    .filter(step => {
      const stepFeatureFlag = step.uiSchema['ui:backstage']?.featureFlag;
      return stepFeatureFlag ? featureFlags.isActive(stepFeatureFlag) : true;
    })
    // Then filter out the properties that are not enabled with feature flag
    .map(step => {
      // Title is rendered at the top of the page, so let's ignore this from jsonschemaform
      const { title, ...stepSchema } = step.schema;

      const filterSchemaByFeatureFlags = (
        schemaNode: JsonObject,
      ): JsonObject => {
        const filtered = { ...schemaNode };

        if (filtered.properties && typeof filtered.properties === 'object') {
          const removedKeys = new Set<string>();
          const filteredProperties = Object.fromEntries(
            Object.entries(filtered.properties as JsonObject).filter(
              ([key]) => {
                const stepFeatureFlag =
                  step.uiSchema[key]?.['ui:backstage']?.featureFlag;
                const enabled = stepFeatureFlag
                  ? featureFlags.isActive(stepFeatureFlag)
                  : true;
                if (!enabled) {
                  removedKeys.add(key);
                }
                return enabled;
              },
            ),
          );
          filtered.properties = filteredProperties;

          if (Array.isArray(filtered.required) && removedKeys.size > 0) {
            filtered.required = filtered.required.filter(
              reqKey => typeof reqKey !== 'string' || !removedKeys.has(reqKey),
            );
          }
        }

        if (
          filtered.dependencies &&
          typeof filtered.dependencies === 'object'
        ) {
          filtered.dependencies = Object.fromEntries(
            Object.entries(filtered.dependencies as JsonObject).map(
              ([depKey, depValue]) => {
                if (
                  depValue &&
                  typeof depValue === 'object' &&
                  !Array.isArray(depValue)
                ) {
                  return [
                    depKey,
                    filterSchemaByFeatureFlags(depValue as JsonObject),
                  ];
                }
                return [depKey, depValue];
              },
            ),
          );
        }

        if (filtered.then && typeof filtered.then === 'object') {
          filtered.then = filterSchemaByFeatureFlags(
            filtered.then as JsonObject,
          );
        }

        if (filtered.else && typeof filtered.else === 'object') {
          filtered.else = filterSchemaByFeatureFlags(
            filtered.else as JsonObject,
          );
        }

        ['allOf', 'oneOf', 'anyOf'].forEach(keyword => {
          if (Array.isArray(filtered[keyword])) {
            filtered[keyword] = (filtered[keyword] as JsonValue[]).map(item =>
              item && typeof item === 'object' && !Array.isArray(item)
                ? filterSchemaByFeatureFlags(item as JsonObject)
                : item,
            );
          }
        });

        return filtered;
      };

      const strippedSchema = {
        ...step,
        schema: filterSchemaByFeatureFlags(stepSchema),
      } as ParsedTemplateSchema;

      const hasConditionals = Boolean(
        step.schema?.dependencies ||
          step.schema?.if ||
          step.schema?.allOf ||
          step.schema?.oneOf ||
          step.schema?.anyOf,
      );

      if (!step.schema?.properties && !hasConditionals) {
        strippedSchema.schema.properties = {};
      }

      return strippedSchema;
    });

  return {
    presentation: manifest.presentation,
    steps: returningSteps,
  };
};
