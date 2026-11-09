# Security Review — pass1

Mode: brownfield, intent feature-extend. Scope: the 13 files in `provenance.json`, diffed against `git_head_before` f20fd9b598.

## Summary
The change only touches client-side code in `@backstage/plugin-scaffolder-react`. It decides which form fields to show and validate, and which to list on the Review step. It adds no routes, auth, persistence, PII handling, secrets, config, or dependencies. No blocking issues were found. Password-widget masking still applies to cross-step conditional fields: `ReviewState.test.tsx` checks that `SDK token` renders as `******`. A cross-step field whose condition is false is dropped from the Review step entirely, not shown in clear. One low-severity transparency item and two informational items are recorded. None of them blocks Gate 3.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | Data exposure / transparency | `plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx` L94-L109 (and documented in `docs/features/software-templates/input-examples.md` note) | A cross-step conditional field whose condition no longer holds is now left off the Review step. Its stale value is still part of `formState` and is sent to the template (the doc note says so). The user can't see on the Review step a value they typed earlier, for example a token, that will still be submitted. Same-step conditionals already behave this way, so this is consistent and documented, not a regression. Confidence: high. | Optional follow-up: remove values of inactive conditional fields from the payload when the user submits. At minimum, keep the doc note that tells authors to guard with `if:` in `spec.steps`. Not a Gate 3 blocker. |
| Info | Input handling (template-author controlled) | `plugins/scaffolder-react/src/next/components/ReviewState/util.ts` L65-L72 | `data[name] = formState[name]` uses names taken from the template schema (`if.properties` / `dependencies` keys). A schema key such as `__proto__` would set the prototype of the local `data` object only. The object is never shared, so nothing global is polluted, and it mirrors the existing dependencies loop just above. Template schemas come from catalog authors. Confidence: high that impact is nil. | None required. If you want to harden it, skip `__proto__`/`constructor` keys or build `data` with `Object.create(null)`. |
| Info | Availability (client-side) | `plugins/scaffolder-react/src/next/lib/schema.ts` `getCrossStepConditions` / `getConditionalPropertyNames`; `ReviewState/util.ts` L67; `Stepper/Stepper.tsx` L298 | The schema walkers recurse with no depth limit, and `declaredHere` re-walks the schema for every name, so cost grows roughly quadratically. They run once per form key for each step on the Review step, and `expandCrossStepDependencies` runs on every Stepper render. Input is acyclic JSON from a template, so there is no infinite recursion. The worst case is a slow browser tab caused by a hostile or huge template. Confidence: medium. | Optional: compute `getCrossStepConditions` and `expandCrossStepDependencies` once per step schema (`useMemo`) rather than on every render or key. |

## Passing checks
- PII encryption / role masking / audit-before-PII: n/a, not in the touched set (no PII fields, entities, or serializers). The existing `ui:widget: password` masking still applies to cross-step fields (covered by a test).
- Route guards, role + `reports_to` checks, JWT secret, password hashing: n/a, no controllers or auth code in the touched set.
- Audit log append-only / reader role / entry shape: n/a, no audit table in the touched set.
- Secrets in code: grep for `(api_key|secret|password|token) = "..."` over all touched files found no hits. The test fixtures use dummy values only (`'secret'`, `'my-sdk'`), with no real credentials.
- Docs example (`input-examples.md`): has no secrets or credentials. The changeset has no secrets.
- `.env.example` / `.env` gitignore: n/a, no config in the touched set.
- Helmet, rate limiting, global error filter: n/a, frontend-only change.
- Dependency risk: no manifest or lockfile touched, and no new imports outside the package (`json-schema-library` and `@backstage/types` were already used). Recorded as unchanged; `npm audit` not run.

## Required fixes before sign-off
- None.

Tool calls: 5
