# Security Review — pass1

## Summary
Scoped brownfield security review of the 16 touched files for cross-step conditional fields in `@backstage/plugin-scaffolder-react` (`feature-extend`). No security vulnerabilities, hardcoded secrets, or unsafe data handling were introduced. Inactive conditional fields are properly pruned from form state prior to validation, review rendering, and `onCreate` submission, and feature-flagged properties inside conditional branches (`dependencies`, `if`/`then`/`else`, `allOf`/`oneOf`/`anyOf`) are filtered out when their feature flag is inactive.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| None | — | — | No findings in the touched set. | — |

## Noted (pre-existing, out of scope)
- None.

## Passing checks
- PII & response masking: `ReviewState` resolves cross-step conditional schemas before looking up property definitions, preserving `ui:backstage.review` masking and omitting inactive conditional keys; `Stepper` prunes inactive conditional values before `onCreate` submission (`n/a — not in the touched set` for backend DB encryption at rest and audit transactions).
- Authn & authz: `useTemplateSchema` recursively filters feature-flagged properties and `required` entries across conditional branches (`n/a — not in the touched set` for backend controller guards, `reports_to`, JWT secrets, and password hashing).
- Audit log integrity: n/a — not in the touched set.
- Secrets & config: No hardcoded secrets or credentials in the 6 source files, 8 test files, or 2 documentation/changeset files.
- Surface & headers: n/a — not in the touched set.
- Dependency risk: Unchanged — no manifest or lockfile (`package.json` / `yarn.lock`) in the touched set.

## Required fixes before sign-off
- None.

Tool calls: 9
