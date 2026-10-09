#!/usr/bin/env node

'use strict';

/**
 * worker-report-validator — deterministic validator for closed worker report payloads.
 *
 * Validates closed payload shapes that a coordinator receives from a worker:
 * terminal statuses (completed, needs_input, failed, cancelled), design notices,
 * progress events, and phase-defined nonterminal extensions (e.g., conflict_detected).
 *
 * Worker payloads carry no time field. The validator checks closed-shape field
 * presence and types, ignores unknown fields with no explicit legacy handling,
 * and rejects malformed payloads without repair or inference.
 *
 * The verdict is timeless. The `validate` CLI response carries received_at (CLI
 * reception time in YYYY-MM-DDTHH:MM:SS±HH:MM form, local wall-clock with numeric
 * offset, never Z) as its first JSON key, and as a text suffix on valid results.
 * The time never alters the validation decision. Zone handling lives in this tool; the
 * coordinator never calls wall-clock time and forwards the verdict verbatim.
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
 * Received-at wire form: YYYY-MM-DDTHH:MM:SS±HH:MM
 * Local wall-clock time with numeric offset (never Z). This pattern describes
 * the response-envelope `received_at` only; it is never a payload field.
 */
const RECEIVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

/** Usage error / tooling failure. Carries the exit code the caller sees. */
class ToolError extends Error {
  constructor(message, code = 2) {
    super(message);
    this.code = code;
  }
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Generate the CLI reception timestamp (`received_at`), the single clock of both CLIs.
 * Local wall-clock time with its numeric UTC offset, colon-separated, never Z.
 * Reception time substitutes emission time; the small transport delta is
 * accepted as a duration proxy. Time is observation, not claim.
 */
function generateReceivedAt(now = new Date()) {
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  const seconds = pad2(now.getSeconds());
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offHours = pad2(Math.floor(abs / 60));
  const offMinutes = pad2(abs % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offHours}:${offMinutes}`;
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

/**
 * Validate a terminal status payload.
 * Required fields: status, summary, changed_files. No time field is required;
 * unknown fields are ignored with no explicit legacy handling.
 * Additional validation based on status value.
 *
 * needs_input accepts two forms (dual validation, merge batch pilot):
 * - singular (backward compatible): question + options, no `questions` field.
 * - batch v1: `questions` present means batch; each item carries a stable `id`
 *   plus its own closed question + options. Only closed questions are allowed
 *   in a batch; open input stays in its own singular round.
 */
function validateTerminal(payload) {
  const errors = [];

  if (!('status' in payload)) {
    errors.push('status is missing');
  } else if (!VALID_STATUSES.includes(payload.status)) {
    errors.push(`status must be one of [${VALID_STATUSES.join(', ')}], got "${payload.status}"`);
  }

  validateStringField(payload, 'summary', errors);
  validateStringArray(payload, 'changed_files', errors);

  const { status } = payload;

  // needs_input requires either the singular question/options pair (when
  // `questions` is absent) or the batch v1 `questions` array (when present).
  if (status === 'needs_input') {
    if ('questions' in payload) {
      if (!Array.isArray(payload.questions)) {
        errors.push(`questions must be an array, got ${typeof payload.questions}`);
      } else if (payload.questions.length === 0) {
        errors.push('questions must be a non-empty array');
      } else {
        const seenIds = new Set();
        payload.questions.forEach((item, index) => {
          const where = `questions[${index}]`;
          if (typeof item !== 'object' || item === null) {
            errors.push(`${where} must be an object`);
            return;
          }
          if (!('id' in item) || typeof item.id !== 'string' || item.id.length === 0) {
            errors.push(`${where}.id is missing (stable non-empty string id required)`);
          } else if (seenIds.has(item.id)) {
            errors.push(`${where}.id is duplicated ("${item.id}")`);
          } else {
            seenIds.add(item.id);
          }
          if (!('question' in item) || typeof item.question !== 'string') {
            errors.push(`${where}.question is missing`);
          }
          if (!('options' in item)) {
            errors.push(`${where}.options is missing`);
          } else if (!Array.isArray(item.options)) {
            errors.push(`${where}.options must be an array, got ${typeof item.options}`);
          } else if (item.options.length === 0) {
            errors.push(`${where}.options must be a non-empty array (batch v1 carries closed questions only)`);
          } else {
            for (const opt of item.options) {
              const optionError = validateOptionObject(opt);
              if (optionError) {
                errors.push(`${where}.${optionError}`);
                break;
              }
            }
          }
        });
      }
    } else {
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
 * Required fields: event: "notice", message, changed_files. No time field.
 */
function validateNotice(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'notice') {
    errors.push(`event must be "notice" for a notice payload, got "${payload.event}"`);
  }

  validateStringField(payload, 'message', errors);
  validateStringArray(payload, 'changed_files', errors);

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

  return errors;
}

/**
 * Validate a conflict_detected extension payload.
 * Required fields: event: "conflict_detected", summary, changed_files,
 * affected_files, continuation_state. No time field.
 */
function validateConflictDetected(payload) {
  const errors = [];

  if (!('event' in payload)) {
    errors.push('event is missing');
  } else if (payload.event !== 'conflict_detected') {
    errors.push(`event must be "conflict_detected" for a conflict extension, got "${payload.event}"`);
  }

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
    return ['payload must be a mapping (JSON object or YAML)'];
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
function validateText(text, kind) {
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

  const errors = validatePayload(payload, kind);
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

async function commandValidate(kind) {
  const stdinData = await readStdin();
  return validateText(stdinData, kind);
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
    'The JSON response carries received_at (CLI reception time) as its first key.',
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
  const validKinds = ['terminal', 'notice', 'progress', 'conflict_detected'];
  if (!validKinds.includes(kind)) {
    const problem = kind === null
      ? 'validate requires --kind with one of: terminal, notice, progress, conflict_detected'
      : `invalid --kind value: ${kind}`;
    process.stderr.write(`${problem}\n${usage()}\n`);
    return 2;
  }

  try {
    const receivedAt = generateReceivedAt();
    const verdict = await commandValidate(kind);
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
  parsePayloadText,
  validatePayload,
  validateTerminal,
  validateNotice,
  validateProgress,
  validateConflictDetected,
  generateReceivedAt,
  usage,
  VALID_STATUSES,
  VALID_FAILURE_CLASSES,
  VALID_EVENTS,
  VALID_CONTINUATION_STATES,
  RECEIVED_AT_PATTERN,
};
