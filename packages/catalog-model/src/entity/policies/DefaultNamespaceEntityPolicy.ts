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
   * Fills in the policy's namespace when the entity's `metadata.namespace` is
   * missing or `undefined`.
   *
   * @remarks
   *
   * When `metadata.namespace` is a non-empty string (the check is for any
   * truthy value), the returned promise resolves to the same entity object,
   * unchanged.
   *
   * Otherwise it resolves to a new object, never the entity that was passed in:
   * the entity deep-merged over `{ metadata: { namespace } }`, where the
   * namespace is the one given to the constructor, {@link DEFAULT_NAMESPACE} by
   * default. The entity's own values win the merge unless they are `undefined`,
   * so the namespace is filled in only when `metadata.namespace` is missing or
   * `undefined`; an empty string or `null` is kept as it is. The entity that
   * was passed in is not modified.
   *
   * @param entity - The entity to apply the default namespace to
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (entity.metadata.namespace) {
      return entity;
    }

    return lodash.merge({ metadata: { namespace: this.namespace } }, entity);
  }
}
