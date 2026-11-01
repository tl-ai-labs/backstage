#!/bin/zsh
# Runs the run's project checks one after another, keeping each exit status.
# Usage: project-checks.sh <label> [check-id ...]
label=$1; shift
root=/Users/macbook/Documents/GitHub/backstage
out=$root/.sdlc/runs/20261101-141015-refactor-drop-react-17/checks/$label
mkdir -p "$out"
: > "$out/status.txt"
rm -f "$out/done"
cd "$root" || exit 1
wanted=("$@")
run() {
  id=$1; shift
  if [ ${#wanted[@]} -gt 0 ] && [[ ${wanted[(ie)$id]} -gt ${#wanted[@]} ]]; then return; fi
  s=$(date +%s)
  eval "$*" > "$out/$id.log" 2>&1
  rc=$?
  echo "$id exit=$rc secs=$(( $(date +%s) - s ))" >> "$out/status.txt"
}
run install-immutable 'yarn install --immutable'
run typecheck 'yarn tsc'
run lint-all 'yarn lint:all'
run lint-peer-deps 'yarn lint:peer-deps'
run test-gate-0 'CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils'
run test-changed-packages 'CI=true yarn test packages/repo-tools packages/cli-module-build packages/dev-utils packages/frontend-dev-utils packages/frontend-plugin-api packages/ui plugins/techdocs'
touch "$out/done"
