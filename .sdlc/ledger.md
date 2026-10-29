# SDLC run ledger

One row per completed run. Newest last.

| Run ID | Date | Intent | Policy | Auth | Gates | Source files | Verification | Dispatched | True total | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `20261029-162244-feature-extend-scaffolder-conditional-fields` | 2026-10-29 | feature-extend | flash-agsdk-only-v38 | vendor | approved / approved / revise / accept | 11 changed (12 written) | green (2402 passed, tsc clean, lint:all clean) | $0.48 | $69.81 (provisional) | accepted |

## Notes

### 20261029-162244-feature-extend-scaffolder-conditional-fields

Cross-step conditional fields in the Scaffolder form wizard: a field in a later step can be shown,
hidden or required based on answers given in an earlier step, with the review step, per-step
validation and back-navigation all kept correct.

- **Root cause** was schema scoping, not state plumbing: `@rjsf/utils` 5.24.13 `processDependencies`
  skips a dependency whose key is absent from `resolvedSchema.properties` whenever the step declares
  `properties` at all. Fixed with an isolated probe schema rather than injecting stubs into the
  rendered schema.
- **FR-1 is satisfied by `resolveStepSchema`**, not by the planned `useTemplateSchema.ts:73` guard
  change — the senior review found that change behaviourally identical for every realistic shape and
  reverted it. That file is byte-identical to the base commit, though it is recorded in
  `provenance.json` because the run did write it (hence 12 written vs 11 changed).
- **Security review gated the run** with four findings, all fixed and re-verified by probe: a
  wizard-wide field-extension validation bypass (introduced by this run's own senior-review fix),
  a prune that dropped a visible filled answer in mixed-condition steps, a feature-flag bypass on
  hoisted conditional properties, and docs that invited reading conditional visibility as access
  control. Advisory item 5 was answered in the docs; item 6 was skipped by decision.
- **Behaviour change disclosed in the changeset**: an answer whose governing condition stops holding
  is now removed from form data, so it no longer reaches `spec.steps`.
- **Cost shape**: dispatched work $0.48 (all `gemini-3.8-flash`), orchestrator overhead $69.33
  (~144x) because this policy's judgment tier cannot execute in-session and ran on Claude. The total
  is transcript-priced and provisional.

**Outstanding:** `yarn build:api-reports` must be run manually — three exports added to
`plugins/scaffolder-react/src/next/lib/index.ts` grow the public alpha surface, and
`**/api-report*.md` was off-limits to the run. CI will fail without it.
