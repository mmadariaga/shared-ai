#!/usr/bin/env node

'use strict';

/**
 * review-delta — working-tree snapshots and deltas for the incremental review
 * loops of `/sai-3-implement` (step review) and Direct Build (functional fix
 * loop).
 *
 * Terms:
 *   snapshot  a Git tree object of the working tree at one moment, written
 *             through a temporary index.
 *   delta     the difference between two snapshots (or any two tree-ish
 *             references).
 *
 * A snapshot never touches the real index, the user's staging, or the working
 * tree. It builds its own index file inside a private directory under the SAI
 * temp root (`temp-root.js`), points `GIT_INDEX_FILE` at it for the child
 * processes alone, and deletes the directory when it is done. The only
 * repository write is the tree (and blob) objects `git write-tree` stores in
 * the object database. Untracked files enter the snapshot; ignored paths enter
 * it only when the caller names them.
 *
 * Sub-commands:
 *   snapshot [path ...]   Load a temporary index from HEAD, add the whole
 *                         working tree (`git add -A`), force-add each named
 *                         path that exists (the ignored paths the loop changed),
 *                         write the tree, and report its identifier.
 *   delta <from> <to>     Report the paths that differ between two tree-ish
 *                         references and their diff.
 *
 * Verdicts:
 *   clean     snapshot: the tree was written.
 *   changed   delta: at least one path differs.
 *   empty     delta: nothing differs.
 *   n/a       No result was possible: not a git repository, git missing, or the
 *             SAI temp root unusable. The caller reviews the full diff instead.
 *
 * Usage:
 *   node sai/tools/review-delta.js snapshot [--cwd <dir>] [path ...]
 *   node sai/tools/review-delta.js delta <from> <to> [--cwd <dir>]
 *
 * Output is JSON on stdout. Exit codes: 0 = a verdict was reported (including
 * `n/a`); 2 = usage error or an unexpected git failure.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { makeTempDir, removeInside, TempRootError, harnessFromInstalledPath } = require('./temp-root');

const harness = () => harnessFromInstalledPath(__filename);

/** A tree-ish argument: a hex object name or a ref-like name; never an option. */
const TREEISH_RE = /^[A-Za-z0-9][A-Za-z0-9._\/^~@{}-]{0,200}$/;

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function git(args, cwd, env) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 512 * 1024 * 1024,
    env: env ? { ...process.env, ...env } : process.env,
  });
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

/** The repository top level, whether HEAD exists, or the reason no check is possible. */
function repoState(cwd) {
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  if (!top.available) return { root: null, reason: 'git-unavailable' };
  if (top.status !== 0) return { root: null, reason: 'not-a-git-repository' };
  const head = git(['rev-parse', '--verify', 'HEAD'], cwd);
  return { root: path.resolve(top.stdout.trim().split('\n')[0]), hasHead: head.status === 0, reason: null };
}

function mustRun(args, cwd, env, what) {
  const result = git(args, cwd, env);
  if (!result.available || result.status !== 0) {
    throw new ToolError(`${what} failed: ${(result.stderr || '').trim() || `exit ${result.status}`}`);
  }
  return result;
}

/** The existing paths among `paths`, relative to the repository root and inside it. */
function existingRelativePaths(root, cwd, paths) {
  const found = [];
  // Git reports the top level in its own spelling (for example no 8.3 short names), so compare real paths.
  const realRoot = fs.realpathSync.native(root);
  for (const candidate of paths) {
    const absolute = path.resolve(cwd, candidate);
    try {
      fs.lstatSync(absolute);
      const real = path.join(fs.realpathSync.native(path.dirname(absolute)), path.basename(absolute));
      const relative = path.relative(realRoot, real);
      if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) continue;
      found.push(relative.split(path.sep).join('/'));
    } catch (err) {
      continue;
    }
  }
  return found;
}

/**
 * Snapshot the working tree. The temporary index lives in a private directory
 * that is removed again whatever happens.
 */
