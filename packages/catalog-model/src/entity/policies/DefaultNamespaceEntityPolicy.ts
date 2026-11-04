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
   * Checks whether `entity.metadata.namespace` is already set; if so, returns `entity` unchanged, and otherwise returns a new merged entity with `metadata.namespace` populated with the policy's configured default namespace (`DEFAULT_NAMESPACE`, `"default"`, unless overridden in the constructor).
   *
   * @param entity - The entity to enforce the policy on
   * @returns Resolves with the original entity if `metadata.namespace` is already set, or a new merged entity with the default namespace populated
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
