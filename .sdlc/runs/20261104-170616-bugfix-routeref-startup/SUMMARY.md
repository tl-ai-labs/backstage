# Run 20261104-170616-bugfix-routeref-startup — policy argon4-plus-flash38

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $14.9497 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $15.2858 |
| **True total** | **$30.2356** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 6 | gemini-4-argon, gemini-3.8-flash | $0.0043 |
| requirements_analysis | 2 | gemini-4-argon | $1.1922 |
| architecture_design | 4 | gemini-4-argon | $5.1174 |
| plan_task_packets | 1 | none | $0.0000 |
| tests | 3 | gemini-3.8-flash, gemini-4-argon | $0.0335 |
| codegen | 6 | gemini-3.8-flash, gemini-4-argon | $0.0480 |
| debug | 4 | gemini-4-argon | $0.1659 |
| senior_code_review | 1 | gemini-4-argon | $8.2942 |
| security_review | 2 | gemini-4-argon | $0.0944 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 18 | $14.8986 |
| gemini-3.8-flash | 10 | $0.0512 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 84 | $6.3904 |
| claude-opus-5-5 | helper | 101 | $8.8954 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08/.sdlc/runs/20261104-170616-bugfix-routeref-startup" --project-root "/Users/macbook/Documents/GitHub/bs-cells/BS-BF-08"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
