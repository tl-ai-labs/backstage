# Security Review — pass1

Mode: brownfield, intent: feature-extend. Scope: the 12 files in `provenance.json` (diffed against `f20fd9b598285c88401406b3812fe00d7708136c`).

## Summary

The change is frontend-only, in `@backstage/plugin-scaffolder-react` (the scaffolder form and its review step), plus a docs page and a changeset. It touches no authn/authz, PII-at-rest, audit-log, secrets/config, headers or dependency surface. The one security-relevant behaviour is review-step masking of `ui:widget: password` / `ui:field: Secret` / `ui:backstage.review.mask` values. The change improves it: a value whose field is declared only in a conditional branch (`dependencies`, `if/then/else`, `allOf/anyOf/oneOf`) that is not active is now left out of the review. Before, such a value fell through to the raw `[formatKey(key), value]` path unmasked. In an active cross-step branch the field's schema resolves and masking applies, and `ReviewState.test.tsx` asserts `SDK token ******`. Nothing found blocks Gate 3.

## Findings

| Severity | Category               | Location                                                                                                                                                        | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Recommendation                                                                                                                                   |
| -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Info     | Surface / transparency | `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` (~L105-107)                                                                          | Values of inactive conditional fields are now hidden from the review step, but they are still submitted with the form (the changeset says so). So a user can submit data they did not see at review time. That data could be stale input from a branch they left, possibly including a secret typed before switching branches. It is not a leak, because the data goes to the same backend as before, and it is better than the old behaviour of showing those values unmasked.          | Optional follow-up: drop inactive-branch values from the submitted payload, or list them as "not used" in the review. Not required for this run. |
| Info     | Robustness             | `plugins/scaffolder-react/src/next/lib/schema.ts` (`declaresKey`, `childSchemas`, `liftDependency`); `components/ReviewState/util.ts` (`declaresInConditional`) | These walk template schemas with unbounded recursion. Template JSON comes from the backend and cannot be cyclic, so only an absurdly deep schema from the template author could overflow the stack, and that would only break the author's own form. Dependency keys such as `__proto__` only change the prototype of the local `remaining` object (and are dropped by `Object.keys`). Computed keys create own properties, so there is no global prototype pollution. Confidence: high. | None needed.                                                                                                                                     |

## Passing checks

- Review masking: the password/Secret/`review.mask` paths are unchanged in `processSchema`. Cross-step active branches resolve to their definitions (masked). Inactive branches are left out rather than shown raw.
- `findSchemaForKey` now forces `additionalProperties: false` (unless the step sets it to an object) and rejects `JsonError`/`Error` results, so an undeclared key no longer matches a made-up schema. The old pre-existing case is unchanged: a step whose `additionalProperties` is an object schema still matches every key, and that is not made worse.
- Secrets in committed code: none in the added lines. The test fixtures use dummy values (`sdkToken: 'abc'`, feature flag `secretFlag`) and are not real credentials.
- Docs (`docs/features/software-templates/input-examples.md`): the examples contain no secrets or tokens.
- Changeset (`.changeset/scaffolder-cross-step-conditions.md`): no sensitive content. It discloses the behaviour change (hidden values are still submitted).
- PII encryption at rest / role masking / audit-before-access: n/a, not in the touched set (frontend form library only).
- Guards on routes, `reports_to` checks, JWT secret, password hashing: n/a, not in the touched set.
- Audit log append-only / auditor-only read / entry fields: n/a, not in the touched set.
- `.env.example` / `.env` gitignore: n/a, not in the touched set.
- Helmet, auth rate limiting, global error filter: n/a, not in the touched set.
- Dependency risk: no manifest or lockfile touched, so the dependency surface is unchanged and `npm audit` was not run.

## Required fixes before sign-off

- None.

Tool calls: 6
