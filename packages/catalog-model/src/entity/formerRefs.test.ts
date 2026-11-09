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

import { Entity } from './Entity';
import { ANNOTATION_FORMER_REFS, getEntityFormerRefs } from './formerRefs';

describe('getEntityFormerRefs', () => {
  it('completes, trims and normalizes refs', () => {
    expect(ANNOTATION_FORMER_REFS).toEqual('backstage.io/former-refs');

    const entityWithNamespace: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        namespace: 'team',
        annotations: {
          [ANNOTATION_FORMER_REFS]:
            ' old-name , Other/Older ,Component:prod/Legacy ,, ',
        },
      },
    };

    expect(getEntityFormerRefs(entityWithNamespace)).toEqual([
      'component:team/old-name',
      'component:other/older',
      'component:prod/legacy',
    ]);

    const entityWithoutNamespace: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        annotations: {
          [ANNOTATION_FORMER_REFS]: 'old-name',
        },
      },
    };

    expect(getEntityFormerRefs(entityWithoutNamespace)).toEqual([
      'component:default/old-name',
    ]);
  });

  it('drops unparseable, other-kind, self and duplicate refs', () => {
    const entity: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        annotations: {
          [ANNOTATION_FORMER_REFS]:
            'old, :bad, api:default/old, new-name, component:default/NEW-NAME, OLD, a:/',
        },
      },
    };

    expect(getEntityFormerRefs(entity)).toEqual(['component:default/old']);
  });

  it('returns an empty list when the annotation is missing or not a string', () => {
    const entityWithoutAnnotations: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
      },
    };

    const entityWithEmptyAnnotation: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        annotations: {
          [ANNOTATION_FORMER_REFS]: '',
        },
      },
    };

    const entityWithNumberAnnotation: Entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'new-name',
        annotations: {
          [ANNOTATION_FORMER_REFS]: 123 as unknown as string,
        },
      },
    };

    expect(getEntityFormerRefs(entityWithoutAnnotations)).toEqual([]);
    expect(getEntityFormerRefs(entityWithEmptyAnnotation)).toEqual([]);
    expect(getEntityFormerRefs(entityWithNumberAnnotation)).toEqual([]);
  });
});
