# SDLC state — backstage

**Project fingerprint** (recorded 2026-10-30)

- **Stack:** node-typescript on Yarn Berry workspaces (yarn 4.18.1, TS ~5.7, Node 22||24), 236 packages
- **Test command:** `CI=1 yarn test <path>` — a path argument is mandatory; never run the full suite
- **Supporting gates:** `yarn tsc` (root, no options), `yarn lint:all` (whole repo), `yarn build:api-reports`
- **Default policy:** `flash-agsdk-only-v38` (`.sdlc/project.json`)
- **Baseline:** `.sdlc/baseline/current.json` + `discovery.md` + `stack-profile.md` (Tier 2b)
- **HEAD at last close:** `be26a07330b4` on `BS-NF-12/flash-agsdk-only-v38`

**Runs:** see [ledger.md](ledger.md) — 1 run, last `feature-new` on 2026-10-30 (accepted).

**Repo notes carried forward**

- Both frontend systems are live; `EntityLayoutBui` is the *default* alpha path, `EntityLayout` the fallback.
- zod import path differs by layer: `zod/v3` in catalog-backend, `zod/v4` in alpha code.
- Husky + lint-staged rewrite staged files on commit.
- Changesets are mandatory for published packages and must be hand-edited — never the changeset CLI.
- Fork: `origin` = tl-ai-labs/backstage, `upstream` = backstage/backstage.
