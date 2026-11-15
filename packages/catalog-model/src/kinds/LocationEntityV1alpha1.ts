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
import jsonSchema from '../schema/kinds/Location.v1alpha1.schema.json';
import { ajvCompiledJsonSchemaValidator } from './util';

/**
 * Backstage catalog Location kind Entity.
 *
 * @public
 */
export interface LocationEntityV1alpha1 extends Entity {
  /**
   * The version of the entity format. Both versions are accepted and have
   * the same shape.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, always `Location`.
   */
  kind: 'Location';
  /**
   * The Location-specific part of the entity.
   */
  spec: {
    /**
     * The location type shared by all targets, for example `url` or `file`.
     * If omitted, the type of the location that this entity was read from is
     * used.
     */
    type?: string;
    /**
     * A single target. Either an absolute path or URL, depending on `type`,
     * or a relative path such as `./details/catalog-info.yaml` that is
     * resolved relative to this entity's own location.
     */
    target?: string;
    /**
     * A list of targets, with the same format as `target`.
     */
    targets?: string[];
    /**
     * Whether the targets must exist. When `required`, a missing target is
     * treated as an error; when `optional`, it is skipped. The catalog
     * treats an omitted value as `required`.
     */
    presence?: 'required' | 'optional';
  };
}

/**
 * {@link KindValidator} for {@link LocationEntityV1alpha1}.
 *
 * @public
 */
export const locationEntityV1alpha1Validator =
  ajvCompiledJsonSchemaValidator(jsonSchema);

/**
 * Extends the catalog model with the Location kind.
 *
 * @alpha
 */
export const locationEntityModel = createCatalogModelLayer({
  layerId: 'catalog.backstage.io/kind-location',
  builder: model => {
    model.addKind({
      group: 'backstage.io',
      names: {
        kind: 'Location',
        singular: 'location',
        plural: 'locations',
      },
      description:
        'A Location is a marker that references other places to look for catalog data.',
      versions: [
        {
          name: ['v1alpha1', 'v1beta1'],
          schema: {
            jsonSchema,
          },
        },
      ],
    });
  },
});
