# Run 20261105-135542-test-routeref-render-bound — policy argon4-plus-flash38

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $0.5400 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $2.9146 |
| **True total** | **$3.4545** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 6 | gemini-4-argon, gemini-3.8-flash | $0.0048 |
| requirements_analysis | 1 | gemini-4-argon | $0.1266 |
| architecture_design | 1 | gemini-4-argon | $0.3288 |
| plan_task_packets | 1 | none | $0.0000 |
| tests | 1 | gemini-3.8-flash | $0.0129 |
| senior_code_review | 1 | gemini-4-argon | $0.0288 |
| security_review | 1 | gemini-4-argon | $0.0379 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 7 | $0.5252 |
| gemini-3.8-flash | 4 | $0.0147 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 34 | $1.3661 |
| claude-opus-5-5 | helper | 32 | $1.5485 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08/.sdlc/runs/20261105-135542-test-routeref-render-bound" --project-root "/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08"
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

- `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`: `test` (`CI=true yarn test '{path}'`)
