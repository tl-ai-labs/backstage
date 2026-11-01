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
 * Checks whether the entity is of the `API` kind, by comparing its `kind` with
 * `API` without regard to case. It does not check the `apiVersion` or the
 * `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Checks whether the entity is of the `Component` kind, by comparing its `kind`
 * with `Component` without regard to case. It does not check the `apiVersion`
 * or the `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Checks whether the entity is of the `Domain` kind, by comparing its `kind`
 * with `Domain` without regard to case. It does not check the `apiVersion` or
 * the `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Checks whether the entity is of the `Group` kind, by comparing its `kind` with
 * `Group` without regard to case. It does not check the `apiVersion` or the
 * `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Checks whether the entity is of the `Location` kind, by comparing its `kind`
 * with `Location` without regard to case. It does not check the `apiVersion` or
 * the `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Checks whether the entity is of the `Resource` kind, by comparing its `kind`
 * with `Resource` without regard to case. It does not check the `apiVersion` or
 * the `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Checks whether the entity is of the `System` kind, by comparing its `kind`
 * with `System` without regard to case. It does not check the `apiVersion` or
 * the `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Checks whether the entity is of the `User` kind, by comparing its `kind` with
 * `User` without regard to case. It does not check the `apiVersion` or the
 * `spec` of the entity.
 *
 * @param entity - The entity to check
 *
 * @public
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
