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
 *   restore <tree> <path ...>
 *                         Write the named working-tree paths back to their
 *                         content in the tree, and remove the named paths the
 *                         tree does not hold. The index is never touched, so a
 *                         caller reverts the changes of a worker between two
 *                         snapshots without changing what is staged.
 *
 * Verdicts:
 *   clean     snapshot: the tree was written.
 *   changed   delta: at least one path differs.
 *   empty     delta: nothing differs.
 *   restored  restore: every named path holds its snapshot content again.
 *   refused   restore: no write happened: a named path lies outside the
 *             repository, or the tree holds a directory or a submodule
 *             there. Every path is checked before the first write.
 *   failed    restore: a git or file-system operation failed; `paths` lists
 *             the paths already restored.
 *   n/a       No result was possible: not a git repository, git missing, or the
 *             SAI temp root unusable. The caller reviews the full diff instead.
 *
 * Usage:
 *   node sai/tools/review-delta.js snapshot [--cwd <dir>] [path ...]
 *   node sai/tools/review-delta.js delta <from> <to> [--cwd <dir>]
 *   node sai/tools/review-delta.js restore <tree> [--cwd <dir>] <path ...>
 *
 * Output is JSON on stdout. Exit codes: 0 = a verdict was reported (including
 * `n/a`); 2 = usage error or an unexpected git failure.
 */

const path = require('path');
const usageKit = require('./usage');
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

function gitRaw(args, cwd) {
  const result = spawnSync('git', args, { cwd, windowsHide: true, maxBuffer: 512 * 1024 * 1024, encoding: 'buffer' });
  if (result.error) return { available: false, status: null, stdout: Buffer.alloc(0), stderr: result.error.message };
  return { available: true, status: result.status, stdout: result.stdout || Buffer.alloc(0), stderr: result.stderr || '' };
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

/**
 * The tree entry of one repository-relative path, or null when the tree does
 * not hold it. A directory entry is reported so the caller can refuse it.
 */
function treeEntry(root, tree, relativePath) {
  const listing = git(['ls-tree', '-z', '--full-tree', tree, '--', relativePath], root);
  if (!listing.available || listing.status !== 0) {
    throw new ToolError(`git ls-tree failed: ${(listing.stderr || '').trim() || `exit ${listing.status}`}`);
  }
  for (const record of listing.stdout.split('\0')) {
    if (record === '') continue;
    const tab = record.indexOf('\t');
    if (tab === -1) continue;
    const [mode, type, object] = record.slice(0, tab).split(' ');
    if (record.slice(tab + 1) !== relativePath) continue;
    return { mode, type, object };
  }
  return null;
}

/** Remove the now-empty directories above a removed file, inside the repository only. */
function pruneEmptyParents(root, relativePath) {
  let current = path.dirname(path.resolve(root, relativePath));
  while (current !== root) {
    const relative = path.relative(root, current);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return;
    try {
      if (fs.readdirSync(current).length !== 0) return;
      fs.rmdirSync(current);
    } catch (err) {
      return;
    }
    current = path.dirname(current);
  }
}

/**
 * The real form of a path whose trailing components may no longer exist: the
 * nearest existing ancestor is resolved and the missing components appended.
 */
function realPathAllowingMissing(absolute) {
  const missing = [];
  let current = absolute;
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(current), ...missing.reverse());
    } catch (err) {
      const parent = path.dirname(current);
      if (parent === current) throw err;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Write the named working-tree paths back to their content in the tree, and
 * remove the named paths the tree does not hold. The real index is untouched.
 * Every path is checked before the first write, so a refusal writes nothing.
 */
function restore(tree, names, cwd) {
  const state = repoState(cwd);
  if (!state.root) return { action: 'restore', verdict: 'n/a', tree: null, paths: [], reason: state.reason };
  const root = state.root;
  const realRoot = fs.realpathSync.native(root);
  const targets = [];
  for (const candidate of names) {
    const absolute = path.resolve(cwd, candidate);
    const real = path.join(realPathAllowingMissing(path.dirname(absolute)), path.basename(absolute));
    const relative = path.relative(realRoot, real);
    if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
      return { action: 'restore', verdict: 'refused', tree: null, paths: [], reason: `path outside the repository: ${candidate}` };
    }
    targets.push(relative.split(path.sep).join('/'));
  }
  const resolved = resolveTree(tree, root);
  const plan = [];
  for (const relativePath of targets) {
    const entry = treeEntry(root, resolved, relativePath);
    if (entry && entry.type !== 'blob') {
      return { action: 'restore', verdict: 'refused', tree: resolved, paths: [], reason: `the tree holds a ${entry.type === 'tree' ? 'directory' : entry.type} there: ${relativePath}` };
    }
    plan.push({ relativePath, entry });
  }
  const done = [];
  const fail = (relativePath, message) => ({ action: 'restore', verdict: 'failed', tree: resolved, paths: done, reason: `${relativePath}: ${message}` });
  for (const { relativePath, entry } of plan) {
    const absolute = path.join(root, relativePath);
    let existed = true;
    try {
      fs.lstatSync(absolute);
    } catch (err) {
      existed = false;
    }
    if (entry) {
      const content = gitRaw(['cat-file', 'blob', entry.object], root);
      if (!content.available || content.status !== 0) return fail(relativePath, 'git cat-file failed');
      try {
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.rmSync(absolute, { force: true, recursive: true });
        if (entry.mode === '120000') {
          fs.symlinkSync(content.stdout.toString('utf8'), absolute);
        } else {
          fs.writeFileSync(absolute, content.stdout, { mode: entry.mode === '100755' ? 0o755 : 0o644 });
        }
      } catch (err) {
        return fail(relativePath, err.message);
      }
      done.push({ path: relativePath, action: 'written' });
    } else {
      if (existed) {
        try {
          fs.rmSync(absolute, { force: true, recursive: true });
        } catch (err) {
          return fail(relativePath, err.message);
        }
        pruneEmptyParents(root, relativePath);
      }
      done.push({ path: relativePath, action: existed ? 'removed' : 'absent' });
    }
  }
  return { action: 'restore', verdict: 'restored', tree: resolved, paths: done, reason: null };
}

