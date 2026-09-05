#!/usr/bin/env node

'use strict';

/**
 * change-picker — deterministic engine behind the sai-* change-name pickers.
 *
 * Resolving a missing OpenSpec change name is mechanical: read the active
 * change list once, then decide by its size. Zero changes means the caller
 * halts; one change means the caller asks a yes/no confirmation; two or more
 * means the caller asks which one. `sai-status` needs the same resolution with
 * one extra bulk-view option at the head of the two-or-more branch, so that
 * branch is a flag here rather than a second copy of the logic.
 *
 * The tool resolves; the harness asks. It returns the resolved name or the
 * ordered option set and never prints a question, never assumes an answer, and
 * never carries a STOP literal — the user-facing wording is owned by
 * `change-picker.md` and `status-picker.md`, exactly as `prereqs.js` leaves its
 * remediation literals to `prereqs-check.md`.
 *
 * Sub-commands:
 *   resolve [supplied-name]    Resolve the change name, or report the option
 *                              set the caller must present.
 *
 * Usage:
 *   node sai/tools/change-picker.js resolve [supplied-name] [--bulk-option] [--json] [--cwd <dir>]
 *
 * Exit codes: 0 = a name was resolved or an option set is reported; 1 =
 * refused, there is no active change to pick and the caller halts; 2 = usage
 * error or CLI/IO failure.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/** The value returned for the bulk-view option, so it can never collide with
 * a change name: `openspec` change names are directory names. */
const BULK_VALUE = 'see-all';

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/** A refusal: no name can be resolved and nothing further happens. */
class Refusal extends Error {
  constructor(reason, message, extra = {}) {
    super(message);
    this.reason = reason;
    this.extra = extra;
  }
}

/**
 * On Windows an npm-installed CLI is a `.cmd` shim, which `spawnSync` cannot
 * execute without a shell. The arguments are fixed literals, so the shell hop
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
 * The active change list comes from `openspec list --json` and nothing else —
 * no filesystem globbing of `openspec/changes/`, no extra CLI flags. Only
 * `changes[].name` is read; every other field the CLI reports is ignored.
 */
function listChangeNames(cwd) {
  const result = run('openspec', ['list', '--json'], cwd);
  if (!result.available) throw new ToolError('the `openspec` binary is not available on PATH');
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout).trim().split('\n').pop() || `exit ${result.status}`;
    throw new ToolError(`\`openspec list --json\` failed: ${detail}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (err) {
    throw new ToolError(`\`openspec list --json\` did not emit JSON: ${err.message}`);
  }
  if (!parsed || !Array.isArray(parsed.changes)) {
    throw new ToolError('`openspec list --json` emitted no `changes` array.');
  }
  return parsed.changes
    .map(entry => (entry && typeof entry.name === 'string' ? entry.name : null))
    .filter(name => typeof name === 'string' && name.trim() !== '');
}

/**
 * Resolve in the policies' order: a supplied name wins outright, then the
 * 0/1/N branches over the active change list.
 *
 * `bulkOption` is the only difference between the two pickers: with it, the
 * two-or-more branch reports the bulk-view option first, and the caller
 * recognises the answer by its `see-all` value.
 */
function commandResolve(cwd, suppliedName, { bulkOption = false } = {}) {
  const supplied = typeof suppliedName === 'string' ? suppliedName.trim() : '';
  if (supplied !== '') {
    return {
      ok: true,
      action: 'resolve',
      outcome: 'supplied',
      resolved_name: supplied,
      candidate: null,
      bulk_option: bulkOption,
      changes: null,
      options: [],
      option_count: 0,
    };
  }

  const changes = listChangeNames(cwd);

  if (changes.length === 0) {
    throw new Refusal(
      'no-active-changes',
      '`openspec list --json` reports no active changes, so there is no name to resolve.',
      { outcome: 'none', changes, bulk_option: bulkOption },
    );
  }

  if (changes.length === 1) {
    return {
      ok: true,
      action: 'resolve',
      outcome: 'confirm',
      resolved_name: null,
      candidate: changes[0],
      bulk_option: bulkOption,
      changes,
      options: [
        { label: 'yes', value: 'yes' },
        { label: 'no', value: 'no' },
      ],
      option_count: 2,
    };
  }

  const options = changes.map(name => ({ label: name, value: name }));
  if (bulkOption) options.unshift({ label: 'See all', value: BULK_VALUE });

  return {
    ok: true,
    action: 'resolve',
    outcome: 'select',
    resolved_name: null,
    candidate: null,
    bulk_option: bulkOption,
    changes,
    options,
    option_count: options.length,
  };
}

function usage() {
  return [
    'Usage: node sai/tools/change-picker.js resolve [supplied-name] [--bulk-option] [--json] [--cwd <dir>]',
    '',
    '  resolve [supplied-name]  Resolve the OpenSpec change name. A non-empty',
    '                           supplied name wins outright (outcome supplied);',
    '                           otherwise the active change list decides: one change',
    '                           reports outcome confirm with a yes/no option set and',
    '                           the candidate name, two or more report outcome select',
    '                           with one option per change in list order.',
    '',
    '  --bulk-option            Prepend the bulk-view option (label "See all", value',
    '                           "see-all") to the two-or-more option set. Used by',
    '                           sai-status only; it is never offered on the zero- or',
    '                           one-change branches.',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Project root to resolve from (default: cwd).',
    '',
    'The caller presents the question and owns every user-facing literal; this',
    'tool never prints a question and never assumes an answer.',
    '',
    'Exit codes: 0 = resolved or option set reported; 1 = refused, no active',
    'change to pick; 2 = usage or CLI error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = {
    command: null, positional: [], json: false, bulkOption: false, cwd: null, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--bulk-option') opts.bulkOption = true;
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
  if (payload.outcome === 'supplied') return `supplied: ${payload.resolved_name}`;
  if (payload.outcome === 'confirm') return `confirm: ${payload.candidate}`;
  const lines = payload.options.map((option, index) => `${index + 1}. ${option.label}`);
  lines.unshift(`select: ${payload.option_count} option(s)`);
  return lines.join('\n');
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
  if (opts.command !== 'resolve') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.positional.length > 1) {
    process.stderr.write(`resolve takes at most one supplied change name\n${usage()}\n`);
    return 2;
  }

  const cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
  if (!isDirectory(cwd)) {
    process.stderr.write(`working directory not found: ${cwd}\n`);
    return 2;
  }

  try {
    const payload = commandResolve(cwd, opts.positional[0] || null, { bulkOption: opts.bulkOption });
    render(payload, opts.json);
    return 0;
  } catch (err) {
    if (err instanceof Refusal) {
      render({
        ok: false, action: 'resolve', refused: true, reason: err.reason, message: err.message, ...err.extra,
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

module.exports = { main, commandResolve, listChangeNames, usage, BULK_VALUE };
