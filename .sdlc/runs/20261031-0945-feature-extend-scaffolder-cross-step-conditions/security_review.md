# Security Review — pass1

Mode: brownfield. Intent: feature-extend. Scope: the 13 files in `provenance.json` (`files_touched`), compared against `git_head_before` cb8b07905b.

## Summary

This run changes frontend-only code in `@backstage/plugin-scaffolder-react`. It rewrites a step's cross-step `dependencies` into `allOf` `if`/`then` entries, and it changes how the Review step finds the schema for each form key. It adds no routes, auth, persistence, secrets handling or dependencies. The one security-relevant path is masking on the Review step (`ui:widget: password`, `ui:field: Secret`, `ui:backstage.review.mask`). Masking still holds. `processSchema` receives the same `mergedSchema` as before, now with the earlier-step conditions applied, and a new test checks that a password field shown by an earlier-step answer appears as `******`. Keys that are declared in a schema but whose condition does not hold are now hidden on Review, where before they could show in plain text. That narrows exposure. No blocking findings.

## Findings

| Severity                     | Category                    | Location                                                                                                                                                          | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Recommendation                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Low (advisory, non-blocking) | PII handling / transparency | `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx:426-428`; documented in `docs/features/software-templates/input-examples.md` (new note) | A field whose condition no longer holds is now left off the Review step (`isKeyDeclaredInSchemas` returns `[]`). Its value stays in `formState`, though, and the docs say it is "still sent with the other parameters." The user can submit a value, possibly sensitive, that the Review step no longer shows. The value was already submitted before this run; what is new is that Review hides it. Confidence: high on the behavior, low on impact, because values in `ui:field: Secret` go through the secrets channel. | Either drop the inactive conditional keys from the submitted parameters (for example, prune `formState` against the resolved schema on submit), or keep the current behavior and leave it documented. Could be a follow-up; does not gate. |

## Passing checks

- Review masking: `processSchema` masking logic is unchanged. The new test in `ReviewState.test.tsx` (lines ~1056-1101 of the diff) checks that `sdkToken` with `ui:widget: password` renders `******` when active and is absent when inactive.
- `findSchemaForKey` (`util.ts:213-222`): it now rejects `JsonError` results through `isJsonError`. Before, a truthy error object could count as a match. Omitting the key from `data` stops json-schema-library from building a schema out of the value itself. No new plain-text path.
- `liftCrossStepDependencies` (`schema.ts:84-160`): it is a pure transform that returns a new object and does not mutate the caller's schema. Its input is the template schema, not user input, and it neither evaluates code nor follows `$ref`. Recursion in `isKeyDeclaredInNode` only walks the tree of a JSON-parsed schema, so it cannot loop on a cycle. A `__proto__` dependency key would only change the prototype of the local `remainingDependencies` object, not the global prototype, so prototype pollution is not possible.
- Secrets in code, docs and the changeset: none. A grep of all added lines for `api_key`, `secret`, `password` or `token` followed by `=`/`:` and a literal value found nothing, and found no private keys and no `ghp_` or `AKIA` tokens. The doc YAML examples use only placeholder fields.
- Test fixtures (`*.test.ts(x)`, 7 files): no real credentials. The only credential-like value is `sdkToken: 't'`, a dummy value.
- PII encryption at rest, audit log (ordering, append-only, roles), guards and `reports_to`, JWT secret, password hashing: n/a, not in the touched set (frontend form rendering only).
- Helmet, rate limiting, global error filter: n/a, not in the touched set.
- `.env.example` / `.env` gitignore: n/a, not in the touched set.
- Dependency risk: unchanged. No manifest or lockfile in the touched set, so `npm audit` was not run. `isJsonError` and `omit` come from `json-schema-library` and `lodash`, which the package already uses.

## Required fixes before sign-off

- None. The Low finding is advisory.

## Noted (pre-existing, out of scope)

- `ReviewState.tsx`: a `formState` key that no step declares still renders in plain text (`[[formatKey(key), value]]`), as at baseline. Sensitive values that reach `formState` without a schema declaration are not masked.

Tool calls: 8
