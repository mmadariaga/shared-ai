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
 *   put --dir <dir> --path <relative> [--exclusive] [--input-file <path>]   (content in the input file, else on stdin)
 *       Write the input file's bytes (else stdin) to `<relative>` inside `<dir>`; return {path, sha256} with
 *       the absolute path. Writing the same path again replaces the file, unless
 *       `--exclusive` is given: then the file is created with an exclusive-create open,
 *       an existing name fails (exit 1) and leaves the existing file and its sha256
 *       unchanged. Every worker report is saved with `--exclusive`; block export and
 *       backfill drafts keep the replacing default.
 *   verify --dir <dir> --path <absolute> --sha256 <hex>
 *       Confirm the path lies inside `<dir>`, is a regular file reached
 *       through no symbolic link, and matches the sha256.
 *   materialize --dir <dir> --path <absolute> --sha256 <hex> --destination <path> [--cwd <root>]
 *       Verify, then copy the verified bytes to the destination (resolved
 *       against --cwd, default cwd, and required to stay inside it), creating
 *       missing parent directories.
 *   accept --dir <dir> --path <absolute> --sha256 <hex> [--check]
 *       Record a reference the coordinator has dealt with in the ledger `.sai-accepted`
 *       inside `<dir>`, after verifying it like `verify`. Recording an already
 *       recorded reference changes nothing. Returns `already` (it was recorded
 *       before) and `recorded` (this call recorded it). With `--check` the call only
 *       looks the reference up in the ledger: it reads no report, records nothing,
 *       and answers `already`.
 *   watch --dir <dir> [--settle <duration>] [--max <duration>] [--poll <duration>]
 *       Poll `<dir>` inside this process (every `--poll`, default 5s) until it holds
 *       a report that is not in the ledger and has been on disk for at least the
 *       settle delay (default 60s), then print those references (`reports`, each
 *       `{path, sha256}` with the hash computed here) in creation order and
 *       exit, or print an empty `reports` list at `--max` (default 30m). A
 *       duration is a whole number followed by ms, s, m, or h. Draft files
 *       (`*.draft.*`), the marker, and the ledger are never reports.
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
const { readInputBytes } = require('./input-reader');

const MARKER = '.sai-transfer';
const LEDGER = '.sai-accepted';
const RESERVED = [MARKER, LEDGER];
const DEFAULT_SETTLE_MS = 60 * 1000;
const DEFAULT_MAX_MS = 30 * 60 * 1000;
const DEFAULT_POLL_MS = 5 * 1000;
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
  if (RESERVED.includes(segments[0])) throw new UsageError(`put --path must not use the reserved name ${segments[0]}`);
  return segments;
}

/**
 * Write bytes to a relative path inside the transfer directory. With `exclusive`
 * the file is created by one exclusive-create open, so an existing name (a file, a
 * symbolic link, anything) fails atomically and nothing is replaced.
 */
