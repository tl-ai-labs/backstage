Changes asked for this step:

Gate 1 revise from the person: AC-5 adds checks (yarn prettier --check, yarn tsc, CI=1 yarn test packages/catalog-model) beyond the run's test command, which Gate 0 fixed word for word for the whole run: yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md

Revise requirements.md accordingly:
1. Remove those extra checks from AC-5, and from anywhere else in the file where `yarn prettier --check`, `yarn tsc`, `CI=1 yarn test ...` or any other command appears as a check to run. The only verification command for the whole run is the Gate 0 command, verbatim: `yarn build:api-reports && ! grep -q "(undocumented)" packages/catalog-model/report.api.md` — plus the existing step after each run of it: check `git status --porcelain` and revert with `git checkout -- <path>` any change outside the allowlist (e.g. other packages' report*.api.md), recording it.
2. Keep `yarn prettier --write <changed paths>` as the formatting step (NFR-4); it is a formatting step from Gate 0, not a check. AC-5 may say that changed files are formatted with `yarn prettier --write <changed paths>` (a step, not a separate check command), or be removed/merged — your choice, but no check command other than the Gate 0 one may remain.
3. Also make AC-4 a review criterion (verified by reading `git diff`), not a command to run, if it reads as a command.

Edit the pieces you handed in and hand each changed one in again.