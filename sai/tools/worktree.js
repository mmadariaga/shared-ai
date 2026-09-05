#!/usr/bin/env node

'use strict';

/**
 * worktree — deterministic engine behind the interactive `/sai-worktree` loop.
 *
 * The command is a finite-state machine: resolve the repository through the
 * common git directory, inventory the registered worktrees, create a worktree
 * in the first free numbered slot, or remove one and optionally its branch.
 * Every one of those steps is decided here by code, never re-derived from
 * prose: the consumer renders the inventory, presents the pickers, and calls
 * back with the user's answer.
 *
 * Sub-commands:
 *   inventory                  Prune stale bookkeeping and report every
 *                              registered worktree plus the next free slot.
 *   create [name]              Validate and create a sibling worktree on a
 *                              derived branch.
 *   index <path>               Best-effort `codegraph init` pass on a freshly
 *                              created worktree; never fatal.
 *   remove <path>              Remove a registered worktree; a worktree with
 *                              uncommitted changes needs --force.
 *   delete-branch <branch>     Delete a branch; an unmerged branch, or one
 *                              whose merge check cannot run, needs --force.
 *
 * Usage:
 *   node sai/tools/worktree.js <sub-command> [args] [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = the action succeeded; 1 = refused, the reported conflict is
 * the user's to resolve and nothing was mutated by the refusing step;
 * 2 = usage error or git/IO failure.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CASE_SENSITIVE = process.platform !== 'win32';

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/** A refusal: the action is not performed and nothing was mutated. */
class Refusal extends Error {
  constructor(reason, message, extra = {}) {
    super(message);
    this.reason = reason;
    this.extra = extra;
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error && result.error.code === 'ENOENT') {
    return { available: false, status: null, stdout: '', stderr: '' };
  }
  if (result.error) throw new ToolError(`${command} failed to start: ${result.error.message}`);
  return {
    available: true,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function git(args, cwd) {
  const result = run('git', args, cwd);
  if (!result.available) throw new ToolError('git is not available on PATH');
  return result;
}

function gitOrThrow(args, cwd) {
  const result = git(args, cwd);
  if (result.status !== 0) {
    throw new ToolError(`git ${args.join(' ')} failed: ${result.stderr.trim() || `exit ${result.status}`}`);
  }
  return result.stdout;
}

/**
 * Canonical form for comparison. Git prints long, fully resolved paths while
 * a process may run from a symlink or (on Windows) an 8.3 short path, so a
 * plain string compare produces false mismatches.
 */
function canonical(target) {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync.native(resolved);
  } catch (err) {
    return resolved;
  }
}

function samePath(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = canonical(a);
  const right = canonical(b);
  return CASE_SENSITIVE ? left === right : left.toLowerCase() === right.toLowerCase();
}

function pathExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    return false;
  }
}

function branchExists(branch, cwd) {
  return git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], cwd).status === 0;
}

/**
 * Resolve the repository through the common git directory — never the cwd.
 * The main worktree directory is the parent of the common git directory and
 * its basename is the main repository directory name; both are derived.
 */
function resolveRepository(cwd) {
  const commonDir = canonical(path.resolve(cwd, gitOrThrow(['rev-parse', '--git-common-dir'], cwd).trim()));
  const mainWorktreeDir = path.dirname(commonDir);
  const currentWorktreeDir = canonical(gitOrThrow(['rev-parse', '--show-toplevel'], cwd).trim());
  return {
    commonDir,
    mainWorktreeDir,
    mainRepoName: path.basename(mainWorktreeDir),
    // Linked worktrees are created beside the main worktree directory, never
    // nested inside any worktree, wherever the command was invoked from.
    siblingRoot: path.dirname(mainWorktreeDir),
    currentWorktreeDir,
  };
}

/**
 * Parse `git worktree list --porcelain`. An entry begins with `worktree
 * <path>`; an entry with no `branch refs/heads/<name>` line is detached and
 * carries no branch — never a failure and never an invented branch.
 */
