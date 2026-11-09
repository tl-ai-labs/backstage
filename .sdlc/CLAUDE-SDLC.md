# SDLC project notes

Maintained by the mmo brownfield pipeline. The run history is in [ledger.md](ledger.md) (machine mirror: [ledger.json](ledger.json)).

## Project fingerprint

- **Baseline:** `.sdlc/baseline/current.json`, taken at `fe6ace679f3439ba2c5abf188a97dc5641a946f8` on branch `BS-NF-09/opus55-plus-flash38-agsdk`.
- **Stack:** `node-typescript`. Yarn 4 workspaces monorepo (`packages/*`, `plugins/*`), TypeScript, React 18, Jest through `backstage-cli` with React Testing Library.
- **Default policy:** `opus55-plus-flash38-agsdk` (from `.sdlc/project.json`).
- **Test command:** `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`. The prefix `plugins/notifications` also matches the `notifications-backend`, `-backend-module-*` and `-node` suites. With Docker running, the base fails two tests: `DatabaseNotificationsStore (POSTGRES_9)` and `(POSTGRES_11) › settings › should save and load notification settings`, because the backend settings query has no `ORDER BY`.
- **API reports:** run `yarn tsc:full` before `yarn build:api-reports:only <paths> --ci`. Straight after a plain `yarn tsc`, the check fails on translation key order alone.
- **Off-limits AI configuration:** `.claude/**`, `.cursor/**`, `.github/copilot-instructions.md`, `AGENTS.md`, `plugins/catalog-backend/CLAUDE.md`.

## Latest run

- `20261109-123717-feature-new-home-unread-notifs` (feature-new), accepted 2026-11-09. Changes are uncommitted.
