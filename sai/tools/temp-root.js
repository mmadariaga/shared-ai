#!/usr/bin/env node

'use strict';

/**
 * temp-root — the one resolver of SAI temporary paths.
 *
 * Terms:
 *   harness root  the private folder of a harness. Linux: `/tmp/claude-{uid}`
 *                 (Claude Code) or `/tmp/opencode` (opencode). Windows and
 *                 macOS: `<os.tmpdir()>/<harness>`.
 *   SAI temp root the `sai/` folder inside the harness root; every SAI temp
 *                 write lives under it.
 *
 * On Linux the harness root belongs to the harness: SAI never creates it, and a
 * missing one is a blocker naming the path. On Windows and macOS the per-user
 * `os.tmpdir()` is the private base, so SAI creates `<harness>/sai/` when
 * missing. `sai/` is created with mode 0700 (no chmod on Windows). On POSIX,
 * the harness root and `sai/` must be real directories (no symbolic links),
 * owned by the current user (the harness root may also be owned by root), and
 * not writable by group or others unless the sticky bit is set.
 *
 * CLI (always JSON on stdout; exit 0 = success, 1 = blocker or rejected path,
 * 2 = usage error):
 *   node temp-root.js resolve --harness claude|opencode
 *   node temp-root.js mkdtemp --harness claude|opencode [--prefix <prefix>]
 *   node temp-root.js remove  --harness claude|opencode --dir <path>
 * `mkdtemp` creates a private (0700) child of the SAI temp root. `remove`
 * deletes a directory strictly inside the SAI temp root and rejects any other
 * path. The CLI accepts no root override.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HARNESSES = ['claude', 'opencode'];
const SAI_DIR = 'sai';
const DEFAULT_PREFIX = 'sai-';
const PREFIX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Blocker raised when a root is missing or unsafe. Never repaired here. */
class TempRootError extends Error {
  constructor(message, code = 'TEMP_ROOT_UNUSABLE') {
    super(message);
    this.code = code;
  }
}

function assertHarness(harness) {
  if (!HARNESSES.includes(harness)) throw new TempRootError('Expected harness: claude or opencode', 'USAGE');
}

function defaultUid() {
  return typeof process.getuid === 'function' ? process.getuid() : undefined;
}

/** The harness root path, before any filesystem check. */
function harnessRoot(harness, { platform = process.platform, tmpdir = os.tmpdir, uid = defaultUid() } = {}) {
  assertHarness(harness);
  if (platform === 'linux') {
    if (harness === 'opencode') return '/tmp/opencode';
    if (!Number.isInteger(uid)) throw new TempRootError('Cannot establish the current user id for the Claude Code temporary root');
    return `/tmp/claude-${uid}`;
  }
  return path.join(tmpdir(), harness);
}

/**
 * The harness whose installed root contains `file`: opencode when the nearest
 * harness folder above it is `.opencode` (project-local) or `opencode` (user
 * config), Claude Code otherwise (`.claude`, or a source checkout that is not
 * installed under either harness). Tools that receive no `--harness` resolve
 * their harness through this.
 */
function harnessFromInstalledPath(file) {
  for (let directory = path.dirname(path.resolve(file)); ; directory = path.dirname(directory)) {
    const name = path.basename(directory);
    if (name === '.claude') return 'claude';
    if (name === '.opencode' || name === 'opencode') return 'opencode';
    if (directory === path.dirname(directory)) return 'claude';
  }
}

