Changes asked for this step:

Gate 1 answer from the user, verbatim:

revise: 1. FR-2 and AC-1: follow standard JSON Schema rules, as the backend does when it validates the submitted values against every step's schema; don't special-case an unset flag. The doc example and the AC-1 test should use a condition that can't match when the flag is unset: an `if` that lists the flag under `required`, or `dependencies` keyed on the flag. 2. In-scope item 3 and FR-5: keep the change to what the form shows and validates, including the Review step. Don't change the data submitted when the task is created.

How to apply it:
- Item 1: rewrite FR-2 so conditions evaluate by standard JSON Schema semantics, the same as the backend's check in plugins/scaffolder-backend/src/service/router.ts (around line 590, which validates the full submitted `values` against each `spec.parameters` step with the `jsonschema` package's `validate`). No special handling of an unset flag. Make AC-1 (and FR-8's doc example) use a condition that cannot match when the flag is unset: an `if` that lists the flag under `required` (for example `if: { properties: { flag: { const: true } }, required: [flag] }`), or `dependencies` keyed on the flag.
- Item 2: limit in-scope item 3, FR-5 and FR-6 to what the form shows and validates, the Review step included. Remove every requirement that the `onCreate` submission payload changes: delete the in-scope wording "and final `onCreate` submission payload", FR-5's "must not be passed as an active parameter when `onCreate` is invoked", and any such wording in FR-6. Update the Role matrix and PII inventory rows that describe what is submitted, so they say the data passed to `onCreate` stays as it is today. Add an Out of scope item saying that the values submitted when the task is created are unchanged.
- Leave everything else as it is. Keep the FR-/AC- numbering stable.

Edit the pieces you handed in and hand each changed one in again.