function snapshot(cwd, ignoredPaths = []) {
  const state = repoState(cwd);
  if (!state.root) return { action: 'snapshot', verdict: 'n/a', tree: null, reason: state.reason };

  let dir;
  try {
    dir = makeTempDir(harness(), 'review-delta-');
  } catch (err) {
    if (err instanceof TempRootError) {
      return { action: 'snapshot', verdict: 'n/a', tree: null, reason: 'temp-root-unavailable', detail: err.message };
    }
    throw err;
  }
  try {
    const env = { GIT_INDEX_FILE: path.join(dir, 'index') };
    if (state.hasHead) mustRun(['read-tree', 'HEAD'], state.root, env, 'git read-tree');
    mustRun(['add', '-A'], state.root, env, 'git add -A');
    const forced = existingRelativePaths(state.root, cwd, ignoredPaths);
    if (forced.length > 0) mustRun(['add', '-f', '--', ...forced], state.root, env, 'git add -f');
    const tree = mustRun(['write-tree'], state.root, env, 'git write-tree').stdout.trim();
    return { action: 'snapshot', verdict: 'clean', tree, reason: null };
  } finally {
    try {
      removeInside(harness(), dir);
    } catch (err) {
      if (!(err instanceof TempRootError)) throw err;
    }
  }
}

/** Parse `git diff-tree -z --name-status` output into `{status, path}` entries. */
function parseNameStatus(output) {
  const fields = output.split('\0');
  const paths = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    if (fields[index] === '') break;
    paths.push({ status: fields[index], path: fields[index + 1] });
  }
  return paths;
}

function resolveTree(reference, cwd) {
  if (!TREEISH_RE.test(reference)) throw new ToolError(`not a tree reference: ${reference}`);
  const result = git(['rev-parse', '--verify', '--quiet', `${reference}^{tree}`], cwd);
  if (!result.available || result.status !== 0) throw new ToolError(`unknown tree reference: ${reference}`);
  return result.stdout.trim();
}

/** The paths that differ between two tree-ish references and their diff. */
function delta(from, to, cwd) {
  const state = repoState(cwd);
  if (!state.root) return { action: 'delta', verdict: 'n/a', from, to, paths: [], diff: '', reason: state.reason };
  const fromTree = resolveTree(from, state.root);
  const toTree = resolveTree(to, state.root);
  const names = mustRun(['diff-tree', '-r', '-z', '--name-status', '--no-renames', fromTree, toTree], state.root, null, 'git diff-tree');
  const paths = parseNameStatus(names.stdout);
  if (paths.length === 0) {
    return { action: 'delta', verdict: 'empty', from: fromTree, to: toTree, paths: [], diff: '', reason: null };
  }
  const diff = mustRun(['diff', '--no-color', '--no-renames', '--no-ext-diff', fromTree, toTree], state.root, null, 'git diff');
  return { action: 'delta', verdict: 'changed', from: fromTree, to: toTree, paths, diff: diff.stdout, reason: null };
}

function usage() {
  return [
    'Usage:',
    '  node sai/tools/review-delta.js snapshot [--cwd <dir>] [path ...]',
    '  node sai/tools/review-delta.js delta <from> <to> [--cwd <dir>]',
    '',
    '  snapshot       Write a Git tree of the working tree through a temporary index and',
    '                 report its identifier. The real index, the staging, and the working',
    '                 tree are never modified. Untracked files are included; each named',
    '                 path (an ignored path the loop changed) is force-added when it exists.',
    '  delta          Report the paths that differ between two tree-ish references and',
    '                 their diff. Verdict changed, empty, or n/a.',
    '',
    '  --cwd <dir>    Project root to check (default: cwd).',
    '',
    'Output is JSON. Exit codes: 0 = verdict reported (clean, changed, empty, n/a); 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], cwd: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function main(argv) {
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
  if (opts.command !== 'snapshot' && opts.command !== 'delta') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'delta' && opts.positional.length !== 2) {
    process.stderr.write(`delta takes exactly two references\n${usage()}\n`);
    return 2;
  }
  if (opts.cwd === undefined || (opts.cwd !== null && opts.cwd === '')) {
    process.stderr.write(`--cwd requires a directory\n${usage()}\n`);
    return 2;
  }
  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    const payload = opts.command === 'snapshot'
      ? snapshot(cwd, opts.positional)
      : delta(opts.positional[0], opts.positional[1], cwd);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return err instanceof ToolError ? err.code : 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, snapshot, delta, parseNameStatus, usage };
