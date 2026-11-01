# Run 20261101-102810-feature-new-home-notifications-card — policy opus55-only

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $1.4079 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $11.4883 |
| In-session work already inside the overhead, counted once | −$0.0900 |
| **True total** | **$12.8062** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 1 | claude-opus-5-5 | $0.0086 |
| requirements_analysis | 1 | claude-opus-5-5 | $0.0900 |
| plan_task_packets | 1 | claude-opus-5-5 | $0.0000 |
| codegen | 13 | claude-opus-5-5 | $0.5222 |
| docs | 3 | claude-opus-5-5 | $0.0933 |
| tests | 5 | claude-opus-5-5 | $0.4059 |
| debug | 4 | claude-opus-5-5 | $0.2880 |
| senior_code_review (measured: the helper's own transcript) | 9 | claude-opus-5-5 | $1.0942 |
| security_review (measured: the helper's own transcript) | 8 | claude-opus-5-5 | $0.8578 |
| architecture_design (measured: the helper's own transcript) | 18 | claude-opus-5-5 | $2.9301 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| claude-opus-5-5 | 28 | $1.4079 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 37 | $1.8962 |
| claude-opus-5-5 | helper | 93 | $9.5920 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/apple/.claude/plugins/cache/tilicho-ai-labs/mmo/0.9.3/scripts/collect-orchestrator-usage.mjs" "/Users/apple/Documents/GitHub/bs-cells/BS-NF-09/.sdlc/runs/20261101-102810-feature-new-home-notifications-card" --project-root "/Users/apple/Documents/GitHub/bs-cells/BS-NF-09"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
