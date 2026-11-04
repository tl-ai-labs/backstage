cd /Users/apple/Documents/GitHub/bs-cells/BS-RF-10
B=.sdlc/runs/20261104-refactor-react18-only/baseline-checks
run() { name=$1; shift; "$@" > $B/$name.log 2>&1; echo "$name $?" >> $B/status.txt; }
: > $B/status.txt
run tsc yarn tsc
run lint-all yarn lint:all
run peer-deps yarn lint:peer-deps
run gate0-tests env CI=true yarn test packages/core-app-api packages/test-utils packages/frontend-test-utils
run touched-tests env CI=true yarn test packages/frontend-dev-utils packages/dev-utils packages/frontend-plugin-api packages/ui plugins/techdocs packages/cli-module-build packages/cli-module-new
run reports-ci sh -c 'yarn build:api-reports:only --ci packages/test-utils && yarn build:knip-reports --ci packages/cli-module-build plugins/app'
echo DONE >> $B/status.txt
