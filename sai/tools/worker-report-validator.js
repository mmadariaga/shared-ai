#!/usr/bin/env node

'use strict';

/**
 * worker-report-validator — deterministic validator for closed worker report payloads.
 *
 * Validates closed payload shapes that a coordinator receives from a worker:
 * terminal statuses (completed, needs_input, failed, cancelled), design notices,
 * progress events, and phase-defined nonterminal extensions (e.g., conflict_detected).
 *
 * The validator checks closed-shape field presence and types, validates the
 * emitted_on field format (ISO-8601 with numeric offset, never Z), and rejects
 * malformed payloads without repair or inference.
 *
 * Sub-commands:
 *   validate                   Read a closed payload from stdin and validate it.
 *
 * Usage:
 *   cat payload.json | node sai/tools/worker-report-validator.js validate --kind <kind> [--json] [--cwd <dir>]
 *
 * Kinds:
 *   - terminal     Validate a terminal status payload (completed, needs_input, failed, cancelled)
 *   - notice       Validate a design notice payload
 *   - progress     Validate a progress event payload
 *   - conflict_detected  Validate a conflict_detected extension payload
 *
 * Exit codes: 0 = validation passed; 1 = validation failed, payload is malformed;
 * 2 = usage error or IO failure.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

/** Valid terminal statuses. */
const VALID_STATUSES = ['completed', 'needs_input', 'failed', 'cancelled'];

/** Valid failure classes for post-resolution failed outcomes. */
const VALID_FAILURE_CLASSES = [
  'blocking-contradiction',
  'validation-failed',
  'generation-error',
  'dispatch-failed',
  'envelope-contract-violation',
  'unclassified-worker-fault',
];

/** Valid events for nonterminal extensions. */
const VALID_EVENTS = ['notice', 'progress', 'conflict_detected'];

/** Valid continuation states for conflict_detected. */
const VALID_CONTINUATION_STATES = ['language-selection', 'strategy-analysis'];

/**
 * ISO-8601 with numeric offset pattern: YYYY-MM-DDTHH:MM:SS±HH:MM
 * Requires a numeric offset (not Z).
 */
const EMITTED_ON_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

/**
 * Validate the emitted_on field format.
 * Must be ISO-8601 with numeric offset (never Z).
 */
function validateEmittedOn(emittedOn) {
  const errors = [];
  if (typeof emittedOn !== 'string') {
    errors.push(`emitted_on must be a string, got ${typeof emittedOn}`);
  } else if (!EMITTED_ON_PATTERN.test(emittedOn)) {
    errors.push(
      `emitted_on must be ISO-8601 with numeric offset (YYYY-MM-DDTHH:MM:SS±HH:MM), got "${emittedOn}" (Z designator not allowed)`
    );
  }
  return errors;
}

/**
 * Validate that a field is present and is a string.
 */
function validateStringField(payload, fieldName, errors) {
  if (!(fieldName in payload)) {
    errors.push(`${fieldName} is missing`);
  } else if (typeof payload[fieldName] !== 'string') {
    errors.push(`${fieldName} must be a string, got ${typeof payload[fieldName]}`);
  }
}

/**
 * Validate that a field is present and is an array of strings.
 */
function validateStringArray(payload, fieldName, errors) {
  if (!(fieldName in payload)) {
    errors.push(`${fieldName} is missing`);
  } else if (!Array.isArray(payload[fieldName])) {
    errors.push(`${fieldName} must be an array, got ${typeof payload[fieldName]}`);
  } else if (!payload[fieldName].every((v) => typeof v === 'string')) {
    errors.push(`${fieldName} must be an array of strings`);
  }
}

/**
 * Validate a terminal status payload.
 * Required fields: status, emitted_on, summary, changed_files.
 * Additional validation based on status value.
 */
function validateTerminal(payload) {
  const errors = [];

  if (!('status' in payload)) {
    errors.push('status is missing');
  } else if (!VALID_STATUSES.includes(payload.status)) {
    errors.push(`status must be one of [${VALID_STATUSES.join(', ')}], got "${payload.status}"`);
  }

  errors.push(...validateEmittedOn(payload.emitted_on || null));
  validateStringField(payload, 'summary', errors);
  validateStringArray(payload, 'changed_files', errors);

  const { status } = payload;

  // needs_input requires question and options
  if (status === 'needs_input') {
    validateStringField(payload, 'question', errors);
    if (!('options' in payload)) {
      errors.push('options is missing');
    } else if (!Array.isArray(payload.options)) {
      errors.push(`options must be an array, got ${typeof payload.options}`);
    } else if (
      !payload.options.every(
        (opt) => typeof opt === 'object' && opt !== null && 'label' in opt && 'value' in opt
      )
    ) {
      errors.push('options must be an array of objects with label and value fields');
    } else if (!payload.options.every((opt) => typeof opt.label === 'string' && typeof opt.value === 'string')) {
      errors.push('each option must have string label and value');
    }
  }

  // Post-resolution failed payloads require failure_class and unrecoverable
  if (status === 'failed' && 'resolved_change_name' in payload) {
    if (!('failure_class' in payload)) {
      errors.push('failure_class is missing (required for post-resolution failed)');
    } else if (!VALID_FAILURE_CLASSES.includes(payload.failure_class)) {
      errors.push(
        `failure_class must be one of [${VALID_FAILURE_CLASSES.join(', ')}], got "${payload.failure_class}"`
      );
    }
    if (!('unrecoverable' in payload)) {
      errors.push('unrecoverable is missing (required for post-resolution failed)');
    } else if (typeof payload.unrecoverable !== 'boolean') {
      errors.push(`unrecoverable must be a boolean, got ${typeof payload.unrecoverable}`);
    }
  }

  return errors;
}

