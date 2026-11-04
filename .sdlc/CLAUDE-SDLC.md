# SDLC project notes

Maintained by the mmo brownfield pipeline. The run history is in [ledger.md](ledger.md) (machine mirror: [ledger.json](ledger.json)).

## Project fingerprint

- **Baseline:** `.sdlc/baseline/current.json`, taken at `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/argon4-agsdk-only`.
- **Stack:** `node-typescript`. Yarn workspaces monorepo (`packages/*`, `plugins/*`), TypeScript ~5.7, React 18, Jest 30 with React Testing Library.
- **Default policy:** `argon4-agsdk-only` (from `.sdlc/project.json`).
- **Test command:** `CI=1 yarn test <path>`. Always pass a path. The prefix `plugins/notifications` also matches the `notifications-backend` database suites, which fail locally without the test databases.
- **Off-limits AI configuration:** `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`.

## Latest run

- `20261104-093718-feature-new-home-unread-notifs` (feature-new), accepted 2026-11-04. Changes are uncommitted.
