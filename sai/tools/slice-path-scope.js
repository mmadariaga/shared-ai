#!/usr/bin/env node

'use strict';

/**
 * slice-path-scope — deterministic working-tree scope check for one slice.
 *
 * A slice owns a set of paths. Files the user had already modified before the
 * slice started are not part of it. This tool records that starting state and
 * later answers two questions about a list of slice paths, from the working
 * tree and the lists alone:
 *
 *   foreign     Which paths changed since the snapshot and lie outside the
 *               slice paths?
 *   uncovered   Which slice paths lie outside a second, covering list (for
 *               example the owned paths of a commit order)?
 *
 * It only reads the repository. The snapshot record is written to the OS
 * temporary directory, outside the repository, and addressed by the opaque
 * reference the caller holds in conversation state.
 *
 * Sub-commands:
 *   snapshot    Record every path `git status` reports as modified, with its
 *               status and a content hash, plus HEAD. Report the reference.
 *               With `--targets`, read target paths from stdin, one per line,
 *               and also record the content of everything at or beneath each
 *               one straight from the file system. `git status` hides ignored
 *               paths; a target is watched whatever its ignore status, so
 *               creating, modifying, or removing it is a change at verify.
 *   verify      Read the slice paths from stdin, one per line. An optional
 *               `---` line starts the covering list. Report `foreign` and
 *               `uncovered`.
 *
 * A listed directory stands for every path beneath it, in both lists.
 *
 * Verdicts (closed vocabulary across both sub-commands):
 *   clean       The snapshot was recorded (snapshot), or `foreign` and
 *               `uncovered` are both empty (verify).
 *   mismatch    `foreign` or `uncovered` holds at least one path.
 *   n/a         No check was possible: not a git repository, git missing, or
 *               an `n/a` snapshot reference.
 *
 * Usage:
 *   node sai/tools/slice-path-scope.js snapshot [--targets] [--json] [--cwd <dir>] [< targets]
 *   node sai/tools/slice-path-scope.js verify --snapshot <ref|n/a> [--json] [--cwd <dir>] < paths
 *
 * Exit codes: 0 = clean or n/a; 1 = mismatch; 2 = usage error or IO failure.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

/** The literal reference recorded when no snapshot could be taken. */
const N_A = 'n/a';

/** A snapshot reference is the hex digest of its record, or the literal `n/a`. */
const REF_RE = /^[0-9a-f]{64}$/;

/** The stdin line that separates the slice paths from the covering list. */
const SEPARATOR = '---';

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (result.error) return { available: false, status: null, stdout: '', stderr: result.error.message };
  return { available: true, status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch (err) {
    return false;
  }
}

/** The repository top level, or the reason no check is possible. */
function repoState(cwd) {
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  if (!top.available) return { root: null, reason: 'git-unavailable' };
  if (top.status !== 0) return { root: null, reason: 'not-a-git-repository' };
  const head = git(['rev-parse', '--verify', 'HEAD'], cwd);
  return {
    root: top.stdout.trim().split('\n')[0],
    head: head.status === 0 ? head.stdout.trim().split('\n')[0] : null,
    reason: null,
  };
}

/** Content identity of one working-tree path: a hash, `dir`, or null when absent. */
function contentHash(root, relative) {
  const target = path.join(root, relative);
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (err) {
    return null;
  }
  if (stat.isSymbolicLink()) return `link:${fs.readlinkSync(target)}`;
  if (stat.isDirectory()) return 'dir';
  return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
}

/**
 * Every path `git status` reports, keyed by repository-relative path, with its
 * two-letter status and content identity. A rename contributes both its new
 * and its original path.
 */
function scan(root) {
  const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'], root);
  if (!status.available || status.status !== 0) {
    throw new ToolError(`git status failed: ${(status.stderr || '').trim() || `exit ${status.status}`}`);
  }
  const entries = {};
  const fields = status.stdout.split('\0');
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.length < 4) continue;
    const xy = field.slice(0, 2);
    const relative = field.slice(3).replace(/\/+$/, '');
    entries[relative] = { status: xy, hash: contentHash(root, relative) };
    if (xy[0] === 'R' || xy[0] === 'C') {
      const original = fields[++i];
      if (original) entries[original] = { status: `${xy}<`, hash: contentHash(root, original) };
    }
  }
  return entries;
}

