/*
 * Copyright 2020 The Backstage Authors
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

import { createCatalogModelLayer } from '../model/createCatalogModelLayer';
import type { Entity } from '../entity/Entity';
import jsonSchema from '../schema/kinds/Component.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage catalog Component kind Entity. Represents a single, individual piece of software.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/features/software-catalog/system-model}
 *
 * @public
 */
export interface ComponentEntityV1alpha1 extends Entity {
  /**
   * The version of the entity format. Both versions are accepted and have
   * the same shape.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, always `Component`.
   */
  kind: 'Component';
  /**
   * The Component-specific part of the entity.
   */
  spec: {
    /**
     * The type of component, for example `service`, `website` or `library`.
     * Any non-empty string is accepted.
     */
    type: string;
    /**
     * The lifecycle state of the component, for example `experimental`,
     * `production` or `deprecated`. Any non-empty string is accepted.
     */
    lifecycle: string;
    /**
     * An entity reference to the owner of the component, for example
     * `group:default/team-a`. The kind defaults to `Group` and the
     * namespace to that of this entity. The catalog creates an `ownedBy`
     * relation from this field.
     */
    owner: string;
    /**
     * An entity reference to another component that this component is a
     * part of. The kind defaults to `Component` and the namespace to that of
     * this entity. The catalog creates a `partOf` relation from this field.
     */
    subcomponentOf?: string;
    /**
     * Entity references to the APIs that the component provides. The kind
     * defaults to `API` and the namespace to that of this entity. The catalog
     * creates `providesApi` relations from this field.
     */
    providesApis?: string[];
    /**
     * Entity references to the APIs that the component consumes. The kind
     * defaults to `API` and the namespace to that of this entity. The catalog
     * creates `consumesApi` relations from this field.
     */
    consumesApis?: string[];
    /**
     * Entity references to other entities that the component depends on to
     * function. There is no default kind, so each reference must include its
     * kind, for example `resource:default/database`. The catalog creates
     * `dependsOn` relations from this field.
     */
    dependsOn?: string[];
    /**
     * Entity references to other entities that depend on the component. There
     * is no default kind, so each reference must include its kind. The
     * catalog creates `dependencyOf` relations from this field.
     */
    dependencyOf?: string[];
    /**
     * An entity reference to the system that the component belongs to. The kind
     * defaults to `System` and the namespace to that of this entity. The
     * catalog creates a `partOf` relation from this field.
     */
    system?: string;
  };
}

/**
 * {@link KindValidator} for {@link ComponentEntityV1alpha1}.
 *
 * @public
 */
export const componentEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the Component kind.
 *
 * @alpha
 */
export const componentEntityModel = createCatalogModelLayer({
  layerId: 'catalog.backstage.io/kind-component',
  builder: model => {
    model.addKind({
      group: 'backstage.io',
      names: {
        kind: 'Component',
        singular: 'component',
        plural: 'components',
      },
      description:
        'A Component describes a software component, usually with a distinct deployable or linkable artifact.',
      versions: [
        {
          name: ['v1alpha1', 'v1beta1'],
          relationFields: [
            {
              selector: { path: 'spec.owner' },
              relation: 'ownedBy',
              defaultKind: 'Group',
              defaultNamespace: 'inherit',
              allowedKinds: ['Group', 'User'],
            },
            {
              selector: { path: 'spec.subcomponentOf' },
              relation: 'partOf',
              defaultKind: 'Component',
              defaultNamespace: 'inherit',
            },
            {
              selector: { path: 'spec.providesApis' },
              relation: 'providesApi',
              defaultKind: 'API',
              defaultNamespace: 'inherit',
            },
            {
              selector: { path: 'spec.consumesApis' },
              relation: 'consumesApi',
              defaultKind: 'API',
              defaultNamespace: 'inherit',
            },
            {
              selector: { path: 'spec.dependsOn' },
              relation: 'dependsOn',
              defaultNamespace: 'inherit',
            },
            {
              selector: { path: 'spec.dependencyOf' },
              relation: 'dependencyOf',
              defaultNamespace: 'inherit',
            },
            {
              selector: { path: 'spec.system' },
              relation: 'partOf',
              defaultKind: 'System',
              defaultNamespace: 'inherit',
            },
          ],
          schema: {
            jsonSchema,
          },
        },
      ],
    });
  },
});