/**
 * Validate a design notice payload.
 * Required fields: event: "notice", emitted_on, message, changed_files.
 */
function validateNotice(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'notice') {
    errors.push(`event must be "notice" for a notice payload, got "${payload.event}"`);
  }

  errors.push(...validateEmittedOn(payload.emitted_on || null));
  validateStringField(payload, 'message', errors);
  validateStringArray(payload, 'changed_files', errors);

  return errors;
}

/**
 * Validate a progress event payload.
 * Required fields: event: "progress", emitted_on, step_ids, changed_files.
 */
function validateProgress(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'progress') {
    errors.push(`event must be "progress" for a progress event, got "${payload.event}"`);
  }

  errors.push(...validateEmittedOn(payload.emitted_on || null));
  validateStringArray(payload, 'step_ids', errors);
  validateStringArray(payload, 'changed_files', errors);

  return errors;
}

/**
 * Validate a conflict_detected extension payload.
 * Required fields: event: "conflict_detected", emitted_on, summary, changed_files,
 * affected_files, continuation_state.
 */
function validateConflictDetected(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'conflict_detected') {
    errors.push(`event must be "conflict_detected" for a conflict extension, got "${payload.event}"`);
  }

  errors.push(...validateEmittedOn(payload.emitted_on || null));
  validateStringField(payload, 'summary', errors);
  validateStringArray(payload, 'changed_files', errors);
  validateStringArray(payload, 'affected_files', errors);

  if (!('continuation_state' in payload)) {
    errors.push('continuation_state is missing');
  } else if (!VALID_CONTINUATION_STATES.includes(payload.continuation_state)) {
    errors.push(
      `continuation_state must be one of [${VALID_CONTINUATION_STATES.join(', ')}], got "${payload.continuation_state}"`
    );
  }

  return errors;
}

/**
 * Dispatch to the appropriate validator based on kind.
 */
function validatePayload(payload, kind) {
  if (!payload || typeof payload !== 'object') {
    return ['payload must be a JSON object'];
  }

  switch (kind) {
    case 'terminal':
      return validateTerminal(payload);
    case 'notice':
      return validateNotice(payload);
    case 'progress':
      return validateProgress(payload);
    case 'conflict_detected':
      return validateConflictDetected(payload);
    default:
      return [`unknown payload kind: ${kind}`];
  }
}

/**
 * Read stdin synchronously (up to a reasonable limit).
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    const stdin = process.stdin;
    stdin.setEncoding('utf8');
    stdin.on('readable', () => {
      let chunk;
      while ((chunk = stdin.read()) !== null) {
        data += chunk;
      }
    });
    stdin.on('end', () => resolve(data));
    stdin.on('error', reject);
  });
}

async function commandValidate(kind) {
  const stdinData = await readStdin();
  let payload;

  try {
    payload = JSON.parse(stdinData);
  } catch (err) {
    return {
      ok: false,
      action: 'validate',
      kind,
      errors: [`invalid JSON on stdin: ${err.message}`],
    };
  }

  const errors = validatePayload(payload, kind);
  return {
    ok: errors.length === 0,
    action: 'validate',
    kind,
    errors,
  };
}

function usage() {
  return [
    'Usage: cat payload.json | node sai/tools/worker-report-validator.js validate --kind <kind> [--json] [--cwd <dir>]',
    '',
    '  validate                 Read a closed payload from stdin and validate it.',
    '',
    '  --kind <kind>            Mandatory: the payload kind to validate.',
    '                           One of: terminal, notice, progress, conflict_detected.',
    '                           Omitting the flag or passing an invalid kind is a usage',
    '                           error (exit 2).',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Working directory (for symmetry with other tools; not',
    '                           currently used by the validator).',
    '',
    'Exit codes: 0 = ok; 1 = validation failed; 2 = usage or IO error.',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], json: false, cwd: null, kind: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--kind') opts.kind = argv[++i];
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--')) return { error: `unknown flag: ${arg}` };
    else if (opts.command === null) opts.command = arg;
    else opts.positional.push(arg);
  }
  return { opts };
}

function renderText(payload) {
  if (!payload.ok) {
    return `invalid (${payload.kind}): ${payload.errors.join('; ')}`;
  }
  return `valid (${payload.kind})`;
}

function render(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderText(payload)}\n`);
}

async function main(argv) {
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
  if (opts.command !== 'validate') {
    process.stderr.write(`unknown sub-command: ${opts.command}\n${usage()}\n`);
    return 2;
  }
  if (opts.positional.length > 0) {
    process.stderr.write(`validate takes no positional arguments\n${usage()}\n`);
    return 2;
  }

  // The kind is mandatory: missing or invalid value is a usage error (exit 2).
  const kind = opts.kind;
  const validKinds = ['terminal', 'notice', 'progress', 'conflict_detected'];
  if (!validKinds.includes(kind)) {
    const problem = kind === null
      ? 'validate requires --kind with one of: terminal, notice, progress, conflict_detected'
      : `invalid --kind value: ${kind}`;
    process.stderr.write(`${problem}\n${usage()}\n`);
    return 2;
  }

  try {
    const payload = await commandValidate(kind);
    render(payload, opts.json);
    return payload.ok ? 0 : 1;
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
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

module.exports = {
  main,
  commandValidate,
  validatePayload,
  validateTerminal,
  validateNotice,
  validateProgress,
  validateConflictDetected,
  validateEmittedOn,
  usage,
  VALID_STATUSES,
  VALID_FAILURE_CLASSES,
  VALID_EVENTS,
  VALID_CONTINUATION_STATES,
  EMITTED_ON_PATTERN,
};
