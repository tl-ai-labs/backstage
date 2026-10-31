# SDLC project context

Maintained by the MMO brownfield pipeline. Run history: [`ledger.md`](./ledger.md) (machine mirror [`ledger.json`](./ledger.json)).

## Project fingerprint

- Repo: Backstage monorepo (Yarn workspaces, node-typescript; new and legacy frontend systems, backend system).
- Baseline: `.sdlc/baseline/current.json`, built 2026-10-31T05:29Z at `2e8b88268c8a` on `BS-BF-08/flash-agsdk-only-v38`, plugin 0.9.3.
- Default policy: `flash-agsdk-only-v38` (`.sdlc/project.json`). Auth mode under this policy: `vendor`.
- Default check line: `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports`, plus `CI=true yarn test packages/core-plugin-api`.

## Standing rules for runs in this repo

- Never look at an upstream PR that already fixes the task, its merge commit, or `master` / `origin/master`. Derive the fix from the branch's code and the brief only.
- Pass the person's gate answers to the orchestrator word for word, and never offer scope choices.
- `packages/core-compat-api/**` stays off-limits; any change to `RouteResolutionApi` must stay backward compatible (optional members only).

## Last run

- `20261031-120000-bugfix-approot-routeref` (bugfix, backstage/backstage#35932), accepted 2026-10-31. Changes are uncommitted in the working tree. See [`runs/20261031-120000-bugfix-approot-routeref/SUMMARY.md`](./runs/20261031-120000-bugfix-approot-routeref/SUMMARY.md).
