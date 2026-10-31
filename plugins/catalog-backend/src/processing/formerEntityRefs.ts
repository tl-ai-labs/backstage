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
  makeValidator,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import { FormerEntityRefClaimOutcome } from '../database/operations/formerEntityRefs/syncFormerEntityRefClaims';
import { isObject } from './util';

export const FORMER_ENTITY_REF_CLAIMS_STATE_KEY = 'formerEntityRefClaims';

const FULL_ENTITY_REF_PATTERN = /^([^:/]+):([^:/]+)\/([^:/]+)$/;

const MAX_FORMER_ENTITY_REFS = 20;

const MAX_ECHOED_VALUE_LENGTH = 100;

const validator = makeValidator();

function truncateEchoedValue(value: string): string {
  return value.length > MAX_ECHOED_VALUE_LENGTH
    ? `${value.slice(0, MAX_ECHOED_VALUE_LENGTH)}...`
    : value;
}

function findInvalidReason(
  formerEntityRef: string,
  entity: Entity,
): string | undefined {
  const match = FULL_ENTITY_REF_PATTERN.exec(formerEntityRef);
  if (
    !match ||
    !validator.isValidKind(match[1]) ||
    !validator.isValidNamespace(match[2]) ||
    !validator.isValidEntityName(match[3])
  ) {
    return 'it is not a full entity ref on the form kind:namespace/name';
  }
  if (match[1] !== entity.kind.toLocaleLowerCase('en-US')) {
    return 'it has a different kind from this entity';
  }
  if (formerEntityRef === stringifyEntityRef(entity)) {
    return "it is this entity's own ref";
  }
  return undefined;
}

export function parseFormerEntityRefs(entity: Entity): {
  formerEntityRefs: string[];
  errors: Error[];
} {
  const formerEntityRefs: string[] = [];
  const errors: Error[] = [];

  const value = entity.metadata.annotations?.[ANNOTATION_FORMER_ENTITY_REFS];
  if (!value) {
    return { formerEntityRefs, errors };
  }

  const seen = new Set<string>();
  for (const piece of value.split(',')) {
    const trimmed = piece.trim();
    const formerEntityRef = trimmed.toLocaleLowerCase('en-US');
    if (!trimmed || seen.has(formerEntityRef)) {
      continue;
    }
    if (seen.size === MAX_FORMER_ENTITY_REFS) {
      errors.push(
        new InputError(
          `Annotation ${ANNOTATION_FORMER_ENTITY_REFS} holds more than ${MAX_FORMER_ENTITY_REFS} distinct former entity refs, so the extra ones were ignored`,
        ),
      );
      break;
    }
    seen.add(formerEntityRef);

    const reason = findInvalidReason(formerEntityRef, entity);
    if (reason) {
      errors.push(
        new InputError(
          `Ignored former entity ref '${truncateEchoedValue(
            trimmed,
          )}' in annotation ${ANNOTATION_FORMER_ENTITY_REFS}: ${reason}`,
        ),
      );
    } else {
      formerEntityRefs.push(formerEntityRef);
    }
  }

  return { formerEntityRefs, errors };
}

export function shouldSyncFormerEntityRefs(
  entity: Entity,
  state: JsonObject | undefined,
): boolean {
  const annotations = entity.metadata.annotations;
  if (annotations?.[ANNOTATION_FORMER_ENTITY_REFS] !== undefined) {
    return true;
  }
  return isObject(state) && Boolean(state[FORMER_ENTITY_REF_CLAIMS_STATE_KEY]);
}

export function formerEntityRefClaimErrors(
  outcomes: FormerEntityRefClaimOutcome[],
): Error[] {
  const errors: Error[] = [];
  for (const { formerEntityRef, outcome } of outcomes) {
    if (outcome === 'rejected') {
      errors.push(
        new InputError(
          `Former entity ref '${formerEntityRef}' was rejected because an entity from another source holds or held that ref. To clear this, remove the value from annotation ${ANNOTATION_FORMER_ENTITY_REFS}, then add it back once that entity is gone`,
        ),
      );
    } else if (outcome === 'lost') {
      errors.push(
        new InputError(
          `Former entity ref '${formerEntityRef}' is not in effect because another entity claimed it first`,
        ),
      );
    }
  }
  return errors;
}
