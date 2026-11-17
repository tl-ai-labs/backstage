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
 * Type guard that checks if an {@link Entity} has kind `'API'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'Component'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'Domain'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'Group'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'Location'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'Resource'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'System'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Type guard that checks if an {@link Entity} has kind `'User'` (case-insensitive).
 * Does not check `apiVersion` or `spec`.
 *
 * @param entity - The entity to check
 * @public
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
