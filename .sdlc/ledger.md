# SDLC run ledger

Machine mirror: `ledger.json`. Costs are provisional until `collect-orchestrator-usage.mjs` is re-run after the session closes.

| Run | Intent | Outcome | Policy / auth | Files | Tests | Spend (true total) | Branch |
|---|---|---|---|---|---|---|---|
| [20261104-184235-bugfix-routeref-startup-crash](runs/20261104-184235-bugfix-routeref-startup-crash/SUMMARY.md) | bugfix: app root elements re-resolve `useRouteRef` after finalization (BS-BF-08, #35932) | accepted, not committed | argon4-agsdk-only / vendor | 6 (5 edited, 1 new) | 434/434 | $10.35 ($3.25 Argon + $7.09 Claude overhead), provisional | `BS-BF-08/argon4-agsdk-only` |
