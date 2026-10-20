#!/usr/bin/env node

'use strict';

/**
 * transfer — worker-to-coordinator transfer files outside the repository.
 *
 * A worker hands a large document to its coordinator as a reference
 * `{path, sha256, destination}` to a transfer file instead of a message body.
 * This CLI creates, writes, verifies, materializes, and removes those files.
 * Every transfer file lives in one private per-invocation directory under the
 * SAI temp root (`temp-root.js`), never inside the repository.
 *
 * Sub-commands (JSON on stdout, one object per call):
 *   open --harness <claude|opencode>
 *       Create one unique private directory (mode 0700 on POSIX) under the SAI
 *       temp root and return its absolute path as `dir`.
 *   put --dir <dir> --path <relative>            (content on stdin)
 *       Write stdin to `<relative>` inside `<dir>`; return {path, sha256} with
 *       the absolute path. Writing the same path again replaces the file.
 *   verify --dir <dir> --path <absolute> --sha256 <hex>
 *       Confirm the path lies inside `<dir>`, is a regular file reached
 *       through no symbolic link, and matches the sha256.
 *   materialize --dir <dir> --path <absolute> --sha256 <hex> --destination <path> [--cwd <root>]
 *       Verify, then copy the verified bytes to the destination (resolved
 *       against --cwd, default cwd, and required to stay inside it), creating
 *       missing parent directories.
 *   close --dir <dir>
 *       Remove only that transfer directory. A directory already gone is not
 *       an error.
 *
 * A transfer directory is recognized by its name (`sai-transfer-XXXXXX`), a
 * `.sai-transfer` marker file written by `open`, and (POSIX) ownership by the
 * current user, so `verify`, `materialize`, and `close` need no harness flag
 * and refuse any other directory.
 *
 * Exit codes: 0 = success; 1 = check failure (missing, outside, symbolic
 * link, sha256 mismatch, invalid directory); 2 = usage error or IO failure,
 * including a missing Linux harness root (never created or repaired).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeTempDir, TempRootError } = require('./temp-root');

const MARKER = '.sai-transfer';
const DIR_PREFIX = 'sai-transfer-';
const DIR_NAME = /^sai-transfer-[A-Za-z0-9]{6}$/;
const SHA256 = /^[0-9a-f]{64}$/;

/** A failed check on transfer content or location (exit 1). */
class CheckError extends Error {}
/** A usage error or IO failure (exit 2). */
class UsageError extends Error {}

const sha256Of = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function within(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function lstatOrNull(target, io) {
  try {
    return io.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

/**
 * Validate that `dir` is a transfer directory created by `open` and return its
 * resolved absolute path.
 */
function checkTransferDir(dir, { io = fs, uid = process.getuid?.() } = {}) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new CheckError('Transfer directory must be an absolute path');
  const resolved = path.resolve(dir);
  if (!DIR_NAME.test(path.basename(resolved))) throw new CheckError('Not a transfer directory: unexpected name');
  const stat = lstatOrNull(resolved, io);
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) throw new CheckError('Transfer directory must be an existing directory that is not a symbolic link');
  if (Number.isInteger(uid) && stat.uid !== uid) throw new CheckError('Transfer directory is not owned by the current user');
  const marker = lstatOrNull(path.join(resolved, MARKER), io);
  if (!marker || !marker.isFile()) throw new CheckError('Not a transfer directory: marker file missing');
  return resolved;
}

/** Create one unique private transfer directory under the SAI temp root. */
function open(harness, options = {}) {
  const { io = fs } = options;
  let dir;
  try {
    dir = makeTempDir(harness, DIR_PREFIX, options);
  } catch (error) {
    throw error instanceof TempRootError ? new UsageError(error.message) : error;
  }
  io.writeFileSync(path.join(dir, MARKER), '', { mode: 0o600 });
  return { dir };
}

/** Normalize a worker-supplied relative path; reject anything that escapes. */
function relativeSegments(value) {
  if (typeof value !== 'string' || value === '' || path.isAbsolute(value) || /[\\:\0]/.test(value)) {
    throw new UsageError('put requires --path as a relative path with forward slashes');
  }
  const segments = value.split('/');
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
    throw new UsageError('put --path must not contain empty, "." or ".." segments');
  }
  if (segments[0] === MARKER) throw new UsageError(`put --path must not use the reserved name ${MARKER}`);
  return segments;
}

/** Write stdin bytes to a relative path inside the transfer directory. */
function put(dir, relative, bytes, { io = fs } = {}) {
  const root = checkTransferDir(dir, { io });
  const segments = relativeSegments(relative);
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    const stat = lstatOrNull(current, io);
    if (!stat) io.mkdirSync(current, { mode: 0o700 });
    else if (!stat.isDirectory() || stat.isSymbolicLink()) throw new CheckError(`Not a plain directory inside the transfer directory: ${segment}`);
  }
  const target = path.join(current, segments[segments.length - 1]);
  const existing = lstatOrNull(target, io);
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new CheckError('Target inside the transfer directory is not a regular file');
  io.writeFileSync(target, bytes, { mode: 0o600 });
  return { path: target, sha256: sha256Of(bytes) };
}

/**
 * Verify a reference and return the verified bytes. The caller must use those
 * bytes, never re-read the file, so content cannot change between check and use.
 */
