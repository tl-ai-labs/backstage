# Run 20261104-210402-refactor-require-react18 — policy argon4-agsdk-only

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $5.0232 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $12.8499 |
| **True total** | **$17.8731** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 3 | gemini-4-argon | $0.0020 |
| requirements_analysis | 2 | gemini-4-argon | $1.0196 |
| architecture_design | 2 | gemini-4-argon | $2.2244 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 85 | gemini-4-argon | $1.0504 |
| docs | 10 | gemini-4-argon | $0.1635 |
| tests | 2 | gemini-4-argon | $0.0334 |
| debug | 6 | gemini-4-argon | $0.1002 |
| senior_code_review | 1 | gemini-4-argon | $0.2519 |
| security_review | 1 | gemini-4-argon | $0.1778 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 112 | $5.0232 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 102 | $7.0071 |
| claude-opus-5-5 | helper | 104 | $5.8427 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261104-210402-refactor-require-react18" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
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

- `packages/frontend-dev-utils/src/createDevApp.test.tsx`: `test` (`CI=true yarn test '{path}'`)
