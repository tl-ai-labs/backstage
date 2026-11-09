# SDLC ledger

| When (UTC) | Job | Cost | Summary |
|---|---|---|---|
| 2026-11-09T10:40Z | feature-new | $31.43 (provisional; $0.60 dispatched, of which $0.21 to gemini-3.8-flash via the Antigravity agent) | Run `20261109-123717-feature-new-home-unread-notifs`, policy `opus55-plus-flash38-agsdk`, auth `estimated`, accepted at Gate 4. Unread notifications home page card in `@backstage/plugin-notifications/alpha` (mark-as-read, live refresh with polling fallback, `/notifications?id=` row highlight), and `@backstage/plugin-home-react` card extensions render without an app context. 20 files changed, uncommitted; all 22 provenance entries match the files on disk. Fix round 3's Flash agent wrote `@backstage/types` into `plugins/notifications/package.json` and `yarn.lock` outside its packet; reverted at Gate 3 (see `run-notes.json`). |
