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

import {
  ANNOTATION_FORMER_ENTITY_REFS,
  Entity,
} from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import {
  FORMER_ENTITY_REF_CLAIMS_STATE_KEY,
  formerEntityRefClaimErrors,
  parseFormerEntityRefs,
  shouldSyncFormerEntityRefs,
} from './formerEntityRefs';

function entityWith(annotation?: string): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'new-name',
      namespace: 'default',
      annotations:
        annotation === undefined
          ? {}
          : { [ANNOTATION_FORMER_ENTITY_REFS]: annotation },
    },
  };
}

describe('parseFormerEntityRefs', () => {
  it('should return lowercase deduplicated refs in order', () => {
    const value =
      ' Component:Default/Old-Name , ,component:default/old-name,component:other-team/new-name,';

    expect(parseFormerEntityRefs(entityWith(value))).toEqual({
      formerEntityRefs: [
        'component:default/old-name',
        'component:other-team/new-name',
      ],
      errors: [],
    });

    // No annotation at all gives two empty lists
    expect(parseFormerEntityRefs(entityWith())).toEqual({
      formerEntityRefs: [],
      errors: [],
    });
  });

  it('should report each invalid value and leave it out', () => {
    const value = [
      'component:foo',
      ' not a ref ',
      'API:Default/Old-Api',
      'Component:Default/New-Name',
      'component:default/old-name',
    ].join(',');

    const { formerEntityRefs, errors } = parseFormerEntityRefs(
      entityWith(value),
    );

    expect(formerEntityRefs).toEqual(['component:default/old-name']);
    expect(errors.map(error => error.message)).toEqual([
      "Ignored former entity ref 'component:foo' in annotation backstage.io/former-entity-refs: it is not a full entity ref on the form kind:namespace/name",
      "Ignored former entity ref 'not a ref' in annotation backstage.io/former-entity-refs: it is not a full entity ref on the form kind:namespace/name",
      "Ignored former entity ref 'API:Default/Old-Api' in annotation backstage.io/former-entity-refs: it has a different kind from this entity",
      "Ignored former entity ref 'Component:Default/New-Name' in annotation backstage.io/former-entity-refs: it is this entity's own ref",
    ]);
    for (const error of errors) {
      expect(error).toBeInstanceOf(InputError);
    }
  });

  it('should cap the number of distinct refs at 20', () => {
    const capMessage =
      'Annotation backstage.io/former-entity-refs holds more than 20 distinct former entity refs, so the extra ones were ignored';
    const refs = Array.from(
      { length: 21 },
      (_, i) => `component:default/old-${i}`,
    );
    const twenty = refs.slice(0, 20);

    // One over the cap keeps the first 20 and reports it once
    const over = parseFormerEntityRefs(entityWith(refs.join(',')));
    expect(over.formerEntityRefs).toEqual(twenty);
    expect(over.errors.map(error => error.message)).toEqual([capMessage]);
    expect(over.errors[0]).toBeInstanceOf(InputError);

    // Exactly at the cap is fine
    expect(parseFormerEntityRefs(entityWith(twenty.join(',')))).toEqual({
      formerEntityRefs: twenty,
      errors: [],
    });

    // Duplicates and empty pieces do not count
    const padded = parseFormerEntityRefs(
      entityWith(['', refs[0], ...twenty, ' ', refs[0]].join(',')),
    );
    expect(padded).toEqual({ formerEntityRefs: twenty, errors: [] });

    // Invalid values do count
    const withInvalid = parseFormerEntityRefs(
      entityWith(['not a ref', ...twenty].join(',')),
    );
    expect(withInvalid.formerEntityRefs).toEqual(refs.slice(0, 19));
    expect(withInvalid.errors.map(error => error.message)).toEqual([
      "Ignored former entity ref 'not a ref' in annotation backstage.io/former-entity-refs: it is not a full entity ref on the form kind:namespace/name",
      capMessage,
    ]);
  });

  it('should cut a very long invalid value in its error', () => {
    const { formerEntityRefs, errors } = parseFormerEntityRefs(
      entityWith('x'.repeat(150)),
    );

    expect(formerEntityRefs).toEqual([]);
    expect(errors.map(error => error.message)).toEqual([
      `Ignored former entity ref '${'x'.repeat(
        100,
      )}...' in annotation backstage.io/former-entity-refs: it is not a full entity ref on the form kind:namespace/name`,
    ]);
  });
});

describe('shouldSyncFormerEntityRefs', () => {
  it('should sync only with an annotation or the state marker', () => {
    const marked = { [FORMER_ENTITY_REF_CLAIMS_STATE_KEY]: true };

    // Neither annotation nor marker
    expect(shouldSyncFormerEntityRefs(entityWith(), undefined)).toBe(false);
    expect(shouldSyncFormerEntityRefs(entityWith(), {})).toBe(false);

    // An empty annotation is still present
    expect(shouldSyncFormerEntityRefs(entityWith(''), undefined)).toBe(true);

    // The marker alone is enough
    expect(shouldSyncFormerEntityRefs(entityWith(), marked)).toBe(true);
  });

  it('should tolerate a state that is not an object', () => {
    const odd = 'not an object' as unknown as JsonObject;

    expect(shouldSyncFormerEntityRefs(entityWith(), odd)).toBe(false);
    expect(shouldSyncFormerEntityRefs(entityWith(''), odd)).toBe(true);
  });
});

describe('formerEntityRefClaimErrors', () => {
  it('should return an error for each rejected and lost outcome', () => {
    const errors = formerEntityRefClaimErrors([
      { formerEntityRef: 'component:default/active', outcome: 'active' },
      { formerEntityRef: 'component:default/rejected', outcome: 'rejected' },
      { formerEntityRef: 'component:default/lost', outcome: 'lost' },
    ]);

    expect(errors.map(error => error.message)).toEqual([
      "Former entity ref 'component:default/rejected' was rejected because an entity from another source holds or held that ref. To clear this, remove the value from annotation backstage.io/former-entity-refs, then add it back once that entity is gone",
      "Former entity ref 'component:default/lost' is not in effect because another entity claimed it first",
    ]);
    for (const error of errors) {
      expect(error).toBeInstanceOf(InputError);
    }
  });
});
