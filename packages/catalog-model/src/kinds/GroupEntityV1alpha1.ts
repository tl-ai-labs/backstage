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
import jsonSchema from '../schema/kinds/Group.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage catalog Group kind Entity.
 *
 * @public
 */
export interface GroupEntityV1alpha1 extends Entity {
  /**
   * The version of the entity format. Both versions are accepted and have
   * the same shape.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, always `Group`.
   */
  kind: 'Group';
  /**
   * The Group-specific part of the entity.
   */
  spec: {
    /**
     * The type of group, for example `team` or `business-unit`. There is no
     * enforced set of values; each organization chooses its own.
     */
    type: string;
    /**
     * Optional profile information about the group, mainly for display
     * purposes.
     */
    profile?: {
      /**
       * A display name to present to users.
       */
      displayName?: string;
      /**
       * An email address where the group can be reached.
       */
      email?: string;
      /**
       * The URL of an image that represents the group, suitable for showing
       * on a group page.
       */
      picture?: string;
    };
    /**
     * An entity reference to the immediate parent group, if any. A group can
     * have at most one parent, and the catalog supports multiple root groups.
     * The kind defaults to `Group` and the namespace to that of this entity.
     * The catalog creates a `childOf` relation from this field.
     */
    parent?: string;
    /**
     * Entity references to the immediate child groups. Required by the
     * schema, but may be empty. The order is not significant. The kind
     * defaults to `Group` and the namespace to that of this entity. The
     * catalog creates `parentOf` relations from this field.
     */
    children: string[];
    /**
     * Entity references to the users that are direct members of the group.
     * The kind defaults to `User` and the namespace to that of this entity.
     * The catalog creates `hasMember` relations from this field.
     */
    members?: string[];
  };
}

/**
 * {@link KindValidator} for {@link GroupEntityV1alpha1}.
 * @public
 */
export const groupEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the Group kind.
 *
 * @alpha
 */
export const groupEntityModel = createCatalogModelLayer({
  layerId: 'catalog.backstage.io/kind-group',
  builder: model => {
    model.addKind({
      group: 'backstage.io',
      names: {
        kind: 'Group',
        singular: 'group',
        plural: 'groups',
      },
      description:
        'A Group describes an organizational entity, such as a team, a business unit, or a loose collection of people.',
      versions: [
        {
          name: ['v1alpha1', 'v1beta1'],
          relationFields: [
            {
              selector: { path: 'spec.parent' },
              relation: 'childOf',
              defaultKind: 'Group',
              defaultNamespace: 'inherit',
              allowedKinds: ['Group'],
            },
            {
              selector: { path: 'spec.children' },
              relation: 'parentOf',
              defaultKind: 'Group',
              defaultNamespace: 'inherit',
              allowedKinds: ['Group'],
            },
            {
              selector: { path: 'spec.members' },
              relation: 'hasMember',
              defaultKind: 'User',
              defaultNamespace: 'inherit',
              allowedKinds: ['User'],
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
