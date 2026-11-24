#!/usr/bin/env node

'use strict';

/**
 * test-select — which tests a step must run, and the base check of the Close
 * suite of `/sai-3-implement`.
 *
 * Terms.
 * - selection: the test files `codegraph affected` reports for the files a step
 *   changed, one call per file at a fixed depth of 2. The coordinator runs it
 *   together with the step's own test command.
 * - test file: a changed file that codegraph classifies as a test, that is, a
 *   file its own single-file `affected` call lists in `affectedTests`.
 * - no dependents: a single-file `affected` call that reports
 *   `totalDependentsTraversed: 0`; the graph cannot vouch for that file.
 * - full: the answer when the selection cannot be trusted; the coordinator runs
 *   the project's full unit and integration suites and warns with the reason.
 * - change base: the merge-base of HEAD with the parent branch, computed by
 *   `change-base.js`, the same computation `scenario-coverage.js` uses.
 * - dirty baseline: the uncommitted paths present before the run started, as
 *   `git status --porcelain` printed them. The run never owns them.
 *
 * Usage:
 *   node sai/tools/test-select.js select --input-file <path> [--timeout-ms <n>] [--cwd <project-root>]
 *   node sai/tools/test-select.js swap --record <path> --dirty-baseline <path> [--parent-branch <branch>] [--cwd <project-root>]
 *   node sai/tools/test-select.js restore --record <path> [--cwd <project-root>]
 *
 * `select` reads a JSON list of the files a step changed and prints one JSON
 * object: `verdict` (`selected` or `full`), `tests` (the selected test files,
 * empty on `full`), and `reason`: null on `selected`, else one of `no-binary`
 * (no `codegraph` on PATH), `no-index` (no `.codegraph/` or an uninitialized
 * one), `sync-failed` (`codegraph sync` exited non-zero), `stale-index`
 * (`codegraph status --json` reports pending changes, or its `index` block shows
 * an index that an older extractor built, that is still rebuilding, or that needs
 * a reindex), `unindexed-file` (a changed file is not in `codegraph files --json`;
 * `files` lists them), `codegraph-error` (a call failed), `timeout` (the calls
 * exceeded `--timeout-ms`, 60000 by default), `invalid-output` (a call printed
 * JSON the tool cannot read), or `no-dependents` (a changed non-test file has no
 * dependents in the graph; `files` lists them). The per-file calls run in
 * parallel, at most 4 at a time, under one shared `--timeout-ms` deadline. It
 * uses only the public codegraph CLI and never opens
 * `.codegraph/codegraph.db`. Paths under `openspec/` are plan artifacts, not
 * code, and are left out of the list.
 *
 * `swap` restores to the change base, in the working tree only, the files the
 * change modified or deleted, and removes the files it added, so the coordinator
 * can run a failing test against the base with the installed dependencies. It
 * saves the paths in the record file first, never touches the git index or a
 * dirty-baseline path, and refuses (`verdict: refused`, exit 1) when a changed
 * path is part of the dirty baseline or has uncommitted work. `restore` brings
 * the recorded paths back to HEAD, is idempotent, and prints `clean` when the
 * working tree already matched HEAD.
 *
 * Exit codes: 0 = a verdict (`selected`, `full`, `swapped`, `restored`,
 * `clean`); 1 = `refused` or a `failed` restore; 2 = usage or I/O error (a
 * message on stderr, never a verdict).
 */

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { InputFileError, extractInputFile, readInputFile } = require('./input-reader.js');
const { UsageError, git, resolveChangeBase } = require('./change-base.js');

const DEFAULT_TIMEOUT_MS = 60000;
const AFFECTED_DEPTH = 2;
const AFFECTED_CONCURRENCY = 4;
const RECORD_VERSION = 1;

class Fallback extends Error {
  constructor(reason, extra) {
    super(reason);
    this.reason = reason;
    this.extra = extra || {};
  }
}

