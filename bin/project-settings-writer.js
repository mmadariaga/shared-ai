'use strict';

// Writer for `.sai/settings.jsonc` and, for the keys it already holds, the
// hand-created `.sai/settings.local.jsonc`. It lives in bin/ because it needs
// `jsonc-parser`, which the installed reader (sai/tools/project-settings.js)
// must not depend on. Setting ids, validation and canonical forms come from the
// reader's CATALOGUE.
const fs = require('fs');
const path = require('path');
const { CATALOGUE, SETTINGS_FILE, LOCAL_SETTINGS_FILE, isKeyword } = require('../sai/tools/project-settings.js');

let jsoncParser = null;
try {
  jsoncParser = require('jsonc-parser');
} catch {
  jsoncParser = null;
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate one value through the catalogue: { ok: true, value } with the canonical form, or { ok: false, problem }. */
function checkValue(id, value, providerIds, prProviderIds) {
  const entry = CATALOGUE[id];
  if (!entry) return { ok: false, problem: `Unknown setting id ${id}` };
  if (typeof value === 'string' && isKeyword(value, 'ask')) return { ok: true, value: 'ask' };
  const problem = entry.validate(value, { providerIds, prProviderIds });
  if (problem) return { ok: false, problem: `${id} ${problem}` };
  return { ok: true, value: entry.normalize ? entry.normalize(value) : value };
}

/** Parse settings text: { root } for a JSON object, { error } otherwise. Empty text is an empty object. */
function parseText(text) {
  if (!jsoncParser) return { error: 'jsonc-parser is not available' };
  if (text.trim() === '') return { root: {} };
  const errors = [];
  const root = jsoncParser.parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const { printParseErrorCode } = jsoncParser;
    return { error: `${printParseErrorCode(errors[0].error)} at offset ${errors[0].offset}` };
  }
  if (!isObject(root)) return { error: 'the file must contain a JSON object' };
  return { root };
}

/** Read the stored text of a settings file: { status: 'absent' } | { status: 'ok', text, root } | { status: 'unreadable', error }. */
function readStored(projectPath, settingsFile = SETTINGS_FILE) {
  const file = path.join(projectPath, settingsFile);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    return error.code === 'ENOENT' ? { status: 'absent' } : { status: 'unreadable', error: error.message };
  }
  const parsed = parseText(text);
  return parsed.error ? { status: 'unreadable', error: parsed.error } : { status: 'ok', text, root: parsed.root };
}

/** The raw stored value of a dotted id, or undefined. */
function storedValue(root, id) {
  let node = root;
  for (const key of id.split('.')) {
    if (!isObject(node) || !Object.hasOwn(node, key)) return undefined;
    node = node[key];
  }
  return node;
}

function writeAtomic(file, text) {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, text);
    fs.renameSync(temp, file);
  } catch (error) {
    try { fs.rmSync(temp, { force: true }); } catch { /* best effort */ }
    throw error;
  }
}

/** The edited text of one settings file for [id, value] pairs, or { error }. A value of undefined removes the key. */
function editText(settingsFile, stored, normalized) {
  const original = stored.status === 'ok' ? stored.text : '';
  const root = stored.status === 'ok' ? stored.root : {};
  for (const [id] of normalized) {
    let node = root;
    for (const key of id.split('.').slice(0, -1)) {
      if (!Object.hasOwn(node, key)) break;
      node = node[key];
      if (!isObject(node)) return { error: `${settingsFile} cannot be edited: ${id} sits under a key that is not an object` };
    }
  }
  const { modify, applyEdits } = jsoncParser;
  const formattingOptions = { insertSpaces: true, tabSize: 2, eol: original.includes('\r\n') ? '\r\n' : '\n' };
  let text = original.trim() === '' ? `{}${formattingOptions.eol}` : original;
  try {
    for (const [id, value] of normalized) text = applyEdits(text, modify(text, id.split('.'), value, { formattingOptions }));
  } catch (error) {
    return { error: `Cannot write ${settingsFile}: ${error.message}` };
  }
  return { text };
}

/**
 * Save { id: value } in place: a key goes to `.sai/settings.local.jsonc` when that file already holds it,
 * otherwise to `.sai/settings.jsonc`, which is created when missing. The local file is never created.
 * A value of undefined removes the key. Returns { ok: true, files } or { ok: false, error }; every edit is
 * prepared before the first write, so a refused edit leaves both files untouched. An empty change set writes nothing.
 */
function saveSettings(projectPath, changes, { providerIds, prProviderIds } = {}) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return { ok: true, changed: false };
  const normalized = [];
  for (const [id, value] of entries) {
    const checked = value === undefined && CATALOGUE[id] ? { ok: true, value } : checkValue(id, value, providerIds, prProviderIds);
    if (!checked.ok) return { ok: false, error: checked.problem };
    normalized.push([id, checked.value]);
  }
  const targets = [[SETTINGS_FILE, readStored(projectPath, SETTINGS_FILE)], [LOCAL_SETTINGS_FILE, readStored(projectPath, LOCAL_SETTINGS_FILE)]];
  for (const [settingsFile, stored] of targets) {
    if (stored.status === 'unreadable') return { ok: false, error: `${settingsFile} cannot be edited: ${stored.error}` };
  }
  const [[, base], [, local]] = targets;
  const inLocal = ([id]) => local.status === 'ok' && storedValue(local.root, id) !== undefined;
  const edits = [
    [SETTINGS_FILE, base, normalized.filter(entry => !inLocal(entry))],
    [LOCAL_SETTINGS_FILE, local, normalized.filter(inLocal)],
  ].filter(([, , pairs]) => pairs.length > 0);
  const prepared = [];
  for (const [settingsFile, stored, pairs] of edits) {
    const edited = editText(settingsFile, stored, pairs);
    if (edited.error) return { ok: false, error: edited.error };
    prepared.push([settingsFile, edited.text]);
  }
  const files = [];
  for (const [settingsFile, text] of prepared) {
    try {
      const file = path.join(projectPath, settingsFile);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      writeAtomic(file, text);
      files.push(settingsFile);
    } catch (error) {
      return { ok: false, error: `Cannot write ${settingsFile}: ${error.message}` };
    }
  }
  return { ok: true, changed: true, files };
}

module.exports = { checkValue, parseText, readStored, storedValue, saveSettings };
