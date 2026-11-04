# Run 20261104-093718-feature-new-home-unread-notifs — policy argon4-agsdk-only

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $5.4471 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $10.7367 |
| **True total** | **$16.1838** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 3 | gemini-4-argon | $0.0031 |
| requirements_analysis | 1 | gemini-4-argon | $0.5468 |
| architecture_design | 2 | gemini-4-argon | $3.7056 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 10 | gemini-4-argon | $0.1309 |
| tests | 5 | gemini-4-argon | $0.1794 |
| docs | 4 | gemini-4-argon | $0.0362 |
| debug | 13 | gemini-4-argon | $0.4296 |
| senior_code_review | 2 | gemini-4-argon | $0.3267 |
| security_review | 1 | gemini-4-argon | $0.0888 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 41 | $5.4471 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 83 | $4.9721 |
| claude-opus-5-5 | helper | 94 | $5.7646 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261104-093718-feature-new-home-unread-notifs" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
