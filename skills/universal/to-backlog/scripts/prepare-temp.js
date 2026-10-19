'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOTS = { claude: '/tmp', opencode: '/tmp/opencode' };

function within(directory, parent) {
  const relative = path.relative(parent, directory);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function privateDirectory(stat, uid) {
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || (stat.mode & 0o7777) !== 0o700) {
    throw new Error('New directory must be a non-symbolic-link directory owned by the current user with mode 0700');
  }
}

function observeRoot(root, io, uid) {
  let stat;
  try {
    stat = io.lstatSync(root);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Required existing temporary root ${root} is missing; restore the permitted temporary location before retrying. This helper does not create or repair shared roots`);
    }
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink() || io.realpathSync(root) !== root) {
    throw new Error('Temporary root must be an existing directory without symbolic links');
  }
  // A shared writable root needs sticky-bit protection; never repair its mode.
  if (![0, uid].includes(stat.uid) || ((stat.mode & 0o022) && !(stat.mode & 0o1000))) {
    throw new Error('Temporary root has unsafe ownership or shared-write permissions');
  }
  return stat;
}

// Dependencies are injectable for failure tests; the CLI accepts no root override.
function prepareTemp(harness, { platform = process.platform, cwd = process.cwd(), io = fs, uid = process.getuid?.() } = {}) {
  if (platform !== 'linux') throw new Error('Temporary preparation supports Linux only');
  const root = ROOTS[harness];
  if (!root) throw new Error('Expected harness: claude or opencode');
  if (!Number.isInteger(uid)) throw new Error('Cannot establish current user ownership');
  const workingDirectory = io.realpathSync(cwd);
  let repository = workingDirectory;
  for (let directory = workingDirectory; ; directory = path.dirname(directory)) {
    if (io.existsSync(path.join(directory, '.git'))) { repository = directory; break; }
    if (directory === path.dirname(directory)) break;
  }
  const rootStat = observeRoot(root, io, uid);
  if (within(root, repository)) throw new Error('Temporary location must be outside the repository');
  const directory = io.mkdtempSync(path.join(root, 'to-backlog-'));
  if (!path.isAbsolute(directory) || path.dirname(directory) !== root || within(directory, repository)) {
    throw new Error('Created directory is outside the permitted temporary location');
  }
  // mkdtemp creates mode 0700 (or stricter under umask). Verify before chmod,
  // then use a no-follow descriptor so a replaced symlink is never chmodded.
  const created = io.lstatSync(directory);
  if (!created.isDirectory() || created.isSymbolicLink() || created.uid !== uid || (created.mode & 0o077)) {
    throw new Error('Created directory has unsafe ownership, permissions or type');
  }
  const fd = io.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {
    const opened = io.fstatSync(fd);
    if (opened.dev !== created.dev || opened.ino !== created.ino) throw new Error('Created directory changed during preparation');
    io.fchmodSync(fd, 0o700);
    privateDirectory(io.fstatSync(fd), uid);
    const verified = io.lstatSync(directory);
    privateDirectory(verified, uid);
    const currentRoot = observeRoot(root, io, uid);
    if (verified.dev !== created.dev || verified.ino !== created.ino || io.realpathSync(directory) !== directory ||
        currentRoot.dev !== rootStat.dev || currentRoot.ino !== rootStat.ino) {
      throw new Error('Temporary location changed during preparation');
    }
    return { directory };
  } finally {
    io.closeSync(fd);
  }
}

if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node prepare-temp.js claude|opencode');
    process.stdout.write(`${JSON.stringify(prepareTemp(process.argv[2]))}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: `Temporary preparation failed: ${error.message}` })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { prepareTemp };
