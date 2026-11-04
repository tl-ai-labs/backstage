# Security Review — pass2

## Summary
Re-reviewed the final diff across all 14 touched files after the two Gate 3 fix rounds (`plugins/scaffolder-react/src/next/lib/schema.ts`, regression tests in `schema.test.ts`, `ReviewState.test.tsx`, `Stepper.test.tsx`, and the mobile-SDK documentation example in `docs/features/software-templates/input-examples.md`). The schema resolution fixes (preserving field metadata and nested properties during branch merges, restricting discriminator classification to pure `const`/`enum`/`not` constraints, handling partly filled `oneOf`/`anyOf` branches and discriminator-less fallbacks, and keeping same-step chained conditionals intact) introduce no code execution, injection, or credential exposure risks. However, we record one **Low** finding regarding the Review-to-Submit discrepancy where `ReviewState` now hides deactivated conditional fields (including `ui:field: Secret` and `ui:widget: password`) while `Stepper` still submits their stale values via `onCreate` (and `SecretsContext`).

## Findings
| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | Data Exposure / Review-to-Submit Integrity | `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx:291` (`plugins/scaffolder-react/src/next/components/ReviewState/ReviewState.tsx:109`) | **What a user/adopter sees:** If a user fills a conditional field in Step 2, navigates back to Step 1, and unticks the controlling flag, Step 2 and the `ReviewState` table (`ReviewState.tsx:109`) now omit the deactivated field (including hiding the masked `******` row for `ui:field: Secret` and `ui:widget: password`), so the user sees a Review screen indicating the value will not be sent. However, because `Stepper.tsx:291` still calls `onCreate(stepsState)` with the unfiltered state (per Gate 1 Out-of-scope 5), an adopter/template action inspecting the created task still receives the stale parameter in `values` and `secrets`. **Why it matters for secrets:** Previously, `ReviewState` still rendered `******` for a stale secret or password field, alerting the user before creation; hiding the row in `ReviewState` while still submitting the data creates a WYSIWYG trust gap where (1) a stale `ui:widget: password` value (`PasswordWidget.tsx`) remains in `stepsState` as plaintext and is submitted and persisted in the backend task's `spec.parameters`, and (2) a stale `ui:field: Secret` value (`SecretInput.tsx` / `SecretWidget.tsx`) retains its `'***...'` mask in `stepsState` and its plaintext secret in `SecretsContext` (`useTemplateSecrets` in `TemplateWizardPage.tsx:118`), transmitting the unreviewed secret to `/v2/tasks` and into the task's `secrets` store. | Prune keys from `stepsState` that are defined in the template schemas (`isKeyDefinedInSchemas`) but absent from any active resolved step schema (`findSchemaForKey`) before calling `onCreate` in `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx:291`, and clear or omit deactivated conditional keys from `SecretsContext` so unreviewed stale values and secrets are not submitted. |

## Passing checks
- **Secrets & config (source, tests, docs):** No hardcoded secrets, API keys, or credentials in the 6 touched source files, 6 test files (including the new regression suites), or 2 documentation/changeset files (including the rewritten `isMobileSdk` example).
- **Schema resolution & validator safety (`schema.ts`, `createAsyncValidators.ts`):** Uses `flatted` deep-cloning and `@rjsf/validator-ajv8` without dynamic code execution, `eval`, or unsafe DOM rendering; inactive conditional field validators are properly skipped.
- **PII handling:** n/a — not in the touched set.
- **Authn & authz:** n/a — not in the touched set.
- **Audit log integrity:** n/a — not in the touched set.
- **Surface & headers:** n/a — not in the touched set.
- **Dependency risk:** Unchanged — no package manifest or lockfile in the touched set.

## Required fixes before sign-off
- Decide at Gate 3 whether to accept or defer the `Stepper.tsx:291` / `ReviewState.tsx:109` stale conditional submission finding (left unchanged per Gate 1 Out-of-scope 5): if conditional `ui:field: Secret` or `ui:widget: password` fields are used across steps, prune deactivated schema keys from the `onCreate` payload and `SecretsContext` so hidden secrets/passwords are not silently submitted after being omitted from the Review screen.

Tool calls: 16
