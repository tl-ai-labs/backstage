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

import { ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX } from '../../database/operations/stitcher/buildEntitySearch';
import { buildFormerEntityRefQuery } from './formerEntityRefQuery';

describe('buildFormerEntityRefQuery', () => {
  it('builds an index-backed predicate for a well-formed ref', () => {
    const expectedKey = `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/my-component`;
    const expectedPredicate = {
      $all: [{ [expectedKey]: true }, { $not: { kind: 'user' } }],
    };

    const regular = buildFormerEntityRefQuery('component:default/my-component');
    const mixedCase = buildFormerEntityRefQuery(
      'Component:Default/My-Component',
    );
    const implicitNamespace = buildFormerEntityRefQuery(
      'component:my-component',
    );

    expect(regular).toEqual(expectedPredicate);
    expect(mixedCase).toEqual(expectedPredicate);
    expect(implicitNamespace).toEqual(expectedPredicate);
  });

  it('returns undefined for a malformed ref without throwing', () => {
    const malformedInputs = [
      '',
      'my-component',
      ':default/x',
      'component:default/',
    ];

    for (const input of malformedInputs) {
      expect(() => buildFormerEntityRefQuery(input)).not.toThrow();
      expect(buildFormerEntityRefQuery(input)).toBeUndefined();
    }
  });

  it('refuses a User ref structurally', () => {
    const lowerUser = buildFormerEntityRefQuery('user:default/old-name');
    const mixedUser = buildFormerEntityRefQuery('User:default/Old-Name');
    const component = buildFormerEntityRefQuery('component:default/old-name');

    expect(lowerUser).toBeUndefined();
    expect(mixedUser).toBeUndefined();
    expect(component).toEqual({
      $all: [
        {
          [`${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/old-name`]:
            true,
        },
        { $not: { kind: 'user' } },
      ],
    });
  });
});
