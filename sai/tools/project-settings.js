'use strict';

// Read-only reader for the committed project settings file. It runs from the
// installed copy, so it uses only Node built-ins. No function here writes.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Keep the repo-relative display path stable across platforms. `path.join`
// normalizes it when resolving the actual filesystem path below.
const SETTINGS_FILE = '.sai/settings.jsonc';
const BACKLOG_FIELDS = ['provider', 'repository', 'project', 'organization'];
// The code host of `/to-pr`: its own keys, because the backlog provider and the code host can differ.
const PR_FIELDS = ['provider', 'repository', 'organization', 'project'];
const nonEmptyString = value => (typeof value === 'string' && value.trim() ? null : 'must be a nonempty string');

const isKeyword = (value, keyword) => value.trim().toLowerCase() === keyword;
// Language values are free strings; the two literals reach the gates in canonical form.
const languageName = value => (isKeyword(value, 'english') ? 'English' : isKeyword(value, 'none') ? 'None' : value.trim());

// The setting id catalogue: the single source of known ids and their validation.
// An entry may add `normalize`, which maps a valid value to the one the gates compare.
const CATALOGUE = {
  ...Object.fromEntries(BACKLOG_FIELDS.map(field => [`backlog.${field}`, {
    validate: field === 'provider'
      ? (value, { providerIds }) => nonEmptyString(value) || (providerIds && !providerIds.includes(value) ? `must be one of ${providerIds.join(', ')}` : null)
      : nonEmptyString,
  }])),
  ...Object.fromEntries(PR_FIELDS.map(field => [`pr.${field}`, {
    validate: field === 'provider'
      ? (value, { prProviderIds }) => nonEmptyString(value) || (prProviderIds && !prProviderIds.includes(value) ? `must be one of ${prProviderIds.join(', ')}` : null)
      : nonEmptyString,
  }])),
  'explore.readyToProposeLanguage': {
    validate: value => nonEmptyString(value) || (isKeyword(value, 'none') ? 'must name a language, not none' : null),
    normalize: languageName,
  },
  'explore.overviewLanguage': { validate: nonEmptyString, normalize: languageName },
};

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
function validate(parsed, label, ids) {
  const values = {};
  const warnings = [];
  if (!isObject(parsed)) return { values, warnings: [`${label} must contain a JSON object; every setting asks its normal question.`] };
  for (const [id, value] of flatten(parsed)) {
    if (!CATALOGUE[id]) { warnings.push(`Unknown setting id ${id} in ${label} is ignored.`); continue; }
    if (typeof value === 'string' && isKeyword(value, 'ask')) continue;
    const problem = CATALOGUE[id].validate(value, ids);
    if (problem) warnings.push(`Setting ${id} in ${label} ${problem}; its question stays normal.`);
    else values[id] = CATALOGUE[id].normalize ? CATALOGUE[id].normalize(value) : value;
  }
  return { values, warnings };
}

function load(file, label, parse) {
  const read = readFile(file);
  if (read.error) return { warnings: [`Cannot read ${label}: ${read.error}; every setting asks its normal question.`] };
  try { return { parsed: parse(read.text) }; }
  catch (error) { return { warnings: [`Cannot parse ${label}: ${error.message}; every setting asks its normal question.`] }; }
}

const readable = file => readFile(file).exists;

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  return result.error || result.status !== 0 ? null : result.stdout.trim();
}

/**
 * E9-E11: the project root that holds the settings file. The git top-level directory of the cwd;
 * the main worktree, from `git rev-parse --git-common-dir`, when a linked worktree has no file of
 * its own; the cwd outside git. A notice names a main-worktree fallback.
 */
function projectRoot(cwd = process.cwd()) {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!top) return { root: cwd, notices: [] };
  const root = path.resolve(top);
  if (readable(path.join(root, SETTINGS_FILE))) return { root, notices: [] };
  const common = git(root, ['rev-parse', '--git-common-dir']);
  const dir = common && path.resolve(root, common);
  const main = dir && path.basename(dir) === '.git' ? path.dirname(dir) : null;
  if (main && main !== root && readable(path.join(main, SETTINGS_FILE))) {
    return { root: main, notices: [`Project settings are read from the main worktree ${main}; ${root} has no ${SETTINGS_FILE}.`] };
  }
  return { root, notices: [] };
}

