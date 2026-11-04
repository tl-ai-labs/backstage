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
 * Type guard that checks whether the given entity is an {@link ApiEntity} by comparing its `kind` case-insensitively to `"API"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is an {@link ApiEntity}
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Type guard that checks whether the given entity is a {@link ComponentEntity} by comparing its `kind` case-insensitively to `"Component"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link ComponentEntity}
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Type guard that checks whether the given entity is a {@link DomainEntity} by comparing its `kind` case-insensitively to `"Domain"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link DomainEntity}
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Type guard that checks whether the given entity is a {@link GroupEntity} by comparing its `kind` case-insensitively to `"Group"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link GroupEntity}
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Type guard that checks whether the given entity is a {@link LocationEntity} by comparing its `kind` case-insensitively to `"Location"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link LocationEntity}
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Type guard that checks whether the given entity is a {@link ResourceEntity} by comparing its `kind` case-insensitively to `"Resource"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link ResourceEntity}
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Type guard that checks whether the given entity is a {@link SystemEntity} by comparing its `kind` case-insensitively to `"System"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link SystemEntity}
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Type guard that checks whether the given entity is a {@link UserEntity} by comparing its `kind` case-insensitively to `"User"`.
 *
 * @public
 * @param entity - The entity to check
 * @returns `true` if the entity is a {@link UserEntity}
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
