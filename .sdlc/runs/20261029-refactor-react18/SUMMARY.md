# Run 20261029-refactor-react18 — policy flash-agsdk-only-v38

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $0.1049 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $57.9573 |
| **True total** | **$58.0622** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 1 | gemini-3.8-flash | $0.0008 |
| plan_task_packets | 1 | gemini-3.8-flash | $0.0000 |
| codegen | 15 | gemini-3.8-flash | $0.0708 |
| docs | 6 | gemini-3.8-flash | $0.0238 |
| tests | 1 | gemini-3.8-flash | $0.0063 |
| debug | 1 | gemini-3.8-flash | $0.0032 |
| security_review (measured: the helper's own transcript) | 7 | claude-opus-5 | $0.6572 |
| senior_code_review (measured: the helper's own transcript) | 29 | claude-opus-5 | $2.7104 |
| architecture_design (measured: the helper's own transcript) | 87 | claude-opus-5 | $14.3942 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-3.8-flash | 25 | $0.1049 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5 | session | 118 | $21.2896 |
| claude-opus-5 | helper | 247 | $36.6676 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.9.3/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261029-refactor-react18" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)

## Checks set aside

A check that already failed before the run changed a file could not judge the change, so it was set aside for that file (the latest batch receipt of each packet):

- `packages/frontend-dev-utils/src/createDevApp.test.tsx`: `jest-file` (`CI=true yarn test '{path}'`)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: `eslint` (`yarn eslint '{path}'`)
