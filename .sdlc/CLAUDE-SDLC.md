# SDLC project fingerprint

- Latest run: `20261101-093743-feature-new-home-notifications-card` (feature-new, accepted, 2026-11-01). See [ledger.md](ledger.md).
- Branch and HEAD at close: `BS-NF-09/flash-agsdk-only-v38`, `0d19e8ee993cceacaecaaf40e2911dfbfa466f07`. The run's source changes are uncommitted in the working tree.
- Stack: TypeScript and React in a Yarn workspaces monorepo (Backstage). Profile: [baseline/stack-profile.md](baseline/stack-profile.md).
- Default policy: `flash-agsdk-only-v38`. Under it, `estimated` auth cannot start; `vendor` passes the start check on Vertex ADC.
- Checks: `CI=true yarn test <paths>`, `yarn tsc`, `yarn lint:all`, run separately.
- API reports: `yarn tsc:full`, then `yarn build:api-reports:only <paths>`, then the same command with `--ci`. `--tsc` with paths produces a key order that fails CI.
- Failing before the first run: `DatabaseNotificationsStore (POSTGRES_9)` and `(POSTGRES_11)` › settings › should save and load notification settings.
