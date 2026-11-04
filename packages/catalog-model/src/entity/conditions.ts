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

import {
  ApiEntity,
  ComponentEntity,
  DomainEntity,
  GroupEntity,
  LocationEntity,
  ResourceEntity,
  SystemEntity,
  UserEntity,
} from '../kinds';
import { Entity } from './Entity';

/**
 * Type guard that checks whether an {@link Entity} has kind `'API'`, narrowing
 * it to {@link ApiEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'API'`
 * case-insensitively (`entity.kind.toUpperCase() === 'API'`). It does not check
 * `entity.apiVersion` or validate `entity.metadata` or `entity.spec` against
 * the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'API'` case-insensitively
 * @public
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'Component'`,
 * narrowing it to {@link ComponentEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'COMPONENT'`
 * case-insensitively (`entity.kind.toUpperCase() === 'COMPONENT'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'COMPONENT'` case-insensitively
 * @public
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'Domain'`,
 * narrowing it to {@link DomainEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'DOMAIN'`
 * case-insensitively (`entity.kind.toUpperCase() === 'DOMAIN'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'DOMAIN'` case-insensitively
 * @public
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'Group'`,
 * narrowing it to {@link GroupEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'GROUP'`
 * case-insensitively (`entity.kind.toUpperCase() === 'GROUP'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'GROUP'` case-insensitively
 * @public
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'Location'`,
 * narrowing it to {@link LocationEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'LOCATION'`
 * case-insensitively (`entity.kind.toUpperCase() === 'LOCATION'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'LOCATION'` case-insensitively
 * @public
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'Resource'`,
 * narrowing it to {@link ResourceEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'RESOURCE'`
 * case-insensitively (`entity.kind.toUpperCase() === 'RESOURCE'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'RESOURCE'` case-insensitively
 * @public
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'System'`,
 * narrowing it to {@link SystemEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'SYSTEM'`
 * case-insensitively (`entity.kind.toUpperCase() === 'SYSTEM'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'SYSTEM'` case-insensitively
 * @public
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Type guard that checks whether an {@link Entity} has kind `'User'`, narrowing
 * it to {@link UserEntity}.
 *
 * @remarks
 *
 * At runtime this only checks whether `entity.kind` matches `'USER'`
 * case-insensitively (`entity.kind.toUpperCase() === 'USER'`). It does not
 * check `entity.apiVersion` or validate `entity.metadata` or `entity.spec`
 * against the kind schema.
 *
 * @param entity - The entity to check
 * @returns `true` if `entity.kind` matches `'USER'` case-insensitively
 * @public
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
