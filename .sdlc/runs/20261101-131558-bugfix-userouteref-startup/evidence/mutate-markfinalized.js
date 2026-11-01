// Run record, not project code. Loaded through NODE_OPTIONS=--require to show
// that 'ends the tolerance when finalization fails' depends on the
// markFinalized() call on the bootstrap-error path (Gate 3, R-7). It changes
// what this process reads for one file, in memory, and leaves the file as it is.
const fs = require('fs');

const TARGET = 'packages/frontend-app-api/src/wiring/prepareSpecializedApp.tsx';
const NEEDLE = 'options.phase.routeResolutionApi.markFinalized();';
const MARKER = process.env.MUTATE_MARKER;

const original = fs.readFileSync;
const DIAG = `${__dirname}/preload.log`;
fs.appendFileSync(
  DIAG,
  `load pid=${process.pid} marker=${MARKER ?? 'unset'} argv=${process.argv
    .slice(1, 3)
    .join(' ')}\n`,
);
fs.readFileSync = function patchedReadFileSync(file, ...rest) {
  const result = original.call(this, file, ...rest);
  if (String(file).includes('prepareSpecializedApp')) {
    fs.appendFileSync(DIAG, `read pid=${process.pid} ${typeof file} ${file}\n`);
  }
  if (typeof file !== 'string' || !file.endsWith(TARGET)) {
    return result;
  }
  const text = Buffer.isBuffer(result) ? result.toString('utf8') : result;
  const first = text.indexOf(NEEDLE);
  const second = text.indexOf(NEEDLE, first + NEEDLE.length);
  if (first < 0 || second < 0) {
    throw new Error(`mutate: expected two occurrences in ${file}`);
  }
  // Same line count, so stack traces keep their line numbers.
  const mutated =
    text.slice(0, second) +
    '/* mutated */' +
    text.slice(second + NEEDLE.length);
  if (MARKER) {
    fs.appendFileSync(MARKER, `pid=${process.pid} line-removed\n`);
  }
  return Buffer.isBuffer(result) ? Buffer.from(mutated) : mutated;
};
