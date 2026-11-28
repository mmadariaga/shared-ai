#!/usr/bin/env node

'use strict';

/**
 * worker-report-validator — deterministic validator for closed worker report payloads.
 *
 * Validates the closed payload shapes that a coordinator receives from a worker,
 * two kinds in all: terminal statuses (completed, needs_input, failed, cancelled)
 * and progress events. A `completed` report may carry an `outcome` that
 * distinguishes successful results; COMMAND_OUTCOMES below is the single source of
 * the values each command admits.
 *
 * Worker payloads carry no time field. The validator checks closed-shape field
 * presence and types and rejects malformed payloads without repair or inference.
 * Both kinds are closed: a key that is not part of the kind's shape (a terminal
 * report's base keys plus the role fields its command's table lists, or a progress
 * report's three keys) is rejected, and so is a key of the other kind. COMMAND_FIELDS
 * below is the single source of the role fields each command's reports carry.
 *
 * The verdict is timeless. The `validate` CLI response carries received_at (CLI
 * reception time in YYYY-MM-DDTHH:MM:SS±HH:MM form, local wall-clock with numeric
 * offset, never Z) as its first JSON key, and as a text suffix on valid results.
 * The time never alters the validation decision. Zone handling lives in received-at.js, the shared clock; the
 * coordinator never calls wall-clock time and forwards the verdict verbatim.
 *
 * Sub-commands:
 *   validate                   Read a closed payload from stdin and validate it.
 *   validate --report-dir <dir> --report-file <path> --report-hash <sha256>
 *                              Verify a private reference and validate the same bytes. A relative
 *                              --report-file resolves against --report-dir before the containment
 *                              and hash checks, which are unchanged.
 *
 * Usage:
 *   node sai/tools/worker-report-validator.js validate --kind <kind> [--command <name>] --input-file <path> [--json] [--cwd <dir>]
 *
 * A terminal report needs --command (the table that closes its shape); a progress
 * report takes none.
 *
 * Kinds:
 *   - terminal     Validate a terminal status payload (completed, needs_input, failed, cancelled)
 *   - progress     Validate a progress event payload
 *
 * Options:
 *   - --command <name>  The command whose role fields and `outcome` values a terminal report
 *                       may carry. Mandatory for --kind terminal.
 *
 * Exit codes: 0 = validation passed; 1 = delivery or payload validation failed;
 * 2 = usage error or IO failure.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const inputReader = require('./input-reader');
const { parseYaml } = require('./yaml-subset');
const usageKit = require('./usage');

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

/** Payload kinds the validator admits. */
const VALID_KINDS = ['terminal', 'progress'];

/**
 * The `outcome` values a `completed` report may carry, per command: the single
 * source of the table. A command that lists no value admits no `outcome`.
 */
const COMMAND_OUTCOMES = Object.freeze({
  spec: [],
  design: [],
  implement: [],
  review: ['no-changes'],
  security: [],
  performance: [],
  accessibility: [],
  commit: [],
  archive: [],
  backfill: [],
  merge: [],
  'direct-build': [],
  'adversarial-expert-review': [],
});

/** Keys every terminal report may carry, whatever its command. */
const TERMINAL_BASE_KEYS = ['status', 'summary', 'changed_files', 'outcome', 'question', 'options'];

/** Keys of a progress report. */
const PROGRESS_KEYS = ['event', 'step_ids', 'changed_files'];

const STRING = { kind: 'string' };
const STRING_LIST = { kind: 'string[]' };
const OBJECT_LIST = { kind: 'object[]' };
const BOOLEAN = { kind: 'boolean' };
const counts = (...keys) => ({ kind: 'counts', keys });
const records = (...keys) => ({ kind: 'records', keys });
const oneOf = (...values) => ({ kind: 'enum', values });
const PLAN_TESTS = { kind: 'plan-tests' };
const FINDINGS = { kind: 'findings' };

/** The closed severity set and finding keys of the adversarial expert review report. */
const FINDING_SEVERITIES = Object.freeze(['High', 'Medium', 'Low']);
const FINDING_REQUIRED_KEYS = Object.freeze(['identifier', 'severity', 'location', 'issue', 'correction']);
const FINDING_KEYS = Object.freeze([...FINDING_REQUIRED_KEYS, 'paths']);

