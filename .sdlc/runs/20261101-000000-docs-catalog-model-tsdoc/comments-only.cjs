// Compares each changed source file with HEAD after removing comments, keeping types.
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = process.argv[2];
const ts = require(path.join(root, 'node_modules/typescript'));
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const print = (name, text) => {
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, false);
  return ts.createPrinter({ removeComments: true }).printFile(sf);
};

const files = git('diff', '--name-only', 'HEAD', '--', 'packages/catalog-model/src')
  .split('\n')
  .filter(Boolean);

let bad = 0;
for (const file of files) {
  const before = print(file, git('show', `HEAD:${file}`));
  const after = print(file, fs.readFileSync(path.join(root, file), 'utf8'));
  const same = before === after;
  if (!same) bad += 1;
  console.log(`${same ? 'same' : 'DIFFERENT'} ${file}`);
}
console.log(`files: ${files.length}, different: ${bad}`);
process.exit(bad ? 1 : 0);
