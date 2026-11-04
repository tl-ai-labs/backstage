# SDLC project record

- Project: Backstage monorepo (node-typescript, Yarn 4 workspaces)
- Baseline: fe6ace6 on branch BS-NF-09/argon4-plus-sonnet55 (built 2026-11-03)
- Default policy: argon4-plus-sonnet55
- Test command used by the last run: `CI=true yarn test plugins/notifications plugins/home-react && yarn tsc && yarn lint:all`
- Known baseline failures: 2 `DatabaseNotificationsStore` tests (Postgres 9 and 11) in plugins/notifications-backend
- Last run: 20261104-005757-feature-new-home-unread-notifications-card (feature-new, accepted 2026-11-04)
- Ledger: [ledger.md](ledger.md) · [ledger.json](ledger.json)
