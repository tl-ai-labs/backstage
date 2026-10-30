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
  ANNOTATION_FORMER_ENTITY_REFS,
  DEFAULT_NAMESPACE,
  Entity,
} from '@backstage/catalog-model';
import { performance } from 'node:perf_hooks';
import {
  ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX,
  buildEntitySearch,
  mapToRows,
  traverse,
} from './buildEntitySearch';

describe('buildEntitySearch', () => {
  describe('traverse', () => {
    it('expands lists of strings to several rows', () => {
      const input = { a: ['b', 'c', 'd'] };
      const output = traverse(input);
      expect(output).toEqual([
        { key: 'a', value: 'b' },
        { key: 'a.b', value: true },
        { key: 'a', value: 'c' },
        { key: 'a.c', value: true },
        { key: 'a', value: 'd' },
        { key: 'a.d', value: true },
      ]);
    });

    it('expands objects', () => {
      const input = { a: { b: { c: 'd' }, e: 'f' } };
      const output = traverse(input);
      expect(output).toEqual([
        { key: 'a.b.c', value: 'd' },
        { key: 'a.e', value: 'f' },
      ]);
    });

    it('expands list of objects', () => {
      const input = { root: { list: [{ a: 1 }, { a: 2 }] } };
      const output = traverse(input);
      expect(output).toEqual([
        { key: 'root.list.a', value: 1 },
        { key: 'root.list.a', value: 2 },
      ]);
    });

    it('handles large arrays without quadratic performance degradation', () => {
      // Generate an array with 500 unique string items to verify that the
      // Set-based dedup scales linearly rather than quadratically.
      // With the previous Array.some() approach this would cause ~125,000
      // comparisons; with Set.has() it's ~500 lookups.
      const items = Array.from({ length: 500 }, (_, i) => `tag-${i}`);
      const input = { tags: items };

      const start = performance.now();
      const output = traverse(input);
      const elapsed = performance.now() - start;

      expect(output).toHaveLength(1000);
      // Should complete well under 100ms with O(n); O(n²) would be noticeably slower
      expect(elapsed).toBeLessThan(100);
    });

    it('skips over special keys', () => {
      const input = {
        status: { x: 1 },
        attachments: [{ y: 2 }],
        relations: [{ z: 3 }],
        a: 'a',
        metadata: {
          b: 'b',
          name: 'name',
          namespace: 'namespace',
          uid: 'uid',
          etag: 'etag',
          c: 'c',
        },
        d: 'd',
      };
      const output = traverse(input);
      expect(output).toEqual([
        { key: 'a', value: 'a' },
        { key: 'metadata.b', value: 'b' },
        { key: 'metadata.c', value: 'c' },
        { key: 'd', value: 'd' },
      ]);
    });
  });

  describe('mapToRows', () => {
    it('converts base types to strings or null', () => {
      const input = [
        { key: 'a', value: true },
        { key: 'b', value: false },
        { key: 'c', value: 7 },
        { key: 'd', value: 'string' },
        { key: 'e', value: null },
        { key: 'f', value: undefined },
      ];
      const output = mapToRows(input, 'eid');
      expect(output).toEqual([
        { entity_id: 'eid', key: 'a', original_value: 'true', value: 'true' },
        { entity_id: 'eid', key: 'b', original_value: 'false', value: 'false' },
        { entity_id: 'eid', key: 'c', original_value: '7', value: '7' },
        {
          entity_id: 'eid',
          key: 'd',
          original_value: 'string',
          value: 'string',
        },
        { entity_id: 'eid', key: 'e', original_value: null, value: null },
        { entity_id: 'eid', key: 'f', original_value: null, value: null },
      ]);
    });

    it('emits lowercase version of keys and values and also keeps the original value', () => {
      const input = [{ key: 'fOo', value: 'BaR' }];
      const output = mapToRows(input, 'eid');
      expect(output).toEqual([
        { entity_id: 'eid', key: 'foo', original_value: 'BaR', value: 'bar' },
      ]);
    });

    it('skips very large keys', () => {
      const input = [
        { key: 'a'.repeat(10000), value: true },
        { key: 'b'.repeat(10000), value: false },
        { key: 'c'.repeat(10000), value: 7 },
        { key: 'd'.repeat(10000), value: 'foo' },
        { key: 'e'.repeat(10000), value: null },
        { key: 'f'.repeat(10000), value: undefined },
      ];
      const output = mapToRows(input, 'eid');
      expect(output).toEqual([]);
    });

    it('replaces very large values with null', () => {
      const input = [{ key: 'foo', value: 'a'.repeat(10000) }];
      const output = mapToRows(input, 'eid');
      expect(output).toEqual([
        { entity_id: 'eid', key: 'foo', original_value: null, value: null },
      ]);
    });
  });

  describe('buildEntitySearch', () => {
    it('adds special keys even if missing', () => {
      const input: Entity = {
        apiVersion: 'a',
        kind: 'b',
        metadata: { name: 'n' },
      };
      expect(buildEntitySearch('eid', input)).toEqual([
        {
          entity_id: 'eid',
          key: 'apiversion',
          original_value: 'a',
          value: 'a',
        },
        { entity_id: 'eid', key: 'kind', original_value: 'b', value: 'b' },
        {
          entity_id: 'eid',
          key: 'metadata.name',
          original_value: 'n',
          value: 'n',
        },
        {
          entity_id: 'eid',
          key: 'metadata.namespace',
          original_value: null,
          value: null,
        },
        {
          entity_id: 'eid',
          key: 'metadata.uid',
          original_value: null,
          value: null,
        },
        {
          entity_id: 'eid',
          key: 'metadata.namespace',
          original_value: DEFAULT_NAMESPACE,
          value: DEFAULT_NAMESPACE,
        },
      ]);
    });

    it('adds relations', () => {
      const input: Entity = {
        relations: [
          {
            type: 't1',
            targetRef: 'k:ns/a',
          },
          {
            type: 't2',
            targetRef: 'k:ns/b',
          },
        ],
        apiVersion: 'a',
        kind: 'b',
        metadata: { name: 'n' },
      };
      expect(buildEntitySearch('eid', input)).toEqual([
        {
          entity_id: 'eid',
          key: 'apiversion',
          original_value: 'a',
          value: 'a',
        },
        { entity_id: 'eid', key: 'kind', original_value: 'b', value: 'b' },
        {
          entity_id: 'eid',
          key: 'metadata.name',
          original_value: 'n',
          value: 'n',
        },
        {
          entity_id: 'eid',
          key: 'metadata.namespace',
          original_value: null,
          value: null,
        },
        {
          entity_id: 'eid',
          key: 'metadata.uid',
          original_value: null,
          value: null,
        },
        {
          entity_id: 'eid',
          key: 'metadata.namespace',
          original_value: DEFAULT_NAMESPACE,
          value: DEFAULT_NAMESPACE,
        },
        {
          entity_id: 'eid',
          key: 'relations.t1',
          original_value: 'k:ns/a',
          value: 'k:ns/a',
        },
        {
          entity_id: 'eid',
          key: 'relations.t2',
          original_value: 'k:ns/b',
          value: 'k:ns/b',
        },
      ]);
    });

    it('deduplicates rows from duplicate array values', () => {
      const rows = buildEntitySearch('eid', {
        apiVersion: 'a',
        kind: 'b',
        metadata: { name: 'n', tags: ['java', 'java', 'Java'] },
      });
      // 'java' and 'Java' both normalise to value 'java'; all three occurrences
      // should collapse into a single row (first-wins for original_value).
      const tagRows = rows.filter(r => r.key === 'metadata.tags');
      expect(tagRows).toHaveLength(1);
      expect(tagRows[0]).toEqual(
        expect.objectContaining({ value: 'java', original_value: 'java' }),
      );
      // The synthetic boolean path key (metadata.tags.java) should also appear
      // exactly once.
      const boolRows = rows.filter(r => r.key === 'metadata.tags.java');
      expect(boolRows).toHaveLength(1);
    });

    it('treats null and empty-string values as distinct for deduplication', () => {
      // An array with both null and '' for the same key must produce two rows
      // since value=null and value='' are distinct in the database.
      const rows = buildEntitySearch('eid', {
        apiVersion: 'a',
        kind: 'b',
        metadata: { name: 'n' },
        spec: { foo: [null, ''] },
      });
      const fooRows = rows.filter(r => r.key === 'spec.foo');
      expect(fooRows).toHaveLength(2);
      const values = fooRows.map(r => r.value);
      expect(values).toContain(null);
      expect(values).toContain('');
    });

    it('rejects duplicate keys', () => {
      expect(() =>
        buildEntitySearch('eid', {
          relations: [],
          apiVersion: 'a',
          kind: 'b',
          metadata: {
            name: 'n',
            Namespace: 'ns',
          },
        }),
      ).toThrow(
        `Entity has duplicate keys that vary only in casing, 'metadata.namespace'`,
      );

      expect(() =>
        buildEntitySearch('eid', {
          relations: [
            {
              type: 'dup',
              targetRef: 'k:ns/a',
            },
            {
              type: 'DUP',
              targetRef: 'k:ns/b',
            },
          ],
          apiVersion: 'a',
          kind: 'b',
          metadata: { name: 'n' },
        }),
      ).toThrow(
        `Entity has duplicate keys that vary only in casing, 'relations.dup'`,
      );

      expect(() =>
        buildEntitySearch('eid', {
          apiVersion: 'a',
          kind: 'b',
          metadata: { name: 'n' },
          spec: {
            owner: 'o',
            OWNER: 'o',
            lifecycle: 'production',
            lifeCycle: 'production',
          },
        }),
      ).toThrow(
        `Entity has duplicate keys that vary only in casing, 'spec.owner', 'spec.lifecycle'`,
      );
    });
  });

  describe('former entity refs', () => {
    it('indexes one row per declared former ref alongside the raw annotation row', () => {
      const rawAnnotationValue =
        'component:default/old-name,  component:custom-ns/old-name , component:default/legacy-name';
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'new-name',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]: rawAnnotationValue,
          },
        },
      };

      const rows = buildEntitySearch('eid', entity);

      // The pre-existing raw annotation-value row must still be present
      const rawRow = rows.find(
        r => r.key === `metadata.annotations.${ANNOTATION_FORMER_ENTITY_REFS}`,
      );
      expect(rawRow).toEqual({
        entity_id: 'eid',
        key: `metadata.annotations.${ANNOTATION_FORMER_ENTITY_REFS}`,
        original_value: rawAnnotationValue,
        value: rawAnnotationValue.toLowerCase(),
      });

      // Synthetic per-ref rows
      const prefixedRows = rows.filter(r =>
        r.key.startsWith(ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX),
      );
      expect(prefixedRows).toHaveLength(3);
      expect(prefixedRows).toEqual(
        expect.arrayContaining([
          {
            entity_id: 'eid',
            key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/old-name`,
            original_value: 'true',
            value: 'true',
          },
          {
            entity_id: 'eid',
            key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:custom-ns/old-name`,
            original_value: 'true',
            value: 'true',
          },
          {
            entity_id: 'eid',
            key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/legacy-name`,
            original_value: 'true',
            value: 'true',
          },
        ]),
      );
    });

    it('tolerates a malformed entry and collapses duplicates', () => {
      const mixedEntity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'new-name',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]:
              'component:default/valid-one, :::bad-ref:::, other:default/valid-two',
          },
        },
      };

      let mixedRows: ReturnType<typeof buildEntitySearch> = [];
      expect(() => {
        mixedRows = buildEntitySearch('eid', mixedEntity);
      }).not.toThrow();

      const mixedPrefixed = mixedRows.filter(r =>
        r.key.startsWith(ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX),
      );
      expect(mixedPrefixed).toHaveLength(2);
      expect(mixedPrefixed).toEqual(
        expect.arrayContaining([
          {
            entity_id: 'eid',
            key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/valid-one`,
            original_value: 'true',
            value: 'true',
          },
          {
            entity_id: 'eid',
            key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}other:default/valid-two`,
            original_value: 'true',
            value: 'true',
          },
        ]),
      );

      const dupEntity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'new-name',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]:
              'component:default/repeated, component:default/repeated, Component:Default/Repeated',
          },
        },
      };

      const dupRows = buildEntitySearch('eid', dupEntity);
      const dupPrefixed = dupRows.filter(r =>
        r.key.startsWith(ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX),
      );
      expect(dupPrefixed).toHaveLength(1);
      expect(dupPrefixed[0]).toEqual({
        entity_id: 'eid',
        key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/repeated`,
        original_value: 'true',
        value: 'true',
      });
    });

    it('emits no former-ref row for a kind: User entity', () => {
      const annotationValue =
        'component:default/previous-name, component:default/other-previous';

      const userEntity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'User',
        metadata: {
          name: 'some-user',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]: annotationValue,
          },
        },
      };

      const componentEntity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'some-comp',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]: annotationValue,
          },
        },
      };

      const userRows = buildEntitySearch('eid-user', userEntity);
      const userPrefixed = userRows.filter(r =>
        r.key.startsWith(ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX),
      );
      expect(userPrefixed).toHaveLength(0);

      const componentRows = buildEntitySearch('eid-comp', componentEntity);
      const componentPrefixed = componentRows.filter(r =>
        r.key.startsWith(ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX),
      );
      expect(componentPrefixed).toHaveLength(2);
    });

    it('emits no former-ref row when the claimed ref kind is user', () => {
      const entity: Entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'some-comp',
          annotations: {
            [ANNOTATION_FORMER_ENTITY_REFS]:
              'user:default/old-name, component:default/old-name',
          },
        },
      };

      const rows = buildEntitySearch('eid', entity);

      const userClaimRow = rows.find(
        r =>
          r.key ===
          `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}user:default/old-name`,
      );
      expect(userClaimRow).toBeUndefined();

      const componentClaimRow = rows.find(
        r =>
          r.key ===
          `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/old-name`,
      );
      expect(componentClaimRow).toEqual({
        entity_id: 'eid',
        key: `${ANNOTATION_FORMER_ENTITY_REFS_SEARCH_KEY_PREFIX}component:default/old-name`,
        original_value: 'true',
        value: 'true',
      });
    });
  });
});