function parsePorcelain(output) {
  const entries = [];
  let current = null;
  for (const raw of output.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith('worktree ')) {
      current = { path: line.slice('worktree '.length), branch: null, detached: false };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('branch refs/heads/')) current.branch = line.slice('branch refs/heads/'.length);
    else if (line === 'detached') current.detached = true;
  }
  return entries;
}

function buildInventory(cwd, { prune = true } = {}) {
  const repo = resolveRepository(cwd);
  if (prune) gitOrThrow(['worktree', 'prune'], cwd);

  const worktrees = parsePorcelain(gitOrThrow(['worktree', 'list', '--porcelain'], cwd)).map(entry => {
    const isMain = samePath(entry.path, repo.mainWorktreeDir);
    const isCurrent = samePath(entry.path, repo.currentWorktreeDir);
    return {
      name: path.basename(entry.path),
      path: entry.path,
      branch: entry.branch,
      detached: entry.branch === null,
      isMain,
      isCurrent,
      deletable: !isMain && !isCurrent,
    };
  });

  const main = worktrees.find(entry => entry.isMain) || null;
  const nextSlot = findFreeSlot(repo, cwd);

  return {
    mainWorktreeDir: repo.mainWorktreeDir,
    siblingRoot: repo.siblingRoot,
    mainRepoName: repo.mainRepoName,
    mainBranch: main ? main.branch : null,
    mainDetached: main ? main.detached : true,
    currentWorktreeDir: repo.currentWorktreeDir,
    worktrees,
    proposedName: nextSlot.name,
    proposedBranch: nextSlot.branch,
    proposedPath: nextSlot.path,
  };
}

/**
 * Smallest positive n whose sibling directory and `worktree-<n>` branch are
 * both free. The first free slot is reused after a deletion, so numbering
 * stays compact and predictable.
 */
function findFreeSlot(repo, cwd) {
  for (let n = 1; ; n++) {
    const branch = `worktree-${n}`;
    const name = `${repo.mainRepoName}.${branch}`;
    const target = path.join(repo.siblingRoot, name);
    if (!pathExists(target) && !branchExists(branch, cwd)) {
      return { name, branch, path: target };
    }
  }
}

/**
 * Derive the branch from the accepted worktree name: a leading
 * `<main-repo-directory-name>.` prefix is stripped, otherwise the whole name
 * becomes the branch.
 */
function deriveBranch(name, mainRepoName) {
  const prefix = `${mainRepoName}.`;
  const hasPrefix = CASE_SENSITIVE
    ? name.startsWith(prefix)
    : name.toLowerCase().startsWith(prefix.toLowerCase());
  return hasPrefix && name.length > prefix.length ? name.slice(prefix.length) : name;
}

function commandInventory(cwd) {
  return { ok: true, action: 'inventory', ...buildInventory(cwd) };
}

function commandCreate(cwd, name) {
  const inventory = buildInventory(cwd);
  const accepted = name === null || name === undefined || name === '' ? inventory.proposedName : name;

  if (/[\\/]/.test(accepted) || accepted.split(/[\\/]/).includes('..') || accepted.includes('..')) {
    throw new Refusal('invalid-name', `'${accepted}' contains a path separator or '..'; a worktree name must be a single directory name.`);
  }

  const target = path.join(inventory.siblingRoot, accepted);
  if (pathExists(target)) {
    throw new Refusal('directory-exists', `'${target}' already exists; pick another name.`, { path: target });
  }

  const branch = deriveBranch(accepted, inventory.mainRepoName);
  if (git(['check-ref-format', `refs/heads/${branch}`], cwd).status !== 0) {
    throw new Refusal('invalid-branch', `'${branch}' is not a valid git branch name.`, { branch });
  }
  if (branchExists(branch, cwd)) {
    throw new Refusal('branch-exists', `branch '${branch}' already exists; pick another name.`, { branch });
  }

  const added = git(['worktree', 'add', '-b', branch, target], cwd);
  if (added.status !== 0) {
    throw new Refusal('git-refused', `git refused to create the worktree: ${added.stderr.trim() || `exit ${added.status}`}`, { branch, path: target });
  }

  return {
    ok: true,
    action: 'create',
    name: accepted,
    path: target,
    branch,
    // The indexing pass is a separate call so its pre-announcement can be
    // printed between worktree creation and the pass itself.
    indexAnnouncement: `codegraph init is about to run in ${target}.`,
  };
}