/**
 * Content identity of everything at or beneath each target, read straight from
 * the file system so that ignored paths are seen. An absent target contributes
 * nothing, so its later creation shows up as new keys.
 */
function scanTargets(root, targets) {
  const entries = {};
  const visit = (relative) => {
    const identity = contentHash(root, relative);
    if (identity === null) return;
    entries[relative] = identity;
    if (identity !== 'dir') return;
    for (const name of fs.readdirSync(path.join(root, relative)).sort()) visit(`${relative}/${name}`);
  };
  for (const target of targets) visit(target);
  return entries;
}

function recordPath(ref) {
  return path.join(fs.realpathSync(os.tmpdir()), `sai-slice-path-scope-${ref}.json`);
}

/** Snapshot: record the modified paths and HEAD, and hand back the reference. */
function snapshot(cwd, targets = []) {
  const state = repoState(cwd);
  if (!state.root) {
    return { action: 'snapshot', verdict: 'n/a', snapshot: N_A, reason: state.reason, modified: [], targets };
  }
  const entries = scan(state.root);
  const watched = scanTargets(state.root, targets);
  const body = JSON.stringify({ root: state.root, head: state.head, entries, targets, watched });
  const ref = crypto.createHash('sha256').update(body).digest('hex');
  fs.writeFileSync(recordPath(ref), body);
  return { action: 'snapshot', verdict: 'clean', snapshot: ref, reason: null, modified: Object.keys(entries).sort(), targets };
}

/** One repository-relative path in forward-slash form, without `./` or a trailing slash. */
function normalize(line) {
  const value = line.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  if (!value) return null;
  if (path.isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.split('/').includes('..')) {
    throw new ToolError(`path must be repository-relative: ${line.trim()}`);
  }
  return value;
}

/** The target paths of `snapshot --targets`: one repository-relative path per line. */
function parseTargets(text) {
  const targets = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const value = normalize(line);
    if (value !== null && !targets.includes(value)) targets.push(value);
  }
  return targets;
}

/** Split stdin into the slice paths and, after a `---` line, the covering list. */
function parseLists(text) {
  const slice = [];
  let cover = null;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (line.trim() === SEPARATOR) {
      if (cover !== null) throw new ToolError('stdin carries more than one --- line');
      cover = [];
      continue;
    }
    const value = normalize(line);
    if (value === null) continue;
    const target = cover === null ? slice : cover;
    if (!target.includes(value)) target.push(value);
  }
  return { slice, cover };
}

/** True when `candidate` is one of `list` or lies beneath one of its directories. */
function within(candidate, list) {
  return list.some((entry) => candidate === entry || candidate.startsWith(`${entry}/`));
}

/** Paths whose status or content differs between the snapshot and now. */
function changedSince(record, state) {
  const current = scan(state.root);
  const changed = new Set();
  for (const key of new Set([...Object.keys(record.entries), ...Object.keys(current)])) {
    const before = record.entries[key];
    const after = current[key];
    if (!before || !after || before.status !== after.status || before.hash !== after.hash) changed.add(key);
  }
  if (record.head && state.head && record.head !== state.head) {
    const diff = git(['diff', '--name-only', '-z', record.head, state.head], state.root);
    if (!diff.available || diff.status !== 0) {
      throw new ToolError(`git diff failed: ${(diff.stderr || '').trim() || `exit ${diff.status}`}`);
    }
    for (const name of diff.stdout.split('\0')) if (name) changed.add(name);
  }
  const before = record.watched || {};
  const after = scanTargets(state.root, record.targets || []);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) changed.add(key);
  }
  return [...changed].sort();
}

/**
 * Verify: classify the working tree against the slice paths, and the slice
 * paths against the covering list when one is supplied.
 */
function verify(ref, stdinText, cwd) {
  const { slice, cover } = parseLists(stdinText);
  const base = { action: 'verify', snapshot: ref, cover_checked: cover !== null };
  if (ref === N_A) {
    return { ...base, verdict: 'n/a', reason: 'snapshot-unavailable', foreign: [], uncovered: [] };
  }
  const state = repoState(cwd);
  if (!state.root) {
    return { ...base, verdict: 'n/a', reason: state.reason, foreign: [], uncovered: [] };
  }
  let record;
  try {
    record = JSON.parse(fs.readFileSync(recordPath(ref), 'utf8'));
  } catch (err) {
    throw new ToolError(`snapshot record not found for reference ${ref}`);
  }
  const foreign = changedSince(record, state).filter((name) => !within(name, slice));
  const uncovered = cover === null ? [] : slice.filter((name) => !within(name, cover));
  const verdict = foreign.length === 0 && uncovered.length === 0 ? 'clean' : 'mismatch';
  return { ...base, verdict, reason: null, foreign, uncovered };
}

