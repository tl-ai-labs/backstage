/*
 * Copyright 2026 The Backstage Authors
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

import { CatalogApi } from '@backstage/catalog-client';
import { CompoundEntityRef, DEFAULT_NAMESPACE } from '@backstage/catalog-model';
import { entityRouteParams } from '../../routes';

/**
 * The navigation state that marks a redirect from a former entity name.
 *
 * @public
 */
export type EntityRenamedLocationState = {
  entityRenamedFrom: string;
};

/**
 * Looks up the current entity for a ref that was not found, and builds the
 * route to redirect to along with the navigation state for the notice.
 *
 * @remarks
 *
 * Never rejects. Returns undefined when there is no redirect to make.
 *
 * @public
 */
export async function resolveEntityRename(options: {
  catalogApi: Pick<CatalogApi, 'resolveFormerEntityRef'>;
  entityRef: CompoundEntityRef;
  location: { pathname: string; search: string; hash: string };
  routeFunc: (params: {
    kind: string;
    namespace: string;
    name: string;
  }) => string;
}): Promise<{ to: string; state: EntityRenamedLocationState } | undefined> {
  try {
    const { catalogApi, entityRef, location, routeFunc } = options;

    const currentRef = await catalogApi.resolveFormerEntityRef?.(entityRef);
    if (!currentRef) {
      return undefined;
    }

    const root = routeFunc(entityRef);
    const subPath = location.pathname.startsWith(root)
      ? location.pathname.slice(root.length)
      : '';

    const to = `${routeFunc(entityRouteParams(currentRef))}${subPath}${
      location.search
    }${location.hash}`;

    const entityRenamedFrom =
      entityRef.namespace.toLowerCase() === DEFAULT_NAMESPACE
        ? entityRef.name
        : `${entityRef.namespace}/${entityRef.name}`;

    return { to, state: { entityRenamedFrom } };
  } catch {
    return undefined;
  }
}
