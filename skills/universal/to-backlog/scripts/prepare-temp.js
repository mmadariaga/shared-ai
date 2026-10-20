'use strict';

const fs = require('node:fs');
const path = require('node:path');

// The resolver ships in the SAI tools beside this skill: the harness root holds
// both `skills/to-backlog/scripts/` and `sai/tools/`; a source checkout holds
// `skills/universal/to-backlog/scripts/` and `sai/tools/`.
const RESOLVER = ['../../../sai/tools/temp-root.js', '../../../../sai/tools/temp-root.js']
  .map(relative => path.join(__dirname, relative))
  .find(candidate => fs.existsSync(candidate));
if (!RESOLVER) throw new Error('SAI temp root resolver sai/tools/temp-root.js not found beside this skill');
const { makeTempDir, resolveTempRoot, harnessFromInstalledPath } = require(RESOLVER);

function within(directory, parent) {
  const relative = path.relative(parent, directory);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Dependencies are injectable for failure tests; the CLI accepts no root override.
// Without a harness, the installed root this script runs from decides it.
function prepareTemp(harness = harnessFromInstalledPath(__filename), { cwd = process.cwd(), io = fs, ...options } = {}) {
  const workingDirectory = io.realpathSync(cwd);
  let repository = workingDirectory;
  for (let directory = workingDirectory; ; directory = path.dirname(directory)) {
    if (io.existsSync(path.join(directory, '.git'))) { repository = directory; break; }
    if (directory === path.dirname(directory)) break;
  }
  const root = resolveTempRoot(harness, { ...options, io });
  if (within(root, repository)) throw new Error('Temporary location must be outside the repository');
  return { directory: makeTempDir(harness, 'to-backlog-', { ...options, io }) };
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node prepare-temp.js [claude|opencode]');
    process.stdout.write(`${JSON.stringify(prepareTemp(process.argv[2]))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: `Temporary preparation failed: ${error.message}` })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { prepareTemp };