/**
 * The role fields of each command's terminal reports: the single source of the
 * table, next to COMMAND_OUTCOMES. Each field has a type, the report statuses
 * that must carry it (`required`; `completed` means a completed report without an
 * `outcome`), and optionally the only statuses that may carry it (`only`). A key
 * that is neither a base key nor listed for the command is rejected.
 * `requiredWith` makes the field mandatory on a status when another key is present.
 * `sai/policies/worker-report-transport.md` § Role fields lists the same fields,
 * and a test keeps the two in step.
 */
const FAILURE_FIELDS = {
  failure_class: { type: oneOf(...VALID_FAILURE_CLASSES), only: ['failed'], requiredWith: { status: 'failed', key: 'resolved_change_name' } },
  unrecoverable: { type: BOOLEAN, only: ['failed'], requiredWith: { status: 'failed', key: 'resolved_change_name' } },
};
const PLAN_FIELDS = {
  step_ids: { type: STRING_LIST, required: ['completed'] },
  warnings: { type: records('spec_assertion', 'other_side', 'disagreement'), required: ['completed'] },
  notes: { type: STRING, required: ['completed'] },
};
const SPEC_FIELDS = {
  ...PLAN_FIELDS,
  research_files: { type: records('path', 'sha256'), required: ['completed'] },
};
const auditFields = (...keys) => ({
  report_path: { type: STRING, required: ['completed'] },
  counts: { type: counts(...keys), required: ['completed'] },
});
const COMMAND_FIELDS = Object.freeze({
  spec: SPEC_FIELDS,
  design: PLAN_FIELDS,
  implement: {
    test_command: { type: STRING, required: ['completed'] },
    notes: { type: STRING, required: ['completed'] },
    // The plan RED's per-step test facts and the existing tests it modified (ADR 0227a write-back).
    plan_tests: { type: PLAN_TESTS, only: ['completed'] },
    modified_tests: { type: records('path', 'reason'), only: ['completed'] },
  },
  review: {
    review_path: { type: STRING, required: ['completed'] },
    counts: { type: counts('critical', 'high', 'medium', 'low', 'questions'), required: ['completed'] },
    recommended_audits: { type: STRING, required: ['completed'] },
  },
  security: auditFields('critical', 'high', 'medium', 'low'),
  performance: auditFields('critical', 'high', 'medium', 'low', 'informational'),
  accessibility: auditFields('critical', 'high', 'medium', 'low', 'informational'),
  commit: {},
  archive: {
    resolved_change_name: { type: STRING, required: ['completed', 'needs_input'] },
    ...FAILURE_FIELDS,
  },
  backfill: {
    resolved_change_name: { type: STRING },
    draft_references: { type: records('path', 'sha256', 'destination'), only: ['completed'] },
    corrected_specs: { type: records('destination', 'content'), only: ['completed'] },
    ...FAILURE_FIELDS,
  },
  merge: {
    strategy: { type: STRING },
    decisions: { type: OBJECT_LIST },
    escalations: { type: OBJECT_LIST },
    analysis: { type: STRING },
    corrections: { type: OBJECT_LIST },
    applicability: { type: oneOf('not-applicable', 'no-collision', 'repair-required', 'escalation-required') },
    renames: { type: OBJECT_LIST },
    reference_updates: { type: OBJECT_LIST },
    recipe: { type: records('path', 'signature'), only: ['completed'] },
  },
  'direct-build': {
    resolved_change_name: { type: STRING },
    ...FAILURE_FIELDS,
  },
  'adversarial-expert-review': {
    // The closed artifact review finding list of the reviewed product, and the
    // corrected change documents of document mode, each with its hash and name.
    findings: { type: FINDINGS, required: ['completed'] },
    corrected_documents: { type: records('path', 'sha256', 'change_name'), only: ['completed'] },
  },
});

const { generateReceivedAt, RECEIVED_AT_PATTERN } = require('./received-at.js');

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
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
 * Validate a closed option object ({label: string, value: string}).
 * Returns an error string or null when valid.
 */