function put(dir, relative, bytes, { io = fs, exclusive = false } = {}) {
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
  if (exclusive) {
    let fd;
    try {
      fd = io.openSync(target, 'wx', 0o600);
    } catch (error) {
      if (error.code === 'EEXIST') throw new CheckError('Target already exists: put --exclusive never replaces a file');
      throw error;
    }
    try {
      io.writeFileSync(fd, bytes);
    } catch (error) {
      try { io.closeSync(fd); } catch (closeError) { /* the write error is the one reported */ }
      try { io.unlinkSync(target); } catch (unlinkError) { /* best effort: the file this call created */ }
      throw error;
    }
    io.closeSync(fd);
  } else {
    io.writeFileSync(target, bytes, { mode: 0o600 });
  }
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
  if (!within(root, resolved) || RESERVED.includes(path.relative(root, resolved).split(path.sep)[0])) {
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

const referenceKey = (target, sha256) => `${path.resolve(target)}\n${sha256}`;

/** The references recorded in the ledger of a transfer directory, as a set of keys. */
function readLedger(root, { io = fs } = {}) {
  let text;
  try {
    text = io.readFileSync(path.join(root, LEDGER), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return new Set();
    throw error;
  }
  const keys = new Set();
  for (const line of text.split('\n')) {
    if (line === '') continue;
    try {
      const entry = JSON.parse(line);
      if (typeof entry.path === 'string' && typeof entry.sha256 === 'string') keys.add(referenceKey(entry.path, entry.sha256));
    } catch (error) { /* a torn line is not a reference */ }
  }
  return keys;
}

/**
 * Record a reference in the ledger of the transfer directory. The reference is verified first
 * (inside the directory, a regular file, matching sha256). With `check` nothing is read or
 * recorded: the call answers whether the reference is already in the ledger.
 */
function accept(dir, reference, { io = fs, check = false } = {}) {
  const root = checkTransferDir(dir, { io });
  const { path: target, sha256 } = reference;
  if (check) {
    if (typeof target !== 'string' || !path.isAbsolute(target)) throw new CheckError('Reference path must be an absolute path');
    if (typeof sha256 !== 'string' || !SHA256.test(sha256)) throw new CheckError('Reference sha256 must be 64 lowercase hex characters');
    return { path: path.resolve(target), sha256, already: readLedger(root, { io }).has(referenceKey(target, sha256)), recorded: false };
  }
  const verified = verify(dir, reference, { io });
  const already = readLedger(root, { io }).has(referenceKey(verified.path, sha256));
  if (!already) io.appendFileSync(path.join(root, LEDGER), `${JSON.stringify({ path: verified.path, sha256 })}\n`, { mode: 0o600 });
  return { path: verified.path, sha256, already, recorded: !already };
}

/** Parse a duration written as a whole number and a unit (ms, s, m, h); a bare 0 is 0 ms. */
function parseDuration(value, flag) {
  const match = /^(\d+)(ms|s|m|h)?$/.exec(String(value));
  if (!match || (match[2] === undefined && match[1] !== '0')) throw new UsageError(`${flag} must be a whole number followed by ms, s, m, or h`);
  const unit = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 }[match[2] || 'ms'];
  return Number(match[1]) * unit;
}

/** Regular files of the directory (any depth) that can be reports, in creation order. */
function candidateReports(root, io) {
  const found = [];
  const walk = current => {
    for (const entry of io.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (current === root && RESERVED.includes(entry.name)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile() && !entry.name.includes('.draft.')) {
        const stat = lstatOrNull(target, io);
        if (stat && stat.isFile()) found.push({ target, name: path.relative(root, target), created: stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs, modified: stat.mtimeMs });
      }
    }
  };
  walk(root);
  return found.sort((a, b) => a.created - b.created || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** The references of the reports that are not in the ledger and have been on disk for the settle delay. */
function undelivered(root, settleMs, io, at) {
  const ledger = readLedger(root, { io });
  const references = [];
  for (const candidate of candidateReports(root, io)) {
    if (at - candidate.modified < settleMs) continue;
    let bytes;
    try {
      bytes = io.readFileSync(candidate.target);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const sha256 = sha256Of(bytes);
    if (!ledger.has(referenceKey(candidate.target, sha256))) references.push({ path: candidate.target, sha256 });
  }
  return references;
}

const defaultSleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Wait until the directory holds an undelivered report or `maxMs` has passed. The process owns the
 * polling, so the caller spends no model turn while nothing happens. A directory that disappears
 * ends the watch with an empty list.
 */
async function watch(dir, { settleMs = DEFAULT_SETTLE_MS, maxMs = DEFAULT_MAX_MS, pollMs = DEFAULT_POLL_MS, io = fs, now = Date.now, sleep = defaultSleep } = {}) {
  const root = checkTransferDir(dir, { io });
  const deadline = now() + maxMs;
  for (;;) {
    let reports;
    try {
      reports = undelivered(root, settleMs, io, now());
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { reports: [], ended: 'closed' };
      throw error;
    }
    if (reports.length > 0) return { reports, ended: 'found' };
    const remaining = deadline - now();
    if (remaining <= 0) return { reports: [], ended: 'max' };
    await sleep(Math.min(pollMs, remaining));
  }
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
    '  node transfer.js put --dir <dir> --path <relative> [--exclusive] [--input-file <path>]   (content in the input file, else on stdin)',
    '  node transfer.js verify --dir <dir> --path <absolute> --sha256 <hex>',
    '  node transfer.js materialize --dir <dir> --path <absolute> --sha256 <hex> --destination <path> [--cwd <root>]',
    '  node transfer.js accept --dir <dir> --path <absolute> --sha256 <hex> [--check]',
    '  node transfer.js watch --dir <dir> [--settle <duration>] [--max <duration>] [--poll <duration>]',
    '  node transfer.js close --dir <dir>',
    '',
    'Exit codes: 0 = success; 1 = check failure; 2 = usage error or IO failure.',
  ].join('\n');
}

const FLAGS = { '--harness': 'harness', '--dir': 'dir', '--path': 'path', '--sha256': 'sha256', '--destination': 'destination', '--cwd': 'cwd', '--input-file': 'inputFile', '--settle': 'settle', '--max': 'max', '--poll': 'poll' };

function parseArgs(argv) {
  const opts = { command: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--exclusive') {
      opts.exclusive = true;
      continue;
    }
    if (arg === '--check') {
      opts.check = true;
      continue;
    }
    if (FLAGS[arg]) {
      if (i + 1 >= argv.length) return { error: `missing value for ${arg}` };
      if (opts[FLAGS[arg]] !== undefined) return { error: `${arg} accepts one value` };
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
      return put(opts.dir, opts.path, opts.inputFile ? readInputBytes(opts.inputFile) : readStdin(), { exclusive: opts.exclusive === true });
    case 'verify': {
      require_(opts, ['dir', 'path', 'sha256']);
      const { path: verified, sha256 } = verify(opts.dir, { path: opts.path, sha256: opts.sha256 });
      return { path: verified, sha256 };
    }
    case 'materialize':
      require_(opts, ['dir', 'path', 'sha256', 'destination']);
      return materialize(opts.dir, { path: opts.path, sha256: opts.sha256 }, opts.destination, { cwd: opts.cwd || process.cwd() });
    case 'accept':
      require_(opts, ['dir', 'path', 'sha256']);
      return accept(opts.dir, { path: opts.path, sha256: opts.sha256 }, { check: opts.check === true });
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

/** Run any sub-command; `watch` is the only one that waits. */
async function run(argv) {
  const parsed = parseArgs(argv);
  if (parsed.help || parsed.error || !parsed.opts || parsed.opts.command !== 'watch') return main(argv);
  const { opts } = parsed;
  const respond = (payload, code) => {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return code;
  };
  try {
    require_(opts, ['dir']);
    const result = await watch(opts.dir, {
      settleMs: opts.settle === undefined ? DEFAULT_SETTLE_MS : parseDuration(opts.settle, '--settle'),
      maxMs: opts.max === undefined ? DEFAULT_MAX_MS : parseDuration(opts.max, '--max'),
      pollMs: opts.poll === undefined ? DEFAULT_POLL_MS : Math.max(1, parseDuration(opts.poll, '--poll')),
    });
    return respond({ ok: true, command: 'watch', ...result }, 0);
  } catch (error) {
    if (error instanceof CheckError) return respond({ ok: false, command: 'watch', check: 'failed', error: error.message }, 1);
    return respond({ ok: false, command: 'watch', error: error.message }, 2);
  }
}

if (require.main === module) run(process.argv.slice(2)).then(code => { process.exitCode = code; });

module.exports = { MARKER, LEDGER, CheckError, UsageError, checkTransferDir, open, put, verify, accept, watch, parseDuration, materialize, close, parseArgs, main, run };
