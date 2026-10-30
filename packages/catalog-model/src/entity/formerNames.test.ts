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

import { parseFormerEntityRefs } from './formerNames';
import { FieldFormatEntityPolicy } from './policies';
import { ANNOTATION_FORMER_NAMES } from './constants';
import { Entity } from './Entity';

function makeEntity(formerNames?: string): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'new-name',
      namespace: 'team-a',
      ...(formerNames !== undefined
        ? { annotations: { [ANNOTATION_FORMER_NAMES]: formerNames } }
        : {}),
    },
  };
}

describe('formerNames', () => {
  describe('parseFormerEntityRefs', () => {
    it('parses full and short refs with defaults', () => {
      const entity = makeEntity(
        ' component:default/Old-One , old-two,, other-ns/old-three ',
      );
      expect(parseFormerEntityRefs(entity)).toEqual([
        'component:default/old-one',
        'component:team-a/old-two',
        'component:other-ns/old-three',
      ]);
    });

    it('ignores missing values, duplicates and refs it cannot claim', () => {
      const noAnnotationEntity = makeEntity();
      expect(parseFormerEntityRefs(noAnnotationEntity)).toEqual([]);

      const entity = makeEntity(
        'old, Old, component:team-a/old, group:default/x, new-name, component:',
      );
      expect(parseFormerEntityRefs(entity)).toEqual(['component:team-a/old']);
    });
  });

  describe('FieldFormatEntityPolicy validation', () => {
    const policy = new FieldFormatEntityPolicy();

    it('accepts valid former names in the policy', async () => {
      const entity = makeEntity('old-two, component:default/old-one');
      await expect(policy.enforce(entity)).resolves.toBe(entity);
    });

    it('rejects invalid former names in the policy', async () => {
      const invalidCases = [
        'group:default/team',
        'new-name',
        'component:',
        'Bad Name!',
      ];

      for (const item of invalidCases) {
        const entity = makeEntity(item);
        const escapedItem = item.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        await expect(policy.enforce(entity)).rejects.toThrow(
          new RegExp(escapedItem),
        );
      }
    });
  });
});
