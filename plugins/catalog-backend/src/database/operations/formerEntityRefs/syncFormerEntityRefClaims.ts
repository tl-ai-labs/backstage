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

import { Knex } from 'knex';
import { DbFormerEntityRefsRow, DbRefreshStateRow } from '../../tables';

/**
 * The state of one former entity ref declared by a claimant.
 */
export type FormerEntityRefClaimOutcome = {
  formerEntityRef: string;
  outcome: 'active' | 'rejected' | 'lost';
};

/**
 * Makes the claim rows of one claimant match the former entity refs that it
 * declares. A claim that is not yet rejected is rejected as soon as its ref has
 * a holder that does not match. Rejected rows are never updated, so a run with
 * no change writes nothing.
 *
 * @returns The outcome of each declared ref, in the order they were given.
 */
export async function syncFormerEntityRefClaims(options: {
  tx: Knex.Transaction;
  claimantEntityId: string;
  claimantEntityRef: string;
  locationKey?: string;
  formerEntityRefs: string[];
}): Promise<FormerEntityRefClaimOutcome[]> {
  const {
    tx,
    claimantEntityId,
    claimantEntityRef,
    locationKey,
    formerEntityRefs,
  } = options;

  const ownRows = await tx<DbFormerEntityRefsRow>('former_entity_refs')
    .select('former_entity_ref', 'rejected_at')
    .where('claimant_entity_id', claimantEntityId);

  const declaredRefs = new Set(formerEntityRefs);
  const ownRefs = new Set(ownRows.map(row => row.former_entity_ref));
  const rejectedRefs = new Set(
    ownRows.filter(row => row.rejected_at).map(row => row.former_entity_ref),
  );

  const staleRefs = [...ownRefs].filter(ref => !declaredRefs.has(ref));
  if (staleRefs.length) {
    await tx<DbFormerEntityRefsRow>('former_entity_refs')
      .where('claimant_entity_id', claimantEntityId)
      .whereIn('former_entity_ref', staleRefs)
      .delete();
  }

  const unrejectedRefs = formerEntityRefs.filter(ref => !rejectedRefs.has(ref));
  if (unrejectedRefs.length) {
    const holders = await tx<DbRefreshStateRow>('refresh_state')
      .select('entity_ref', 'location_key')
      .whereIn('entity_ref', unrejectedRefs);
    const holderKeys = new Map(
      holders.map(holder => [holder.entity_ref, holder.location_key]),
    );

    // A missing location key never matches, not even another missing one
    const isConflicting = (ref: string) =>
      holderKeys.has(ref) &&
      !(locationKey && holderKeys.get(ref) === locationKey);

    const conflictingRefs = unrejectedRefs.filter(
      ref => ownRefs.has(ref) && isConflicting(ref),
    );
    if (conflictingRefs.length) {
      await tx<DbFormerEntityRefsRow>('former_entity_refs')
        .where('claimant_entity_id', claimantEntityId)
        .whereIn('former_entity_ref', conflictingRefs)
        .whereNull('rejected_at')
        .update({ rejected_at: tx.fn.now() });
      conflictingRefs.forEach(ref => rejectedRefs.add(ref));
    }

    const newRefs = unrejectedRefs.filter(ref => !ownRefs.has(ref));
    if (newRefs.length) {
      const newRows = newRefs.map(ref => {
        const isRejected = isConflicting(ref);
        if (isRejected) {
          rejectedRefs.add(ref);
        }
        return {
          former_entity_ref: ref,
          claimant_entity_id: claimantEntityId,
          claimant_entity_ref: claimantEntityRef,
          claimed_at: tx.fn.now(),
          rejected_at: isRejected ? tx.fn.now() : null,
        };
      });

      await tx<DbFormerEntityRefsRow>('former_entity_refs')
        .insert(newRows)
        .onConflict(['former_entity_ref', 'claimant_entity_id'])
        .ignore();
    }
  }

  if (!formerEntityRefs.length) {
    return [];
  }

  const claimRows = await tx<DbFormerEntityRefsRow>('former_entity_refs')
    .select('former_entity_ref', 'claimant_entity_id')
    .whereIn('former_entity_ref', formerEntityRefs)
    .whereNull('rejected_at')
    .orderBy('claimed_at', 'asc')
    .orderBy('claimant_entity_ref', 'asc');

  const winners = new Map<string, string>();
  for (const row of claimRows) {
    if (!winners.has(row.former_entity_ref)) {
      winners.set(row.former_entity_ref, row.claimant_entity_id);
    }
  }

  return formerEntityRefs.map(formerEntityRef => {
    if (rejectedRefs.has(formerEntityRef)) {
      return { formerEntityRef, outcome: 'rejected' };
    }
    const winner = winners.get(formerEntityRef);
    if (winner && winner !== claimantEntityId) {
      return { formerEntityRef, outcome: 'lost' };
    }
    return { formerEntityRef, outcome: 'active' };
  });
}
