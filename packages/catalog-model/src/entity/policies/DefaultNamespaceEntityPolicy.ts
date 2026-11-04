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
   * Ensures that the entity has a default namespace when none is set.
   *
   * @remarks
   *
   * If `entity.metadata.namespace` is truthy, this method resolves with the
   * original entity untouched. Otherwise, it resolves with a new deep copy in
   * which the configured default namespace ({@link DEFAULT_NAMESPACE},
   * `'default'` by default) is applied only when `metadata.namespace` is absent
   * or `undefined`; falsy values such as `''` and `null` are kept as they are
   * in the returned copy, and the input entity is never mutated.
   *
   * @param entity - The entity, as validated/mutated so far in the policy tree
   * @returns The incoming entity when `metadata.namespace` is truthy, otherwise
   *          a new copy in which the default namespace fills an absent or
   *          undefined namespace
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
