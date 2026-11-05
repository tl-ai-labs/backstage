# Run 20261105-100258-refactor-react18-only — policy argon4-plus-flash38

Status: **provisional**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $4.2285 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $6.0612 |
| **True total** | **$10.2897** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 6 | gemini-4-argon, gemini-3.8-flash | $0.0053 |
| requirements_analysis | 1 | gemini-4-argon | $0.1777 |
| architecture_design | 2 | gemini-4-argon | $3.0010 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 82 | gemini-3.8-flash, gemini-4-argon | $0.4248 |
| tests | 2 | gemini-3.8-flash, gemini-4-argon | $0.0240 |
| docs | 6 | gemini-3.8-flash, gemini-4-argon | $0.0530 |
| senior_code_review | 1 | gemini-4-argon | $0.3517 |
| security_review | 1 | gemini-4-argon | $0.1910 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 15 | $3.8445 |
| gemini-3.8-flash | 86 | $0.3840 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 42 | $1.7677 |
| claude-opus-5-5 | helper | 92 | $4.2935 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/backstage/.sdlc/runs/20261105-100258-refactor-react18-only" --project-root "/Users/macbook/Documents/GitHub/backstage"
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

- `packages/frontend-dev-utils/src/createDevApp.test.tsx`: `test` (`CI=1 yarn test '{path}'`)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: `eslint` (`yarn eslint '{path}'`)
