# Before-the-fix check: `-t 'across finalization'`, sources restored to HEAD

Five sources (RouteResolutionApi.ts, phaseApis.tsx, prepareSpecializedApp.tsx, both useRouteRef.tsx) were restored with `git checkout HEAD`. The three test files kept their new cases and the U01 `path:` edit. Logs: red1.log, red2.log, red3.log.

| # | Case | Result | Failure |
|---|---|---|---|
| 1 | createSpecializedApp: should resolve new frontend system route refs in app root elements across finalization (AC-1, new-system row) | FAIL | After finalization (test line 2048): `Unable to find an element with the text: Link: [/new-page]`. The DOM shows `Link: [pending]` next to `App Layout`, so the link is still unresolved after finalization. |
| 2 | createSpecializedApp: should resolve legacy route refs in app root elements across finalization (AC-1, legacy row) | FAIL | During bootstrap (test line 2028): `findByText('Link: []')` timed out. The thrown error is `Error: No path for routeRef{id=test.legacyPage,legacyId=legacy-page}` (console.error, at core-plugin-api useRouteRef.tsx:131). The error box shows `Error in extension 'app-root-element:test/link'; caused by Error: No path for routeRef{id=test.legacyPage,legacyId=legacy-page}`. |
| 3 | createSpecializedApp: should re-resolve app root element route refs across finalization after a bootstrap error (AC-7) | FAIL | Test line 2142: `expect(api.isFinalized?.()).toBe(false)`, Received: undefined (no finalization signal on the unfixed API). |
| 4 | createSpecializedApp: should signal route resolution finalization once across finalization when the error path follows normal finalization (AC-7) | FAIL | Test line 2196: `expect(api.isFinalized?.()).toBe(false)`, Received: undefined. |
| 5 | frontend-plugin-api useRouteRef: should re-resolve once across finalization and not re-render for APIs without finalization support (AC-4) | FAIL | Test line 246: `expect(listeners.size).toBe(1)`, Received: 0 (the hook does not subscribe). |
| 6 | frontend-plugin-api useRouteRef: should not miss a finalization that happens while subscribing across finalization (FR-5) | FAIL | Test line 342: `expect(onFinalizedA).toHaveBeenCalledTimes(1)`, Received: 0. |
| 7 | core-plugin-api useRouteRef: should return an empty link during bootstrap and re-resolve across finalization (FR-3) | FAIL | `No path for routeRef{type=absolute,id=ref1}`, thrown at useRouteRef.tsx:131 during bootstrap. |
| 8 | core-plugin-api useRouteRef: should keep renders bounded across finalization (AC-4) | FAIL | `No path for routeRef{type=absolute,id=ref1}`, thrown at useRouteRef.tsx:131. |

Totals: createSpecializedApp 4 failed / 34 skipped; frontend-plugin-api useRouteRef 2 failed / 7 skipped; core-plugin-api useRouteRef 2 failed / 7 skipped. Every command exited 1.
