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
 *                              Verify a private reference and validate the same bytes.
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
const auditFields = (...keys) => ({
  report_path: { type: STRING, required: ['completed'] },
  counts: { type: counts(...keys), required: ['completed'] },
});
const COMMAND_FIELDS = Object.freeze({
  spec: PLAN_FIELDS,
  design: PLAN_FIELDS,
  implement: {
    test_command: { type: STRING, required: ['completed'] },
    notes: { type: STRING, required: ['completed'] },
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
  },
  'direct-build': {
    resolved_change_name: { type: STRING },
    ...FAILURE_FIELDS,
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

/**
 * Minimal closed-subset YAML reader for worker payloads (no dependency).
 * Supports block mappings, block lists (scalars or mappings), flow lists and
 * maps, block scalars (| and >), quoted and plain scalars. Anything else
 * throws a clear error.
 */
function yamlError(lineNo, message) {
  return new Error(`line ${lineNo}: ${message}`);
}

function parseFlow(src, lineNo) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i += 1; };
  const quoted = () => {
    const q = src[i];
    let out = '';
    i += 1;
    while (i < src.length) {
      const c = src[i];
      if (q === '"' && c === '\\') {
        out += c + (src[i + 1] || '');
        i += 2;
        continue;
      }
      if (c === q) {
        if (q === "'" && src[i + 1] === "'") { out += "'"; i += 2; continue; }
        i += 1;
        return q === '"' ? JSON.parse(`"${out}"`) : out;
      }
      out += c;
      i += 1;
    }
    throw yamlError(lineNo, 'unterminated quoted string');
  };
  const value = () => {
    ws();
    const c = src[i];
    if (c === '[') {
      i += 1;
      const arr = [];
      ws();
      if (src[i] === ']') { i += 1; return arr; }
      for (;;) {
        arr.push(value());
        ws();
        if (src[i] === ',') { i += 1; ws(); if (src[i] === ']') { i += 1; return arr; } continue; }
        if (src[i] === ']') { i += 1; return arr; }
        throw yamlError(lineNo, 'malformed flow list');
      }
    }
    if (c === '{') {
      i += 1;
      const obj = {};
      ws();
      if (src[i] === '}') { i += 1; return obj; }
      for (;;) {
        ws();
        let key;
        if (src[i] === '"' || src[i] === "'") key = quoted();
        else {
          const m = /^[^:,{}\[\]]+/.exec(src.slice(i));
          if (!m) throw yamlError(lineNo, 'malformed flow map key');
          key = m[0].trim();
          i += m[0].length;
        }
        ws();
        if (src[i] !== ':') throw yamlError(lineNo, 'malformed flow map: expected ":"');
        i += 1;
        obj[key] = value();
        ws();
        if (src[i] === ',') { i += 1; ws(); if (src[i] === '}') { i += 1; return obj; } continue; }
        if (src[i] === '}') { i += 1; return obj; }
        throw yamlError(lineNo, 'malformed flow map');
      }
    }
    if (c === '"' || c === "'") return quoted();
    const m = /^[^,\]}]*/.exec(src.slice(i));
    i += m[0].length;
    return plainScalar(m[0].trim());
  };
  const result = value();
  ws();
  if (i !== src.length) throw yamlError(lineNo, 'unexpected trailing text after flow value');
  return result;
}

function plainScalar(text) {
  if (text === '' || text === '~' || text === 'null') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function stripComment(text) {
  let q = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '\\' && q === '"') i += 1;
      else if (c === q) q = null;
    } else if ((c === '"' || c === "'") && (i === 0 || /[\s:\[{,-]/.test(text[i - 1]))) q = c;
    else if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trimEnd();
  }
  return text;
}