function usage() {
  return [
    'Usage:',
    '  node sai/tools/slice-path-scope.js snapshot [--targets] [--json] [--cwd <dir>] [< targets]',
    '  node sai/tools/slice-path-scope.js verify --snapshot <ref|n/a> [--json] [--cwd <dir>] < paths',
    '',
    '  snapshot                  Record the paths that are already modified and',
    '                            report the snapshot reference. Verdict clean or n/a.',
    '',
    '  verify                    Read the slice paths from stdin, one per line; an',
    '                            optional --- line starts the covering list. Report',
    '                            foreign (changed since the snapshot, outside the',
    '                            slice paths) and uncovered (slice paths outside the',
    '                            covering list). Verdict clean, mismatch, or n/a.',
    '',
    '  --targets                 snapshot only: read target paths from stdin, one per',
    '                            line, and watch everything at or beneath each one',
    '                            whatever its ignore status. verify then reports a',
    '                            created, modified, or removed target as a change.',
    '  --snapshot <ref|n/a>      Reference returned by snapshot, or the literal n/a.',
    '  --json                    Emit the report as JSON on stdout.',
    '  --cwd <dir>               Project root to check (default: cwd).',
    '',
    'Exit codes: 0 = clean or n/a; 1 = mismatch; 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], json: false, cwd: null, snapshot: null, targets: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--snapshot') opts.snapshot = argv[++i];
    else if (arg === '--targets') opts.targets = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (payload.verdict === 'n/a') return `n/a (${payload.reason}): no check possible.`;
  if (payload.action === 'snapshot') {
    return `clean: snapshot ${payload.snapshot} records ${payload.modified.length} modified path(s).`;
  }
  if (payload.verdict === 'clean') return 'clean: no foreign change and no uncovered slice path.';
  const lines = [`mismatch: ${payload.foreign.length} foreign change(s), ${payload.uncovered.length} uncovered slice path(s).`];
  for (const name of payload.foreign) lines.push(`foreign ${name}`);
  for (const name of payload.uncovered) lines.push(`uncovered ${name}`);
  return lines.join('\n');
}

function render(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderText(payload)}\n`);
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    return '';
  }
}

function main(argv, stdinText) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`${parsed.error}\n${usage()}\n`);
    return 2;
  }
  const { opts } = parsed;
  if (opts.help || opts.command === null) {
    process.stdout.write(`${usage()}\n`);
    return opts.help ? 0 : 2;
  }
  if (opts.command !== 'snapshot' && opts.command !== 'verify') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.positional.length > 0) {
    process.stderr.write(`${opts.command} takes no positional arguments\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'snapshot' && opts.snapshot !== null) {
    process.stderr.write(`snapshot does not accept --snapshot\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'verify' && opts.targets) {
    process.stderr.write(`verify does not accept --targets\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'verify') {
    if (opts.snapshot === null || opts.snapshot === undefined) {
      process.stderr.write(`verify requires --snapshot <ref|n/a>\n${usage()}\n`);
      return 2;
    }
    if (opts.snapshot !== N_A && !REF_RE.test(opts.snapshot)) {
      process.stderr.write(`--snapshot must be a snapshot reference or the literal n/a: ${opts.snapshot}\n${usage()}\n`);
      return 2;
    }
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    const input = () => (stdinText === undefined ? readStdin() : stdinText);
    const payload = opts.command === 'snapshot'
      ? snapshot(cwd, opts.targets ? parseTargets(input()) : [])
      : verify(opts.snapshot, input(), cwd);
    render(payload, opts.json);
    return payload.verdict === 'mismatch' ? 1 : 0;
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return err instanceof ToolError ? err.code : 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, snapshot, verify, parseLists, parseTargets, within, usage, N_A, REF_RE, SEPARATOR };
