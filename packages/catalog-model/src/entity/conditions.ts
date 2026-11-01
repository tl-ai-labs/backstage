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
 * Checks whether `entity.kind` is `API`, ignoring case. The function does not
 * check `apiVersion` or `spec`, so a match does not prove that the entity is
 * valid for this kind.
 *
 * @public
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Checks whether `entity.kind` is `Component`, ignoring case. The function does
 * not check `apiVersion` or `spec`, so a match does not prove that the entity
 * is valid for this kind.
 *
 * @public
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Checks whether `entity.kind` is `Domain`, ignoring case. The function does
 * not check `apiVersion` or `spec`, so a match does not prove that the entity
 * is valid for this kind.
 *
 * @public
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Checks whether `entity.kind` is `Group`, ignoring case. The function does not
 * check `apiVersion` or `spec`, so a match does not prove that the entity is
 * valid for this kind.
 *
 * @public
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Checks whether `entity.kind` is `Location`, ignoring case. The function does
 * not check `apiVersion` or `spec`, so a match does not prove that the entity
 * is valid for this kind.
 *
 * @public
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Checks whether `entity.kind` is `Resource`, ignoring case. The function does
 * not check `apiVersion` or `spec`, so a match does not prove that the entity
 * is valid for this kind.
 *
 * @public
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Checks whether `entity.kind` is `System`, ignoring case. The function does
 * not check `apiVersion` or `spec`, so a match does not prove that the entity
 * is valid for this kind.
 *
 * @public
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Checks whether `entity.kind` is `User`, ignoring case. The function does not
 * check `apiVersion` or `spec`, so a match does not prove that the entity is
 * valid for this kind.
 *
 * @public
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