function verify(dir, reference, { io = fs } = {}) {
  const root = checkTransferDir(dir, { io });
  const { path: target, sha256 } = reference;
  if (typeof target !== 'string' || !path.isAbsolute(target)) throw new CheckError('Reference path must be an absolute path');
  if (typeof sha256 !== 'string' || !SHA256.test(sha256)) throw new CheckError('Reference sha256 must be 64 lowercase hex characters');
  const resolved = path.resolve(target);
  if (!within(root, resolved) || path.relative(root, resolved).split(path.sep)[0] === MARKER) {
    throw new CheckError('Reference path lies outside the transfer directory');
  }
  let current = root;
  for (const segment of path.relative(root, resolved).split(path.sep)) {
    current = path.join(current, segment);
    const stat = lstatOrNull(current, io);
    if (!stat) throw new CheckError('Referenced transfer file is missing');
    if (stat.isSymbolicLink()) throw new CheckError('Reference path passes through a symbolic link');
  }
  if (!io.lstatSync(resolved).isFile()) throw new CheckError('Referenced transfer file is not a regular file');
  let bytes;
  try {
    bytes = io.readFileSync(resolved);
  } catch (error) {
    throw new CheckError(`Referenced transfer file is unreadable: ${error.code || error.message}`);
  }
  if (sha256Of(bytes) !== sha256) throw new CheckError('Referenced transfer file sha256 differs from the reference');
  return { path: resolved, sha256, bytes };
}

/** Copy verified bytes to a destination inside `cwd`. */
function materialize(dir, reference, destination, { io = fs, cwd = process.cwd() } = {}) {
  const verified = verify(dir, reference, { io });
  if (typeof destination !== 'string' || destination === '' || destination.includes('\0')) throw new UsageError('materialize requires --destination');
  const base = io.realpathSync(path.resolve(cwd));
  const target = path.resolve(base, destination);
  if (!within(base, target)) throw new CheckError('Destination lies outside the project root');
  let ancestor = path.dirname(target);
  while (!lstatOrNull(ancestor, io)) ancestor = path.dirname(ancestor);
  const real = io.realpathSync(ancestor);
  if (real !== base && !within(base, real)) throw new CheckError('Destination passes through a path outside the project root');
  const existing = lstatOrNull(target, io);
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new CheckError('Destination exists and is not a regular file');
  io.mkdirSync(path.dirname(target), { recursive: true });
  io.writeFileSync(target, verified.bytes);
  return { destination: target, sha256: verified.sha256 };
}

/** Remove only the transfer directory. */
function close(dir, { io = fs } = {}) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) throw new CheckError('Transfer directory must be an absolute path');
  const resolved = path.resolve(dir);
  if (DIR_NAME.test(path.basename(resolved)) && !lstatOrNull(resolved, io)) return { dir: resolved, removed: false };
  const root = checkTransferDir(resolved, { io });
  io.rmSync(root, { recursive: true, force: true });
  return { dir: root, removed: true };
}

function usage() {
  return [
    'Usage:',
    '  node transfer.js open --harness <claude|opencode>',
    '  node transfer.js put --dir <dir> --path <relative>      (content on stdin)',
    '  node transfer.js verify --dir <dir> --path <absolute> --sha256 <hex>',
    '  node transfer.js materialize --dir <dir> --path <absolute> --sha256 <hex> --destination <path> [--cwd <root>]',
    '  node transfer.js close --dir <dir>',
    '',
    'Exit codes: 0 = success; 1 = check failure; 2 = usage error or IO failure.',
  ].join('\n');
}

const FLAGS = { '--harness': 'harness', '--dir': 'dir', '--path': 'path', '--sha256': 'sha256', '--destination': 'destination', '--cwd': 'cwd' };

function parseArgs(argv) {
  const opts = { command: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (FLAGS[arg]) {
      if (i + 1 >= argv.length) return { error: `missing value for ${arg}` };
      opts[FLAGS[arg]] = argv[++i];
    } else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else return { error: `unexpected argument: ${arg}` };
  }
  return { opts };
}

function require_(opts, names) {
  for (const name of names) if (!opts[name]) throw new UsageError(`missing required flag --${name}`);
}

function readStdin() {
  try {
    return fs.readFileSync(0);
  } catch (error) {
    if (error.code === 'EAGAIN' || error.code === 'EOF') return Buffer.alloc(0);
    throw error;
  }
}

function execute(opts) {
  switch (opts.command) {
    case 'open':
      require_(opts, ['harness']);
      return open(opts.harness);
    case 'put':
      require_(opts, ['dir', 'path']);
      return put(opts.dir, opts.path, readStdin());
    case 'verify': {
      require_(opts, ['dir', 'path', 'sha256']);
      const { path: verified, sha256 } = verify(opts.dir, { path: opts.path, sha256: opts.sha256 });
      return { path: verified, sha256 };
    }
    case 'materialize':
      require_(opts, ['dir', 'path', 'sha256', 'destination']);
      return materialize(opts.dir, { path: opts.path, sha256: opts.sha256 }, opts.destination, { cwd: opts.cwd || process.cwd() });
    case 'close':
      require_(opts, ['dir']);
      return close(opts.dir);
    default:
      throw new UsageError(opts.command ? `unknown sub-command: ${opts.command}` : 'missing sub-command');
  }
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  const respond = (payload, code) => {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return code;
  };
  if (parsed.error) return respond({ ok: false, command: null, error: parsed.error }, 2);
  try {
    return respond({ ok: true, command: parsed.opts.command, ...execute(parsed.opts) }, 0);
  } catch (error) {
    if (error instanceof CheckError) return respond({ ok: false, command: parsed.opts.command, check: 'failed', error: error.message }, 1);
    return respond({ ok: false, command: parsed.opts.command, error: error.message }, 2);
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { MARKER, CheckError, UsageError, checkTransferDir, open, put, verify, materialize, close, parseArgs, main };