function commandIndex(target) {
  if (!target) throw new ToolError('index requires the worktree path to index.');
  const resolved = path.resolve(target);
  if (!pathExists(resolved)) throw new ToolError(`worktree directory not found: ${resolved}`);
  return { ok: true, action: 'index', path: resolved, indexing: indexWorktree(resolved) };
}

/**
 * Best-effort CodeGraph indexing pass on the freshly created worktree. Never
 * fatal: an unavailable binary or a failed init is reported and nothing is
 * rolled back or retried.
 */
function indexWorktree(target) {
  let result;
  try {
    result = run('codegraph', ['init', target], target);
  } catch (err) {
    return { status: 'failed', message: `codegraph init failed: ${err.message}` };
  }
  if (!result.available) {
    return { status: 'unavailable', message: 'codegraph is not available on PATH; the new worktree has no index.' };
  }
  if (result.status !== 0) {
    const reason = (result.stderr || result.stdout).trim().split('\n').pop() || `exit ${result.status}`;
    return { status: 'failed', message: `codegraph init failed: ${reason}` };
  }
  return { status: 'created', message: `codegraph index created in ${target}.` };
}

function commandRemove(cwd, target, { force = false }) {
  if (!target) throw new ToolError('remove requires the worktree path to remove.');
  const inventory = buildInventory(cwd);
  const entry = inventory.worktrees.find(item => samePath(item.path, target));
  if (!entry) {
    throw new Refusal('not-registered', `'${target}' is not a registered worktree.`, { path: target });
  }
  if (!entry.deletable) {
    const role = entry.isMain ? 'main' : 'current';
    throw new Refusal('not-deletable', `'${entry.name}' is the ${role} worktree and cannot be removed.`, { path: entry.path });
  }

  const status = git(['-C', entry.path, 'status', '--porcelain'], cwd);
  if (status.status !== 0) {
    throw new ToolError(`git status failed for ${entry.path}: ${status.stderr.trim() || `exit ${status.status}`}`);
  }
  const statusLines = status.stdout.split('\n').map(line => line.replace(/\r$/, '')).filter(Boolean);

  if (statusLines.length > 0 && !force) {
    throw new Refusal(
      'dirty',
      `'${entry.name}' has ${statusLines.length} uncommitted change(s); removing it would lose them.`,
      { path: entry.path, branch: entry.branch, statusLines },
    );
  }

  const args = ['worktree', 'remove'];
  if (statusLines.length > 0) args.push('--force');
  args.push(entry.path);
  const removed = git(args, cwd);
  if (removed.status !== 0) {
    throw new Refusal('git-refused', `git refused to remove the worktree: ${removed.stderr.trim() || `exit ${removed.status}`}`, { path: entry.path });
  }

  return {
    ok: true,
    action: 'remove',
    name: entry.name,
    path: entry.path,
    branch: entry.branch,
    forced: statusLines.length > 0,
    statusLines,
    branchDeletionApplicable: entry.branch !== null,
  };
}

function commandDeleteBranch(cwd, branch, { force = false }) {
  if (!branch) throw new ToolError('delete-branch requires the branch name to delete.');
  const inventory = buildInventory(cwd, { prune: false });
  if (!branchExists(branch, cwd)) {
    throw new Refusal('branch-missing', `branch '${branch}' does not exist.`, { branch });
  }

  // The main worktree in detached HEAD state has no branch to compare
  // against, so the unmerged-commits check cannot run at all.
  if (inventory.mainDetached || !inventory.mainBranch) {
    if (!force) {
      throw new Refusal(
        'merge-check-skipped',
        `the main worktree is in detached HEAD state, so whether '${branch}' is merged cannot be checked.`,
        { branch, mergeCheckSkipped: true },
      );
    }
    return finishBranchDeletion(cwd, branch, true, { merged: null, mergeCheckSkipped: true });
  }

  const ancestor = git(['merge-base', '--is-ancestor', branch, inventory.mainBranch], cwd);
  if (ancestor.status !== 0 && ancestor.status !== 1) {
    throw new ToolError(`git merge-base failed: ${ancestor.stderr.trim() || `exit ${ancestor.status}`}`);
  }
  const merged = ancestor.status === 0;
  if (!merged && !force) {
    throw new Refusal(
      'unmerged',
      `'${branch}' holds commits that are not merged into '${inventory.mainBranch}'; deleting it loses them.`,
      { branch, mainBranch: inventory.mainBranch, mergeCheckSkipped: false },
    );
  }
  return finishBranchDeletion(cwd, branch, !merged, { merged, mergeCheckSkipped: false, mainBranch: inventory.mainBranch });
}