const RD = 'node sai/tools/review-delta.js';
const USAGE = {
  subcommands: {
    snapshot: {
      usage: [`${RD} snapshot [--cwd <dir>] [path ...]`],
      notes: [
        'Writes a Git tree of the working tree through a temporary index and reports its identifier. The real index, the staging, and the working tree',
        'are never modified. Untracked files are included; each named path (an ignored path the loop changed) is force-added when it exists.',
      ],
      examples: [`${RD} snapshot --cwd /path/to/project`, `${RD} snapshot --cwd /path/to/project openspec/changes/my-change/design.md`],
      flags: { '--cwd': true },
      positionals: { max: null, names: ['path'] },
    },
    delta: {
      usage: [`${RD} delta <from> <to> [--cwd <dir>]`],
      notes: ['Reports the paths that differ between two tree-ish references and their diff. Verdict changed, empty, or n/a.'],
      examples: [`${RD} delta 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD --cwd /path/to/project`],
      flags: { '--cwd': true },
      positionals: { min: 2, max: 2, names: ['from', 'to'] },
    },
    restore: {
      usage: [`${RD} restore <tree> [--cwd <dir>] <path ...>`],
      notes: [
        'Writes each named working-tree path back to its content in the tree, and removes the named paths the tree does not hold.',
        'The index, the staging, and every other working-tree file stay untouched. Verdict restored, refused, failed, or n/a.',
      ],
      examples: [`${RD} restore 4b825dc642cb6eb9a060e54bf8d69288fbee4904 --cwd /path/to/project src/app.js src/new.js`],
      flags: { '--cwd': true },
      positionals: { min: 2, max: null, names: ['tree', 'path'] },
    },
  },
};
function usage() {
  return usageKit.render(USAGE);
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
  const guarded = usageKit.handle(USAGE, argv);
  if (guarded !== null) return guarded;
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
  if (opts.command !== 'snapshot' && opts.command !== 'delta' && opts.command !== 'restore') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'delta' && opts.positional.length !== 2) {
    process.stderr.write(`delta takes exactly two references\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'restore' && opts.positional.length < 2) {
    process.stderr.write(`restore takes a tree and at least one path\n${usage()}\n`);
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
      : opts.command === 'delta'
        ? delta(opts.positional[0], opts.positional[1], cwd)
        : restore(opts.positional[0], opts.positional.slice(1), cwd);
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return ['refused', 'failed'].includes(payload.verdict) ? 1 : 0;
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return err instanceof ToolError ? err.code : 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, snapshot, delta, restore, parseNameStatus, usage, USAGE };
