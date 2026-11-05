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
 * Checks whether the entity is an {@link ApiEntity}, matching `entity.kind === 'API'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Checks whether the entity is a {@link ComponentEntity}, matching `entity.kind === 'Component'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Checks whether the entity is a {@link DomainEntity}, matching `entity.kind === 'Domain'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Checks whether the entity is a {@link GroupEntity}, matching `entity.kind === 'Group'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Checks whether the entity is a {@link LocationEntity}, matching `entity.kind === 'Location'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Checks whether the entity is a {@link ResourceEntity}, matching `entity.kind === 'Resource'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Checks whether the entity is a {@link SystemEntity}, matching `entity.kind === 'System'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Checks whether the entity is a {@link UserEntity}, matching `entity.kind === 'User'` case-insensitively.
 *
 * @public
 * @param entity - The entity to check
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
