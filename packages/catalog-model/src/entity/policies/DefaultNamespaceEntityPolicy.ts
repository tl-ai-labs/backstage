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
   * Applies a default namespace when the entity has none.
   *
   * @remarks
   * If metadata.namespace contains a non-empty string, the incoming entity is
   * returned unchanged as the exact same object. Otherwise, a merged copy is
   * returned without mutating the original entity. In the returned copy, an
   * absent or undefined namespace receives the configured default, while an
   * empty string or null is preserved as it was, so callers cannot assume a
   * non-empty namespace.
   *
   * @param entity - The entity to apply the policy to
   * @returns The incoming entity unchanged if metadata.namespace was a
   *          non-empty string, or a merged copy with default applied when
   *          absent or undefined, preserving empty or null values
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
