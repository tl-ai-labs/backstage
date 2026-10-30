# Security Review — pass1

mode: brownfield · intent: docs · run 20261030-152500-docs-catalog-model-tsdoc
Scope: the 19 files in `provenance.json` (`git_head_before` cb696c38202c). Comment-only source
change plus two generated API reports and one changeset.

## Summary
Low risk. The src diff adds only TSDoc blocks — no executable line added or removed, no dependency,
manifest, lockfile, test, CI config or agent-instruction file touched, and no secret, token, internal
hostname, private URL or real person's data in the added prose (the only four added links are public
kubernetes.io and tools.ietf.org docs). Both API-report diffs are pure `// (undocumented)` marker
removals with zero signature, export or ordering changes, consistent with generator output rather
than hand editing. The residual risk is entirely in the accuracy of security-adjacent prose on the
validators and policies that decide what the catalog accepts; four blocks below either omit a
throwing/non-applying path or let a `@see` imply a constraint the code does not enforce. All four are
Low and none blocks sign-off on its own.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | Misleading security guidance | `packages/catalog-model/src/validation/KubernetesValidatorFunctions.ts` (`isValidAnnotationValue`, ~L138-147) | Prose is literally accurate ("any string … no length or character restrictions"), but the block carries `@see …/annotations/#syntax-and-character-set`, whose rules the function does not apply, and the `isValid*` name plus the absence of any caveat invites plugin authors to treat an annotation value as checked. The body is `typeof value === 'string'`. | Add one `@remarks` line: the value is accepted as-is and is neither bounded nor sanitized/escaped — consumers that render or interpolate annotation values must bound and escape them. Keep or demote the `@see` to "for the Kubernetes rules, which this function does not enforce". |
| Low | Entity-policy semantics | `packages/catalog-model/src/entity/policies/DefaultNamespaceEntityPolicy.ts` (~L34-46) | Doc reads as if `enforce` leaves every entity with a namespace. For `metadata.namespace: ''` or `null` the branch falls through to `lodash.merge({metadata:{namespace:default}}, entity)` and the source wins, so the returned copy still has `''`/`null` — the default fills in only on `undefined`/absent. Verified against lodash merge semantics. | State that only an absent/`undefined` namespace is defaulted, and that an explicitly empty or null namespace is returned unchanged (in a copy), so callers must not assume a non-empty namespace after this policy. |
| Low | Entity-policy semantics | `packages/catalog-model/src/entity/policies/GroupDefaultParentEntityPolicy.ts` (~L51-66) | The block documents only non-throwing paths and has no `@throws`, but for an entity with `kind: 'Group'` and no `spec`, `group.spec.parent` raises a `TypeError`. A reader ordering policies will assume this one cannot reject input. | Add `@throws` noting a `TypeError` when a Group entity has no `spec`, or note that the policy assumes a schema-valid envelope and must run after `SchemaValidEntityPolicy`. |
| Low | Accuracy / input validation | `packages/catalog-model/src/entity/policies/FieldFormatEntityPolicy.ts` (~L43-62) | "`metadata.namespace` (checked only when present)" and the parallel wording for `links[].title`/`icon` understate the behavior: the internal `optional()` short-circuits on `undefined` only, so an explicit `null` in any of those fields throws "must have a value". The sentence about `null` is scoped to required fields. | Extend the `null` sentence to cover optional fields: `undefined` skips the check, `null` fails as a missing value everywhere. |

## Passing checks
- Secret/credential leakage in added prose: none — no key, token, hostname, private URL, employee/customer name or internal ticket reference in any added line.
- Added external links: 4, all public docs (`kubernetes.io` ×3, `tools.ietf.org/html/rfc1123`); no internal or shortened URLs.
- `isValidObjectName` doc correctly states the real regex (uppercase, `_`, `.` accepted) and adds no DNS-label/subdomain `@see` it would not satisfy; `isValidApiVersion`, `isValidKind`, `isValidNamespace`, `isValidLabelKey`, `isValidLabelValue` blocks match their implementations and the regex length bounds.
- No block claims any validator sanitizes, escapes or makes input safe.
- `NoForeignRootFieldsEntityPolicy` correctly documents the default accepted set and that `relations` is absent from it; `SchemaValidEntityPolicy` correctly scopes to the whole envelope and documents the `Malformed envelope` throw; `GroupDefaultParentEntityPolicy` correctly discloses in-place mutation and the case-sensitive `kind` comparison.
- Type guards in `src/entity/conditions.ts`: all eight describe the kind-only, case-insensitive check accurately; none implies spec validation.
- PII: no real person's data used as an example; no prose encouraging sensitive personal data in `UserEntityV1alpha1.spec.profile` / `GroupEntityV1alpha1`.
- Dependency risk: no manifest or lockfile in the touched set — `packages/catalog-model/package.json` and `yarn.lock` are byte-unchanged vs `git_head_before`; dependency check recorded as unchanged, `yarn audit` not run per budget.
- Supply chain / integrity: `report.api.md` and `report-alpha.api.md` diffs contain only marker removals (no signature, export, type or ordering change); no test file, lockfile, `.github/` config or `.claude/`/`CLAUDE.md` file touched (`git status` shows only the provenance-listed paths plus the run's own `.sdlc` telemetry).
- Changeset `.changeset/plain-models-explain.md`: correct package and `patch` bump, adopter-facing wording, no code symbols, no secrets.
- n/a — not in the touched set: controller route guards, `reports_to` checks, JWT secret loading, password hashing cost factor, PII encryption at rest and response masking, audit-log append-only/read-role/field capture, helmet, rate limiting, global error filter, `.env`/`.env.example`.

## Required fixes before sign-off
- None blocking. Recommended with the next touch of these files, in priority order: the
  `isValidAnnotationValue` "not sanitized, not bounded" caveat (highest value — it is the one
  comment a plugin author could act on unsafely), then the `DefaultNamespaceEntityPolicy`
  empty-string/null clarification, then the `GroupDefaultParentEntityPolicy` `@throws` and the
  `FieldFormatEntityPolicy` `null` wording. All four are comment-only and cannot change behavior;
  each needs a `yarn build:api-reports` re-run only if it alters a `@public` doc summary line.

Tool calls: 7
