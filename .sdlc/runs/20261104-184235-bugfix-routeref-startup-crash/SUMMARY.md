# Run 20261104-184235-bugfix-routeref-startup-crash — policy argon4-agsdk-only

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $3.2526 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $8.3086 |
| **True total** | **$11.5611** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 3 | gemini-4-argon | $0.0031 |
| requirements_analysis | 1 | gemini-4-argon | $0.3420 |
| architecture_design | 2 | gemini-4-argon | $2.6663 |
| plan_task_packets | 1 | none | $0.0000 |
| tests | 2 | gemini-4-argon | $0.0571 |
| codegen | 5 | gemini-4-argon | $0.0749 |
| senior_code_review | 1 | gemini-4-argon | $0.0591 |
| security_review | 1 | gemini-4-argon | $0.0502 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 15 | $3.2526 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 89 | $5.4657 |
| claude-opus-5-5 | helper | 55 | $2.8429 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261104-184235-bugfix-routeref-startup-crash" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
