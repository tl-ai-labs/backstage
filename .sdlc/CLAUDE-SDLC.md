# SDLC State — backstage

Maintained by the MMO AI-SDLC plugin. Machine-written; edit the ledger instead.

## Project fingerprint

| | |
| --- | --- |
| Stack | node-typescript (Backstage, React, Jest, Storybook, Playwright, changesets, api-extractor) |
| Monorepo | yarn-workspaces · yarn@4.18.1 · Node 22 \|\| 24 · 235 packages (74 `packages/`, 162 `plugins/`) |
| Test command | `CI=1 yarn test <path>` — always with a path; never the whole suite |
| API reports | `yarn build:api-reports` · api-extractor via `@backstage/repo-tools` · reports are tracked and generated, never hand-edited |
| Default policy | `flash-agsdk-only-v38` |
| Baseline | `.sdlc/baseline/current.json` · HEAD at discovery `f20fd9b` |
| Stack profile | `.sdlc/baseline/stack-profile.md` (Tier 2b — no pre-authored adapter for this stack) |

## Runs

See **[.sdlc/ledger.md](ledger.md)** for the full ledger (machine mirror: `ledger.json`).

| Run | Intent | Status | Dispatched | True total |
| --- | --- | --- | --- | --- |
| [`20261030-152500-docs-catalog-model-tsdoc`](runs/20261030-152500-docs-catalog-model-tsdoc/SUMMARY.md) | docs | accepted | $0.210158 | $45.424833 |

## Notes for future runs

- `ae-undocumented` is in the `-o` omit list of `build:api-reports`, so missing TSDoc does not
  fail the build. But this package tolerates **no** api-extractor warnings at all — a marker
  grep alone is not a sufficient acceptance check, as round 1 of the docs run demonstrated.
- `--validate-release-tags` is active. Reuse the release tag the report already shows; never
  promote `@alpha` to `@public`. Documented members of a type carry no tag of their own.
- `@param name - desc` requires the hyphen (`STYLE.md:234`) or api-extractor warns.
- `.sdlc/` is **tracked on branch `BS-DOC-04/flash-agsdk-only-v38`** by the person's decision
  (WIP commits after each gate are part of this study). It is not in `.gitignore`; on other
  branches it is covered only by the machine-local `.git/info/exclude`.
- Husky `pre-commit` runs `lint-staged` (`eslint --fix` + `prettier --write` on `.ts`), so
  committing reformats touched files.
- Cost figures for orchestrator overhead are transcript-priced and unverified; re-run
  `collect-orchestrator-usage.mjs` after a session closes for a better figure.