function usage() {
  return [
    'Usage: node sai/tools/test-select.js select --input-file <path> [--timeout-ms <n>] [--cwd <project-root>]',
    '       node sai/tools/test-select.js swap --record <path> --dirty-baseline <path> [--parent-branch <branch>] [--cwd <project-root>]',
    '       node sai/tools/test-select.js restore --record <path> [--cwd <project-root>]',
    '',
    '  select           <path> holds a JSON list of the files a step changed.',
    '  swap             restores the change\'s files to the change base in the working tree and saves them in --record.',
    '  restore          brings the files saved in --record back to HEAD.',
    '  --dirty-baseline File with the `git status --porcelain` output recorded before the run.',
    '  --timeout-ms     Timeout of each codegraph call, one shared deadline for the per-file `affected` calls (default 60000).',
    '  --cwd            Project root (default: the working directory).',
  ].join('\n');
}

// ---- select ---------------------------------------------------------------

/** The `codegraph` executable on PATH (with PATHEXT on Windows), or null. */
function findCodegraph() {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const names = process.platform === 'win32'
    ? ['codegraph', ...(process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((ext) => `codegraph${ext.toLowerCase()}`)]
    : ['codegraph'];
  for (const dir of dirs) {
    for (const name of names) {
      const file = path.join(dir, name);
      try {
        if (!fs.statSync(file).isFile()) continue;
        if (process.platform !== 'win32') fs.accessSync(file, fs.constants.X_OK);
        return file;
      } catch (error) { /* not here */ }
    }
  }
  return null;
}

// The Windows CodeGraph shim is a batch file, which only the command interpreter runs. Only fixed arguments are
// passed on the command line; the file list travels on stdin. A timeout that killed only the interpreter would leave
// CodeGraph running, so on Windows a supervisor runs the interpreter and kills its whole process tree at the timeout,
// writing TIMEOUT_MARK on its stderr.
const TIMEOUT_MARK = 'test-select:timeout';
const SUPERVISOR = `
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const [timeoutMs, shell, ...args] = process.argv.slice(1);
const taskkill = path.join(process.env.SystemRoot || 'C:\\\\Windows', 'System32', 'taskkill.exe');
const child = spawn(shell, ['/d', '/s', '/c', 'codegraph', ...args], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
process.stdin.pipe(child.stdin);
child.stdin.on('error', () => {});
child.stdout.pipe(process.stdout);
const timer = setTimeout(() => {
  spawnSync(taskkill, ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  process.stderr.write(${JSON.stringify(TIMEOUT_MARK)});
  process.exit(1);
}, Number(timeoutMs));
child.on('error', () => { clearTimeout(timer); process.exit(1); });
child.on('close', (code) => { clearTimeout(timer); process.exitCode = code === null ? 1 : code; });
`;

function invocation(args, timeoutMs) {
  return process.platform === 'win32'
    ? [process.execPath, ['-e', SUPERVISOR, String(timeoutMs), process.env.ComSpec || 'cmd.exe', ...args]]
    : ['codegraph', args];
}

function codegraph(args, { cwd, timeoutMs, input, failure }) {
  const windows = process.platform === 'win32';
  const [file, argv] = invocation(args, timeoutMs);
  const result = spawnSync(file, argv, {
    cwd,
    encoding: 'utf8',
    // The supervisor enforces the timeout on Windows; this one only bounds a supervisor that never ends.
    timeout: windows ? timeoutMs + 30000 : timeoutMs,
    input,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['pipe', 'pipe', windows ? 'pipe' : 'ignore'],
  });
  if (result.error) throw new Fallback(result.error.code === 'ETIMEDOUT' ? 'timeout' : failure);
  if (windows && (result.stderr || '').includes(TIMEOUT_MARK)) throw new Fallback('timeout');
  if (result.status !== 0) throw new Fallback(failure);
  return result.stdout;
}

/** The asynchronous variant of `codegraph`: the same call, ended at `deadline` (a time in ms) instead of after a timeout. */
function codegraphAsync(args, { cwd, input, failure, deadline }) {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      reject(new Fallback('timeout'));
      return;
    }
    const windows = process.platform === 'win32';
    const [file, argv] = invocation(args, remaining);
    const child = spawn(file, argv, { cwd, stdio: ['pipe', 'pipe', windows ? 'pipe' : 'ignore'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    // The supervisor enforces the deadline on Windows; this timer only bounds a supervisor that never ends.
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      settle(reject, new Fallback('timeout'));
    }, windows ? remaining + 30000 : remaining);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    if (windows) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.stdin.on('error', () => {});
    child.on('error', () => settle(reject, new Fallback(failure)));
    child.on('close', (code) => {
      if (windows && stderr.includes(TIMEOUT_MARK)) settle(reject, new Fallback('timeout'));
      else if (code !== 0) settle(reject, new Fallback(failure));
      else settle(resolve, stdout);
    });
    child.stdin.end(input);
  });
}

