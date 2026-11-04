# Run 20261104-refactor-react18-only — policy argon4-plus-sonnet55

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $7.1930 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $6.7893 |
| **True total** | **$13.9824** |

How the overhead was measured: transcript (no receipt; unverified; approximate window).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 4 | gemini-4-argon, claude-sonnet-5-5 | $0.0072 |
| requirements_analysis | 3 | gemini-4-argon | $1.8293 |
| architecture_design | 2 | gemini-4-argon | $3.8326 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 73 | claude-sonnet-5-5 | $0.7414 |
| docs | 9 | claude-sonnet-5-5 | $0.0937 |
| tests | 1 | claude-sonnet-5-5 | $0.0205 |
| senior_code_review | 1 | gemini-4-argon | $0.3520 |
| security_review | 2 | gemini-4-argon | $0.2838 |
| debug | 3 | gemini-4-argon | $0.0324 |

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 14 | $6.3332 |
| claude-sonnet-5-5 | 84 | $0.8599 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 49 | $1.9270 |
| claude-opus-5-5 | helper | 93 | $4.8623 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/apple/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/apple/Documents/GitHub/bs-cells/BS-RF-10/.sdlc/runs/20261104-refactor-react18-only" --project-root "/Users/apple/Documents/GitHub/bs-cells/BS-RF-10"
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
