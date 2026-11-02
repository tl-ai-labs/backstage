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

import { ANNOTATION_FORMER_NAMES, DEFAULT_NAMESPACE } from './constants';
import { Entity } from './Entity';
import { parseEntityRef, stringifyEntityRef } from './ref';

const ENTRY_PATTERN = /^(?:[^\s:/,]+:)?(?:[^\s:/,]+\/)?[^\s:/,]+$/;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;
const MAX_FORMER_REF_LENGTH = 255;
const MAX_FORMER_NAMES = 100;
const MAX_ECHOED_ENTRY_LENGTH = 64;

/**
 * The result of parsing an entity's `backstage.io/former-names` annotation.
 *
 * @public
 */
export type EntityFormerRefs = {
  formerRefs: string[];
  problems: Array<{ entry: string; reason: string }>;
};

/**
 * Parses the `backstage.io/former-names` annotation of an entity into
 * normalized former entity references and a list of rejected entries. Only the
 * first 100 entries are read.
 *
 * @public
 * @param entity - The entity whose former names annotation should be parsed
 * @returns The normalized former entity references and any rejected entries
 */
export function parseEntityFormerRefs(entity: Entity): EntityFormerRefs {
  const raw = entity.metadata?.annotations?.[ANNOTATION_FORMER_NAMES];
  if (typeof raw !== 'string') {
    return { formerRefs: [], problems: [] };
  }

  const currentRef = stringifyEntityRef(entity);
  const entityKindLower = entity.kind.toLowerCase();
  const defaultNamespace = entity.metadata.namespace || DEFAULT_NAMESPACE;

  const seen = new Set<string>();
  const seenProblems = new Set<string>();
  const formerRefs: string[] = [];
  const problems: Array<{ entry: string; reason: string }> = [];

  const addProblem = (rawEntry: string, reason: string) => {
    const sanitized = rawEntry.replace(/\p{Cc}/gu, '?');
    const shortened =
      sanitized.length > MAX_ECHOED_ENTRY_LENGTH
        ? `${sanitized.slice(0, MAX_ECHOED_ENTRY_LENGTH)}...`
        : sanitized;
    const key = `${shortened}\0${reason}`;
    if (!seenProblems.has(key)) {
      seenProblems.add(key);
      problems.push({ entry: shortened, reason });
    }
  };

  const parts = raw.split(',');
  for (const part of parts.slice(0, MAX_FORMER_NAMES)) {
    const entry = part.trim();
    if (!entry) {
      addProblem(entry, 'it is empty');
      continue;
    }

    if (CONTROL_CHARACTER_PATTERN.test(entry)) {
      addProblem(entry, 'it holds a control character');
      continue;
    }

    if (!ENTRY_PATTERN.test(entry)) {
      addProblem(entry, 'it is not on the form [<kind>:][<namespace>/]<name>');
      continue;
    }

    let parsed;
    try {
      parsed = parseEntityRef(entry, {
        defaultKind: entity.kind,
        defaultNamespace,
      });
    } catch {
      addProblem(entry, 'it is not on the form [<kind>:][<namespace>/]<name>');
      continue;
    }

    const normalized = stringifyEntityRef(parsed);

    if (normalized.length > MAX_FORMER_REF_LENGTH) {
      addProblem(entry, 'it is longer than 255 characters');
      continue;
    }

    if (parsed.kind.toLowerCase() !== entityKindLower) {
      addProblem(entry, 'its kind is not the kind of this entity');
      continue;
    }

    if (normalized === currentRef) {
      addProblem(entry, 'it is the current name of this entity');
      continue;
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      formerRefs.push(normalized);
    }
  }

  if (parts.length > MAX_FORMER_NAMES) {
    addProblem(
      `${parts.length - MAX_FORMER_NAMES} more entries`,
      `only the first ${MAX_FORMER_NAMES} entries are read`,
    );
  }

  return { formerRefs, problems };
}
