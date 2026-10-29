# Pre-change baseline (scoped) — run 20261029-refactor-react18

Captured at git HEAD `f20fd9b598285c88401406b3812fe00d7708136c`, 2026-10-29T06:27:55Z,
before any file of this run was written. Repo-wide test health was unmeasured at discovery,
so this is the reference a post-change red result is judged against.

Commands are the run's check command, confirmed at Gate 0, run as four separate commands so
each one's status is known independently.

| Command                                                                                    | Exit | Result                                              |
| ------------------------------------------------------------------------------------------ | ---- | --------------------------------------------------- |
| `yarn tsc`                                                                                 | 0    | clean                                               |
| `yarn lint:all` (`backstage-cli repo lint`, whole repo)                                    | 0    | clean                                               |
| `yarn lint:peer-deps`                                                                      | 0    | clean — manifests agree with peer-deps.ts constants |
| `CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils` | 0    | 86/86 suites, 550/550 tests, 12/12 snapshots, 9.82s |

All four green. Every post-change failure in these four commands is therefore this run's to fix.

Known coverage gap, accepted at Gate 0 (requirements AC-9): 12 allowlisted source files fall
outside the three test paths. `yarn tsc` and `yarn lint:all` cover them for type and lint
regression; runtime test regression in those packages is not covered by this check command.

Note carried from the brief: CI runs the stricter `yarn tsc:full`
(`--skipLibCheck false --incremental false`, after a clean). A green `yarn tsc` here is
necessary but not sufficient for CI.
