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
import jsonSchema from '../schema/kinds/User.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage catalog User kind Entity.
 *
 * @public
 */
export interface UserEntityV1alpha1 extends Entity {
  /**
   * The version of the specification format that the entity is written
   * against, either `backstage.io/v1alpha1` or `backstage.io/v1beta1`.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, which is `User`.
   */
  kind: 'User';
  /**
   * The specification data of the user, whose fields are both optional:
   * `profile` and `memberOf`.
   */
  spec: {
    profile?: {
      displayName?: string;
      email?: string;
      picture?: string;
    };
    memberOf?: string[];
  };
}

/**
 * {@link KindValidator} for {@link UserEntityV1alpha1}.
 *
 * @public
 */
export const userEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the User kind.
 *
 * @alpha
 */
export const userEntityModel = createCatalogModelLayer({
  layerId: 'catalog.backstage.io/kind-user',
  builder: model => {
    model.addKind({
      group: 'backstage.io',
      names: {
        kind: 'User',
        singular: 'user',
        plural: 'users',
      },
      description:
        'A User describes a person, such as an employee or a contractor.',
      versions: [
        {
          name: ['v1alpha1', 'v1beta1'],
          relationFields: [
            {
              selector: { path: 'spec.memberOf' },
              relation: 'memberOf',
              defaultKind: 'Group',
              defaultNamespace: 'inherit',
              allowedKinds: ['Group'],
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
