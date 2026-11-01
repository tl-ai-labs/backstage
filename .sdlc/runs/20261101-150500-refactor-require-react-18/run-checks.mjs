#!/usr/bin/env node
// Runs this run's checks and records exit codes and failing test names, not whole logs.
// Usage: node run-checks.mjs <label> [pkg-path ...]
// With no package paths it uses the affected packages (NFR-2). Results go to <run folder>/checks/<label>/.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(runDir, '../../..');
const [label, ...given] = process.argv.slice(2);
const pkgs = given.length
  ? given
  : [
      'packages/repo-tools',
      'packages/frontend-plugin-api',
      'packages/ui',
      'packages/dev-utils',
      'packages/frontend-dev-utils',
      'plugins/techdocs',
      'packages/cli-module-build',
      'packages/cli-module-test-jest',
      'packages/test-utils',
      'packages/cli-module-new',
      'packages/core-app-api',
      'plugins/catalog-react',
      'plugins/app',
    ];
const out = join(runDir, 'checks', label);
mkdirSync(out, { recursive: true });
const summaryPath = join(out, 'summary.json');
const summary = existsSync(summaryPath)
  ? JSON.parse(readFileSync(summaryPath, 'utf8'))
  : { label, head: '', commands: {}, tests: {} };
summary.head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();

const save = () => writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
const sh = (cmd, logName, env = {}) => {
  const log = join(out, `${logName}.log`);
  const started = Date.now();
  const r = spawnSync('bash', ['-c', `${cmd} > ${JSON.stringify(log)} 2>&1`], {
    cwd: root,
    env: { ...process.env, ...env },
  });
  return { rc: r.status, seconds: Math.round((Date.now() - started) / 1000), log };
};

for (const pkg of pkgs) {
  const name = pkg.replace(/\//g, '__');
  const json = join(out, `${name}.jest.json`);
  const r = sh(`yarn test ${pkg} --json --outputFile=${JSON.stringify(json)}`, name, { CI: '1' });
  const entry = { command: `CI=1 yarn test ${pkg}`, rc: r.rc, seconds: r.seconds };
  if (existsSync(json)) {
    const j = JSON.parse(readFileSync(json, 'utf8'));
    entry.total = j.numTotalTests;
    entry.passed = j.numPassedTests;
    entry.failed = j.numFailedTests;
    entry.skipped = j.numPendingTests;
    entry.suites = j.numTotalTestSuites;
    entry.failedSuites = j.numFailedTestSuites;
    entry.failures = j.testResults.flatMap(t =>
      t.assertionResults
        .filter(a => a.status === 'failed')
        .map(a => `${t.name.replace(`${root}/`, '')} > ${a.fullName}`)
        .concat(
          t.status === 'failed' && t.assertionResults.length === 0
            ? [`${t.name.replace(`${root}/`, '')} > (suite failed to run)`]
            : [],
        ),
    );
  } else {
    entry.note = 'no jest json written; see the log';
  }
  summary.tests[pkg] = entry;
  save();
}

if (!given.length) {
  for (const [key, cmd] of [
    ['peer-deps', 'yarn lint:peer-deps'],
    ['tsc', 'yarn tsc'],
    ['lint', 'yarn lint'],
  ]) {
    const r = sh(cmd, key);
    summary.commands[key] = { command: cmd, rc: r.rc, seconds: r.seconds };
    save();
  }
}
summary.done = true;
save();
writeFileSync(join(out, 'DONE'), new Date().toISOString());
