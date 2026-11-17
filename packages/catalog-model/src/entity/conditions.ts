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
 * Type guard that checks whether an entity is of the API kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `api` and
 * `API` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Type guard that checks whether an entity is of the Component kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `component` and
 * `COMPONENT` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Type guard that checks whether an entity is of the Domain kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `domain` and
 * `DOMAIN` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Type guard that checks whether an entity is of the Group kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `group` and
 * `GROUP` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Type guard that checks whether an entity is of the Location kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `location` and
 * `LOCATION` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Type guard that checks whether an entity is of the Resource kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `resource` and
 * `RESOURCE` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Type guard that checks whether an entity is of the System kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `system` and
 * `SYSTEM` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Type guard that checks whether an entity is of the User kind.
 *
 * @remarks
 *
 * Only the `kind` field is compared, case-insensitively (so `user` and
 * `USER` both match). The `apiVersion` and `spec` are not inspected,
 * so a match does not guarantee that the entity is valid.
 *
 * @public
 * @param entity - The entity to check
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
