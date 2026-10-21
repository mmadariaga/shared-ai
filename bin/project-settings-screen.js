'use strict';

// The `Project behavior settings` screen of the post-setup menu. It shows and edits the
// settings that the menu manages, by label and under section headers from the catalogue,
// and saves them through the writer when the user leaves the screen. A key that the
// hand-created local settings file holds shows as an override and saves to that file.
// Prompts are injected so tests drive it.
const fs = require('fs');
const path = require('path');
const { CATALOGUE, readSettings, SETTINGS_FILE, LOCAL_SETTINGS_FILE } = require('../sai/tools/project-settings.js');
const { checkValue, readStored, storedValue, saveSettings } = require('./project-settings-writer.js');
const { BACK } = require('./install-flow.js');

const SETTING_IDS = Object.freeze(['explore.readyToProposeLanguage', 'explore.overviewLanguage', 'explore.chatPublicLanguage', 'backlog.provider', 'pr.provider']);
const REGISTRIES = Object.freeze([
  ['skills', 'universal', 'to-backlog', 'providers', 'registry.json'],
  ['skills', 'universal', 'from-backlog', 'providers', 'registry.json'],
]);
const PR_REGISTRY = Object.freeze(['skills', 'universal', 'to-pr', 'providers', 'registry.json']);
const OTHER_LANGUAGE = 'Other language...';
const DONE = 'Done';
const ASK = 'ask';

/** The union of the provider ids in the to-backlog and from-backlog registries. */
function providerIdsFrom(packageRoot) {
  const ids = new Set();
  for (const parts of REGISTRIES) {
    const registry = JSON.parse(fs.readFileSync(path.join(packageRoot, ...parts), 'utf8'));
    for (const entry of registry.providers) ids.add(entry.id);
  }
  return [...ids];
}

/** The provider ids in the to-pr registry, the code hosts that `pr.provider` may name. */
function prProviderIdsFrom(packageRoot) {
  const registry = JSON.parse(fs.readFileSync(path.join(packageRoot, ...PR_REGISTRY), 'utf8'));
  return registry.providers.map(entry => entry.id);
}

// What a key with no value reads as: `ask` unless the catalogue words it otherwise.
const absentText = id => CATALOGUE[id].absent ?? ASK;

function valueChoices(id, providerIds, prProviderIds) {
  if (id === 'backlog.provider') return [ASK, ...providerIds];
  if (id === 'pr.provider') return [ASK, ...prProviderIds];
  return [absentText(id), 'English', ...(id === 'explore.overviewLanguage' ? ['none'] : []), OTHER_LANGUAGE];
}

const sectionHeader = id => `-- ${CATALOGUE[id].section} --`;

function rowLabel(id, shown) {
  return `${CATALOGUE[id].label}: ${shown}`;
}

const colorEnabled = () => Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

// An override row: the base value struck through, then the local value and a text marker that
// stays visible when the terminal applies no styling.
function overrideText(base, local, color) {
  return color ? `\x1b[9m${base}\x1b[29m ${local} (local)` : `${base} -> ${local} (local)`;
}

/**
 * Run the screen. Resolves to { status: 'saved'|'unchanged'|'failed'|'discarded', ... } and always
 * returns to the menu. 'discarded' (null from a prompt, an interrupt) drops the edits and saves nothing.
 */