/**
 * Read every catalogue value: { values: {id: value}, source: setting|absent, warnings, root, notices? }.
 * `providerIds` validates `backlog.provider`, `prProviderIds` validates `pr.provider`; `locate: false` reads the cwd itself.
 */
function readSettings({ cwd = process.cwd(), providerIds, prProviderIds, locate = true } = {}) {
  const { root, notices } = locate ? projectRoot(cwd) : { root: cwd, notices: [] };
  const note = notices.length ? { notices } : {};
  const file = path.join(root, SETTINGS_FILE);
  if (!readable(file)) return { values: {}, source: 'absent', warnings: [], root, ...note };
  const loaded = load(file, SETTINGS_FILE, parseJsonc);
  const checked = loaded.parsed === undefined ? { values: {}, warnings: loaded.warnings } : validate(loaded.parsed, SETTINGS_FILE, { providerIds, prProviderIds });
  return { values: checked.values, source: Object.keys(checked.values).length ? 'setting' : 'absent', warnings: checked.warnings, root, ...note };
}

/** One setting: { value, source, warnings, notices? }. */
function get(id, options) {
  const { values, source, warnings, notices = [] } = readSettings(options);
  const value = Object.hasOwn(values, id) ? values[id] : null;
  return { value, source: value === null ? 'absent' : source, warnings, ...(notices.length ? { notices } : {}) };
}

function readGroup(group, fields, options) {
  const { values, source, warnings, root, notices = [] } = readSettings(options);
  const config = {};
  for (const field of fields) if (Object.hasOwn(values, `${group}.${field}`)) config[field] = values[`${group}.${field}`];
  return { config, source, warnings, root, ...(notices.length ? { notices } : {}) };
}

/** The destination fields of `backlog.*`, shaped as the to-backlog `config` input. */
function readBacklog(options) {
  const { root, ...rest } = readGroup('backlog', BACKLOG_FIELDS, options);
  return rest;
}

/** The destination fields of `pr.*`, shaped as the to-pr `config` input; `providerIds` are the to-pr provider ids. */
function readPr({ providerIds, ...options } = {}) {
  return readGroup('pr', PR_FIELDS, { ...options, prProviderIds: providerIds });
}

const notice = (field, value, group = 'backlog') => `Project setting ${group}.${field}: ${value}`;

/**
 * E4: one line per configured field whose value the destination result took from
 * the settings. An explicit field wins; `addressProvider` is the provider that an
 * explicit repository address selected, which also outranks the setting.
 */
function notices(config, explicit, result, addressProvider, group = 'backlog') {
  const given = explicit || {};
  return Object.entries(config).filter(([field, value]) => {
    if (given[field] !== undefined) return false;
    if (field === 'provider') return !addressProvider && result.status !== 'unsupported' && result.provider === value;
    return result.status === 'resolved' && result[field] !== undefined;
  }).map(([field, value]) => notice(field, value, group));
}

/**
 * One line per configured field that an explicit value outranked with a different value.
 * `addressProvider` is the provider that an explicit repository address selected.
 */
function overrides(config, explicit, addressProvider, group = 'backlog') {
  const given = explicit || {};
  return Object.entries(config).flatMap(([field, value]) => {
    if (given[field] !== undefined) return given[field] === value ? [] : [`${notice(field, value, group)} is overridden by the explicit ${field} ${given[field]}`];
    if (field === 'provider' && addressProvider && addressProvider !== value) return [`${notice(field, value, group)} is overridden by the explicit repository address, which selects ${addressProvider}`];
    return [];
  });
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
      else if (rest[i] === '--pr-providers' && rest[i + 1]) options.prProviderIds = rest[i += 1].split(',');
      else throw new Error(`Unknown argument: ${rest[i]}`);
    }
    if (command !== 'get' || !CATALOGUE[id]) throw new Error(`Usage: node project-settings.js get <${Object.keys(CATALOGUE).join('|')}> [--json] [--cwd <root>] [--providers <id,id>] [--pr-providers <id,id>]`);
    process.stdout.write(`${JSON.stringify(get(id, options))}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: 'error', message: error.message })}\n`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { CATALOGUE, SETTINGS_FILE, isKeyword, parseJsonc, projectRoot, readSettings, get, readBacklog, readPr, notices, overrides, notice, report, main };
