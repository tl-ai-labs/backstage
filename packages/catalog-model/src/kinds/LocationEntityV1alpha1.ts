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
   * The API version of the entity, either `backstage.io/v1alpha1` or
   * `backstage.io/v1beta1`.
   */
  apiVersion: 'backstage.io/v1alpha1' | 'backstage.io/v1beta1';
  /**
   * The kind of the entity, always `Location`.
   */
  kind: 'Location';
  /**
   * The specification of the location.
   *
   * @remarks
   *
   * All fields of the specification are optional. The `type` field is the
   * location type that is common to the targets. The `target` field is a
   * single target and `targets` is a list of targets, where each target is an
   * absolute path or URL, or a relative path that is resolved against the
   * location of this Location entity. The `presence` field is `required` or
   * `optional` and states whether a target that cannot be found is an error.
   */
  spec: {
    type?: string;
    target?: string;
    targets?: string[];
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
