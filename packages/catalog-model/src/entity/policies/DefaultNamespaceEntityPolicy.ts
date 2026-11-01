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

import lodash from 'lodash';
import { EntityPolicy } from './types';
import { DEFAULT_NAMESPACE } from '../constants';
import { Entity } from '../Entity';

/**
 * Sets a default namespace if none was set.
 *
 * @public
 */
export class DefaultNamespaceEntityPolicy implements EntityPolicy {
  private readonly namespace: string;

  constructor(namespace: string = DEFAULT_NAMESPACE) {
    this.namespace = namespace;
  }

  /**
   * Sets the default namespace on an entity whose namespace is undefined.
   *
   * @remarks
   *
   * The default namespace is the one passed to the constructor, which defaults
   * to `DEFAULT_NAMESPACE`.
   *
   * @param entity - The entity to update
   * @returns The same entity object if its `metadata.namespace` is truthy,
   *          otherwise a new object that leaves the input unchanged. The new
   *          object gets the default namespace only when `metadata.namespace`
   *          is undefined, and keeps an empty or null namespace
   * @throws A `TypeError` if the entity has no `metadata`, since the method
   *         does no validation of its own
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
