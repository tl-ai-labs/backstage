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
 * Checks whether an entity is of the `API` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Checks whether an entity is of the `Component` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Checks whether an entity is of the `Domain` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Checks whether an entity is of the `Group` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Checks whether an entity is of the `Location` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Checks whether an entity is of the `Resource` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Checks whether an entity is of the `System` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Checks whether an entity is of the `User` kind, narrowing its type
 * accordingly.
 *
 * @remarks
 *
 * Only `kind` is checked, case-insensitively. The `apiVersion` and `spec`
 * are not validated, so the narrowed type is only as reliable as the data.
 *
 * @param entity - The entity to check
 * @public
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
