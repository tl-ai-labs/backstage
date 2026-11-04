# Run 20261104-005757-feature-new-home-unread-notifications-card — policy argon4-plus-sonnet55

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $3.3861 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $8.4790 |
| **True total** | **$11.8651** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 4 | gemini-4-argon, claude-sonnet-5-5 | $0.0072 |
| requirements_analysis | 1 | gemini-4-argon | $0.1343 |
| architecture_design | 3 | gemini-4-argon | $1.8243 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 12 | claude-sonnet-5-5 | $0.1950 |
| docs | 5 | claude-sonnet-5-5 | $0.0620 |
| tests | 6 | claude-sonnet-5-5, gemini-4-argon | $0.2676 |
| debug | 9 | gemini-4-argon, claude-sonnet-5-5 | $0.3489 |
| senior_code_review | 2 | gemini-4-argon | $0.3969 |
| security_review | 2 | gemini-4-argon | $0.1498 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 21 | $2.7960 |
| claude-sonnet-5-5 | 23 | $0.5901 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 51 | $2.8396 |
| claude-opus-5-5 | helper | 79 | $5.6394 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/apple/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.0/scripts/collect-orchestrator-usage.mjs" "/Users/apple/Documents/GitHub/bs-cells/BS-NF-09-argon-attempt2/.sdlc/runs/20261104-005757-feature-new-home-unread-notifications-card" --project-root "/Users/apple/Documents/GitHub/bs-cells/BS-NF-09-argon-attempt2"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
