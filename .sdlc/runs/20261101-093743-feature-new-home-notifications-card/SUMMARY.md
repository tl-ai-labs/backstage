# Run 20261101-093743-feature-new-home-notifications-card — policy flash-agsdk-only-v38

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $0.6402 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $22.0364 |
| **True total** | **$22.6766** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 1 | gemini-3.8-flash | $0.0004 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 12 | gemini-3.8-flash | $0.0789 |
| docs | 6 | gemini-3.8-flash | $0.0281 |
| tests | 13 | gemini-3.8-flash | $0.1296 |
| debug | 37 | gemini-3.8-flash | $0.4032 |
| senior_code_review (measured: the helper's own transcript) | 7 | claude-opus-5-5 | $1.1237 |
| security_review (measured: the helper's own transcript) | 9 | claude-opus-5-5 | $0.9090 |
| architecture_design (measured: the helper's own transcript) | 21 | claude-opus-5-5 | $3.1973 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-3.8-flash | 69 | $0.6402 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 62 | $8.4176 |
| claude-opus-5-5 | helper | 126 | $13.6187 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.9.3/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261101-093743-feature-new-home-notifications-card" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