function codegraphJson(args, options) {
  try {
    return JSON.parse(codegraph(args, { ...options, failure: 'codegraph-error' }));
  } catch (error) {
    if (error instanceof Fallback) throw error;
    throw new Fallback('invalid-output');
  }
}

const normalizePath = (file) => file.replace(/\\/g, '/').replace(/^\.\//, '');
const isPlanArtifact = (file) => file === 'openspec' || file.startsWith('openspec/');

function readFileList(inputFile) {
  if (!inputFile) throw new UsageError('select requires --input-file <path>');
  let files;
  try {
    files = JSON.parse(readInputFile(inputFile));
  } catch (error) {
    if (error instanceof InputFileError) throw new UsageError(error.message);
    throw new UsageError(`${inputFile}: not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(files) || files.some((file) => typeof file !== 'string' || !file.trim())) {
    throw new UsageError(`${inputFile}: expected a JSON list of non-empty file paths`);
  }
  return [...new Set(files.map(normalizePath))].filter((file) => !isPlanArtifact(file));
}

function stringList(value, what) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Fallback('invalid-output', { detail: what });
  return value;
}

/** The `index` signals of `codegraph status --json` that show an index the tool cannot trust; none when the block is absent. */
function staleIndex(status) {
  const index = status.index;
  if (!index || typeof index !== 'object') return false;
  return index.reindexRecommended === true
    || index.builtWithExtractionVersion !== index.currentExtractionVersion
    || index.state !== 'complete'
    || Number(index.filesNeedingReindex) > 0
    || status.rebuildInProgress === true;
}

/** What one single-file `affected` call reports: its tests and whether the graph has dependents for the file. */
function readAffected(text) {
  let affected;
  try {
    affected = JSON.parse(text);
  } catch (error) {
    throw new Fallback('invalid-output');
  }
  if (!affected || typeof affected !== 'object') throw new Fallback('invalid-output');
  const traversed = affected.totalDependentsTraversed;
  if (typeof traversed !== 'number' || !Number.isFinite(traversed)) throw new Fallback('invalid-output', { detail: 'totalDependentsTraversed' });
  return { tests: stringList(affected.affectedTests, 'affectedTests').map(normalizePath), noDependents: traversed === 0 };
}

/**
 * One `affected --depth` call per file, each file alone on stdin, at most AFFECTED_CONCURRENCY at a time under one
 * shared deadline. Every call runs to its end, so the results, kept in file order, do not depend on which call finishes first.
 */
async function affectedPerFile(files, { cwd, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  const results = new Array(files.length);
  let next = 0;
  const lane = async () => {
    while (next < files.length) {
      const i = next;
      next += 1;
      try {
        const text = await codegraphAsync(['affected', '--json', '--stdin', '--depth', String(AFFECTED_DEPTH)], {
          cwd, deadline, input: `${files[i]}\n`, failure: 'codegraph-error',
        });
        results[i] = { ...readAffected(text), file: files[i] };
      } catch (error) {
        if (!(error instanceof Fallback)) throw error;
        results[i] = { error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(AFFECTED_CONCURRENCY, files.length) }, lane));
  return results;
}

async function selectTests(files, cwd, timeoutMs) {
  if (files.length === 0) return { verdict: 'selected', tests: [], reason: null };
  const options = { cwd, timeoutMs };
  try {
    if (!findCodegraph()) throw new Fallback('no-binary');
    if (!fs.existsSync(path.join(cwd, '.codegraph'))) throw new Fallback('no-index');
    codegraph(['sync'], { ...options, failure: 'sync-failed' });

    const status = codegraphJson(['status', '--json'], options);
    if (!status || typeof status !== 'object') throw new Fallback('invalid-output');
    if (status.initialized === false) throw new Fallback('no-index');
    const pending = status.pendingChanges;
    if (!pending || typeof pending !== 'object') throw new Fallback('invalid-output');
    if (Object.values(pending).some((count) => Number(count) > 0)) throw new Fallback('stale-index');
    if (staleIndex(status)) throw new Fallback('stale-index');

    const listing = codegraphJson(['files', '--json'], options);
    if (!Array.isArray(listing) || listing.some((entry) => !entry || typeof entry.path !== 'string')) throw new Fallback('invalid-output');
    const indexed = new Set(listing.map((entry) => normalizePath(entry.path)));
    const unindexed = files.filter((file) => /[\r\n]/.test(file) || !indexed.has(file));
    if (unindexed.length) throw new Fallback('unindexed-file', { files: unindexed });

    const results = await affectedPerFile(files, options);
    const failed = results.find((result) => result.error);
    if (failed) throw failed.error;
    // A test file is one whose own call lists it; every other file, fixtures and mocks included, is code.
    const bare = results.filter((result) => result.noDependents && !result.tests.includes(result.file)).map((result) => result.file);
    if (bare.length) throw new Fallback('no-dependents', { files: bare });
    const tests = [...new Set(results.flatMap((result) => result.tests))].sort();
    return { verdict: 'selected', tests, reason: null };
  } catch (error) {
    if (!(error instanceof Fallback)) throw error;
    return { verdict: 'full', tests: [], reason: error.reason, ...(error.extra.files ? { files: error.extra.files } : {}) };
  }
}

// ---- swap and restore -----------------------------------------------------

function gitOk(args, cwd, input) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new UsageError(`cannot run git: ${result.error.message}`);
  if (result.status !== 0) throw new UsageError(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

const nulList = (text) => text.split('\0').filter(Boolean);

/** Decode a path as `git status --porcelain` prints it, quoted when it holds unusual characters. */
function unquote(text) {
  if (!(text.length >= 2 && text.startsWith('"') && text.endsWith('"'))) return text;
  const bytes = [];
  const inner = text.slice(1, -1);
  const escapes = { n: 10, t: 9, r: 13, '"': 34, '\\': 92, a: 7, b: 8, f: 12, v: 11 };
  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char !== '\\') {
      bytes.push(...Buffer.from(char, 'utf8'));
    } else if (/^[0-7]{3}/.test(inner.slice(i + 1, i + 4))) {
      bytes.push(parseInt(inner.slice(i + 1, i + 4), 8));
      i += 3;
    } else {
      bytes.push(escapes[inner[i + 1]] ?? inner.charCodeAt(i + 1));
      i += 1;
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/** Paths of a `git status --porcelain` text, relative to `prefix` (the project root inside the repository). */
function dirtyBaselinePaths(text, prefix) {
  const paths = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 4) continue;
    const entry = line.slice(3);
    const arrow = entry.indexOf(' -> ');
    const names = arrow === -1 ? [entry] : [entry.slice(0, arrow), entry.slice(arrow + 4)];
    for (const name of names.map(unquote)) {
      paths.push(prefix && name.startsWith(prefix) ? name.slice(prefix.length) : name);
    }
  }
  return paths;
}

const inDirtyBaseline = (file, dirty) => dirty.some((entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry));

function readRecord(recordFile) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(recordFile, 'utf8'));
  } catch (error) {
    throw new UsageError(`${recordFile}: cannot read the record: ${error.message}`);
  }
  if (!record || record.version !== RECORD_VERSION || !Array.isArray(record.paths)
    || record.paths.some((entry) => !entry || typeof entry.path !== 'string' || typeof entry.status !== 'string')) {
    throw new UsageError(`${recordFile}: not a test-select record`);
  }
  return record;
}

function inside(cwd, file) {
  const resolved = path.resolve(cwd, file);
  return resolved !== cwd && resolved.startsWith(cwd + path.sep);
}

function guardPaths(cwd, files) {
  for (const file of files) if (!inside(cwd, file)) throw new UsageError(`path outside the project root: ${file}`);
}

/** The recorded paths whose working-tree copy differs from HEAD, untracked copies of paths HEAD lacks included. */
function differing(cwd, paths) {
  const changed = new Set([
    ...nulList(gitOk(['diff', '--name-only', '--relative', '-z', 'HEAD'], cwd)),
    ...nulList(gitOk(['ls-files', '--others', '--exclude-standard', '-z'], cwd)),
  ]);
  const present = (entry) => fs.lstatSync(path.join(cwd, entry.path), { throwIfNoEntry: false }) !== undefined;
  return paths.filter((entry) => (entry.status === 'D' ? present(entry) : changed.has(entry.path) || !present(entry)));
}

function removeFile(cwd, file) {
  fs.rmSync(path.join(cwd, file), { force: true });
  for (let dir = path.dirname(path.join(cwd, file)); dir !== cwd && dir.startsWith(cwd + path.sep); dir = path.dirname(dir)) {
    try { fs.rmdirSync(dir); } catch (error) { break; } // not empty (or not removable): keep it
  }
}

/** Put `files` into the working tree as `source` holds them; the index is never touched. */
function restoreFiles(cwd, source, files) {
  if (files.length === 0) return;
  gitOk(['restore', `--source=${source}`, '--worktree', '--pathspec-from-file=-', '--pathspec-file-nul'], cwd, files.map((file) => `${file}\0`).join(''));
}

function runSwap({ record, dirtyBaseline, parentBranch, cwd }) {
  if (!record) throw new UsageError('swap requires --record <path>');
  if (!dirtyBaseline) throw new UsageError('swap requires --dirty-baseline <path>');
  let baselineText;
  try {
    baselineText = fs.readFileSync(dirtyBaseline, 'utf8');
  } catch (error) {
    throw new UsageError(`${dirtyBaseline}: cannot read the dirty baseline: ${error.message}`);
  }
  if (fs.existsSync(record)) {
    const earlier = readRecord(record);
    if (earlier.state !== 'restored') return { verdict: 'refused', reason: 'record-exists', record };
  }
  const base = resolveChangeBase(cwd, parentBranch);
  const head = gitOk(['rev-parse', 'HEAD'], cwd).trim();
  const tokens = nulList(gitOk(['diff', '--name-status', '--no-renames', '--relative', '-z', base.change_base, 'HEAD'], cwd));
  const paths = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) paths.push({ status: tokens[i][0], path: tokens[i + 1] });
  guardPaths(cwd, paths.map((entry) => entry.path));

  const prefix = gitOk(['rev-parse', '--show-prefix'], cwd).trim();
  const dirty = dirtyBaselinePaths(baselineText, prefix);
  const overlap = paths.filter((entry) => inDirtyBaseline(entry.path, dirty)).map((entry) => entry.path);
  if (overlap.length) return { verdict: 'refused', reason: 'dirty-baseline-overlap', paths: overlap };
  const uncommitted = differing(cwd, paths.filter((entry) => entry.status !== 'D')).map((entry) => entry.path);
  const resurrected = differing(cwd, paths.filter((entry) => entry.status === 'D')).map((entry) => entry.path);
  if (uncommitted.length || resurrected.length) return { verdict: 'refused', reason: 'uncommitted-changes', paths: [...uncommitted, ...resurrected] };

  // The record comes first: an interrupted swap is healed by `restore` from it.
  fs.writeFileSync(record, `${JSON.stringify({ version: RECORD_VERSION, state: 'swapped', change_base: base.change_base, head, paths }, null, 2)}\n`);
  try {
    for (const entry of paths) if (entry.status === 'A') removeFile(cwd, entry.path);
    restoreFiles(cwd, base.change_base, paths.filter((entry) => entry.status !== 'A').map((entry) => entry.path));
  } catch (error) {
    runRestore({ record, cwd });
    throw error;
  }
  return { verdict: 'swapped', ...base, record, paths: paths.length };
}

function runRestore({ record, cwd }) {
  if (!record) throw new UsageError('restore requires --record <path>');
  const saved = readRecord(record);
  guardPaths(cwd, saved.paths.map((entry) => entry.path));
  const pending = differing(cwd, saved.paths);
  for (const entry of pending.filter((item) => item.status === 'D')) removeFile(cwd, entry.path);
  restoreFiles(cwd, 'HEAD', pending.filter((item) => item.status !== 'D').map((item) => item.path));
  const remaining = differing(cwd, saved.paths).map((entry) => entry.path);
  if (remaining.length) return { verdict: 'failed', record, remaining };
  if (saved.state !== 'restored') fs.writeFileSync(record, `${JSON.stringify({ ...saved, state: 'restored' }, null, 2)}\n`);
  return pending.length ? { verdict: 'restored', record, paths: pending.length } : { verdict: 'clean', record, paths: 0 };
}

// ---- command line ---------------------------------------------------------

function parse(argv) {
  const { argv: rest, inputFile } = extractInputFile(argv);
  const positional = [];
  const options = { cwd: process.cwd(), record: null, dirtyBaseline: null, parentBranch: null, timeoutMs: DEFAULT_TIMEOUT_MS };
  const value = (i, flag) => {
    if (!rest[i + 1] || rest[i + 1].startsWith('--')) throw new UsageError(`value required for ${flag}`);
    return rest[i + 1];
  };
  for (let i = 0; i < rest.length; i += 1) {
    switch (rest[i]) {
      case '--cwd': options.cwd = path.resolve(value(i, '--cwd')); i += 1; break;
      case '--record': options.record = path.resolve(value(i, '--record')); i += 1; break;
      case '--dirty-baseline': options.dirtyBaseline = path.resolve(value(i, '--dirty-baseline')); i += 1; break;
      case '--parent-branch': options.parentBranch = value(i, '--parent-branch'); i += 1; break;
      case '--timeout-ms': {
        const ms = Number(value(i, '--timeout-ms'));
        if (!Number.isInteger(ms) || ms <= 0) throw new UsageError('--timeout-ms takes a positive integer');
        options.timeoutMs = ms;
        i += 1;
        break;
      }
      default:
        if (rest[i].startsWith('--')) throw new UsageError(`unknown flag: ${rest[i]}`);
        positional.push(rest[i]);
    }
  }
  return { command: positional[0], extra: positional.slice(1), inputFile, options };
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  try {
    const { command: name, extra, inputFile, options } = parse(argv);
    if (extra.length) throw new UsageError(`unexpected positional argument: ${extra[0]}`);
    let result;
    if (name === 'select') {
      result = await selectTests(readFileList(inputFile), options.cwd, options.timeoutMs);
    } else if (name === 'swap' || name === 'restore') {
      if (inputFile) throw new UsageError(`${name} takes no --input-file`);
      result = name === 'swap' ? runSwap(options) : runRestore(options);
    } else {
      throw new UsageError(name ? `unknown sub-command: ${name}` : 'sub-command required');
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.verdict === 'refused' || result.verdict === 'failed' ? 1 : 0;
  } catch (error) {
    if (!(error instanceof UsageError || error instanceof InputFileError)) throw error;
    process.stderr.write(`${error.message}\n${usage()}\n`);
    return 2;
  }
}

// `node --test` discovers every file named `test-*.js` and runs it with no argument: that run is not a call of the tool.
const discoveredAsTest = Boolean(process.env.NODE_TEST_CONTEXT) && process.argv.length <= 2;
if (require.main === module && !discoveredAsTest) main(process.argv.slice(2)).then((code) => { process.exitCode = code; });

module.exports = { main, selectTests, dirtyBaselinePaths };
