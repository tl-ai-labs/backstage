# Run 20261104-210415-docs-catalog-model-tsdoc — policy argon4-agsdk-only

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $2.2304 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $10.6045 |
| **True total** | **$12.8349** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 3 | gemini-4-argon | $0.0020 |
| requirements_analysis | 2 | gemini-4-argon | $0.9195 |
| architecture_design | 1 | gemini-4-argon | $0.7879 |
| plan_task_packets | 1 | none | $0.0000 |
| docs | 16 | gemini-4-argon | $0.2297 |
| senior_code_review | 1 | gemini-4-argon | $0.1447 |
| debug | 6 | gemini-4-argon | $0.0743 |
| security_review | 1 | gemini-4-argon | $0.0724 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 30 | $2.2304 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 87 | $5.9407 |
| claude-opus-5-5 | helper | 81 | $4.6638 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage-2/.sdlc/runs/20261104-210415-docs-catalog-model-tsdoc" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage-2"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