function validateOptionObject(opt) {
  if (typeof opt !== 'object' || opt === null || !('label' in opt) || !('value' in opt)) {
    return 'options must be an array of objects with label and value fields';
  }
  if (typeof opt.label !== 'string' || typeof opt.value !== 'string') {
    return 'each option must have string label and value';
  }
  return null;
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const describe = (value) => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/**
 * Check one value against a field type. Returns an error string or null.
 */
function checkType(name, value, type) {
  switch (type.kind) {
    case 'string':
      return typeof value === 'string' ? null : `${name} must be a string, got ${describe(value)}`;
    case 'boolean':
      return typeof value === 'boolean' ? null : `${name} must be a boolean, got ${describe(value)}`;
    case 'string[]':
      if (!Array.isArray(value)) return `${name} must be an array, got ${describe(value)}`;
      return value.every((v) => typeof v === 'string') ? null : `${name} must be an array of strings`;
    case 'object[]':
      if (!Array.isArray(value)) return `${name} must be an array, got ${describe(value)}`;
      return value.every(isRecord) ? null : `${name} must be an array of objects`;
    case 'enum':
      return type.values.includes(value)
        ? null
        : `${name} must be one of [${type.values.join(', ')}], got "${value}"`;
    case 'counts': {
      if (!isRecord(value)) return `${name} must be an object, got ${describe(value)}`;
      const keys = Object.keys(value);
      if (keys.length !== type.keys.length || !type.keys.every((k) => keys.includes(k))) {
        return `${name} must have exactly the keys [${type.keys.join(', ')}]`;
      }
      const bad = type.keys.find((k) => !Number.isInteger(value[k]) || value[k] < 0);
      return bad ? `${name}.${bad} must be a non-negative integer` : null;
    }
    case 'records': {
      if (!Array.isArray(value)) return `${name} must be an array, got ${describe(value)}`;
      for (const [index, item] of value.entries()) {
        if (!isRecord(item)) return `${name}[${index}] must be an object`;
        const keys = Object.keys(item);
        if (keys.length !== type.keys.length || !type.keys.every((k) => keys.includes(k))) {
          return `${name}[${index}] must have exactly the keys [${type.keys.join(', ')}]`;
        }
        if (!type.keys.every((k) => typeof item[k] === 'string')) return `${name}[${index}] must have string values`;
      }
      return null;
    }
    case 'plan-tests': {
      if (!Array.isArray(value)) return `${name} must be an array, got ${describe(value)}`;
      for (const [index, item] of value.entries()) {
        const at = `${name}[${index}]`;
        if (!isRecord(item)) return `${at} must be an object`;
        const extra = Object.keys(item).find((k) => !['step', 'test_command', 'tests'].includes(k));
        if (extra) return `${at} has the unknown key ${extra}`;
        if (!Number.isInteger(item.step) || item.step < 1) return `${at}.step must be a positive integer`;
        if (typeof item.test_command !== 'string' || item.test_command === '') return `${at}.test_command must be a non-empty string`;
        if (!Array.isArray(item.tests) || item.tests.length === 0) return `${at}.tests must be a non-empty array`;
        for (const [n, test] of item.tests.entries()) {
          const where = `${at}.tests[${n}]`;
          if (!isRecord(test)) return `${where} must be an object`;
          const bad = Object.keys(test).find((k) => !['path', 'name', 'regression_guard'].includes(k));
          if (bad) return `${where} has the unknown key ${bad}`;
          if (typeof test.path !== 'string' || test.path === '') return `${where}.path must be a non-empty string`;
          if (typeof test.name !== 'string' || test.name === '') return `${where}.name must be a non-empty string`;
          if ('regression_guard' in test && typeof test.regression_guard !== 'boolean') return `${where}.regression_guard must be a boolean`;
        }
      }
      return null;
    }
    case 'findings': {
      // The closed artifact review finding list: five required string fields and,
      // in mutations mode, the working-tree paths the correction changed.
      if (!Array.isArray(value)) return `${name} must be an array, got ${describe(value)}`;
      for (const [index, item] of value.entries()) {
        const at = `${name}[${index}]`;
        if (!isRecord(item)) return `${at} must be an object`;
        const extra = Object.keys(item).find((k) => !FINDING_KEYS.includes(k));
        if (extra) return `${at} has the unknown key ${extra}`;
        for (const key of FINDING_REQUIRED_KEYS) {
          if (typeof item[key] !== 'string' || item[key] === '') return `${at}.${key} must be a non-empty string`;
        }
        if (!FINDING_SEVERITIES.includes(item.severity)) {
          return `${at}.severity must be one of [${FINDING_SEVERITIES.join(', ')}], got "${item.severity}"`;
        }
        if ('paths' in item && (!Array.isArray(item.paths) || item.paths.some((p) => typeof p !== 'string' || p === ''))) {
          return `${at}.paths must be an array of non-empty strings`;
        }
      }
      return null;
    }
    default:
      return `${name} has an unknown type`;
  }
}

/**
 * Validate a terminal status payload against the closed shape of its command.
 * Base fields: status, summary, changed_files; `outcome` on a completed report;
 * `question` and `options` on a needs_input report. Every other key must be a role
 * field the command's COMMAND_FIELDS entry lists, with its type and, on the
 * statuses it names, its presence. No time field exists, and a key of the
 * progress kind (`event`) or an unlisted key is rejected without repair.
 */
function validateTerminal(payload, options = {}) {
  const errors = [];
  const { command } = options;
  const fields = command && Object.hasOwn(COMMAND_FIELDS, command) ? COMMAND_FIELDS[command] : null;
  if (!command) errors.push('a terminal report needs the command whose shape applies (--command)');
  else if (!fields) errors.push(`unknown command: ${command}`);

  if (!('status' in payload)) {
    errors.push('status is missing');
  } else if (!VALID_STATUSES.includes(payload.status)) {
    errors.push(`status must be one of [${VALID_STATUSES.join(', ')}], got "${payload.status}"`);
  }

  validateStringField(payload, 'summary', errors);
  validateStringArray(payload, 'changed_files', errors);

  const { status } = payload;

  if (status === 'needs_input') {
    validateStringField(payload, 'question', errors);
    if (!('options' in payload)) {
      errors.push('options is missing');
    } else if (!Array.isArray(payload.options)) {
      errors.push(`options must be an array, got ${typeof payload.options}`);
    } else {
      for (const opt of payload.options) {
        const optionError = validateOptionObject(opt);
        if (optionError) {
          errors.push(optionError);
          break;
        }
      }
    }
  } else {
    for (const key of ['question', 'options']) {
      if (key in payload) errors.push(`${key} is allowed only on a needs_input report`);
    }
  }

  if ('outcome' in payload) {
    const admitted = command ? COMMAND_OUTCOMES[command] || [] : [];
    if (status !== 'completed') {
      errors.push('outcome is allowed only on a completed report');
    } else if (typeof payload.outcome !== 'string') {
      errors.push(`outcome must be a string, got ${typeof payload.outcome}`);
    } else if (!command) {
      errors.push('outcome needs the command that admits it (--command)');
    } else if (!admitted.includes(payload.outcome)) {
      errors.push(admitted.length === 0
        ? `outcome is not admitted by ${command}, got "${payload.outcome}"`
        : `outcome must be one of [${admitted.join(', ')}] for ${command}, got "${payload.outcome}"`);
    }
  }

  // The reading status of `required`: a completed report that carries an outcome
  // (for example review's no-changes) is a different shape and owes no role field.
  const reading = status === 'completed' && 'outcome' in payload ? 'completed-with-outcome' : status;
  for (const key of Object.keys(payload)) {
    if (TERMINAL_BASE_KEYS.includes(key)) continue;
    if (PROGRESS_KEYS.includes(key) && !(fields && key in fields)) {
      errors.push(`${key} belongs to a progress report, not a terminal one`);
    } else if (!fields || !(key in fields)) {
      if (fields) errors.push(`${key} is not a field of a ${command} report`);
    } else if (fields[key].only && !fields[key].only.includes(status)) {
      errors.push(`${key} is allowed only on a ${fields[key].only.join(' or ')} report`);
    } else {
      const typeError = checkType(key, payload[key], fields[key].type);
      if (typeError) errors.push(typeError);
    }
  }
  for (const [key, spec] of Object.entries(fields || {})) {
    if (key in payload) continue;
    if (spec.required && spec.required.includes(reading)) {
      errors.push(`${key} is missing`);
    } else if (spec.requiredWith && status === spec.requiredWith.status && spec.requiredWith.key in payload) {
      errors.push(`${key} is missing (required for post-resolution failed)`);
    }
  }

  return errors;
}

/**
 * Validate a progress event payload.
 * Required fields: event: "progress", step_ids, changed_files. No time field.
 */
function validateProgress(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'progress') {
    errors.push(`event must be "progress" for a progress event, got "${payload.event}"`);
  }

  validateStringArray(payload, 'step_ids', errors);
  validateStringArray(payload, 'changed_files', errors);

  for (const key of Object.keys(payload)) {
    if (PROGRESS_KEYS.includes(key)) continue;
    errors.push(TERMINAL_BASE_KEYS.includes(key)
      ? `${key} belongs to a terminal report, not a progress one`
      : `${key} is not a field of a progress report`);
  }

  return errors;
}

