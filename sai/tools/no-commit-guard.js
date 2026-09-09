#!/usr/bin/env node

'use strict';

/**
 * no-commit-guard — deterministic HEAD-immobility guard around routed worker
 * dispatches.
 *
 * Worker behavioral rules ("never run a mutating git command") are enforced as
 * prose the worker reads at start, not at the moment of action. This tool
 * turns the one invariant that is true in every project into a filesystem
 * check: HEAD must be identical immediately before and immediately after each
 * worker dispatch window. It is HEAD-only and project-agnostic — no path
 * knowledge, no project configuration, no scope lists.
 *
 * Sub-commands:
 *   snapshot                   Resolve HEAD and report it as the dispatch
 *                              window's baseline. Held by the coordinator as
 *                              conversation state `guard_base`.
 *   verify                     Compare the current HEAD against `guard_base`
 *                              and report the window verdict.
 *
 * Verdicts (closed vocabulary across both sub-commands):
 *   clean       HEAD resolved (snapshot) or HEAD unchanged / permitted to move
 *               (verify); the route continues.
 *   violation   HEAD moved during the window without an `allow_commit`
 *               authorization; the caller remediates (evidence first, then
 *               `git reset <base>` mixed) and continues.
 *   allowed     HEAD moved while `--allow-commit` was carried; any HEAD
 *               movement passes while the flag is carried (lax semantics).
 *   n/a         No check was possible — not a git repository, git missing,
 *               unborn HEAD (empty repository), or an `n/a` baseline. No
 *               auto-remediation; the caller logs one line and continues.
 *
 * The remediation phrasing the user sees is owned by the caller — this tool
 * reports WHICH verdict resolved and the evidence (the commits between the
 * baseline and the current HEAD), never how to phrase the fix.
 *
 * Usage:
 *   node sai/tools/no-commit-guard.js snapshot [--json] [--cwd <dir>]
 *   node sai/tools/no-commit-guard.js verify --base <sha|n/a> [--allow-commit] [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = clean, allowed, or n/a — the route continues; 1 = violation
 * — the caller remediates before continuing; 2 = usage error or IO failure.
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

/** The literal baseline recorded when HEAD cannot be resolved. */
const N_A = 'n/a';

/** A baseline argument must be a git SHA (7–40 hex) or the literal `n/a`. */
const SHA_RE = /^[0-9a-fA-F]{7,40}$/;

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/**
 * On Windows an npm-installed CLI is a `.cmd` shim, which `spawnSync` cannot
 * execute without a shell — a direct spawn would report an installed `git` as
 * missing. The arguments here are fixed literals or a validated hex SHA, so
 * the shell hop introduces no quoting hazard.
 */
function run(command, args, cwd) {
  const useShell = process.platform === 'win32';
  const result = useShell
    ? spawnSync([command, ...args].join(' '), { cwd, encoding: 'utf8', windowsHide: true, shell: true })
    : spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error && result.error.code === 'ENOENT') {
    return { available: false, status: null, stdout: '', stderr: '' };
  }
  if (result.error) return { available: false, status: null, stdout: '', stderr: result.error.message };
  return {
    available: true,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch (err) {
    return false;
  }
}

function git(args, cwd) {
  return run('git', args, cwd);
}

/**
 * Resolve the repository state in two fixed git calls: whether a repository
 * exists at all, and what HEAD points at. An unborn HEAD (empty repository)
 * and a missing repository are both `n/a` states — they are reported with a
 * `reason` so the caller can log one line; neither is an error.
 */
function repoState(cwd) {
  const gitDir = git(['rev-parse', '--git-dir'], cwd);
  if (!gitDir.available) return { repo: false, reason: 'git-unavailable' };
  if (gitDir.status !== 0) return { repo: false, reason: 'not-a-git-repository' };
  const head = git(['rev-parse', '--verify', 'HEAD'], cwd);
  if (!head.available || head.status !== 0) return { repo: true, head: null, reason: 'unborn-head' };
  const sha = head.stdout.trim().split('\n')[0];
  return { repo: true, head: sha, reason: null };
}

/**
 * Evidence for a violation: the commits between the baseline and the current
 * HEAD, exactly `git log <base>..HEAD`. Captured before any remediation,
 * because the reset erases them.
 */
function collectCommits(base, head, cwd) {
  // %x20 (a space) instead of a literal space keeps the whole format one argv
  // token — on Windows this tool's git calls go through the shell, which would
  // otherwise split `%H %s` and treat `%s` as a pathspec.
  const log = git(['log', `${base}..${head}`, '--pretty=format:%H%x20%s'], cwd);
  if (!log.available || log.status !== 0) {
    return { commits: [], error: (log.stderr || log.stdout || '').trim() || `exit ${log.status}` };
  }
  const commits = [];
  for (const line of log.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(' ');
    if (separator === -1) continue;
    commits.push({ sha: trimmed.slice(0, separator), subject: trimmed.slice(separator + 1) });
  }
  return { commits, error: null };
}

