#!/usr/bin/env node

'use strict';

/**
 * prereqs — deterministic engine behind the OpenSpec prerequisite preflight.
 *
 * The three preconditions every openspec-dependent sai-* command checks before
 * it touches anything are mechanical: a binary on PATH, a directory on disk,
 * and one regex over one file. They are decided here by code so no consumer
 * re-derives them from prose.
 *
 * The checks run in order and the first failure decides the verdict:
 *   1 cli     the `openspec` binary answers `openspec --version`.
 *   2 dir     `openspec/` exists as a directory at the project root.
 *   3 schema  `openspec/config.yaml` has a line matching
 *             /^schema:\s*sai-workflow\s*$/m.
 *
 * The remediation text a user sees is owned by the caller — this tool reports
 * WHICH check failed and what it observed, never how to phrase the fix.
 *
 * Sub-commands:
 *   check                      Evaluate the three preconditions and report the
 *                              verdict.
 *
 * Usage:
 *   node sai/tools/prereqs.js check [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = every check passed (`verdict: pass`); 1 = a check failed, so
 * the caller halts (`verdict: halt`) and nothing was read beyond the checks;
 * 2 = usage error or IO failure.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCHEMA_LINE = /^schema:\s*sai-workflow\s*$/m;

/** Ordered check ids. The first failing one decides the verdict. */
const CHECKS = ['cli', 'dir', 'schema'];

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/**
 * On Windows an npm-installed CLI is a `.cmd` shim, which `spawnSync` cannot
 * execute without a shell — a direct spawn would report a perfectly installed
 * `openspec` as missing and halt every command. The arguments are fixed
 * literals, so the shell hop introduces no quoting hazard.
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

function pathExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    return false;
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * `openspec --version` is the verification command the policy names, so its
 * outcome — not the mere presence of a file somewhere on PATH — is the check.
 */
function checkCli(cwd) {
  const result = run('openspec', ['--version'], cwd);
  if (!result.available) {
    return { id: 'cli', passed: false, reason: 'openspec-cli-missing', message: 'the `openspec` binary is not available on PATH.' };
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim().split('\n').pop() || `exit ${result.status}`;
    return {
      id: 'cli',
      passed: false,
      reason: 'openspec-cli-missing',
      message: `\`openspec --version\` failed: ${detail}`,
    };
  }
  return { id: 'cli', passed: true, version: result.stdout.trim() };
}

function checkDir(cwd) {
  const target = path.join(cwd, 'openspec');
  if (isDirectory(target)) return { id: 'dir', passed: true, path: target };
  return {
    id: 'dir',
    passed: false,
    reason: 'openspec-dir-missing',
    message: pathExists(target)
      ? `'${target}' exists but is not a directory.`
      : `'${target}' does not exist.`,
    path: target,
  };
}

function checkSchema(cwd) {
  const target = path.join(cwd, 'openspec', 'config.yaml');
  let contents;
  try {
    contents = fs.readFileSync(target, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        id: 'schema',
        passed: false,
        reason: 'schema-not-declared',
        message: `'${target}' does not exist, so it declares no schema.`,
        path: target,
      };
    }
    throw new ToolError(`could not read ${target}: ${err.message}`);
  }
  if (SCHEMA_LINE.test(contents)) return { id: 'schema', passed: true, path: target };
  return {
    id: 'schema',
    passed: false,
    reason: 'schema-not-declared',
    message: `'${target}' has no line matching \`schema: sai-workflow\`.`,
    path: target,
  };
}

const RUNNERS = { cli: checkCli, dir: checkDir, schema: checkSchema };

/**
 * Run the checks in order and stop at the first failure: a project without
 * the CLI is not also interrogated about its config file, and the caller
 * receives exactly one failed check to remediate.
 */
function commandCheck(cwd) {
  const checks = [];
  for (const id of CHECKS) {
    const result = RUNNERS[id](cwd);
    checks.push(result);
    if (!result.passed) {
      return {
        ok: false,
        action: 'check',
        verdict: 'halt',
        failed_check: id,
        reason: result.reason,
        message: result.message,
        checks,
      };
    }
  }
  return { ok: true, action: 'check', verdict: 'pass', failed_check: null, checks };
}

function usage() {
  return [
    'Usage: node sai/tools/prereqs.js check [--json] [--cwd <dir>]',
    '',
    '  check                    Evaluate the three OpenSpec preconditions — the',
    '                           openspec binary, the openspec/ directory, and the',
    '                           schema: sai-workflow line in openspec/config.yaml —',
    '                           and report verdict pass or halt.',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Project root to check (default: cwd).',
    '',
    'Exit codes: 0 = pass; 1 = halt, a check failed; 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], json: false, cwd: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (payload.verdict === 'halt') return `halt (${payload.reason}): ${payload.message}`;
  return 'pass: openspec CLI, openspec/ directory, and schema: sai-workflow all present.';
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
  if (opts.command !== 'check') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.positional.length > 0) {
    process.stderr.write(`check takes no positional arguments\n${usage()}\n`);
    return 2;
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    const payload = commandCheck(cwd);
    render(payload, opts.json);
    return payload.verdict === 'pass' ? 0 : 1;
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

module.exports = { main, commandCheck, checkDir, checkSchema, usage, CHECKS, SCHEMA_LINE };