/**
 * Dispatch to the appropriate validator based on kind.
 */
function validatePayload(payload, kind, options = {}) {
  if (!payload || typeof payload !== 'object') {
    return ['payload must be a mapping (JSON object or YAML)'];
  }

  switch (kind) {
    case 'terminal':
      return validateTerminal(payload, options);
    case 'progress':
      return validateProgress(payload);
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

function parsePayloadText(text) {
  const trimmed = text.trim();
  if (trimmed === '') return { error: 'empty payload on stdin' };
  if (trimmed[0] === '{' || trimmed[0] === '[' || trimmed[0] === '"') {
    try {
      return { payload: JSON.parse(trimmed) };
    } catch (jsonErr) {
      try {
        return { payload: parseYaml(text) };
      } catch (yamlErr) {
        return { error: `invalid payload on stdin (not JSON: ${jsonErr.message}; not YAML: ${yamlErr.message})` };
      }
    }
  }
  try {
    return { payload: parseYaml(text) };
  } catch (err) {
    return { error: `invalid YAML on stdin: ${err.message}` };
  }
}

/**
 * Pure verdict builder: turns stdin text plus a payload kind into the closed
 * validation verdict (JSON or YAML parse, validatePayload). It is pure and carries no
 * time; the `validate` CLI and `sai-state emit --progress` both consume it.
 */
function validateText(text, kind, options = {}) {
  const parsed = parsePayloadText(text);
  if (parsed.error) {
    return {
      ok: false,
      action: 'validate',
      kind,
      errors: [parsed.error],
    };
  }
  const payload = parsed.payload;

  const errors = validatePayload(payload, kind, options);
  if (errors.length !== 0) {
    return {
      ok: false,
      action: 'validate',
      kind,
      errors,
    };
  }
  return {
    ok: true,
    action: 'validate',
    kind,
    errors: [],
  };
}

async function commandValidate(kind, inputFile, options = {}) {
  const text = inputFile ? inputReader.readInputFile(inputFile) : await readStdin();
  return validateText(text, kind, options);
}

/** Verify once and validate that exact buffer; never read the report again. A relative `path` resolves against `dir`. */
function validateFile(dir, reference, kind, options = {}) {
  const { command, ...transferOptions } = options;
  let verified;
  try {
    const transfer = require('./transfer');
    // A report file written relative to the report directory resolves against it; containment and hash checks follow unchanged.
    verified = transfer.verify(dir, { ...reference, path: transfer.resolveReferencePath(dir, reference.path) }, transferOptions);
  } catch (error) {
    return { ok: false, action: 'validate', kind, outcome: 'delivery-failed', errors: [error.message] };
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(verified.bytes);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) {
      throw new Error('Report contains unsupported control characters');
    }
  } catch (error) {
    return { ok: false, action: 'validate', kind, outcome: 'report-invalid', errors: [error.message] };
  }
  const verdict = validateText(text, kind, { command });
  return { ...verdict, outcome: verdict.ok ? 'accepted' : 'report-invalid',
    ...(verdict.ok ? { payload: parsePayloadText(text).payload } : {}) };
}

const USAGE = {
  subcommands: {
    validate: {
      usage: [
        'node sai/tools/worker-report-validator.js validate --kind <terminal|progress> [--command <name>] --input-file <path> [--json] [--cwd <dir>]',
        'node sai/tools/worker-report-validator.js validate --kind <terminal|progress> [--command <name>] --report-dir <dir> --report-file <path> --report-hash <sha256> [--json]',
      ],
      notes: [
        '--kind is mandatory. --command names the command whose role fields and `outcome` values a terminal report may',
        'carry (mandatory for --kind terminal, none for a progress report).',
        `--command is one of: ${Object.keys(COMMAND_OUTCOMES).join(', ')}.`,
        'Without --input-file the payload is read from stdin. The three --report-* flags verify a private transfer file',
        'and validate the same bytes; they are required together, and a relative --report-file resolves against --report-dir.',
        'Exit codes: 0 = valid; 1 = delivery or validation failed; 2 = usage or I/O error.',
      ],
      examples: [
        'node sai/tools/worker-report-validator.js validate --kind terminal --command implement --json --report-dir /path/to/report-dir --report-file red-step-1.json --report-hash 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        'node sai/tools/worker-report-validator.js validate --kind progress --json --input-file progress.yaml',
      ],
      flags: {
        '--kind': VALID_KINDS,
        '--command': Object.keys(COMMAND_OUTCOMES),
        '--input-file': true,
        '--report-dir': true,
        '--report-file': true,
        '--report-hash': true,
        '--json': false,
        '--cwd': true,
      },
      required: ['--kind'],
      messages: {
        required: { '--kind': `validate requires --kind with one of: ${VALID_KINDS.join(', ')}` },
        invalid: { '--kind': value => `invalid --kind value: ${value}`, '--command': value => `invalid --command value: ${value}` },
      },
    },
  },
};

function usage() {
  return usageKit.render(USAGE, 'validate');
}

function parseArgs(argv) {
  const opts = { command: null, positional: [], json: false, cwd: null, kind: null, outcomeCommand: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--cwd') opts.cwd = argv[++i];
    else if (arg === '--kind') opts.kind = argv[++i];
    else if (arg === '--command') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) return { error: 'missing value for --command' };
      opts.outcomeCommand = argv[++i];
    }
    else if (arg === '--input-file') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) return { error: 'missing value for --input-file' };
      opts.inputFile = argv[++i];
    }
    else if (['--report-dir', '--report-file', '--report-hash'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) return { error: `missing value for ${arg}` };
      const key = { '--report-dir': 'reportDir', '--report-file': 'reportFile', '--report-hash': 'reportHash' }[arg];
      opts[key] = argv[++i];
    }
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
  return `valid (${payload.kind}) received_at ${payload.received_at}`;
}

