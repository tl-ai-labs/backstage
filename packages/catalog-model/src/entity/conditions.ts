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
 * Type guard that narrows an entity to an {@link ApiEntity} if its kind
 * matches 'API' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Type guard that narrows an entity to a {@link ComponentEntity} if its kind
 * matches 'Component' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Type guard that narrows an entity to a {@link DomainEntity} if its kind
 * matches 'Domain' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Type guard that narrows an entity to a {@link GroupEntity} if its kind
 * matches 'Group' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Type guard that narrows an entity to a {@link LocationEntity} if its kind
 * matches 'Location' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Type guard that narrows an entity to a {@link ResourceEntity} if its kind
 * matches 'Resource' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Type guard that narrows an entity to a {@link SystemEntity} if its kind
 * matches 'System' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Type guard that narrows an entity to a {@link UserEntity} if its kind
 * matches 'User' case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
