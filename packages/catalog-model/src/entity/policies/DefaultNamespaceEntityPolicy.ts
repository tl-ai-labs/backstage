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
   * Sets the namespace of the entity, if it has none. If
   * `metadata.namespace` is set, the input entity is returned as is. Otherwise
   * a new entity object is returned, a deep merge of the input over a
   * `metadata.namespace` set to the namespace given to the constructor
   * (`default` when none was given), and the input is not modified.
   *
   * @param entity - The entity to enforce the policy on
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
