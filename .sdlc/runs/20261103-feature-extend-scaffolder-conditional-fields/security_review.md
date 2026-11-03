# Security Review — pass2

## Summary
Re-reviewed the final diff after the Gate 3 revision for brownfield `feature-extend` run `20261103-feature-extend-scaffolder-conditional-fields` (touching `ReviewState.tsx`, `ReviewState/util.ts`, `ReviewState.test.tsx`, and `.changeset/scaffolder-cross-step-conditional-fields.md`, alongside the 9 previously reviewed files). In `ReviewState.tsx`, fields hidden by an unsatisfied cross-step condition are omitted via `collectCrossStepHiddenKeys`, while active cross-step fields and same-step fields resolve through `findSchemaForKey` and `processSchema` with `resolveConditionalSchema`, preserving existing `ui:widget: 'password'`, `ui:field: 'Secret'`, and `ui:backstage.review` (`mask` / `show: false`) masking behavior unchanged. No security issues or secret exposures were introduced.

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| — | — | — | No findings introduced by this run. | — |

## Passing checks
- PII & secret masking in ReviewState: Verified that inactive cross-step conditional fields are omitted before rendering (`crossStepHiddenKeys.has(key)`), active cross-step and same-step fields resolve their schema definition in `processSchema` and apply `ui:backstage.review.mask`, `ui:backstage.review.show: false`, `ui:widget: 'password'`, and `ui:field: 'secret'` masking (`******`), and same-step conditional fields retain baseline behavior.
- PII handling (at rest / audit): n/a — not in the touched set (client-side template schema resolution and form state UI in `plugins/scaffolder-react`).
- Authn & authz: n/a — not in the touched set (no backend controller routes, guards, JWT config, or password storage touched).
- Audit log integrity: n/a — not in the touched set (no audit log tables or endpoints touched).
- Secrets & config (source): No hardcoded API keys, secrets, or passwords in `schema.ts`, `ReviewState.tsx`, `ReviewState/util.ts`, `Stepper.tsx`, or `createAsyncValidators.ts`.
- Secrets & config (tests): No real credentials or secrets embedded in test fixtures (`schema.test.ts`, `createAsyncValidators.test.ts`, `ReviewState/util.test.ts`, `ReviewState.test.tsx`, `Stepper.test.tsx`).
- Secrets & config (docs): No secrets exposed in documentation examples (`docs/features/software-templates/input-examples.md`, `docs/features/software-templates/writing-templates.md`, `.changeset/scaffolder-cross-step-conditional-fields.md`).
- Surface & headers: n/a — not in the touched set (no HTTP server middleware, rate limiters, or error filters touched).
- Dependency risk: unchanged — no manifest or lockfile (`package.json` / `yarn.lock`) in the touched set.

## Required fixes before sign-off
- None.

Tool calls: 12
