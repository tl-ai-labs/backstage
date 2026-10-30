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

import { FORMER_ENTITY_REFS_MAX_COUNT } from './constants';
import { parseFormerEntityRefs } from './formerEntityRefs';

describe('parseFormerEntityRefs', () => {
  it('returns an empty list for absent and degenerate values', () => {
    expect(parseFormerEntityRefs(undefined)).toEqual([]);
    expect(parseFormerEntityRefs('')).toEqual([]);
    expect(parseFormerEntityRefs('   ')).toEqual([]);
    expect(parseFormerEntityRefs(',')).toEqual([]);
    expect(parseFormerEntityRefs(',,,')).toEqual([]);
    expect(parseFormerEntityRefs('  , ,  ,  ')).toEqual([]);
  });

  it('normalizes, de-duplicates and order-stabilizes a delimited list', () => {
    expect(parseFormerEntityRefs('Component:default/old-service')).toEqual([
      'component:default/old-service',
    ]);

    const input = [
      'Component:default/service-a',
      ' \t component:team-b/service-a \t ',
      'COMPONENT:DEFAULT/SERVICE-A',
      'api:default/service-a',
      'component:default/service-b',
      'component:default/service-a',
    ].join(',');

    expect(parseFormerEntityRefs(input)).toEqual([
      'component:default/service-a',
      'component:team-b/service-a',
      'api:default/service-a',
      'component:default/service-b',
    ]);
  });

  it('fails closed per entry without throwing', () => {
    const mixedInput = [
      'bare-entity-name',
      'component:default/valid-1',
      ':default/empty-kind',
      'api:default/valid-2',
      'component:default/',
      '   ',
    ].join(',');

    expect(parseFormerEntityRefs(mixedInput)).toEqual([
      'component:default/valid-1',
      'api:default/valid-2',
    ]);
    expect(parseFormerEntityRefs('bare-name')).toEqual([]);
    expect(parseFormerEntityRefs(':default/x')).toEqual([]);
    expect(parseFormerEntityRefs('component:default/')).toEqual([]);
  });

  it('refuses a declaration over the maximum count', () => {
    const exactlyMax = Array.from(
      { length: FORMER_ENTITY_REFS_MAX_COUNT },
      (_, i) => `component:default/service-${i}`,
    );
    expect(parseFormerEntityRefs(exactlyMax.join(','))).toEqual(exactlyMax);

    const overMax = [
      ...exactlyMax,
      `component:default/service-${FORMER_ENTITY_REFS_MAX_COUNT}`,
    ];
    expect(parseFormerEntityRefs(overMax.join(','))).toEqual([]);
  });
});
