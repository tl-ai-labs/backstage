# SDLC ledger

Machine mirror: [`ledger.json`](./ledger.json). Per-run records live in [`runs/`](./runs/).

| Ended (UTC) | Run | Intent | Policy | Branch | Outcome | Files | Cost (true total) | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-10-31 12:16 | [`20261031-120000-bugfix-approot-routeref`](./runs/20261031-120000-bugfix-approot-routeref/SUMMARY.md) | bugfix | `flash-agsdk-only-v38` | `BS-BF-08/flash-agsdk-only-v38` | accepted (Gate 4) | 13 (10 edited, 3 new changesets) | $49.58 provisional ($0.19 dispatched) | backstage/backstage#35932: `useRouteRef` in app root elements before finalization. 8 new tests fail before / pass after; 438/438 + 84/84 pass; tsc, lint, API reports pass. One 2-line U01 edit made outside the packet flow; see run notes in SUMMARY.md. |