function lstatOrNull(target, io) {
  try {
    return io.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Fail unless `stat` describes a safe directory; `owners` lists accepted uids. */
function checkDirectory(label, target, stat, { platform, uid, owners }) {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new TempRootError(`${label} ${target} must be an existing directory that is not a symbolic link`);
  }
  if (platform === 'win32' || !Number.isInteger(uid)) return;
  if (!owners.includes(stat.uid)) {
    throw new TempRootError(`${label} ${target} is owned by another user; it must belong to the current user`);
  }
  if ((stat.mode & 0o022) && !(stat.mode & 0o1000)) {
    throw new TempRootError(`${label} ${target} is writable by group or others without the sticky bit`);
  }
}

/**
 * Resolve and verify the SAI temp root, creating `sai/` (and, off Linux, the
 * harness folder) when missing. With `create: false` a missing folder is
 * reported as `null` instead of being created. Dependencies are injectable for
 * tests.
 */
function resolveTempRoot(harness, options = {}) {
  const { platform = process.platform, tmpdir = os.tmpdir, io = fs, uid = defaultUid(), create = true } = options;
  const harnessPath = harnessRoot(harness, { platform, tmpdir, uid });
  let harnessStat = lstatOrNull(harnessPath, io);
  if (!harnessStat) {
    if (platform === 'linux') {
      throw new TempRootError(`Required harness temporary root ${harnessPath} is missing; start the harness so it exists, or restore it, before retrying. SAI does not create it`, 'TEMP_ROOT_MISSING');
    }
    if (!create) return null;
    try {
      io.mkdirSync(harnessPath, { mode: 0o700 });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new TempRootError(`Required temporary base ${path.dirname(harnessPath)} is missing; restore it before retrying. SAI does not create it`, 'TEMP_ROOT_MISSING');
      }
      throw error;
    }
    harnessStat = io.lstatSync(harnessPath);
  }
  checkDirectory('Harness temporary root', harnessPath, harnessStat, { platform, uid, owners: [0, uid] });

  const saiPath = path.join(harnessPath, SAI_DIR);
  let saiStat = lstatOrNull(saiPath, io);
  if (!saiStat) {
    if (!create) return null;
    io.mkdirSync(saiPath, platform === 'win32' ? undefined : { mode: 0o700 });
    if (platform !== 'win32') io.chmodSync(saiPath, 0o700);
    saiStat = io.lstatSync(saiPath);
  }
  checkDirectory('SAI temporary root', saiPath, saiStat, { platform, uid, owners: [uid] });
  return saiPath;
}

/** The directory the SAI temp root must really be: a symbolic link anywhere on its path is a blocker. */
function checkRootPath(root, io) {
  if (io.realpathSync(root) !== root) {
    throw new TempRootError(`SAI temporary root ${root} must be reachable through no symbolic link`);
  }
}

/** Fail unless `stat` describes a private (0700) directory owned by `uid`. */
function checkPrivateChild(target, stat, uid) {
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || (stat.mode & 0o077)) {
    throw new TempRootError(`Created directory ${target} must be a directory, not a symbolic link, owned by the current user with mode 0700`);
  }
}

/**
 * Create one private child of the SAI temp root and return its real path. On
 * POSIX the child is verified before it is used (directory, no symbolic link,
 * current user, no group or other bits), fixed to 0700 through a no-follow
 * descriptor so a replaced symbolic link is never chmodded, and the root and
 * child must be unchanged when verification ends.
 */
