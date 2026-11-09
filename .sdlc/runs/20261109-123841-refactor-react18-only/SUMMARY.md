# Run 20261109-123841-refactor-react18-only — policy opus55-plus-flash38-agsdk

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

|                                                                              |         Cost |
| ---------------------------------------------------------------------------- | -----------: |
| Dispatched work (the calls the dispatch server made or logged)               |      $0.5987 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) |     $19.3512 |
| In-session work already inside the overhead, counted once                    |     −$0.1220 |
| **True total**                                                               | **$19.8279** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase                                                       | Calls | Models                            |     Cost |
| ----------------------------------------------------------- | ----: | --------------------------------- | -------: |
| preflight                                                   |     4 | claude-opus-5-5, gemini-3.8-flash |  $0.0115 |
| requirements_analysis                                       |     1 | claude-opus-5-5                   |  $0.1220 |
| codegen                                                     |    79 | gemini-3.8-flash                  |  $0.3817 |
| tests                                                       |     1 | gemini-3.8-flash                  |  $0.0068 |
| docs                                                        |    14 | gemini-3.8-flash                  |  $0.0730 |
| debug                                                       |     1 | gemini-3.8-flash                  |  $0.0037 |
| senior_code_review (measured: the helper's own transcript)  |    16 | claude-opus-5-5                   |  $0.6977 |
| architecture_design (measured: the helper's own transcript) |    74 | claude-opus-5-5                   | $10.6150 |
| security_review (measured: the helper's own transcript)     |     8 | claude-opus-5-5                   |  $0.3517 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model            | Calls |    Cost |
| ---------------- | ----: | ------: |
| claude-opus-5-5  |     2 | $0.1326 |
| gemini-3.8-flash |    98 | $0.4661 |

### Orchestrator overhead by model

| Model           | Role    | Messages |     Cost |
| --------------- | ------- | -------: | -------: |
| claude-opus-5-5 | session |       50 |  $2.7303 |
| claude-opus-5-5 | helper  |      194 | $16.6208 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.10.1/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/bf-agy/BS-RF-10/.sdlc/runs/20261109-123841-refactor-react18-only" --project-root "/Users/macbook/Documents/GitHub/bf-agy/BS-RF-10"
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

- `packages/frontend-dev-utils/src/createDevApp.test.tsx`: `jest` (`CI=1 yarn test '{path}'`)
- `packages/frontend-plugin-api/src/routing/useRouteRef.tsx`: `eslint` (`yarn eslint '{path}'`)