function finishBranchDeletion(cwd, branch, forced, details) {
  const deleted = git(['branch', forced ? '-D' : '-d', branch], cwd);
  if (deleted.status !== 0) {
    throw new Refusal('git-refused', `git refused to delete the branch: ${deleted.stderr.trim() || `exit ${deleted.status}`}`, { branch });
  }
  return { ok: true, action: 'delete-branch', branch, forced, ...details };
}

function usage() {
  return [
    'Usage: node sai/tools/worktree.js <sub-command> [args] [--json] [--cwd <dir>]',
    '',
    '  inventory                Prune stale bookkeeping and report every registered',
    '                           worktree plus the next free numbered slot.',
    '  create [name]            Create a sibling worktree on a derived branch.',
    '                           Defaults to the reported free slot.',
    '  index <path>             Best-effort codegraph init pass on a created worktree.',
    '  remove <path>            Remove a registered worktree. --force is required when',
    '                           it holds uncommitted changes.',
    '  delete-branch <branch>   Delete a branch. --force is required when it holds',
    '                           unmerged commits or the merge check cannot run.',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Directory to resolve the repository from (default: cwd).',
    '',
    'Exit codes: 0 = done; 1 = refused, nothing mutated; 2 = usage or git error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    command: null, positional: [], json: false, force: false, cwd: null, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (payload.refused) return `refused (${payload.reason}): ${payload.message}`;
  if (payload.action === 'inventory') {
    const lines = payload.worktrees.map(entry => {
      const markers = [entry.isMain ? 'main' : null, entry.isCurrent ? 'current' : null].filter(Boolean);
      const suffix = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
      return entry.detached
        ? `${entry.name} — ${entry.path}${suffix}`
        : `${entry.name} — ${entry.path} — ${entry.branch}${suffix}`;
    });
    lines.push(`next free slot: ${payload.proposedName} (branch ${payload.proposedBranch})`);
    return lines.join('\n');
  }
  if (payload.action === 'create') return `created ${payload.name} at ${payload.path} on branch ${payload.branch}.`;
  if (payload.action === 'index') return payload.indexing.message;
  if (payload.action === 'remove') return `removed ${payload.name} (${payload.path})${payload.forced ? ', forced' : ''}.`;
  return `deleted branch ${payload.branch}${payload.forced ? ' (forced)' : ''}.`;
}

function render(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderText(payload)}\n`);
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

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!pathExists(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    let payload;
    switch (opts.command) {
      case 'inventory':
        payload = commandInventory(cwd);
        break;
      case 'create':
        payload = commandCreate(cwd, opts.positional[0] || null);
        break;
      case 'index':
        payload = commandIndex(opts.positional[0] || null);
        break;
      case 'remove':
        payload = commandRemove(cwd, opts.positional[0] || null, { force: opts.force });
        break;
      case 'delete-branch':
        payload = commandDeleteBranch(cwd, opts.positional[0] || null, { force: opts.force });
        break;
      default:
        process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
        return 2;
    }
    render(payload, opts.json);
    return 0;
  } catch (err) {
    if (err instanceof Refusal) {
      render({
        ok: false, action: opts.command, refused: true, reason: err.reason, message: err.message, ...err.extra,
      }, opts.json);
      return 1;
    }
    if (err instanceof ToolError) {
      process.stderr.write(`${err.message}\n`);
      return err.code;
    }
    process.stderr.write(`${err.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, parsePorcelain, deriveBranch, findFreeSlot, usage };
