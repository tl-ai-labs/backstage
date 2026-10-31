# Run 20261031-120000-bugfix-approot-routeref — policy flash-agsdk-only-v38

Status: **accepted**

Written by code from this run's records (manifest.json and the files below); every figure is the manifest's.

## Cost

| | Cost |
|---|---:|
| Dispatched work (the calls the dispatch server made or logged) | $0.1933 |
| Orchestrator overhead (this session's own loop, priced from its transcripts) | $49.3891 |
| **True total** | **$49.5824** |

How the overhead was measured: transcript (no receipt; unverified).

### By phase

The calls dispatched (or logged) in each phase. The rest of the orchestrator's own loop is in the overhead above, in no phase.

| Phase | Calls | Models | Cost |
|---|---:|---|---:|
| preflight | 1 | gemini-3.8-flash | $0.0005 |
| plan_task_packets | 1 | none | $0.0000 |
| tests | 6 | gemini-3.8-flash | $0.0860 |
| codegen | 12 | gemini-3.8-flash | $0.0915 |
| debug | 3 | gemini-3.8-flash | $0.0154 |
| architecture_design (measured: the helper's own transcript) | 115 | claude-opus-5-5 | $28.0989 |
| security_review (measured: the helper's own transcript) | 6 | claude-opus-5-5 | $0.2406 |
| senior_code_review (measured: the helper's own transcript) | 13 | claude-opus-5-5 | $0.6863 |

A phase marked measured ran in a helper of this session (the architect or a reviewer): its cost is that helper's transcript priced at the list (part of the overhead above), in place of any estimate the orchestrator logged.

### Dispatched work by model

| Model | Calls | Cost |
|---|---:|---:|
| gemini-3.8-flash | 22 | $0.1933 |
| none | 1 | $0.0000 |

### Orchestrator overhead by model

| Model | Role | Messages | Cost |
|---|---|---:|---:|
| claude-opus-5-5 | session | 143 | $13.0429 |
| claude-opus-5-5 | helper | 263 | $36.3461 |

## Provisional — re-run after closing this session

The collector reads the session's transcripts; run from inside a session that has not ended, it misses the session's own tail. Once the session is closed, run:

```
node "/Users/macbook/.claude/plugins/cache/tilicho-ai-labs/mmo/0.9.3/scripts/collect-orchestrator-usage.mjs" "/Users/macbook/Documents/GitHub/Google-Projects/backstage/.sdlc/runs/20261031-120000-bugfix-approot-routeref" --project-root "/Users/macbook/Documents/GitHub/Google-Projects/backstage"
```

## Files

- [requirements.md](requirements.md)
- [change_plan.md](change_plan.md)
- [review.json](review.json)
- [security_review.md](security_review.md)
- [manifest.json](manifest.json)
- [provenance.json](provenance.json)
## Run notes (recorded at Gate 3, as the person instructed)

1. **U01 edit made outside the packet flow.** The orchestrator changed two words by hand, `defaultPath:` to `path:`, on lines 1983 and 1991 of `packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`. Flash did not type this change. The person approved it because no fix round can change the reproducing test. Provenance packet id: `orchestrator_manual_U01_path`. Its diff against the batch result is exactly those two lines (`u01-manual/u01-vs-batch.diff`).
2. **Senior findings 1 to 3, left as they are (accepted at Gate 3):**
   - Finding 1 (`packages/frontend-plugin-api/src/routing/useRouteRef.test.tsx`, `listeners.clear()` inside `act()`): this is a reproducing-test file, which no fix round can change. The same test still covers unsubscribe-on-unmount through its `thirdListeners` assertions.
   - Finding 2 (`packages/frontend-app-api/src/wiring/createSpecializedApp.test.tsx`, four new `as any` casts): cosmetic, and also in a reproducing-test file.
   - Finding 3 (`packages/frontend-app-api/src/wiring/phaseApis.tsx`, a listener that throws in `markFinalized()` stops the listeners after it): today the only listeners are the two hooks' `setSignalled(true)` calls, which do not throw.
3. **Senior finding 4, rejected.** It asked to restore "including when finalization follows a startup error" in `.changeset/app-root-route-resolution-finalization.md`. The clause was removed on purpose, on the person's instruction: page routes are not built on that path, and the error screen replaces the root elements.
4. **`change_plan.md` is out of date** for U01, U04, U09 and U11. It still shows the wording from before the person's final revision. The revised sections were refused by plan-lint (because of other units' sites, which no longer match the applied files), so the plan was not re-rendered. The files on disk follow the person's exact text.
5. **One bad provenance entry.** `provenance.json` has an entry whose `path` is five file paths joined by spaces, under packet id `orchestrator_redcheck_restore`. It came from a shell quoting error in the first snapshot attempt, which wrote and restored nothing. It names no real file, and each of the five files has its own correct entry. The file was left unedited, as instructed. `/mmo:revert` may warn about this entry.

Before-the-fix check: all 8 new `across finalization` cases fail on the HEAD sources (`red-check/before-fix-results.md`). The 5 fixed files' SHA-256 hashes match after they were put back (`red-check/fixed.sha256`, `red-check/putback.sha256`).
