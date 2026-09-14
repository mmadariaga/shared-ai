#!/usr/bin/env node

'use strict';

/**
 * research-tools-check — deterministic research-tooling availability probe.
 *
 * Moves CodeGraph detection out of the explore prompt into code so the
 * explore prompt stays lean while detection stays testable. The caller
 * (sai/commands/explore/body.md) runs this inline in the main session
 * immediately after the prereqs pass and before Load behaviors; the
 * explore instructions print only the returned literal.
 *
 * Signals (filesystem only, never inferred MCP):
 *   - index: `.codegraph/` at the project root contains an entry other
 *     than `.gitignore`. A missing directory, an empty directory, or a
 *     sentinel-only directory counts as absent (E2).
 *   - binary: the `codegraph` binary answers `codegraph --version`
 *     (same shell/PATHEXT-resolving probe as the setup bootstrap, so a
 *     Windows `.cmd` shim is not misclassified as absent).
 *   - MCP: never inferred by this script (E3). The caller supplies it
 *     explicitly via `--mcp-present true|false`; when omitted, MCP is
 *     removed from detection and `installed` derives from the binary
 *     alone.
 *
 * States (verbatim English literals, E4):
 *   - not-installed: no install evidence (binary absent and no explicit
 *     MCP presence) — fallback notice recommending install.
 *   - no-index: install evidence present but the root `.codegraph/`
 *     Glob-equivalent returns no non-sentinel entry — fallback notice
 *     recommending `codegraph init -i`.
 *   - ready: install evidence present and a non-sentinel index entry
 *     exists — brief ready notice.
 *
 * The check is advisory and read-only: it never halts, never writes
 * files, and exits 0 whenever the check completes regardless of status.
 * Exit 2 signals usage or IO failure only.
 *
 * Usage:
 *   node sai/tools/research-tools-check.js [--json] [--cwd <dir>]
 *     [--mcp-present true|false]
 *
 * Exit codes: 0 = check completed (any status); 2 = usage or IO error.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const STATUSES = ['ready', 'no-index', 'not-installed'];

const LITERALS = {
  'not-installed':
    '> ⚠️ **CodeGraph not detected — structural research falls back to grep/glob/Read.** For faster, cheaper structural queries, install CodeGraph, a local code knowledge-graph MCP: https://github.com/colbymchenry/codegraph',
  'no-index':
    '> ⚠️ **CodeGraph available but this project has no index — structural research falls back to grep/glob/Read.** Run `codegraph init -i` at the project root to build the index and enable structural queries. (CodeGraph: https://github.com/colbymchenry/codegraph)',
  ready:
    '> **CodeGraph ready — structural research will use codegraph instead of grep/glob/Read.**',
};

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
 * binary as missing. The arguments are fixed literals, so the shell hop
 * introduces no quoting hazard.
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

/**
 * `codegraph --version` is the verification command, so its outcome — not
 * the mere presence of a file somewhere on PATH — decides binary presence.
 * A non-zero exit counts as absent: the binary cannot serve research.
 */
function checkBinary(cwd) {
  const result = run('codegraph', ['--version'], cwd);
  if (!result.available) return { present: false };
  if (result.status !== 0) return { present: false };
  return { present: true, version: result.stdout.trim() };
}

/**
 * Filesystem index probe: the `.codegraph/` directory at the project root
 * counts as present only when it holds an entry other than the `.gitignore`
 * sentinel. Missing, not-a-directory, empty, and sentinel-only all count
 * as absent (E2). Permission failures beyond ENOENT/ENOTDIR are IO errors.
 */
function checkIndex(cwd) {
  const indexPath = path.join(cwd, '.codegraph');
  let entries;
  try {
    entries = fs.readdirSync(indexPath);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      return { present: false, path: indexPath };
    }
    throw new ToolError(`could not read ${indexPath}: ${err.message}`);
  }
  const evidence = entries.filter((entry) => path.basename(entry) !== '.gitignore');
  return { present: evidence.length > 0, path: indexPath };
}

/**
 * Pure derivation: given gathered inputs, return the advisory status.
 * Installed means the binary answers or the caller explicitly reports MCP
 * presence; when the caller omits `--mcp-present`, MCP is removed from
 * detection and the binary alone decides. Never infers MCP from the
 * environment.
 */
function classify({ indexPresent, binaryPresent, mcpPresent }) {
  const installed = mcpPresent === true ? true : binaryPresent;
  if (!installed) return 'not-installed';
  if (!indexPresent) return 'no-index';
  return 'ready';
}

function usage() {
  return [
    'Usage: node sai/tools/research-tools-check.js [--json] [--cwd <dir>] [--mcp-present true|false]',
    '',
    '  Probe CodeGraph research-tooling availability and report the advisory',
    '  status plus its verbatim English notice literal.',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Project root to check (default: cwd).',
    '  --mcp-present true|false Explicit caller-observed CodeGraph MCP tool',
    '                           presence. Omitted means MCP is removed from',
    '                           detection; the script never infers it.',
    '',
    'Exit codes: 0 = check completed (any status); 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { json: false, cwd: null, mcpPresent: null, help: false, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--mcp-present') {
      const value = argv[++i];
      if (value !== 'true' && value !== 'false') {
        return { error: `invalid --mcp-present value: ${value} (expected true or false)` };
      }
      opts.mcpPresent = value === 'true';
    } else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
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
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (opts.positional.length > 0) {
    process.stderr.write(`unexpected positional argument: ${opts.positional[0]}\n${usage()}\n`);
    return 2;
  }
  if (opts.cwd === undefined) {
    process.stderr.write(`missing value for --cwd\n${usage()}\n`);
    return 2;
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  let binary;
  let index;
  try {
    binary = checkBinary(cwd);
    index = checkIndex(cwd);
  } catch (err) {
    if (err instanceof ToolError) {
      process.stderr.write(`${err.message}\n`);
      return err.code;
    }
    process.stderr.write(`${err.message}\n`);
    return 2;
  }

  const status = classify({
    indexPresent: index.present,
    binaryPresent: binary.present,
    mcpPresent: opts.mcpPresent,
  });
  const literal = LITERALS[status];

  const payload = {
    ok: true,
    action: 'check',
    status,
    literal,
    indexPresent: index.present,
    binaryPresent: binary.present,
    mcpPresent: opts.mcpPresent,
    cwd,
    indexPath: index.path,
  };

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(`${literal}\n`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, parseArgs, usage, classify, checkBinary, checkIndex, LITERALS, STATUSES };