async function runProjectSettingsScreen({
  projectPath = process.cwd(),
  packageRoot = path.join(__dirname, '..'),
  promptChoice,
  promptInput,
  log = console.log,
  color = colorEnabled(),
} = {}) {
  const providerIds = providerIdsFrom(packageRoot);
  const prProviderIds = prProviderIdsFrom(packageRoot);
  const roots = {};
  for (const settingsFile of [SETTINGS_FILE, LOCAL_SETTINGS_FILE]) {
    const stored = readStored(projectPath, settingsFile);
    if (stored.status === 'unreadable') {
      log(`Cannot edit ${settingsFile}: ${stored.error}. Fix or remove the file and try again.`);
      return { status: 'failed', reason: 'unparseable', error: stored.error };
    }
    roots[settingsFile] = stored.status === 'ok' ? stored.root : {};
  }
  const baseRoot = roots[SETTINGS_FILE];
  const localRoot = roots[LOCAL_SETTINGS_FILE];
  const { baseValues, localValues, warnings } = readSettings({ cwd: projectPath, providerIds, prProviderIds, locate: false });
  for (const warning of warnings) log(warning);

  // A key that the local file holds saves there; every other key saves to the base file.
  const isLocal = id => storedValue(localRoot, id) !== undefined;
  const targetRoot = id => (isLocal(id) ? localRoot : baseRoot);
  const changes = {};
  const pending = id => Object.hasOwn(changes, id);
  const shownIn = (root, values, id) => {
    const raw = storedValue(root, id);
    if (raw === undefined) return absentText(id);
    if (Object.hasOwn(values, id)) return values[id];
    return checkValue(id, raw, providerIds, prProviderIds).ok ? absentText(id) : `${JSON.stringify(raw)} (invalid)`;
  };
  const baseText = id => shownIn(baseRoot, baseValues, id);
  const pendingText = id => changes[id] ?? absentText(id);
  const displayValue = id => {
    if (!isLocal(id)) return pending(id) ? pendingText(id) : baseText(id);
    // Removing a key from the local file lets the base value apply again.
    if (pending(id) && changes[id] === undefined) return baseText(id);
    return overrideText(baseText(id), pending(id) ? pendingText(id) : shownIn(localRoot, localValues, id), color);
  };

  // A free-text language: ask again until the catalogue accepts it or the user backs out.
  const askLanguage = async id => {
    for (;;) {
      const answer = await promptInput('Language name: ');
      if (answer === BACK) return BACK;
      if (answer === null || answer === undefined) return null;
      const checked = checkValue(id, String(answer), providerIds, prProviderIds);
      if (checked.ok) return checked.value;
      log(`Rejected: ${checked.problem}.`);
    }
  };

  const discard = () => {
    log('Interrupted: the edits were discarded and nothing was saved.');
    return { status: 'discarded' };
  };

  const record = (id, value) => {
    if (value === storedValue(targetRoot(id), id)) delete changes[id];
    else changes[id] = value;
  };

  for (;;) {
    // Option values are the setting ids and section headers, which are unique; the visible text
    // travels beside them, because two sections may show the same label and value.
    const options = [];
    const displayOptions = [];
    const groupHeaders = [];
    SETTING_IDS.forEach((id, index) => {
      if (index === 0 || CATALOGUE[id].section !== CATALOGUE[SETTING_IDS[index - 1]].section) {
        groupHeaders.push(sectionHeader(id));
        options.push(sectionHeader(id));
        displayOptions.push(sectionHeader(id));
      }
      options.push(id);
      displayOptions.push(rowLabel(id, displayValue(id)));
    });
    options.push(DONE);
    displayOptions.push(DONE);
    const action = await promptChoice('Project behavior settings:', options, undefined, undefined, { groupHeaders, displayOptions });
    if (action === null) return discard();
    if (action === BACK || action === DONE) break;
    const id = SETTING_IDS.find(candidate => candidate === action);
    if (!id) return discard();
    const chosen = await promptChoice(`${CATALOGUE[id].label}:`, valueChoices(id, providerIds, prProviderIds));
    if (chosen === null) return discard();
    if (chosen === BACK) continue;
    if (chosen === OTHER_LANGUAGE) {
      const language = await askLanguage(id);
      if (language === null) return discard();
      if (language !== BACK) record(id, language);
      continue;
    }
    if (CATALOGUE[id].absent && chosen === CATALOGUE[id].absent) {
      record(id, undefined);
      continue;
    }
    const checked = checkValue(id, chosen, providerIds, prProviderIds);
    if (!checked.ok) {
      log(`Rejected: ${checked.problem}.`);
      continue;
    }
    record(id, checked.value);
  }

  if (Object.keys(changes).length === 0) return { status: 'unchanged' };
  const saved = saveSettings(projectPath, changes, { providerIds, prProviderIds });
  if (!saved.ok) {
    log(`Project settings were not saved: ${saved.error}`);
    return { status: 'failed', reason: 'save', error: saved.error };
  }
  log(`Saved ${Object.keys(changes).length} project setting(s) to ${saved.files.join(', ')}.`);
  return { status: 'saved', changes: { ...changes } };
}

module.exports = { SETTING_IDS, OTHER_LANGUAGE, DONE, providerIdsFrom, prProviderIdsFrom, runProjectSettingsScreen };