function parseScalarText(text, lineNo) {
  const t = text.trim();
  if (t[0] === '[' || t[0] === '{' || t[0] === '"' || t[0] === "'") return parseFlow(t, lineNo);
  if (/^[&*!%@`]/.test(t)) throw yamlError(lineNo, `unsupported YAML construct: ${t[0]}`);
  return plainScalar(t);
}

function parseYaml(text) {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const lines = raw.map((s, idx) => ({ s, n: idx + 1 }));
  let pos = 0;

  const indentOf = (s) => s.length - s.trimStart().length;
  const isSkippable = (s) => {
    const t = s.trim();
    return t === '' || t.startsWith('#') || t === '---';
  };
  const skip = () => { while (pos < lines.length && isSkippable(lines[pos].s)) pos += 1; };

  function blockScalar(header, parentIndent) {
    const style = header[0];
    const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
    const body = [];
    let indent = null;
    while (pos < lines.length) {
      const { s } = lines[pos];
      if (s.trim() === '') { body.push(''); pos += 1; continue; }
      const ind = indentOf(s);
      if (ind <= parentIndent) break;
      if (indent === null) indent = ind;
      if (ind < indent) break;
      body.push(s.slice(indent));
      pos += 1;
    }
    let trailing = 0;
    while (body.length && body[body.length - 1] === '') { body.pop(); trailing += 1; }
    let out = style === '|' ? body.join('\n') : body.join('\n').replace(/([^\n])\n(?=[^\n])/g, '$1 ');
    if (chomp === 'clip') out += body.length ? '\n' : '';
    else if (chomp === 'keep') out += '\n'.repeat(trailing + (body.length ? 1 : 0));
    return out;
  }

  function parseValueAfterKey(rest, indent, lineNo) {
    const r = stripComment(rest).trim();
    if (/^[|>][+-]?$/.test(r)) return blockScalar(r, indent);
    if (r === '') {
      skip();
      if (pos < lines.length) {
        const ind = indentOf(lines[pos].s);
        const t = lines[pos].s.trim();
        if (ind > indent || (ind === indent && t.startsWith('- '))) return parseNode(ind);
        if (ind === indent && t === '-') return parseNode(ind);
      }
      return null;
    }
    const v = parseScalarText(r, lineNo);
    return v;
  }

  function splitKey(t, lineNo) {
    let m;
    if (t[0] === '"' || t[0] === "'") {
      const q = t[0];
      let i = 1;
      while (i < t.length && t[i] !== q) i += t[i] === '\\' && q === '"' ? 2 : 1;
      m = [t.slice(0, i + 1), t.slice(i + 1)];
      if (!/^\s*:(\s|$)/.test(m[1])) throw yamlError(lineNo, 'expected "key: value"');
      return [parseFlow(m[0], lineNo), m[1].replace(/^\s*:/, '')];
    }
    m = /^([^\s:#][^:#]*?):(\s+(.*))?$/.exec(t);
    if (!m) throw yamlError(lineNo, `expected "key: value", got "${t}"`);
    return [m[1].trim(), m[2] || ''];
  }

  function parseMapping(indent) {
    const obj = {};
    for (;;) {
      skip();
      if (pos >= lines.length) return obj;
      const { s, n } = lines[pos];
      const ind = indentOf(s);
      if (ind < indent) return obj;
      if (ind > indent) throw yamlError(n, 'unexpected indentation');
      const t = s.trim();
      if (t.startsWith('- ') || t === '-') throw yamlError(n, 'list item where a mapping key was expected');
      const [key, rest] = splitKey(stripComment(t) === t ? t : t, n);
      pos += 1;
      if (Object.prototype.hasOwnProperty.call(obj, key)) throw yamlError(n, `duplicate key: ${key}`);
      obj[key] = parseValueAfterKey(rest, indent, n);
    }
  }

  function parseList(indent) {
    const arr = [];
    for (;;) {
      skip();
      if (pos >= lines.length) return arr;
      const { s, n } = lines[pos];
      const ind = indentOf(s);
      if (ind < indent) return arr;
      const t = s.trim();
      if (ind > indent) throw yamlError(n, 'unexpected indentation');
      if (!(t.startsWith('- ') || t === '-')) return arr;
      const rest = t === '-' ? '' : t.slice(2);
      if (rest.trim() === '') {
        pos += 1;
        skip();
        if (pos < lines.length && indentOf(lines[pos].s) > indent) arr.push(parseNode(indentOf(lines[pos].s)));
        else arr.push(null);
        continue;
      }
      const stripped = stripComment(rest);
      const isKey = !/^["'\[{]/.test(stripped) && /^[^\s:#][^:#]*:(\s|$)/.test(stripped)
        || /^(["'])(?:\\.|[^\\])*?\1\s*:(\s|$)/.test(stripped);
      if (isKey) {
        // Re-read the item as an inline mapping start at the content column.
        const col = ind + (s.slice(ind + 1).length - s.slice(ind + 1).trimStart().length) + 1;
        lines[pos] = { s: ' '.repeat(col) + rest, n };
        arr.push(parseMapping(col));
      } else {
        pos += 1;
        arr.push(parseScalarText(stripped, n));
      }
    }
  }

  function parseNode(indent) {
    skip();
    const t = lines[pos].s.trim();
    return t.startsWith('- ') || t === '-' ? parseList(indent) : parseMapping(indent);
  }

  skip();
  if (pos >= lines.length) throw new Error('empty payload');
  const root = parseNode(indentOf(lines[pos].s));
  skip();
  if (pos < lines.length) throw yamlError(lines[pos].n, 'unexpected content');
  return root;
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

/** Verify once and validate that exact buffer; never read the report again. */
function validateFile(dir, reference, kind, options = {}) {
  const { command, ...transferOptions } = options;
  let verified;
  try {
    verified = require('./transfer').verify(dir, reference, transferOptions);
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

function usage() {
  return [
    'Usage: node sai/tools/worker-report-validator.js validate --kind <kind> [--command <name>] --input-file <path> [--json] [--cwd <dir>]',
    '',
    '  validate                 Read a closed payload from the input file (or stdin) and validate it.',
    '  --input-file <path>      File holding the payload; without it the payload is read from stdin.',
    '  --report-dir <dir> --report-file <path> --report-hash <sha256>',
    '                           Instead verify a private transfer file and validate the same bytes.',
    '                           All three flags are required together; stdin is not read.',
    '                           JSON includes outcome and, only on acceptance, the parsed payload.',
    '',
    '  --kind <kind>            Mandatory: the payload kind to validate.',
    `                           One of: ${VALID_KINDS.join(', ')}.`,
    '                           Omitting the flag or passing an invalid kind is a usage',
    '                           error (exit 2).',
    '  --command <name>         The command whose role fields and `outcome` values a terminal',
    '                           report may carry; its shape is closed to them.',
    `                           One of: ${Object.keys(COMMAND_OUTCOMES).join(', ')}.`,
    '                           Mandatory for --kind terminal (usage error, exit 2, without it);',
    '                           a progress report takes none.',
    '',
    '  --json                   Emit the report as JSON on stdout.',
    '  --cwd <dir>              Working directory (for symmetry with other tools; not',
    '                           currently used by the validator).',
    '',
    'Exit codes: 0 = ok; 1 = delivery or validation failed; 2 = usage or IO error.',
    'The JSON response carries received_at (CLI reception time) as its first key.',
  ].join('\n');
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
  VALID_STATUSES,
  VALID_FAILURE_CLASSES,
  VALID_KINDS,
  COMMAND_OUTCOMES,
  COMMAND_FIELDS,
  RECEIVED_AT_PATTERN,
};
