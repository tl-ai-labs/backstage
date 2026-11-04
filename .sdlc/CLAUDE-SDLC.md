# SDLC project notes

Ledger: [ledger.md](ledger.md), with a machine-readable copy in [ledger.json](ledger.json).

## Project fingerprint

- Repo: the Backstage monorepo, a Yarn 4 workspace of 235 packages under `packages/*` and `plugins/*`, written in TypeScript with React, Express and Jest.
- Baseline: `.sdlc/baseline/current.json`, built at HEAD `f20fd9b59828` on `BS-FE-08/argon4-agsdk-only`.
- Default policy: `argon4-agsdk-only` (`.sdlc/project.json`).
- Test command convention: `CI=1 yarn test <path>` from the repo root, always with a path.
- `.sdlc/` is ignored only through the shared `.git/info/exclude` (line 7); `.gitignore` doesn't cover it.

## Latest run

`20261104-160801-feature-extend-scaffolder-conditional-fields` (feature-extend) was accepted on 2026-11-04.
- It changed 14 files, all left uncommitted, and `/mmo:revert` can restore them.
- Its cost is $25.14, provisional.
