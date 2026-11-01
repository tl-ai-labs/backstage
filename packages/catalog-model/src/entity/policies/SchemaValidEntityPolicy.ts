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

import Ajv, { ValidateFunction } from 'ajv';
import entitySchema from '../../schema/Entity.schema.json';
import entityMetaSchema from '../../schema/EntityMeta.schema.json';
import commonSchema from '../../schema/shared/common.schema.json';
import { Entity } from '../Entity';
import { EntityPolicy } from './types';

/**
 * Ensures that the entity spec is valid according to a schema.
 *
 * @remarks
 *
 * This should be the first policy in the list, to ensure that other downstream
 * policies can work with a structure that is at least valid in therms of the
 * typescript type.
 *
 * @public
 */
export class SchemaValidEntityPolicy implements EntityPolicy {
  private validate: ValidateFunction<Entity> | undefined;

  /**
   * Validates the entity against the JSON schema of the entity envelope, and
   * leaves the entity unchanged.
   *
   * @remarks
   *
   * This schema is common to all kinds. It requires `apiVersion`, `kind` and
   * `metadata`, allows only `spec`, `relations` and `status` as other root
   * fields, and requires `spec` to be an object if present. It applies no
   * kind-specific schema, so it does not check the fields inside `spec`. The
   * method compiles the schema on its first call and reuses it for later calls.
   *
   * @param entity - The entity to validate
   * @returns The same entity object
   * @throws An error whose message starts with `Malformed envelope` and
   *         describes the first schema violation
   */
  async enforce(entity: Entity): Promise<Entity> {
    if (!this.validate) {
      const ajv = new Ajv({ allowUnionTypes: true });
      this.validate = ajv
        .addSchema([commonSchema, entityMetaSchema], undefined, undefined, true)
        .compile<Entity>(entitySchema);
    }

    const result = this.validate(entity);
    if (result === true) {
      return entity;
    }

    const [error] = this.validate.errors || [];
    if (!error) {
      throw new Error(`Malformed envelope, Unknown error`);
    }

    throw new Error(
      `Malformed envelope, ${error.instancePath || '<root>'} ${error.message}`,
    );
  }
}