function render(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderText(payload)}\n`);
}

async function main(argv) {
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
  if (!VALID_KINDS.includes(kind)) {
    const problem = kind === null
      ? `validate requires --kind with one of: ${VALID_KINDS.join(', ')}`
      : `invalid --kind value: ${kind}`;
    process.stderr.write(`${problem}\n${usage()}\n`);
    return 2;
  }
  if (opts.outcomeCommand !== null && !Object.hasOwn(COMMAND_OUTCOMES, opts.outcomeCommand)) {
    process.stderr.write(`invalid --command value: ${opts.outcomeCommand}\n${usage()}\n`);
    return 2;
  }
  if (kind === 'terminal' && opts.outcomeCommand === null) {
    process.stderr.write(`validate --kind terminal requires --command with one of: ${Object.keys(COMMAND_OUTCOMES).join(', ')}\n${usage()}\n`);
    return 2;
  }
  const verdictOptions = opts.outcomeCommand === null ? {} : { command: opts.outcomeCommand };

  try {
    const fileMode = ['reportDir', 'reportFile', 'reportHash'].some(key => opts[key] !== undefined);
    if (fileMode && ![opts.reportDir, opts.reportFile, opts.reportHash].every(Boolean)) {
      process.stderr.write('File validation requires --report-dir, --report-file, and --report-hash together\n');
      return 2;
    }
    const receivedAt = generateReceivedAt();
    const verdict = fileMode
      ? validateFile(opts.reportDir, { path: opts.reportFile, sha256: opts.reportHash }, kind, verdictOptions)
      : await commandValidate(kind, opts.inputFile, verdictOptions);
    const payload = Object.assign({ received_at: receivedAt }, verdict);
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
  validateText,
  validateFile,
  parsePayloadText,
  validatePayload,
  validateTerminal,
  validateProgress,
  generateReceivedAt,
  usage,
  USAGE,
  VALID_STATUSES,
  VALID_FAILURE_CLASSES,
  VALID_KINDS,
  COMMAND_OUTCOMES,
  COMMAND_FIELDS,
  RECEIVED_AT_PATTERN,
};