function makeTempDir(harness, prefix = DEFAULT_PREFIX, options = {}) {
  const { platform = process.platform, io = fs, uid = defaultUid() } = options;
  if (typeof prefix !== 'string' || !PREFIX.test(prefix)) {
    throw new TempRootError('Prefix must start with a letter or digit and use only letters, digits, ".", "_" and "-" (at most 64 characters)', 'USAGE');
  }
  const root = resolveTempRoot(harness, options);
  if (platform === 'win32') return io.realpathSync(io.mkdtempSync(path.join(root, prefix)));

  const realRoot = io.realpathSync(root);
  if (platform === 'linux') checkRootPath(root, io);
  const rootStat = io.lstatSync(root);
  const created = io.mkdtempSync(path.join(root, prefix));
  if (!path.isAbsolute(created) || path.dirname(created) !== root) {
    throw new TempRootError('Created directory is outside the SAI temp root');
  }
  const first = io.lstatSync(created);
  checkPrivateChild(created, first, uid);
  const fd = io.openSync(created, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {
    const opened = io.fstatSync(fd);
    if (opened.dev !== first.dev || opened.ino !== first.ino) throw new TempRootError('Created directory changed during preparation');
    io.fchmodSync(fd, 0o700);
    checkPrivateChild(created, io.fstatSync(fd), uid);
    const verified = io.lstatSync(created);
    checkPrivateChild(created, verified, uid);
    const currentRoot = io.lstatSync(root);
    checkDirectory('SAI temporary root', root, currentRoot, { platform, uid, owners: [uid] });
    const real = io.realpathSync(created);
    if (verified.dev !== first.dev || verified.ino !== first.ino || currentRoot.dev !== rootStat.dev || currentRoot.ino !== rootStat.ino ||
        real !== path.join(realRoot, path.basename(created))) {
      throw new TempRootError('Temporary location changed during preparation');
    }
    return real;
  } finally {
    io.closeSync(fd);
  }
}

/** The real path a missing `target` would have: its nearest existing ancestor, resolved, plus the missing rest. */
function realpathOfMissing(target, io) {
  const missing = [];
  for (let current = target; ; current = path.dirname(current)) {
    try {
      return path.join(io.realpathSync(current), ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT' || path.dirname(current) === current) throw error;
      missing.push(path.basename(current));
    }
  }
}

/**
 * Remove a directory strictly inside the SAI temp root. Any other path is
 * rejected and nothing is deleted. Returns whether a directory was removed.
 */
function removeInside(harness, target, options = {}) {
  const { io = fs } = options;
  if (typeof target !== 'string' || !path.isAbsolute(target)) {
    throw new TempRootError('Removal requires an absolute path inside the SAI temp root', 'REJECTED_PATH');
  }
  const root = resolveTempRoot(harness, { ...options, create: false });
  const resolved = path.resolve(target);
  const stat = lstatOrNull(resolved, io);
  if (!root) {
    throw new TempRootError(`Path ${resolved} is not inside the SAI temp root`, 'REJECTED_PATH');
  }
  const realRoot = io.realpathSync(root);
  const inside = candidate => {
    const relative = path.relative(realRoot, candidate);
    return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  if (!stat) {
    if (!inside(realpathOfMissing(resolved, io))) {
      throw new TempRootError(`Path ${resolved} is not inside the SAI temp root ${realRoot}`, 'REJECTED_PATH');
    }
    return false;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new TempRootError(`Path ${resolved} must be a directory that is not a symbolic link`, 'REJECTED_PATH');
  }
  if (!inside(io.realpathSync(resolved))) {
    throw new TempRootError(`Path ${resolved} is not inside the SAI temp root ${realRoot}`, 'REJECTED_PATH');
  }
  io.rmSync(resolved, { recursive: true, force: true });
  return true;
}

function parseOptions(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!['--harness', '--prefix', '--dir'].includes(flag) || index + 1 >= argv.length) {
      throw new TempRootError(`Unexpected argument ${flag}`, 'USAGE');
    }
    options[flag.slice(2)] = argv[index + 1];
  }
  return options;
}

function main(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);
  assertHarness(options.harness);
  switch (command) {
    case 'resolve': return { ok: true, root: resolveTempRoot(options.harness) };
    case 'mkdtemp': return { ok: true, dir: makeTempDir(options.harness, options.prefix) };
    case 'remove':
      if (!options.dir) throw new TempRootError('remove requires --dir', 'USAGE');
      return { ok: true, removed: removeInside(options.harness, options.dir) };
    default:
      throw new TempRootError('Usage: temp-root.js resolve|mkdtemp|remove --harness claude|opencode [--prefix <prefix>] [--dir <path>]', 'USAGE');
  }
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    if (!(error instanceof TempRootError)) throw error;
    process.stdout.write(`${JSON.stringify({ ok: false, code: error.code, error: error.message })}\n`);
    process.exitCode = error.code === 'USAGE' ? 2 : 1;
  }
}

module.exports = { HARNESSES, SAI_DIR, TempRootError, harnessRoot, harnessFromInstalledPath, resolveTempRoot, makeTempDir, removeInside };
