# SDLC project fingerprint

- Repo: Backstage monorepo (node-typescript, Yarn workspaces, 233 packages)
- Baseline: HEAD 2e8b88268c on BS-BF-08/argon4-plus-flash38 (see baseline/current.json)
- Default policy: argon4-plus-flash38
- Test command (confirmed at Gate 0): `CI=true yarn test packages/frontend-app-api packages/frontend-plugin-api && yarn tsc && yarn lint:all && yarn build:api-reports`
- Last run: 20261104-170616-bugfix-routeref-startup (bugfix, accepted 2026-11-05)
- Ledger: [ledger.md](ledger.md)
