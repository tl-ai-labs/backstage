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
 * Checks whether an entity is of the API kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `API` ignores case, so `api` also matches. Only
 * `kind` is checked: `apiVersion` and `spec` are not looked at, so a match does
 * not mean that the entity conforms to {@link ApiEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link ApiEntityV1alpha1}
 */
export function isApiEntity(entity: Entity): entity is ApiEntity {
  return entity.kind.toUpperCase() === 'API';
}
/**
 * Checks whether an entity is of the Component kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `Component` ignores case, so `component` also
 * matches. Only `kind` is checked: `apiVersion` and `spec` are not looked at,
 * so a match does not mean that the entity conforms to
 * {@link ComponentEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link ComponentEntityV1alpha1}
 */
export function isComponentEntity(entity: Entity): entity is ComponentEntity {
  return entity.kind.toUpperCase() === 'COMPONENT';
}
/**
 * Checks whether an entity is of the Domain kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `Domain` ignores case, so `domain` also
 * matches. Only `kind` is checked: `apiVersion` and `spec` are not looked at,
 * so a match does not mean that the entity conforms to
 * {@link DomainEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link DomainEntityV1alpha1}
 */
export function isDomainEntity(entity: Entity): entity is DomainEntity {
  return entity.kind.toUpperCase() === 'DOMAIN';
}
/**
 * Checks whether an entity is of the Group kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `Group` ignores case, so `group` also matches.
 * Only `kind` is checked: `apiVersion` and `spec` are not looked at, so a match
 * does not mean that the entity conforms to {@link GroupEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link GroupEntityV1alpha1}
 */
export function isGroupEntity(entity: Entity): entity is GroupEntity {
  return entity.kind.toUpperCase() === 'GROUP';
}
/**
 * Checks whether an entity is of the Location kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `Location` ignores case, so `location` also
 * matches. Only `kind` is checked: `apiVersion` and `spec` are not looked at,
 * so a match does not mean that the entity conforms to
 * {@link LocationEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link LocationEntityV1alpha1}
 */
export function isLocationEntity(entity: Entity): entity is LocationEntity {
  return entity.kind.toUpperCase() === 'LOCATION';
}
/**
 * Checks whether an entity is of the Resource kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `Resource` ignores case, so `resource` also
 * matches. Only `kind` is checked: `apiVersion` and `spec` are not looked at,
 * so a match does not mean that the entity conforms to
 * {@link ResourceEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link ResourceEntityV1alpha1}
 */
export function isResourceEntity(entity: Entity): entity is ResourceEntity {
  return entity.kind.toUpperCase() === 'RESOURCE';
}
/**
 * Checks whether an entity is of the System kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `System` ignores case, so `system` also
 * matches. Only `kind` is checked: `apiVersion` and `spec` are not looked at,
 * so a match does not mean that the entity conforms to
 * {@link SystemEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link SystemEntityV1alpha1}
 */
export function isSystemEntity(entity: Entity): entity is SystemEntity {
  return entity.kind.toUpperCase() === 'SYSTEM';
}
/**
 * Checks whether an entity is of the User kind.
 *
 * @remarks
 *
 * The comparison of `kind` with `User` ignores case, so `user` also matches.
 * Only `kind` is checked: `apiVersion` and `spec` are not looked at, so a match
 * does not mean that the entity conforms to {@link UserEntityV1alpha1}.
 *
 * @public
 * @param entity - The entity to check
 * @returns True if the kind matches, narrowing the type of the entity to
 *   {@link UserEntityV1alpha1}
 */
export function isUserEntity(entity: Entity): entity is UserEntity {
  return entity.kind.toUpperCase() === 'USER';
}
