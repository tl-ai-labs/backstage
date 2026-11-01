# Security Review — pass1

Scope: the 8 files in `provenance.json`, compared with `f20fd9b59828`. This is a frontend-only change to the scaffolder form, with no backend, auth or persistence code in the touched set.

## Summary

Low risk, with no high or medium findings and no secrets in the change. The run introduces no plaintext regression in the Review step and closes one existing leak: a `ui:widget: password` field under a cross-step top-level `if` showed in plaintext at baseline and is now masked. Three low findings remain. One needs a one-sentence changeset fix before sign-off, because the changeset says hidden values are not submitted while secret-field values still are. Hiding a field is a client-side form behaviour, not an access control: the backend still accepts whatever values a direct API call sends.

## Findings

| Severity | Category | Location | Issue | Recommendation |
|---|---|---|---|---|
| Low | PII / data handling | `.changeset/scaffolder-cross-step-conditions.md:5`; behaviour at `plugins/scaffolder-react/src/next/components/Stepper/Stepper.tsx:265` | `visibleState` drops the masked placeholder from form values, but the real value stays in the secrets context and `TemplateWizardPage.tsx:109-118` (not touched) still submits it. The user no longer sees a Review row for a secret that is sent to the task. The changeset says the value is left out of "the submitted values", which contradicts `docs/features/software-templates/input-examples.md:412`. | Required: add the secret-field exception to the changeset. Optional follow-up: filter hidden keys out of secrets at submit, which needs a change in `plugins/scaffolder`. |
| Low | Surface | `plugins/scaffolder-react/src/next/components/ReviewState/util.ts:72` | `formState` can come from the `?formData=` query string, so a crafted link with an own `hasOwnProperty` key makes this call throw while Review renders. The effect is availability only, in the session of whoever opens the link, and no data is exposed. Line 59 has the same pattern at baseline, but this line extends it to `if`/`then` templates. Confidence is high from language semantics; I did not run this case. | Use `Object.prototype.hasOwnProperty.call(formState, conditionKey)`, as `crossStepConditions.ts` already does. |
| Low | PII / masking | `plugins/scaffolder-react/src/next/components/ReviewState/util.test.ts`, `plugins/scaffolder-react/src/next/components/Stepper/Stepper.test.tsx`, `plugins/scaffolder-react/src/next/lib/crossStepConditions.test.ts` | Masking of cross-step fields now depends on the lookup added in `util.ts`, but none of the touched tests mention `mask` or `password`. A regression there would show plaintext in Review with the suite still passing. | Add one `ReviewState` test covering a cross-step `if`/`then` field with `ui:widget: password`. |

## Passing checks

- Review masking: the real `ReviewState` masked every case across 10 condition forms and 4 field definitions (`ui:widget: password`, `ui:field: Secret`, `review.mask`, `review.show: false`), 40 of 40.
- Hidden values: tests show they are dropped from Review and `onCreate` for the `dependencies`, `oneOf`, `if`/`then` and `allOf` forms and for chained conditions.
- Fail-open path (`crossStepConditions.ts:305`): returns the unfiltered values, which matches baseline behaviour. It only triggers on an unresolvable schema.
- Prototype pollution: `data[conditionKey]` writes only to a local object and lodash `omit` is used for removal, so there is no global pollution.
- Termination: the `omitHiddenCrossStepValues` loop shrinks `values` on each pass, and the schema walks are bounded by JSON depth because `$ref` is not followed.
- Secrets scan: no matches in any touched file, using the checklist regex extended with `token` and `:`.
- Test fixtures: no real credentials, only placeholders such as `because`, `ABC-1` and `team-a`.
- Docs and changeset: no secrets in examples.
- Module surface: `crossStepConditions` is imported only by `util.ts` and `Stepper.tsx`, and is not exported from the `lib` index.
- Dependencies: unchanged, since no manifest or lockfile is touched. `@rjsf/utils` and `lodash` are already declared in `plugins/scaffolder-react/package.json`, so `npm audit` was not run.
- Encryption at rest and audit-before-access: n/a — not in the touched set.
- Authn and authz (guards, `reports_to`, JWT, password storage): n/a — not in the touched set.
- Audit log integrity: n/a — not in the touched set.
- `.env.example` and `.env` handling: n/a — not in the touched set.
- Helmet, rate limiting and the error filter: n/a — not in the touched set.

## Noted (pre-existing, out of scope)

Not gating. These gave the same result at baseline and on the current code.

- **Plaintext fallback in Review:** when `findSchemaForKey` returns null, `ReviewState.tsx` shows the raw value and skips every mask check. With `ui:widget: password`, the value appeared in plaintext in these cases:
  - same-step top-level `if`
  - same-step `allOf` `if`
  - a condition reading an earlier key defined under a root `oneOf`
  - a condition reading an earlier key defined under a root `anyOf`
  - a condition reading an earlier key defined under `then.oneOf`
  - a key declared in both steps
  - a key supplied only by the query string
- **Other field types:** only `password` was measured here. `review.mask` and `review.show: false` sit behind the same check, so they should fail the same way. `ui:field: Secret` holds asterisks in form values, so it does not expose the real value.
- **Related to this run:** the three `oneOf`/`anyOf` cases sit next to this change. `fieldKeys` (`crossStepConditions.ts:118`) does not look inside those keywords, although the docs say a field can depend on "any earlier step". Extending it should close those cases. The same-step behaviour is pinned by `util.test.ts:274` as required by this run's same-step compatibility rule, so changing it is a separate decision.

## Required fixes before sign-off

- `.changeset/scaffolder-cross-step-conditions.md`: state that a value entered in a secret field stays in the task's secrets when its field is hidden, matching `docs/features/software-templates/input-examples.md:412`.

The other two findings are recommended and do not block sign-off.

Tool calls: 8
