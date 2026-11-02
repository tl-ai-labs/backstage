# Run 20261102-feature-new-entity-former-names — policy argon4-plus-sonnet55

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $3.3534 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $24.9115 |
| **True total** | **$28.2649** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 2 | gemini-4-argon, claude-sonnet-5-5 | $0.0049 |
| plan_task_packets | 1 | none | $0.0000 |
| codegen | 40 | claude-sonnet-5-5, gemini-4-argon | $0.8547 |
| docs | 13 | claude-sonnet-5-5 | $0.1974 |
| tests | 29 | claude-sonnet-5-5, gemini-4-argon | $1.5059 |
| debug | 25 | gemini-4-argon | $0.7905 |
| architecture_design (measured: the helper's own transcript) | 35 | claude-opus-5-5 | $9.5428 |
| senior_code_review (measured: the helper's own transcript) | 11 | claude-opus-5-5 | $2.2504 |
| security_review (measured: the helper's own transcript) | 14 | claude-opus-5-5 | $1.8596 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-4-argon | 35 | $1.1292 |
| claude-sonnet-5-5 | 74 | $2.2243 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 32 | $2.6396 |
| claude-opus-5-5 | helper | 158 | $22.2719 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/apple/.claude/plugins/cache/tilicho-ai-labs/mmo/0.9.3/scripts/collect-orchestrator-usage.mjs" "/Users/apple/Documents/GitHub/bs-cells/BS-NF-12/.sdlc/runs/20261102-feature-new-entity-former-names" --project-root "/Users/apple/Documents/GitHub/bs-cells/BS-NF-12"
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

- `plugins/techdocs/src/reader/components/TechDocsReaderPage/useExternalRedirect.test.tsx`: `test` (`CI=true yarn test '{path}'`)