/**
 * Snapshot: resolve HEAD and hand it to the caller as the window baseline.
 * Always exit 0 — a failed resolution is a legitimate `n/a`, never a halt.
 */
function snapshot(cwd) {
  const state = repoState(cwd);
  if (!state.repo || !state.head) {
    return { action: 'snapshot', verdict: 'n/a', head: null, reason: state.reason };
  }
  return { action: 'snapshot', verdict: 'clean', head: state.head, reason: null };
}

/**
 * Verify: compare the current HEAD against the baseline and classify the
 * window. exit 0 = clean/allowed/n/a (route continues); exit 1 = violation
 * (the caller remediates before continuing).
 */
function verify(base, allowCommit, cwd) {
  if (base === N_A) {
    return { action: 'verify', verdict: 'n/a', base: null, head: null, reason: 'base-unavailable', commits: [], evidence_error: null };
  }
  const state = repoState(cwd);
  if (!state.repo || !state.head) {
    return { action: 'verify', verdict: 'n/a', base, head: null, reason: state.reason, commits: [], evidence_error: null };
  }
  if (state.head === base) {
    return { action: 'verify', verdict: 'clean', base, head: state.head, reason: null, commits: [], evidence_error: null };
  }
  if (allowCommit) {
    return { action: 'verify', verdict: 'allowed', base, head: state.head, reason: null, commits: [], evidence_error: null };
  }
  const evidence = collectCommits(base, state.head, cwd);
  return {
    action: 'verify',
    verdict: 'violation',
    base,
    head: state.head,
    reason: null,
    commits: evidence.commits,
    evidence_error: evidence.error,
  };
}

function usage() {
  return [
    'Usage:',
    '  node sai/tools/no-commit-guard.js snapshot [--json] [--cwd <dir>]',
    '  node sai/tools/no-commit-guard.js verify --base <sha|n/a> [--allow-commit] [--json] [--cwd <dir>]',
    '',
    '  snapshot                  Resolve HEAD and report it as the dispatch-window',
    '                            baseline (`guard_base`). Verdict clean or n/a.',
    '',
    '  verify                    Compare current HEAD against the --base baseline.',
    '                            Verdict clean (unchanged), allowed (moved with',
    '                            --allow-commit), violation (moved without it),',
    '                            or n/a (no check possible).',
    '',
    '  --base <sha|n/a>          Baseline captured by snapshot, or the literal n/a.',
    '  --allow-commit            Lax authorization: any HEAD movement passes.',
    '  --json                    Emit the report as JSON on stdout.',
    '  --cwd <dir>               Project root to check (default: cwd).',
    '',
    'Exit codes: 0 = clean, allowed, or n/a; 1 = violation; 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], json: false, cwd: null, base: null, allowCommit: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--allow-commit') opts.allowCommit = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (payload.verdict === 'violation') {
    const lines = [
      `violation: HEAD moved from ${payload.base} to ${payload.head} during the dispatch window.`,
    ];
    if (payload.commits.length === 0) {
      lines.push(payload.evidence_error
        ? `0 commits reported (evidence unavailable: ${payload.evidence_error}).`
        : '0 commits reported.');
    } else {
      lines.push(`${payload.commits.length} commit(s) since the baseline:`);
      for (const commit of payload.commits) lines.push(`${commit.sha} ${commit.subject}`);
    }
    return lines.join('\n');
  }
  if (payload.verdict === 'allowed') {
    return `allowed: HEAD moved to ${payload.head} with allow_commit active.`;
  }
  if (payload.verdict === 'n/a') {
    return `n/a (${payload.reason}): no check possible; no auto-remediation, log one line and continue.`;
  }
  return payload.action === 'snapshot'
    ? `clean: snapshot captured at ${payload.head}.`
    : `clean: HEAD unchanged since ${payload.base}.`;
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
  if (opts.command !== 'snapshot' && opts.command !== 'verify') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.positional.length > 0) {
    process.stderr.write(`${opts.command} takes no positional arguments\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'snapshot' && (opts.base !== null || opts.allowCommit)) {
    process.stderr.write(`snapshot accepts neither --base nor --allow-commit\n${usage()}\n`);
    return 2;
  }
  if (opts.command === 'verify') {
    if (opts.base === null || opts.base === undefined) {
      process.stderr.write(`verify requires --base <sha|n/a>\n${usage()}\n`);
      return 2;
    }
    if (opts.base !== N_A && !SHA_RE.test(opts.base)) {
      process.stderr.write(`--base must be a git SHA or the literal n/a: ${opts.base}\n${usage()}\n`);
      return 2;
    }
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    const payload = opts.command === 'snapshot'
      ? snapshot(cwd)
      : verify(opts.base, opts.allowCommit, cwd);
    render(payload, opts.json);
    return payload.verdict === 'violation' ? 1 : 0;
  } catch (err) {
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

module.exports = { main, snapshot, verify, repoState, collectCommits, usage, N_A, SHA_RE };
