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
import { parseEntityFormerRefs } from './formerNames';

describe('formerNames', () => {
  describe('parseEntityFormerRefs', () => {
    it('parses every documented form', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          namespace: 'team-a',
          annotations: {
            'backstage.io/former-names':
              'old, team-b/Older, component:team-c/oldest, Component:legacy',
          },
        },
      };

      expect(parseEntityFormerRefs(entity)).toEqual({
        formerRefs: [
          'component:team-a/old',
          'component:team-b/older',
          'component:team-c/oldest',
          'component:team-a/legacy',
        ],
        problems: [],
      });
    });

    it('defaults the namespace of an entity with none', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: { 'backstage.io/former-names': 'old' },
        },
      };

      expect(parseEntityFormerRefs(entity).formerRefs).toEqual([
        'component:default/old',
      ]);
    });

    it('returns nothing without the annotation', () => {
      const bare: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'current' },
      };
      const notAString = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: { 'backstage.io/former-names': 7 },
        },
      } as unknown as Entity;

      expect(parseEntityFormerRefs(bare)).toEqual({
        formerRefs: [],
        problems: [],
      });
      expect(parseEntityFormerRefs(notAString)).toEqual({
        formerRefs: [],
        problems: [],
      });
    });

    it('reports each invalid entry and keeps the valid ones', () => {
      const longName = 'a'.repeat(300);
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'me',
          annotations: {
            'backstage.io/former-names': `ok, , a/b/c, user:default/x, me, ${longName}`,
          },
        },
      };

      const result = parseEntityFormerRefs(entity);

      expect(result.formerRefs).toEqual(['component:default/ok']);
      expect(result.problems).toEqual([
        { entry: '', reason: expect.any(String) },
        { entry: 'a/b/c', reason: expect.any(String) },
        { entry: 'user:default/x', reason: expect.any(String) },
        { entry: 'me', reason: expect.any(String) },
        { entry: `${longName.slice(0, 64)}...`, reason: expect.any(String) },
      ]);
    });

    it('caps entries, deduplicates problems, and rejects control characters', () => {
      const capped = parseEntityFormerRefs({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: {
            'backstage.io/former-names': Array.from(
              { length: 150 },
              (_, i) => `old-${i}`,
            ).join(', '),
          },
        },
      });
      expect(capped.formerRefs).toHaveLength(100);
      expect(capped.problems).toEqual([
        {
          entry: '50 more entries',
          reason: 'only the first 100 entries are read',
        },
      ]);

      const repeatedProblems = parseEntityFormerRefs({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: {
            'backstage.io/former-names': ', , , a/b/c, a/b/c',
          },
        },
      });
      expect(repeatedProblems.formerRefs).toEqual([]);
      expect(repeatedProblems.problems).toEqual([
        { entry: '', reason: 'it is empty' },
        {
          entry: 'a/b/c',
          reason: 'it is not on the form [<kind>:][<namespace>/]<name>',
        },
      ]);

      const withNul = parseEntityFormerRefs({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: {
            'backstage.io/former-names': 'before, bad\u0000name, after',
          },
        },
      });
      expect(withNul.formerRefs).toEqual([
        'component:default/before',
        'component:default/after',
      ]);
      expect(withNul.problems).toEqual([
        { entry: 'bad?name', reason: 'it holds a control character' },
      ]);
      expect(withNul.problems[0].entry).not.toMatch(/\p{Cc}/u);
    });

    it('drops repeats without a problem', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'current',
          annotations: { 'backstage.io/former-names': 'Old, old, default/old' },
        },
      };

      expect(parseEntityFormerRefs(entity)).toEqual({
        formerRefs: ['component:default/old'],
        problems: [],
      });
    });
  });
});
