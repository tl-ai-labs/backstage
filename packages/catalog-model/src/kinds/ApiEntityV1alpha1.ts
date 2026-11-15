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
import jsonSchema from '../schema/kinds/API.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage API kind Entity. APIs describe the interfaces for Components to communicate.
 *
 * @remarks
 *
 * See {@link https://backstage.io/docs/features/software-catalog/system-model}
 *
 * @public
 */
export interface ApiEntityV1alpha1 extends Entity {
  /**
   * The version of the entity format. Both versions are accepted and have
   * the same shape.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, always `API`.
   */
  kind: 'API';
  /**
   * The API-specific part of the entity.
   */
  spec: {
    /**
     * The format of the API definition, for example `openapi`, `asyncapi`,
     * `graphql` or `grpc`. Any non-empty string is accepted.
     */
    type: string;
    /**
     * The lifecycle state of the API, for example `experimental`,
     * `production` or `deprecated`. Any non-empty string is accepted.
     */
    lifecycle: string;
    /**
     * An entity reference to the owner of the API, for example
     * `group:default/team-a`. The kind defaults to `Group` and the
     * namespace to that of this entity. The catalog creates an `ownedBy`
     * relation from this field.
     */
    owner: string;
    /**
     * The definition of the API, in the format given by `type`.
     */
    definition: string;
    /**
     * An entity reference to the system that the API belongs to. The kind
     * defaults to `System` and the namespace to that of this entity. The
     * catalog creates a `partOf` relation from this field.
     */
    system?: string;
  };
}

/**
 * {@link KindValidator} for {@link ApiEntityV1alpha1}.
 *
 * @public
 */
export const apiEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the API kind.
 *
 * @alpha
 */
export const apiEntityModel = createCatalogModelLayer({
  layerId: 'catalog.backstage.io/kind-api',
  builder: model => {
    model.addKind({
      group: 'backstage.io',
      names: {
        kind: 'API',
        singular: 'api',
        plural: 'apis',
      },
      description:
        'An API describes an interface that can be exposed by a component.',
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
              selector: { path: 'spec.system' },
              relation: 'partOf',
              defaultKind: 'System',
              defaultNamespace: 'inherit',
            },
          ],
          schema: { jsonSchema },
        },
      ],
    });
  },
});
