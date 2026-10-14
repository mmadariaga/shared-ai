'use strict';

// Read-only reader for the committed project settings file. It runs from the
// installed copy, so it uses only Node built-ins. No function here writes.
const fs = require('node:fs');
const path = require('node:path');

const SETTINGS_FILE = path.join('.sai', 'settings.jsonc');
const LEGACY_FILE = '.to-backlog.json';
const BACKLOG_FIELDS = ['provider', 'repository', 'project', 'organization'];
const nonEmptyString = value => (typeof value === 'string' && value.trim() ? null : 'must be a nonempty string');

// The setting id catalogue: the single source of known ids and their validation.
const CATALOGUE = Object.fromEntries(BACKLOG_FIELDS.map(field => [`backlog.${field}`, {
  validate: field === 'provider'
    ? (value, { providerIds }) => nonEmptyString(value) || (providerIds && !providerIds.includes(value) ? `must be one of ${providerIds.join(', ')}` : null)
    : nonEmptyString,
}]));

// Replace comments with spaces and drop trailing commas, leaving string
// contents and every character position untouched, then parse as JSON.
function parseJsonc(text) {
  const out = [];
  let comma = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      let end = i + 1;
      while (end < text.length && text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
      out.push(text.slice(i, end + 1));
      comma = -1;
      i = end;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') { out.push(' '); i += 1; }
      i -= 1;
    } else if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) throw new Error('Unterminated block comment');
      for (; i < end + 2; i += 1) out.push(/[\r\n]/.test(text[i]) ? text[i] : ' ');
      i -= 1;
    } else {
      if (ch === '}' || ch === ']') { if (comma !== -1) out[comma] = ' '; }
      if (!/\s/.test(ch)) comma = ch === ',' ? out.length : -1;
      out.push(ch);
    }
  }
  return JSON.parse(out.join(''));
}

function readFile(file) {
  try { return { exists: true, text: fs.readFileSync(file, 'utf8') }; }
  catch (error) { return error.code === 'ENOENT' ? { exists: false } : { exists: true, error: error.message }; }
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, item]) => {
    const id = prefix ? `${prefix}.${key}` : key;
    return isObject(item) && !CATALOGUE[id] ? flatten(item, id) : [[id, item]];
  });
}

// E5/E6: an unknown id or an invalid value drops only that key, with a warning.
function validate(parsed, label, providerIds) {
  const values = {};
  const warnings = [];
  if (!isObject(parsed)) return { values, warnings: [`${label} must contain a JSON object; every setting asks its normal question.`] };
  for (const [id, value] of flatten(parsed)) {
    if (!CATALOGUE[id]) { warnings.push(`Unknown setting id ${id} in ${label} is ignored.`); continue; }
    if (value === 'ask') continue;
    const problem = CATALOGUE[id].validate(value, { providerIds });
    if (problem) warnings.push(`Setting ${id} in ${label} ${problem}; its question stays normal.`);
    else values[id] = value;
  }
  return { values, warnings };
}

function load(file, label, parse) {
  const read = readFile(file);
  if (read.error) return { warnings: [`Cannot read ${label}: ${read.error}; every setting asks its normal question.`] };
  try { return { parsed: parse(read.text) }; }
  catch (error) { return { warnings: [`Cannot parse ${label}: ${error.message}; every setting asks its normal question.`] }; }
}

/** Read every catalogue value: { values: {id: value}, source: setting|legacy|absent, warnings }. */
function readSettings({ cwd = process.cwd(), providerIds } = {}) {
  const legacyFile = path.join(cwd, LEGACY_FILE);
  if (readFile(path.join(cwd, SETTINGS_FILE)).exists) {
    const loaded = load(path.join(cwd, SETTINGS_FILE), SETTINGS_FILE, parseJsonc);
    const checked = loaded.parsed === undefined ? { values: {}, warnings: loaded.warnings } : validate(loaded.parsed, SETTINGS_FILE, providerIds);
    const warnings = [...(fs.existsSync(legacyFile) ? [`${LEGACY_FILE} is ignored because ${SETTINGS_FILE} exists.`] : []), ...checked.warnings];
    return { values: checked.values, source: Object.keys(checked.values).length ? 'setting' : 'absent', warnings };
  }
  if (!fs.existsSync(legacyFile)) return { values: {}, source: 'absent', warnings: [] };
  const loaded = load(legacyFile, LEGACY_FILE, JSON.parse);
  const checked = loaded.parsed === undefined ? { values: {}, warnings: loaded.warnings } : validate(isObject(loaded.parsed) ? { backlog: loaded.parsed } : loaded.parsed, LEGACY_FILE, providerIds);
  return {
    values: checked.values,
    source: Object.keys(checked.values).length ? 'legacy' : 'absent',
    warnings: [`${LEGACY_FILE} is deprecated; move its fields under "backlog" in ${SETTINGS_FILE}.`, ...checked.warnings],
  };
}

/** One setting: { value, source, warnings }. */
function get(id, options) {
  const { values, source, warnings } = readSettings(options);
  const value = Object.hasOwn(values, id) ? values[id] : null;
  return { value, source: value === null ? 'absent' : source, warnings };
}

/** The destination fields of `backlog.*`, shaped as the to-backlog `config` input. */
function readBacklog(options) {
  const { values, source, warnings } = readSettings(options);
  const config = {};
  for (const field of BACKLOG_FIELDS) if (Object.hasOwn(values, `backlog.${field}`)) config[field] = values[`backlog.${field}`];
  return { config, source, warnings };
}

const notice = (field, value) => `Project setting backlog.${field}: ${value}`;

/**
 * E4: one line per configured field whose value the destination result took from
 * the settings. An explicit field wins; `addressProvider` is the provider that an
 * explicit repository address selected, which also outranks the setting.
 */
function notices(config, explicit, result, addressProvider) {
  const given = explicit || {};
  return Object.entries(config).filter(([field, value]) => {
    if (given[field] !== undefined) return false;
    if (field === 'provider') return !addressProvider && result.status !== 'unsupported' && result.provider === value;
    return result.status === 'resolved' && result[field] !== undefined;
  }).map(([field, value]) => notice(field, value));
}

/** Attach warnings and notices to a tool result; empty lists leave it unchanged. */
function report(result, { warnings = [], notices: lines = [] } = {}) {
  return { ...result, ...(warnings.length ? { warnings } : {}), ...(lines.length ? { notices: lines } : {}) };
}

function main(argv) {
  try {
    const [command, id, ...rest] = argv;
    const options = {};
    for (let i = 0; i < rest.length; i += 1) {
      if (rest[i] === '--json') continue;
      if (rest[i] === '--cwd' && rest[i + 1]) options.cwd = rest[i += 1];
      else if (rest[i] === '--providers' && rest[i + 1]) options.providerIds = rest[i += 1].split(',');
      else throw new Error(`Unknown argument: ${rest[i]}`);
    }
    if (command !== 'get' || !CATALOGUE[id]) throw new Error(`Usage: node project-settings.js get <${Object.keys(CATALOGUE).join('|')}> [--json] [--cwd <root>] [--providers <id,id>]`);
    process.stdout.write(`${JSON.stringify(get(id, options))}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: 'error', message: error.message })}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { CATALOGUE, SETTINGS_FILE, parseJsonc, readSettings, get, readBacklog, notices, notice, report, main };
