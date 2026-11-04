## This invocation

mode: brownfield
intent: docs
run_id: 20261104-docs-catalog-model-tsdoc
change plan: .sdlc/runs/20261104-docs-catalog-model-tsdoc/change_plan.md
provenance: .sdlc/runs/20261104-docs-catalog-model-tsdoc/provenance.json (read edited files as `git diff <git_head_before> -- <file>`, new files in full)
write review to: .sdlc/runs/20261104-docs-catalog-model-tsdoc/review.json
Results already in hand (do not re-run):
- Gate 0 test command `yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md`: exit 0 (0 markers in report.api.md, was 45; report-alpha.api.md 22, out of scope).
- Formatting step `yarn prettier --write` on the 16 changed paths: exit 0, no changes.
- git status: only the 18 allowlisted paths changed; nothing outside the allowlist to revert.
Review focus (person's rules): only comments changed (no code, signature, release-tag or copyright-year changes); every TSDoc description accurate against the implementation it documents; package TSDoc style; changeset names only '@backstage/catalog-model': patch, adopter-facing, no internal symbols.